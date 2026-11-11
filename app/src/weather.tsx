// Live weather at MCAST Paola, from Open-Meteo (free, no key needed).
// Fetched on the phone every 10 minutes and shared by Home and the map.
// If the phone is offline the app still knows the season, and "preview"
// lets anyone see every kind of weather (useful for a demo on a sunny day).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type WeatherKind = 'clear' | 'night' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'storm' | 'snow' | 'wind';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const WEATHER_KINDS: WeatherKind[] = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'storm', 'snow', 'wind', 'night'];
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const WEATHER_ICON: Record<WeatherKind, string> = {
  clear: 'weather-sunny',
  night: 'weather-night',
  partly: 'weather-partly-cloudy',
  cloudy: 'weather-cloudy',
  fog: 'weather-fog',
  drizzle: 'weather-partly-rainy',
  rain: 'weather-pouring',
  storm: 'weather-lightning-rainy',
  snow: 'weather-snowy-heavy',
  wind: 'weather-windy',
};

const MCAST = { lat: 35.8773, lng: 14.5063 };
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${MCAST.lat}&longitude=${MCAST.lng}&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Europe%2FMalta`;
const REFRESH_MS = 10 * 60 * 1000;

type Live = { kind: WeatherKind; temperature: number; wind: number; code: number; at: number };

// WMO weather codes, as used by Open-Meteo.
export function kindFromCode(code: number, isDay: boolean, wind: number): WeatherKind {
  let kind: WeatherKind;
  if (code === 0 || code === 1) kind = 'clear';
  else if (code === 2) kind = 'partly';
  else if (code === 3) kind = 'cloudy';
  else if (code === 45 || code === 48) kind = 'fog';
  else if (code >= 51 && code <= 57) kind = 'drizzle';
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) kind = 'rain';
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) kind = 'snow';
  else if (code >= 95) kind = 'storm';
  else kind = 'cloudy';
  if (wind >= 30 && (kind === 'clear' || kind === 'partly' || kind === 'cloudy')) kind = 'wind';
  if (!isDay && (kind === 'clear' || kind === 'partly')) kind = 'night';
  return kind;
}

// Malta's seasons by month.
export function seasonOf(date = new Date()): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

// What to show before the first reading arrives or when offline.
function fallbackKind(season: Season, hour: number): WeatherKind {
  if (hour < 6 || hour >= 19) return 'night';
  return season === 'winter' ? 'cloudy' : season === 'autumn' ? 'partly' : 'clear';
}

type WeatherState = {
  kind: WeatherKind; // what the app shows (live or preview)
  season: Season;
  temperature: number | null;
  wind: number | null;
  source: 'live' | 'season' | 'preview';
  previewKind: WeatherKind | null;
  previewSeason: Season | null;
  setPreview: (kind: WeatherKind | null) => void;
  setPreviewSeason: (season: Season | null) => void;
  refresh: () => void;
};

const WeatherContext = createContext<WeatherState | null>(null);

export function useWeather(): WeatherState {
  const value = useContext(WeatherContext);
  if (!value) throw new Error('useWeather must be inside WeatherProvider');
  return value;
}

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<Live | null>(null);
  const [previewKind, setPreview] = useState<WeatherKind | null>(null);
  const [previewSeason, setPreviewSeason] = useState<Season | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(URL, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`weather ${res.status}`);
        const data = await res.json();
        const cur = data?.current;
        if (!cur || typeof cur.weather_code !== 'number') throw new Error('weather: no current block');
        if (cancelled) return;
        setLive({
          code: cur.weather_code,
          temperature: Math.round(cur.temperature_2m),
          wind: Math.round(cur.wind_speed_10m),
          kind: kindFromCode(cur.weather_code, cur.is_day === 1, cur.wind_speed_10m),
          at: Date.now(),
        });
      } catch {
        // Offline or blocked: keep the last reading, or fall back to the season.
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tick]);

  const value = useMemo<WeatherState>(() => {
    const season = previewSeason ?? seasonOf();
    const kind = previewKind ?? live?.kind ?? fallbackKind(season, new Date().getHours());
    return {
      kind,
      season,
      temperature: live?.temperature ?? null,
      wind: live?.wind ?? null,
      source: previewKind || previewSeason ? 'preview' : live ? 'live' : 'season',
      previewKind,
      previewSeason,
      setPreview,
      setPreviewSeason,
      refresh,
    };
  }, [live, previewKind, previewSeason, refresh]);

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}
