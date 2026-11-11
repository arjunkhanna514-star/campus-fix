// Live location on campus. Turns the phone's GPS position into a point on
// the campus map, keeps it updated while you walk, and remembers a one-tap
// calibration so the dot lands exactly on the right building.

import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { campus, locate, Point } from './navigation';
import { getItem, setItem } from './storage';

const CAL_KEY = 'geo_calibration';
const M_PER_DEG_LAT = 111320;

type Calibration = { dx: number; dy: number }; // map-pixel offset learnt on campus
let calibration: Calibration = { dx: 0, dy: 0 };
let calibrationLoaded = false;
const listeners = new Set<() => void>();

async function loadCalibration() {
  if (calibrationLoaded) return;
  calibrationLoaded = true;
  const saved = await getItem(CAL_KEY);
  if (saved) calibration = JSON.parse(saved);
  listeners.forEach((fn) => fn());
}

// GPS -> map. The map is drawn north-up; one map pixel is about 0.33 m.
function rawToMap(lat: number, lng: number): Point {
  const g = campus.geo;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((g.anchorLat * Math.PI) / 180);
  const east = (lng - g.anchorLng) * mPerDegLng;
  const north = (lat - g.anchorLat) * M_PER_DEG_LAT;
  const t = (g.rotationDeg * Math.PI) / 180;
  const ex = east * Math.cos(t) - north * Math.sin(t);
  const ny = east * Math.sin(t) + north * Math.cos(t);
  return [g.anchorX + ex / campus.metresPerPixel, g.anchorY - ny / campus.metresPerPixel];
}

export function toMap(lat: number, lng: number): Point {
  const [x, y] = rawToMap(lat, lng);
  return [x + calibration.dx, y + calibration.dy];
}

// Map -> GPS, used to place buildings and routes on the satellite view.
export function toLatLng([x, y]: Point): { latitude: number; longitude: number } {
  const g = campus.geo;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((g.anchorLat * Math.PI) / 180);
  const ex = (x - calibration.dx - g.anchorX) * campus.metresPerPixel;
  const ny = -(y - calibration.dy - g.anchorY) * campus.metresPerPixel;
  const t = (-g.rotationDeg * Math.PI) / 180;
  const east = ex * Math.cos(t) - ny * Math.sin(t);
  const north = ex * Math.sin(t) + ny * Math.cos(t);
  return { latitude: g.anchorLat + north / M_PER_DEG_LAT, longitude: g.anchorLng + east / mPerDegLng };
}

// "I am at this block right now": shift the map so the live GPS point lands on that spot.
export async function calibrateTo(lat: number, lng: number, actual: Point) {
  const [x, y] = rawToMap(lat, lng);
  calibration = { dx: actual[0] - x, dy: actual[1] - y };
  await setItem(CAL_KEY, JSON.stringify(calibration));
  listeners.forEach((fn) => fn());
}

export async function resetCalibration() {
  calibration = { dx: 0, dy: 0 };
  await setItem(CAL_KEY, JSON.stringify(calibration));
  listeners.forEach((fn) => fn());
}

export function isCalibrated() {
  return calibration.dx !== 0 || calibration.dy !== 0;
}

export type LiveLocation = {
  status: 'idle' | 'asking' | 'denied' | 'searching' | 'live' | 'unavailable';
  lat?: number;
  lng?: number;
  point?: Point;
  accuracyM?: number;
  heading?: number | null;
  place?: ReturnType<typeof locate>;
};

// Watches the GPS while the screen that uses it is open: every couple of metres the position updates.
export function useLiveLocation(enabled = true): LiveLocation & { retry: () => void } {
  const [state, setState] = useState<LiveLocation>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const [, forceRender] = useState(0);
  const last = useRef<{ lat: number; lng: number; acc?: number; heading?: number | null } | null>(null);

  // Recompute the map point when the calibration changes.
  useEffect(() => {
    const fn = () => forceRender((n) => n + 1);
    listeners.add(fn);
    loadCalibration();
    return () => {
      listeners.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        setState((s) => ({ ...s, status: 'asking' }));
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission.status !== 'granted') {
          setState({ status: 'denied' });
          return;
        }
        setState((s) => ({ ...s, status: 'searching' }));
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 2000 },
          (pos) => {
            if (cancelled) return;
            last.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? undefined, heading: pos.coords.heading };
            forceRender((n) => n + 1);
          }
        );
      } catch {
        if (!cancelled) setState({ status: 'unavailable' });
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  const fix = last.current;
  if (!fix || state.status === 'denied' || state.status === 'unavailable') return { ...state, retry };
  const point = toMap(fix.lat, fix.lng);
  return {
    status: 'live',
    lat: fix.lat,
    lng: fix.lng,
    point,
    accuracyM: fix.acc,
    heading: fix.heading != null && fix.heading >= 0 ? fix.heading : null,
    place: locate(point),
    retry,
  };
}

// A sentence for the emergency screen and the map card.
export function describe(loc: LiveLocation): string {
  if (loc.status !== 'live' || !loc.place) return 'Location not available';
  if (!loc.place.onCampus) return `Not on campus (about ${loc.place.metresAway} m away)`;
  if (loc.place.inside) return `${loc.place.inside.name}, ${loc.place.inside.title}`;
  if (loc.place.near) return `Outside ${loc.place.near.name}, ${loc.place.near.title}`;
  return 'On the MCAST Paola campus grounds';
}
