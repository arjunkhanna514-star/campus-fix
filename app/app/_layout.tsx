// The root of the app: loads fonts, sets up the shared providers, and
// shows the navigation stack once we know whether someone is logged in.

import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { BarlowSemiCondensed_600SemiBold } from '@expo-google-fonts/barlow-semi-condensed/600SemiBold';
import { BarlowSemiCondensed_700Bold } from '@expo-google-fonts/barlow-semi-condensed/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/src/auth';
import { I18nProvider } from '@/src/i18n';
import { SessionProvider } from '@/src/session';
import { useTheme } from '@/src/theme';
import { ToastProvider } from '@/src/toast';
import { WeatherProvider } from '@/src/weather';

export { ErrorBoundary } from 'expo-router';

// Keep the splash screen up until fonts and the saved login are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowSemiCondensed_600SemiBold,
    BarlowSemiCondensed_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <WeatherProvider>
          <AuthProvider>
            <ToastProvider>
              <SessionProvider>
                <Navigation />
              </SessionProvider>
            </ToastProvider>
          </AuthProvider>
        </WeatherProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function Navigation() {
  const { ready } = useAuth();
  const { c, isDark } = useTheme();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.ink, border: c.line, primary: c.ink } };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Screens slide in from the right and the previous one parallaxes away, instead of cutting. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'ios_from_right', gestureEnabled: true }} />
    </ThemeProvider>
  );
}
