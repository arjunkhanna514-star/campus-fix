// "Tag", the Campus Fix mascot: a glass maintenance tag with a face.
// It floats gently and blinks, and its expression matches the situation,
// so empty screens and loading screens feel looked after instead of broken.

import React, { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useForever, useReduceMotion, wave } from '../motion';

export type Mood = 'happy' | 'curious' | 'sleepy' | 'sad' | 'proud';

export function Mascot({ mood = 'happy', size = 96 }: { mood?: Mood; size?: number }) {
  const gid = `body${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reduce = useReduceMotion();
  const floatClock = useForever(3200, 0, !reduce);
  const float = wave(floatClock);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3600);
    return () => clearInterval(timer);
  }, [reduce]);

  const eyesClosed = blink || mood === 'sleepy';
  const lookX = mood === 'curious' ? 4 : 0;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { rotate: '-7deg' }] }}>
        <Svg width={size} height={size * 1.15} viewBox="0 0 100 115">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#C9CBD2" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          {/* string loop */}
          <Path d="M50 18 C 40 4, 66 0, 60 14" stroke="#8E8E93" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <Rect x="14" y="14" width="72" height="92" rx="20" fill={`url(#${gid})`} />
          {/* glass shine */}
          <Path d="M24 26 Q 30 20 40 20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity={0.9} />
          {/* punched hole */}
          <Circle cx="50" cy="30" r="6" fill="#000000" />
          {/* eyes */}
          <G transform={`translate(${lookX} 0)`}>
            {eyesClosed ? (
              <>
                <Path d="M33 62 q5 4 10 0" stroke="#0A0A0B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <Path d="M57 62 q5 4 10 0" stroke="#0A0A0B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <Ellipse cx="38" cy="61" rx="5" ry={mood === 'sad' ? 5 : 6.5} fill="#0A0A0B" />
                <Ellipse cx="62" cy="61" rx="5" ry={mood === 'sad' ? 5 : 6.5} fill="#0A0A0B" />
                <Circle cx="39.5" cy="58.5" r="1.6" fill="#FFFFFF" />
                <Circle cx="63.5" cy="58.5" r="1.6" fill="#FFFFFF" />
              </>
            )}
          </G>
          {/* cheeks */}
          <Circle cx="28" cy="74" r="4.5" fill="#8E8E93" opacity={0.35} />
          <Circle cx="72" cy="74" r="4.5" fill="#8E8E93" opacity={0.35} />
          {/* mouth */}
          {mood === 'sad' ? (
            <Path d="M41 84 q9 -7 18 0" stroke="#0A0A0B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          ) : mood === 'curious' ? (
            <Circle cx={52 + lookX} cy="82" r="3.5" fill="#0A0A0B" />
          ) : mood === 'sleepy' ? (
            <Path d="M44 82 h12" stroke="#0A0A0B" strokeWidth="3.5" strokeLinecap="round" />
          ) : (
            <Path d={mood === 'proud' ? 'M38 78 q12 14 24 0 z' : 'M40 79 q10 10 20 0'} stroke="#0A0A0B" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill={mood === 'proud' ? '#0A0A0B' : 'none'} />
          )}
        </Svg>
      </Animated.View>
      {/* shadow that shrinks as the mascot floats up */}
      <Animated.View
        style={{
          width: size * 0.5,
          height: 6,
          borderRadius: 3,
          marginTop: 4,
          backgroundColor: 'rgba(255,255,255,0.10)',
          transform: [{ scaleX: float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }],
        }}
      />
    </View>
  );
}
