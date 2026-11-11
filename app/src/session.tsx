// Data about the logged-in user that many screens need: their profile
// (points, level, badges) and the fixed lists (categories, buildings).
//
// It also turns changes in the profile into reward banners. Every 10 seconds
// it re-reads the profile; if the points ledger has new rows, a new badge or
// a higher level, it shows a banner. That is how a student sees "+15, your
// report was acknowledged" appear seconds after an admin acts on another device.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
import { useAuth } from './auth';
import { getItem, setItem } from './storage';
import { useToast } from './toast';
import type { Me, Meta } from './types';

const POLL_MS = 10000;

type Seen = { eventId: number; badges: string[]; levelIndex: number };

type SessionState = {
  me: Me | null;
  meta: Meta | null;
  refreshMe: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({ me: null, meta: null, refreshMe: async () => {} });
export const useSession = () => useContext(SessionContext);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { show } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const seen = useRef<Seen | null>(null);
  const busy = useRef(false);
  const userId = user?.id ?? null;

  // Compares the fresh profile with what this user has already been shown.
  const announceChanges = useCallback(
    async (fresh: Me) => {
      const key = `seen_${fresh.user.id}`;
      const newestEvent = fresh.events[0]?.id ?? 0;
      const earned = fresh.badges.filter((badge) => badge.earned);
      const snapshot: Seen = { eventId: newestEvent, badges: earned.map((badge) => badge.code), levelIndex: fresh.level.index };

      if (!seen.current) {
        const saved = await getItem(key);
        seen.current = saved ? (JSON.parse(saved) as Seen) : null;
        // First time on this device, or the database was reset: start quietly.
        if (!seen.current || seen.current.eventId > newestEvent) {
          seen.current = snapshot;
          await setItem(key, JSON.stringify(snapshot));
          return;
        }
      }

      const before = seen.current;
      const newEvents = fresh.events.filter((event) => event.id > before.eventId);
      if (newEvents.length > 0) {
        const total = newEvents.reduce((sum, event) => sum + event.amount, 0);
        const reasons = [...new Set(newEvents.map((event) => event.reason))];
        if (total > 0) {
          show({ kind: 'points', title: `+${total} ${total === 1 ? 'point' : 'points'}`, body: reasons.slice(0, 2).join(', ') });
        } else if (total < 0) {
          show({ kind: 'info', title: `${total} ${total === -1 ? 'point' : 'points'}`, body: reasons[0], icon: 'undo-variant' });
        }
      }
      for (const badge of earned) {
        if (!before.badges.includes(badge.code)) {
          show({ kind: 'badge', title: `Badge unlocked: ${badge.name}`, body: badge.description, icon: badge.icon });
        }
      }
      if (fresh.level.index > before.levelIndex) {
        show({ kind: 'level', title: `Level up: ${fresh.level.name}`, body: 'Your reports are making a difference.' });
      }

      seen.current = snapshot;
      await setItem(key, JSON.stringify(snapshot));
    },
    [show]
  );

  const refreshMe = useCallback(async () => {
    if (userId === null || busy.current) return;
    busy.current = true;
    try {
      const fresh = await api<Me>('/me');
      setMe(fresh);
      if (fresh.user.role === 'student') await announceChanges(fresh);
    } catch {
      // A failed background refresh is not worth interrupting the user for.
    } finally {
      busy.current = false;
    }
  }, [userId, announceChanges]);

  // Load everything when someone logs in; clear it when they log out.
  useEffect(() => {
    seen.current = null;
    setMe(null);
    if (userId === null) return;
    refreshMe();
    api<Meta>('/meta').then(setMeta).catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while the app is open and in the foreground.
  useEffect(() => {
    if (userId === null) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refreshMe();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [userId, refreshMe]);

  const value = useMemo(() => ({ me, meta, refreshMe }), [me, meta, refreshMe]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
