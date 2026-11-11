// Login and register live here. A logged-in user is sent straight to the app.

import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/src/auth';
import { useTheme } from '@/src/theme';

export default function AuthLayout() {
  const { user } = useAuth();
  const { c } = useTheme();
  if (user) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }} />;
}
