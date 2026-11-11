// Everything that talks to the server goes through this file.
// It finds the server, attaches the login token, and turns failures into
// messages a person can read.

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getItem, removeItem, setItem } from './storage';

// The always-on copy of the server on Vercel's free plan (see vercel.json).
export const HOSTED_URL = 'https://campus-fix-mcast.vercel.app/api';

const PORT = 4000;
const CUSTOM_URL_KEY = 'server_url';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let baseUrl: string | null = null;
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}
export function currentBaseUrl() {
  return baseUrl;
}

// Places the server might be, most specific first:
// 1. an address typed in by the user, 2. EXPO_PUBLIC_API_URL,
// 3. the laptop running Expo (works for real phones on the same Wi-Fi),
// 4. 10.0.2.2, which is how an Android emulator reaches the laptop,
// 5. localhost (web browser, or emulators using "adb reverse").
async function candidateUrls(): Promise<string[]> {
  const list: string[] = [];
  const custom = await getItem(CUSTOM_URL_KEY);
  if (custom) list.push(custom);
  if (process.env.EXPO_PUBLIC_API_URL) list.push(process.env.EXPO_PUBLIC_API_URL);

  const hostUri = Constants.expoConfig?.hostUri;
  const devHost = hostUri ? hostUri.split(':')[0] : null;
  if (Platform.OS === 'web') {
    const loc = typeof window !== 'undefined' ? window.location : null;
    // Served by the Campus Fix server itself (the shared link): the API is on the same address.
    if (loc && loc.port !== '8081' && loc.port !== '19006') list.unshift(`${loc.origin}/api`);
    const pageHost = loc?.hostname;
    if (pageHost) list.push(`http://${pageHost}:${PORT}`);
  } else if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
    list.push(`http://${devHost}:${PORT}`);
  }
  if (Platform.OS === 'android') list.push(`http://10.0.2.2:${PORT}`);
  list.push(`http://localhost:${PORT}`);
  // Last of all, the hosted copy that runs in the cloud, so the phone app works with the laptop switched off.
  list.push(HOSTED_URL);

  return [...new Set(list.map((url) => url.replace(/\/+$/, '')))];
}

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isServer(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${url}/health`, {}, 2500);
    if (!res.ok) return false;
    const body = await res.json();
    return body?.ok === true;
  } catch {
    return false;
  }
}

// Tries every candidate at once and keeps the first one (in priority order) that answers.
export async function findServer(force = false): Promise<string | null> {
  if (baseUrl && !force) return baseUrl;
  const urls = await candidateUrls();
  const results = await Promise.all(urls.map(isServer));
  const index = results.findIndex(Boolean);
  baseUrl = index >= 0 ? urls[index] : null;
  return baseUrl;
}

// Saves an address typed by the user, if a Campus Fix server really answers there.
export async function saveCustomServer(input: string): Promise<boolean> {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) {
    await removeItem(CUSTOM_URL_KEY);
    return (await findServer(true)) !== null;
  }
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  // A plain http address without a port means the laptop's port 4000; an https link (the shared one) is used as it is.
  if (/^http:\/\//i.test(url) && !/:\d+$/.test(url)) url = `${url}:${PORT}`;
  if (!(await isServer(url))) {
    if (await isServer(`${url}/api`)) url = `${url}/api`;
    else return false;
  }
  await setItem(CUSTOM_URL_KEY, url);
  baseUrl = url;
  return true;
}

type Options = { method?: string; body?: unknown; form?: FormData };

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const base = await findServer();
  if (!base) {
    throw new ApiError(0, "Can't reach the Campus Fix server. Check that it is running, then try again.");
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form; // fetch sets the multipart boundary header itself
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${base}${path}`, { method: options.method || 'GET', headers, body }, options.form ? 30000 : 10000);
  } catch {
    baseUrl = null; // look for the server again next time
    throw new ApiError(0, "Can't reach the Campus Fix server. Check that it is running, then try again.");
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Some errors have no JSON body.
  }

  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(res.status, data?.error || `The server answered with an error (${res.status}).`);
  }
  return data as T;
}

// Photos are stored on the server as "/uploads/abc.jpg". This makes the full address.
export function photoUrl(path: string | null): string | null {
  if (!path || !baseUrl) return null;
  return `${baseUrl}${path}`;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Try again.';
}
