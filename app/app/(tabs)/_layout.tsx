// The floating glass tab bar. Students and admins see different tabs:
// students get Report and Leaderboard, admins get Manage. Switching tabs
// slides the screens and gives a firm vibration; the active icon lifts.

import { Redirect, Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth';
import { GlassBlur } from '@/src/components/Glass';
import { Icon } from '@/src/components/ui';
import { haptics } from '@/src/haptics';
import { useT } from '@/src/i18n';
import { fonts, useTheme } from '@/src/theme';

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: import("react-native").ColorValue }) {
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(lift, { toValue: focused ? 1 : 0, useNativeDriver: true, damping: 14, stiffness: 220 }).start();
  }, [focused, lift]);
  return (
    <Animated.View style={{ transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
      <Icon name={name} size={24} color={color} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();

  if (!user) return <Redirect href="/login" />;
  const isAdmin = user.role === 'admin';

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.impact() }}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.inkFaint,
        // A capsule floating above the bottom edge, like a pane of dark glass.
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          marginHorizontal: 14,
          bottom: Math.max(insets.bottom, 10) + 4,
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 34,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: c.lineStrong,
          backgroundColor: 'rgba(62,62,78,0.66)',
          elevation: 0,
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: 34, overflow: 'hidden' }]}>
            <GlassBlur radius={34} intensity={45} />
            <LinearGradient colors={[c.highlight, 'rgba(255,255,255,0)']} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
          </View>
        ),
        // Room below the letters, so the tails of p, g and y are never cut off.
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 16, paddingBottom: 2, overflow: 'visible' },
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'home-variant' : 'home-variant-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: t('tab.issues'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'format-list-bulleted-square' : 'format-list-bulleted'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tab.map'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: t('tab.report'),
          href: isAdmin ? null : undefined,
          tabBarAccessibilityLabel: 'Report a problem',
          // The one solid white thing in the bar: reporting is the main job of the app.
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 46, height: 32, borderRadius: 16, backgroundColor: c.tag, alignItems: 'center', justifyContent: 'center', transform: [{ scale: focused ? 1.08 : 1 }] }}>
              <Icon name="plus-thick" size={20} color={c.tagInk} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t('tab.manage'),
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'clipboard-check' : 'clipboard-check-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t('tab.ranks'),
          href: isAdmin ? null : undefined,
          tabBarAccessibilityLabel: 'Leaderboard',
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'trophy' : 'trophy-outline'} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ color, focused }) => <TabIcon name={focused ? 'account-circle' : 'account-circle-outline'} focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
