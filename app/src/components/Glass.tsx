// The glass look: the ambient light behind every screen, and the bright
// top edge that makes a translucent pane read as glass.

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useId, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';
import { useForever, useReduceMotion, wave } from '../motion';

// Two soft pools of light on a black canvas. They breathe very slowly,
// which keeps the glass alive without pulling attention from the content.
export function Ambient() {
  const reduce = useReduceMotion();
  const glow = wave(useForever(12000, 0, !reduce));

  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#1A1E27', '#08090C', '#000000']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }]}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`lightA${uid}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#DCE3F2" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={`lightB${uid}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#9AA6BC" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#B8BCC8" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="12" cy="4" rx="70" ry="34" fill={`url(#lightA${uid})`} />
          <Ellipse cx="96" cy="78" rx="60" ry="38" fill={`url(#lightB${uid})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// The body of a glass pane: brighter at the top-left where the light hits, clearer towards the bottom-right.
export function GlassFill({ radius }: { radius: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0.06)']}
      locations={[0, 0.45, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
}

// A band of light that glides across a surface every few seconds, like a reflection on polished glass.
export function Sheen({ width, every = 3800, strength = 0.55 }: { width: number; every?: number; strength?: number }) {
  const reduce = useReduceMotion();
  const total = every + 1100;
  const clock = useForever(total, 0, !reduce && !!width);
  // Rest for "every" ms, then glide across in 1.1 s.
  const sweep = clock.interpolate({ inputRange: [0, every / total, 1], outputRange: [0, 0, 1] });
  if (!width) return null;
  const band = Math.max(60, width * 0.35);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { width: band, transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-band * 1.5, width + band * 0.5] }) }, { skewX: '-20deg' }] },
      ]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', `rgba(255,255,255,${strength})`, 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// A thin bright band along the top of a pane, fading down: light catching the glass edge.
export function GlassEdge({ radius }: { radius: number }) {
  const { c } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[c.highlight, 'rgba(255,255,255,0)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.55 }}
      style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
    />
  );
}

// Frosted glass: blurs whatever is behind the pane (the live wallpaper), so the
// pane reads as real glass and text on it stays sharp. iPhone and the web blur
// for real; Android shows a smooth dark tint instead, which is much lighter on
// the battery.
export function GlassBlur({ radius, intensity = 32 }: { radius: number; intensity?: number }) {
  return <BlurView pointerEvents="none" intensity={intensity} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]} />;
}
