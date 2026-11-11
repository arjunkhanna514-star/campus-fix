// Small key-value storage that works on phones and in a browser.
// On Android and iOS it uses the encrypted SecureStore (good for the login
// token). On web, SecureStore does not exist, so it uses localStorage.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore keys may only contain letters, numbers, ".", "-" and "_".
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(safeKey(key));
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(safeKey(key), value);
  } catch {
    // Storage being unavailable should never crash the app.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(safeKey(key));
  } catch {
    // Same as above.
  }
}
