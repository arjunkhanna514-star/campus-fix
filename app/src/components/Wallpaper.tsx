// The live wallpaper: the glass-spheres picture behind every screen, breathing
// very slowly (a gentle zoom and drift) so it feels alive.
//
// It never stops and never restarts. The movement comes from one shared clock
// (the time since 1970), not from when a screen opened, so switching screens
// carries on in perfect step. Screens that are not on display hold still to save
// battery. With "reduce motion" switched on in the phone's settings it is a
// still picture. The map screens do not use it, so nothing shows through the map.

import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

import { useForever, useReduceMotion, wave } from '../motion';

const PICTURE = require('../../assets/images/wallpaper.jpg');

function useFocusedSafe() {
  try {
    return useIsFocused();
  } catch {
    return true;
  }
}

export function Wallpaper() {
  const focused = useFocusedSafe();
  const reduce = useReduceMotion();
  const running = focused && !reduce;
  const zoom = wave(useForever(36000, 0, running));
  const drift = wave(useForever(52000, 0.3, running));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: '#0D0D11' }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="wallpaper">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1.03, 1.1] }) },
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] }) },
              { translateY: zoom.interpolate({ inputRange: [0, 1], outputRange: [6, -6] }) },
            ],
          },
        ]}>
        <Image source={PICTURE} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </Animated.View>
      {/* a light veil at the top and bottom keeps text readable */}
      <LinearGradient colors={['rgba(8,8,11,0.5)', 'rgba(8,8,11,0.24)', 'rgba(8,8,11,0.26)', 'rgba(8,8,11,0.52)']} locations={[0, 0.25, 0.75, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
