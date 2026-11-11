// Animations that run for ever and never jump.
//
// useForever gives a value that goes 0 -> 1 again and again. Each cycle starts
// the next one when it finishes, which works the same on iPhone, Android and the
// web (Animated.loop with the native driver can stop after one cycle on the web).
// The value follows the wall clock, so a screen opened later shows the motion
// exactly in step with the one before: it never visibly restarts.

import { useEffect, useRef } from 'react';
import { Animated, Easing, EasingFunction, Platform } from 'react-native';

const native = Platform.OS !== 'web';

export function useForever(duration: number, offset = 0, running = true, easing: EasingFunction = Easing.linear, jsDriver = false) {
  const phaseNow = () => (((Date.now() / duration + offset) % 1) + 1) % 1;
  const v = useRef(new Animated.Value(phaseNow())).current;

  useEffect(() => {
    let cancelled = false;
    let current: Animated.CompositeAnimation | null = null;
    const run = (from: number) => {
      if (cancelled) return;
      v.setValue(from);
      current = Animated.timing(v, { toValue: 1, duration: Math.max(16, (1 - from) * duration), easing, useNativeDriver: native && !jsDriver });
      current.start(({ finished }) => {
        if (finished && !cancelled) run(0);
      });
    };
    if (running) run(phaseNow());
    else v.setValue(phaseNow());
    return () => {
      cancelled = true;
      current?.stop();
    };
  }, [running, duration, offset, jsDriver]); // eslint-disable-line react-hooks/exhaustive-deps

  return v;
}

// 0 -> 1 -> 0 smoothly, for breathing and swaying motions.
export const pingPong = (v: Animated.Value) => v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });

// A smooth wave 0 -> 1 -> 0 (cosine shaped) with no kinks, for floating and breathing.
const WAVE_IN = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const WAVE_OUT = WAVE_IN.map((x) => (1 - Math.cos(2 * Math.PI * x)) / 2);
export const wave = (v: Animated.Value) => v.interpolate({ inputRange: WAVE_IN, outputRange: WAVE_OUT });

// Respects the phone's "reduce motion" setting.
import { AccessibilityInfo } from 'react-native';
import { useState } from 'react';
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => sub?.remove?.();
  }, []);
  return reduce;
}
