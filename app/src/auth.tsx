// Keeps track of who is logged in. The login token is saved in secure
// storage, so the user stays signed in after closing the app.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, findServer, setAuthToken, setUnauthorizedHandler } from './api';
import { getItem, removeItem, setItem } from './storage';
import type { Me, User } from './types';

const TOKEN_KEY = 'auth_token';

type AuthState = {
  user: User | null;
  ready: boolean; // false while we check for a saved login on start-up
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await removeItem(TOKEN_KEY);
  }, []);

  // On start-up: if a token was saved, ask the server who it belongs to.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getItem(TOKEN_KEY);
      await findServer();
      if (token) {
        setAuthToken(token);
        try {
          const me = await api<Me>('/me');
          if (!cancelled) setUser(me.user);
        } catch {
          setAuthToken(null);
          await removeItem(TOKEN_KEY);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // If the server ever answers "401 not logged in", sign out cleanly.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const startSession = useCallback(async (result: { token: string; user: User }) => {
    setAuthToken(result.token);
    await setItem(TOKEN_KEY, result.token);
    setUser(result.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      startSession(await api('/auth/login', { method: 'POST', body: { email, password } }));
    },
    [startSession]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      startSession(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
    },
    [startSession]
  );

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
