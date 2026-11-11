// Tag, the Campus Fix mascot, dressed for the weather. Each kind of weather
// has its own pose and props: an umbrella in the rain, sunglasses in the sun,
// a beanie and scarf in snow, a lantern in fog, a nightcap at night, leaning
// into the wind. The season adds a touch: a scarf in winter, a leaf on its
// head in autumn, a flower in spring. The whole figure moves to match.

import React, { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { Season, WeatherKind } from '@/src/weather';
import { useForever, useReduceMotion } from '@/src/motion';

const INK = '#0A0A0B';
const ARM = '#D9DBE1';

const MOTION: Record<WeatherKind, number> = {
  clear: 1200, partly: 2400, cloudy: 3200, fog: 4200, drizzle: 2600, rain: 2200, storm: 900, snow: 380, wind: 1400, night: 3800,
};

export function WeatherAvatar({ kind, season, size = 120 }: { kind: WeatherKind; season: Season; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduce = useReduceMotion();
  const t = useForever(MOTION[kind], 0, !reduce);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3400);
    return () => clearInterval(timer);
  }, [reduce]);

  const wave = (a: number) => t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, a, 0, -a, 0] });
  const bob = (a: number) => t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -a, 0] });

  const motion: any[] =
    kind === 'clear'
      ? [{ translateY: t.interpolate({ inputRange: [0, 0.3, 0.5, 0.8, 1], outputRange: [0, -10, 0, -4, 0] }) }, { rotate: wave(4).interpolate({ inputRange: [-4, 4], outputRange: ['-4deg', '4deg'] }) }]
      : kind === 'storm'
        ? [{ rotate: t.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 0.4, 1], outputRange: ['0deg', '-3deg', '3deg', '-2deg', '0deg', '0deg'] }) }, { translateY: bob(2) }]
        : kind === 'snow'
          ? [{ translateX: t.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 1.6, -1.6, 0] }) }]
          : kind === 'wind'
            ? [{ rotate: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-9deg', '-14deg', '-9deg'] }) }, { translateX: wave(3) }]
            : kind === 'night'
              ? [{ scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.035, 1] }) }]
              : kind === 'fog'
                ? [{ rotate: wave(3).interpolate({ inputRange: [-3, 3], outputRange: ['-3deg', '3deg'] }) }]
                : [{ translateY: bob(kind === 'rain' || kind === 'drizzle' ? 4 : 6) }];

  const wet = kind === 'rain' || kind === 'drizzle' || kind === 'storm';
  const hat = kind === 'snow' || kind === 'night';
  const scarf = kind === 'snow' || kind === 'wind' || season === 'winter';
  const eyesClosed = blink || kind === 'night';
  const squint = kind === 'fog' || kind === 'wind';
  const lookUp = kind === 'cloudy' || wet;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Tag the mascot, dressed for ${kind} weather`} style={{ alignItems: 'center' }} testID={`avatar-${kind}`}>
      <Animated.View style={{ transform: motion }}>
        <Svg width={size} height={size * 1.0} viewBox="-30 -55 180 180">
          <Defs>
            <LinearGradient id={`wbody${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.97" />
              <Stop offset="1" stopColor="#C9CBD2" stopOpacity="0.92" />
            </LinearGradient>
            <LinearGradient id={`umb${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F4F5F8" />
              <Stop offset="1" stopColor="#B8BCC6" />
            </LinearGradient>
          </Defs>

          {/* umbrella behind the body, held in the right hand */}
          {wet ? (
            <G transform={kind === 'storm' ? 'rotate(-18 104 40)' : 'rotate(-10 104 40)'}>
              <Path d="M104 -38 L104 44" stroke="#8E929C" strokeWidth="3.5" strokeLinecap="round" />
              <Path d="M104 44 q0 9 -8 9" stroke="#8E929C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <Path d="M38 -6 Q 104 -86 170 -6 Q 159 -14 148 -6 Q 137 -14 126 -6 Q 115 -14 104 -6 Q 93 -14 82 -6 Q 71 -14 60 -6 Q 49 -14 38 -6 Z" fill={`url(#umb${uid})`} />
              <Path d="M104 -46 L104 -38" stroke="#8E929C" strokeWidth="3" strokeLinecap="round" />
              <G stroke="#9EA3AD" strokeWidth="1.4" fill="none">
                <Path d="M104 -44 Q 78 -30 60 -6" />
                <Path d="M104 -44 Q 130 -30 148 -6" />
                <Path d="M104 -44 L104 -6" />
              </G>
            </G>
          ) : null}

          {/* arms */}
          <G stroke={ARM} strokeWidth="6" strokeLinecap="round" fill="none">
            {/* left arm */}
            {kind === 'partly' ? <Path d="M16 62 q-14 6 -6 22" /> : kind === 'wind' ? <Path d="M16 50 q-10 -20 6 -34" /> : kind === 'snow' ? <Path d="M16 66 q-8 10 6 14" /> : <Path d="M16 64 q-12 10 -10 24" />}
            {/* right arm */}
            {wet ? (
              <Path d="M84 60 q14 -6 18 -16" />
            ) : kind === 'clear' ? (
              <Path d="M84 56 q16 -10 18 -30" />
            ) : kind === 'cloudy' ? (
              <Path d="M84 54 q12 -14 10 -34" />
            ) : kind === 'fog' ? (
              <Path d="M84 64 q12 8 16 18" />
            ) : kind === 'snow' ? (
              <Path d="M84 66 q8 10 -6 14" />
            ) : (
              <Path d="M84 64 q12 10 10 24" />
            )}
          </G>
          {kind === 'clear' ? <Circle cx="102" cy="24" r="5" fill={ARM} /> : null}
          {kind === 'cloudy' ? <Circle cx="94" cy="18" r="4.5" fill={ARM} /> : null}

          {/* lantern in fog */}
          {kind === 'fog' ? (
            <G>
              <Circle cx="104" cy="96" r="18" fill="rgba(255,210,120,0.25)" />
              <Path d="M100 80 L108 80" stroke="#8E929C" strokeWidth="2.5" />
              <Rect x="96" y="84" width="16" height="20" rx="4" fill="#FFD27A" stroke="#8E929C" strokeWidth="2" />
            </G>
          ) : null}

          {/* feet */}
          <Ellipse cx="36" cy="110" rx="9" ry="5" fill={ARM} />
          <Ellipse cx="64" cy="110" rx="9" ry="5" fill={ARM} />

          {/* body: the glass tag */}
          <Path d="M50 18 C 40 4, 66 0, 60 14" stroke="#8E8E93" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Rect x="14" y="14" width="72" height="92" rx="20" fill={`url(#wbody${uid})`} />
          <Path d="M24 26 Q 30 20 40 20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity={0.9} />
          {!hat ? <Circle cx="50" cy="30" r="6" fill="#000000" /> : null}

          {/* eyes */}
          <G transform={`translate(0 ${lookUp ? -3 : 0})`}>
            {eyesClosed ? (
              <>
                <Path d="M33 62 q5 4 10 0" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <Path d="M57 62 q5 4 10 0" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </>
            ) : squint ? (
              <>
                <Path d="M33 61 h10" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
                <Path d="M57 61 h10" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <Ellipse cx="38" cy="61" rx="5" ry="6.5" fill={INK} />
                <Ellipse cx="62" cy="61" rx="5" ry="6.5" fill={INK} />
                <Circle cx="39.5" cy="58.5" r="1.6" fill="#FFFFFF" />
                <Circle cx="63.5" cy="58.5" r="1.6" fill="#FFFFFF" />
              </>
            )}
          </G>

          {/* sunglasses */}
          {kind === 'clear' ? (
            <G>
              <Rect x="27" y="53" width="21" height="15" rx="6" fill={INK} />
              <Rect x="52" y="53" width="21" height="15" rx="6" fill={INK} />
              <Path d="M48 58 h4" stroke={INK} strokeWidth="3" />
              <Path d="M31 57 l6 0" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
              <Path d="M56 57 l6 0" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
            </G>
          ) : null}

          {/* cheeks: rosy in the cold */}
          <Circle cx="28" cy="74" r="4.5" fill={kind === 'snow' || season === 'winter' ? '#E8A0A8' : '#8E8E93'} opacity={kind === 'snow' || season === 'winter' ? 0.7 : 0.35} />
          <Circle cx="72" cy="74" r="4.5" fill={kind === 'snow' || season === 'winter' ? '#E8A0A8' : '#8E8E93'} opacity={kind === 'snow' || season === 'winter' ? 0.7 : 0.35} />

          {/* mouth */}
          {kind === 'storm' ? (
            <Ellipse cx="50" cy="83" rx="4.5" ry="5.5" fill={INK} />
          ) : kind === 'night' ? (
            <Path d="M44 82 h12" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          ) : kind === 'cloudy' || kind === 'fog' ? (
            <Path d="M43 82 q7 3 14 0" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          ) : kind === 'clear' ? (
            <Path d="M38 78 q12 14 24 0 z" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" fill={INK} />
          ) : (
            <Path d="M40 79 q10 10 20 0" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          )}

          {/* scarf */}
          {scarf ? (
            <G>
              <Rect x="12" y="90" width="76" height="10" rx="5" fill="#8C96A8" />
              <Path d="M20 92 h60" stroke="#B5BDCB" strokeWidth="2" strokeDasharray="5 5" />
              {kind === 'wind' ? (
                <Path d="M16 95 q-16 -6 -30 2 q-12 6 -24 -2" stroke="#8C96A8" strokeWidth="8" strokeLinecap="round" fill="none" />
              ) : (
                <Rect x="62" y="96" width="10" height="20" rx="4" fill="#8C96A8" />
              )}
            </G>
          ) : null}

          {/* beanie in snow */}
          {kind === 'snow' ? (
            <G>
              <Path d="M16 30 Q 50 -14 84 30 Z" fill="#7F8AA0" />
              <Rect x="13" y="24" width="74" height="11" rx="5.5" fill="#A9B2C3" />
              <Circle cx="50" cy="4" r="7" fill="#FFFFFF" />
            </G>
          ) : null}

          {/* nightcap */}
          {kind === 'night' ? (
            <G>
              <Path d="M16 30 Q 44 -8 84 30 Z" fill="#4A5578" />
              <Path d="M60 6 Q 96 -6 104 34" stroke="#4A5578" strokeWidth="12" strokeLinecap="round" fill="none" />
              <Circle cx="104" cy="38" r="6" fill="#FFFFFF" />
              <Rect x="13" y="25" width="74" height="9" rx="4.5" fill="#6B76A0" />
              <SvgText x="104" y="0" fill="#C9D2EA" fontSize="16" fontWeight="bold">z</SvgText>
              <SvgText x="118" y="-16" fill="#C9D2EA" fontSize="12" fontWeight="bold">z</SvgText>
            </G>
          ) : null}

          {/* season touches on the head */}
          {!hat && season === 'autumn' ? (
            <G transform="rotate(-25 30 14)">
              <Path d="M30 2 C 40 7, 40 19, 30 25 C 20 19, 20 7, 30 2 Z" fill="#C8692B" />
              <Path d="M30 5 L30 27" stroke="#7A3A16" strokeWidth="1.5" />
            </G>
          ) : null}
          {!hat && season === 'spring' ? (
            <G transform="translate(28 12)">
              {[0, 72, 144, 216, 288].map((a) => (
                <Ellipse key={a} cx="0" cy="-6" rx="4" ry="6" fill="#F6C9D6" transform={`rotate(${a})`} />
              ))}
              <Circle cx="0" cy="0" r="3.5" fill="#FFD27A" />
            </G>
          ) : null}
          {!hat && !wet && season === 'summer' && kind !== 'clear' ? (
            <G>
              <Ellipse cx="50" cy="20" rx="44" ry="7" fill="#E9D8A8" />
              <Path d="M24 20 Q 50 -12 76 20 Z" fill="#E9D8A8" />
              <Rect x="26" y="14" width="48" height="5" fill="#8C96A8" />
            </G>
          ) : null}
        </Svg>
      </Animated.View>
      <Animated.View
        style={{
          width: size * 0.42,
          height: 6,
          borderRadius: 3,
          marginTop: -size * 0.02,
          backgroundColor: 'rgba(255,255,255,0.10)',
        }}
      />
    </View>
  );
}
