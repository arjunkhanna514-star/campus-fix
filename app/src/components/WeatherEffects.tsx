// Animated weather drawn over the map and the Home weather card: rain,
// thunderstorms, drizzle, snow, sun rays, drifting clouds, fog, wind,
// stars at night, plus falling leaves in autumn and petals in spring.
// It never takes touches (pointerEvents none), and with "reduce motion"
// switched on in the phone's settings it stays still.

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import type { Season, WeatherKind } from '@/src/weather';
import { useForever } from '@/src/motion';

// The same "random" layout every render, so particles never jump around.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => sub?.remove?.();
  }, []);
  return reduce;
}

// A 0 -> 1 value that loops for ever, each particle starting at its own point in the cycle.
function useLoop(duration: number, delay: number, still: boolean, easing = Easing.linear) {
  return useForever(duration, delay / duration, !still, easing);
}

type Box = { w: number; h: number };
type P = { i: number; box: Box; still: boolean };

function Drop({ i, box, still, heavy }: P & { heavy: number }) {
  const len = 12 + rand(i, 1) * 14 * heavy;
  const dur = (heavy > 1.2 ? 520 : 760) + rand(i, 2) * 420;
  const v = useLoop(dur, rand(i, 3) * 1200, still);
  const x = rand(i, 4) * (box.w + 60) - 30;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: heavy > 1.2 ? 2.2 : 1.8,
        height: len,
        borderRadius: 1,
        backgroundColor: 'rgba(205,222,255,0.85)',
        opacity: 0.45 + rand(i, 5) * 0.5,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-len - 20, box.h + 20] }) },
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -box.h * 0.18] }) },
          { rotate: '10deg' },
        ],
      }}
    />
  );
}

function Flake({ i, box, still }: P) {
  const size = 3 + rand(i, 1) * 4.5;
  const v = useLoop(6000 + rand(i, 2) * 5000, rand(i, 3) * 6000, still);
  const sway = 10 + rand(i, 4) * 18;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: rand(i, 5) * box.w,
        top: 0,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: '#FFFFFF',
        opacity: 0.55 + rand(i, 6) * 0.4,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-10, box.h + 10] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, sway, 0, -sway, 0] }) },
        ],
      }}
    />
  );
}

const LEAF_COLOURS = ['#C8692B', '#D99A3A', '#A9471F', '#B98A3E'];
const PETAL_COLOURS = ['#F6C9D6', '#FFFFFF', '#F2B5C8'];

