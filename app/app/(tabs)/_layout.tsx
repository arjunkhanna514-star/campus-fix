// The bottom tab bar. Students and admins see different tabs:
// students get Report and Leaderboard, admins get Manage.

import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth';
import { Icon } from '@/src/components/ui';
import { fonts, useTheme } from '@/src/theme';

export default function TabLayout() {
  const { user } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  if (!user) return <Redirect href="/login" />;
  const isAdmin = user.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.inkFaint,
        // Room for icon + label, plus the phone's gesture bar at the bottom.
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, height: 70 + insets.bottom, paddingTop: 6, paddingBottom: 10 + insets.bottom },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11.5, lineHeight: 15 },
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Issues',
          tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'home-variant' : 'home-variant-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          href: isAdmin ? null : undefined,
          tabBarAccessibilityLabel: 'Report a problem',
          // The one yellow thing in the bar: reporting is the main job of the app.
          tabBarIcon: () => (
            <View style={{ width: 44, height: 30, borderRadius: 10, backgroundColor: c.tag, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus-thick" size={20} color={c.tagInk} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Manage',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'clipboard-check' : 'clipboard-check-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'trophy' : 'trophy-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'account-circle' : 'account-circle-outline'} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