function Leaf({ i, box, still, petal }: P & { petal?: boolean }) {
  const size = petal ? 7 + rand(i, 1) * 5 : 10 + rand(i, 1) * 8;
  const v = useLoop(7000 + rand(i, 2) * 6000, rand(i, 3) * 7000, still, Easing.inOut(Easing.sin));
  const sway = 30 + rand(i, 4) * 40;
  const colour = (petal ? PETAL_COLOURS : LEAF_COLOURS)[i % (petal ? 3 : 4)];
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: rand(i, 5) * box.w,
        top: 0,
        opacity: 0.85,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-20, box.h + 20] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, sway, -sway * 0.5, sway * 0.3] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(rand(i, 6) > 0.5 ? 1 : -1) * 540}deg`] }) },
        ],
      }}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {petal ? (
          <Ellipse cx="10" cy="10" rx="5" ry="9" fill={colour} />
        ) : (
          <>
            <Path d="M10 1 C 17 5, 17 14, 10 19 C 3 14, 3 5, 10 1 Z" fill={colour} />
            <Path d="M10 3 L10 18" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

function Streak({ i, box, still }: P) {
  const w = 50 + rand(i, 1) * 90;
  const v = useLoop(900 + rand(i, 2) * 900, rand(i, 3) * 2000, still);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: rand(i, 4) * box.h,
        left: 0,
        width: w,
        height: 1.5,
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.45)',
        opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.8, 0] }),
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-w, box.w + w] }) }],
      }}
    />
  );
}

function Cloud({ i, box, still, dark, slow, faint }: P & { dark?: boolean; slow?: number; faint?: boolean }) {
  const cw = 110 + rand(i, 1) * 90;
  const v = useLoop((38000 + rand(i, 2) * 30000) * (slow ?? 1), 0, still);
  const start = rand(i, 3); // spread clouds across the width from the first frame
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 8 + rand(i, 4) * Math.min(box.h * 0.45, 160),
        left: 0,
        opacity: (dark ? 0.55 : 0.35) * (faint ? 0.55 : 1),
        transform: [
          {
            translateX: v.interpolate({
              inputRange: [0, 1 - start, 1 - start + 0.0001, 1],
              outputRange: [-cw + (box.w + cw) * start, box.w, -cw, -cw + (box.w + cw) * start],
            }),
          },
        ],
      }}>
      <Svg width={cw} height={cw * 0.5} viewBox="0 0 120 60">
        <G fill={dark ? '#5D6470' : '#FFFFFF'}>
          <Ellipse cx="40" cy="38" rx="30" ry="18" />
          <Ellipse cx="66" cy="28" rx="28" ry="22" />
          <Ellipse cx="88" cy="40" rx="24" ry="16" />
          <Ellipse cx="60" cy="44" rx="42" ry="14" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function FogBand({ i, box, still }: P) {
  const v = useLoop(14000 + rand(i, 1) * 8000, 0, still, Easing.inOut(Easing.sin));
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: box.h * (0.15 + i * 0.28),
        left: -box.w * 0.5,
        width: box.w * 2,
        height: Math.max(70, box.h * 0.22),
        transform: [{ translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-box.w * 0.25, box.w * 0.25, -box.w * 0.25] }) }],
      }}>
      <LinearGradient colors={['rgba(220,222,230,0)', 'rgba(220,222,230,0.24)', 'rgba(220,222,230,0)']} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function Star({ i, box, still }: P) {
  const v = useLoop(1800 + rand(i, 1) * 2600, rand(i, 2) * 2000, still, Easing.inOut(Easing.sin));
  const size = 1.5 + rand(i, 3) * 2.2;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: rand(i, 4) * box.w,
        top: rand(i, 5) * box.h * 0.7,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: '#FFFFFF',
        opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 1, 0.15] }),
      }}
    />
  );
}

function Mote({ i, box, still }: P) {
  const v = useLoop(5000 + rand(i, 1) * 4000, rand(i, 2) * 4000, still);
  const size = 3 + rand(i, 3) * 4;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: rand(i, 4) * box.w,
        top: 0,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: 'rgba(255,214,140,0.9)',
        opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [box.h * (0.6 + rand(i, 5) * 0.4), box.h * 0.1] }) }],
      }}
    />
  );
}

function Sun({ still, small }: { box: Box; still: boolean; small?: boolean }) {
  const spin = useLoop(36000, 0, still);
  const pulse = useLoop(3200, 0, still, Easing.inOut(Easing.sin));
  const size = small ? 90 : 150;
  return (
    <View style={{ position: 'absolute', right: -size * 0.22, top: -size * 0.22, width: size, height: size }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size,
            backgroundColor: 'rgba(255,200,90,0.22)',
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1] }) }],
          },
        ]}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <G stroke="rgba(255,214,120,0.75)" strokeWidth="3" strokeLinecap="round">
            {Array.from({ length: 12 }).map((_, k) => {
              const a = (k / 12) * Math.PI * 2;
              return <Path key={k} d={`M${50 + Math.cos(a) * 30} ${50 + Math.sin(a) * 30} L${50 + Math.cos(a) * 44} ${50 + Math.sin(a) * 44}`} />;
            })}
          </G>
          <Circle cx="50" cy="50" r="22" fill="#FFD27A" />
          <Circle cx="50" cy="50" r="22" fill="rgba(255,255,255,0.25)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Moon() {
  return (
    <View style={{ position: 'absolute', right: 18, top: 14 }}>
      <View style={{ position: 'absolute', left: -14, top: -14, width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(200,215,255,0.12)' }} />
      <Svg width={48} height={48} viewBox="0 0 48 48">
        <Path d="M30 4 A 20 20 0 1 0 44 32 A 16 16 0 1 1 30 4 Z" fill="#E9EEF8" />
      </Svg>
    </View>
  );
}

function Lightning({ box, still }: { box: Box; still: boolean }) {
  // One 5-second cycle: dark, a double flash, then dark again.
  const cycle = useForever(5030, 0, !still);
  const flash = cycle.interpolate({ inputRange: [0, 2600 / 5030, 2660 / 5030, 2750 / 5030, 2810 / 5030, 3230 / 5030, 1], outputRange: [0, 0, 1, 0.1, 0.8, 0, 0] });
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(225,230,255,0.35)', opacity: flash }]} />
      <Animated.View style={{ position: 'absolute', left: box.w * 0.62, top: 0, opacity: flash }}>
        <Svg width={46} height={Math.min(150, box.h * 0.6)} viewBox="0 0 46 150">
          <Path d="M28 0 L8 70 L22 70 L10 150 L40 55 L25 55 L38 0 Z" fill="#F4F6FF" />
        </Svg>
      </Animated.View>
    </>
  );
}

const TINT: Record<WeatherKind, [string, string]> = {
  clear: ['rgba(255,186,90,0.18)', 'rgba(255,186,90,0)'],
  partly: ['rgba(255,200,120,0.10)', 'rgba(255,200,120,0)'],
  cloudy: ['rgba(120,126,138,0.22)', 'rgba(120,126,138,0.04)'],
  fog: ['rgba(200,202,212,0.16)', 'rgba(200,202,212,0.10)'],
  drizzle: ['rgba(80,100,130,0.22)', 'rgba(80,100,130,0.04)'],
  rain: ['rgba(60,82,115,0.32)', 'rgba(60,82,115,0.08)'],
  storm: ['rgba(34,24,58,0.50)', 'rgba(34,24,58,0.16)'],
  snow: ['rgba(205,222,255,0.16)', 'rgba(205,222,255,0.04)'],
  wind: ['rgba(160,170,185,0.10)', 'rgba(160,170,185,0)'],
  night: ['rgba(18,28,70,0.42)', 'rgba(18,28,70,0.08)'],
};

type Props = { kind: WeatherKind; season: Season; density?: number; style?: ViewStyle; tint?: boolean; compact?: boolean };

export function WeatherEffects({ kind, season, density = 1, style, tint = true, compact }: Props) {
  const [box, setBox] = useState<Box | null>(null);
  const still = useReduceMotion();
  const n = (count: number) => Math.max(1, Math.round(count * density));

  const layers = useMemo(() => {
    if (!box) return null;
    const p = (i: number) => ({ i, box, still, faint: compact });
    const range = (count: number) => Array.from({ length: count }, (_, i) => i);
    const out: React.ReactNode[] = [];
    const calm = kind !== 'rain' && kind !== 'storm' && kind !== 'snow' && kind !== 'drizzle';

    if (kind === 'clear') out.push(<Sun key="sun" box={box} still={still} small={compact} />);
    if (kind === 'partly') out.push(<Sun key="sun" box={box} still={still} small />);
    if (kind === 'night') {
      out.push(<Moon key="moon" />);
      range(n(32)).forEach((i) => out.push(<Star key={`st${i}`} {...p(i)} />));
    }
    if (kind === 'partly') range(2).forEach((i) => out.push(<Cloud key={`c${i}`} {...p(i)} />));
    if (kind === 'cloudy') range(4).forEach((i) => out.push(<Cloud key={`c${i}`} {...p(i)} />));
    if (kind === 'rain' || kind === 'drizzle' || kind === 'storm') range(3).forEach((i) => out.push(<Cloud key={`c${i}`} {...p(i + 7)} dark />));
    if (kind === 'snow') range(2).forEach((i) => out.push(<Cloud key={`c${i}`} {...p(i + 3)} slow={1.4} />));
    if (kind === 'fog') range(3).forEach((i) => out.push(<FogBand key={`f${i}`} {...p(i)} />));
    if (kind === 'drizzle') range(n(22)).forEach((i) => out.push(<Drop key={`d${i}`} {...p(i)} heavy={0.6} />));
    if (kind === 'rain') range(n(48)).forEach((i) => out.push(<Drop key={`d${i}`} {...p(i)} heavy={1} />));
    if (kind === 'storm') {
      range(n(66)).forEach((i) => out.push(<Drop key={`d${i}`} {...p(i)} heavy={1.5} />));
      out.push(<Lightning key="bolt" box={box} still={still} />);
    }
    if (kind === 'snow') range(n(40)).forEach((i) => out.push(<Flake key={`s${i}`} {...p(i)} />));
    if (kind === 'wind') {
      range(n(14)).forEach((i) => out.push(<Streak key={`w${i}`} {...p(i)} />));
      range(n(5)).forEach((i) => out.push(<Leaf key={`wl${i}`} {...p(i + 40)} />));
    }
    if (kind === 'clear' && season === 'summer') range(n(10)).forEach((i) => out.push(<Mote key={`m${i}`} {...p(i)} />));
    if (calm && kind !== 'wind' && season === 'autumn') range(n(8)).forEach((i) => out.push(<Leaf key={`l${i}`} {...p(i)} />));
    if (calm && kind !== 'wind' && season === 'spring') range(n(10)).forEach((i) => out.push(<Leaf key={`p${i}`} {...p(i)} petal />));
    return out;
  }, [box, kind, season, still, density, compact]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`weather-${kind}`}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!box || Math.abs(box.w - width) > 4 || Math.abs(box.h - height) > 4) setBox({ w: width, h: height });
      }}>
      {tint ? <LinearGradient colors={TINT[kind]} style={StyleSheet.absoluteFill} /> : null}
      {layers}
    </View>
  );
}
