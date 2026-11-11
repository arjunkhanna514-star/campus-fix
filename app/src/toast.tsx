// The banner that drops in from the top of the screen: points earned,
// badges unlocked, level-ups, and plain messages. Badges and level-ups
// also fire confetti.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassEdge } from './components/Glass';
import { Icon, IconName, Txt } from './components/ui';
import { haptics } from './haptics';
import { MAX_WIDTH, radius, space, useTheme } from './theme';

export type Toast = {
  kind: 'points' | 'badge' | 'level' | 'info' | 'error';
  title: string;
  body?: string;
  icon?: IconName | string;
};

type ToastApi = { show: (toast: Toast) => void };
const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

const VISIBLE_MS = 3400;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [queue, setQueue] = useState<(Toast & { id: number })[]>([]);
  const [confettiKey, setConfettiKey] = useState(0);
  const nextId = useRef(1);
  const slide = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((on) => (reduceMotion.current = on));
  }, []);

  const show = useCallback((toast: Toast) => {
    setQueue((current) => [...current, { ...toast, id: nextId.current++ }].slice(-4));
  }, []);

  const current = queue[0];

  const dismiss = useCallback(() => {
    Animated.timing(slide, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setQueue((items) => items.slice(1));
    });
  }, [slide]);

  // Show one toast at a time: slide in, wait, slide out, then the next.
  useEffect(() => {
    if (!current) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if ((current.kind === 'badge' || current.kind === 'level') && !reduceMotion.current) {
      setConfettiKey((key) => key + 1);
    }
    // A vibration that matches the news: success for rewards, a buzz for errors.
    if (current.kind === 'error') haptics.error();
    else if (current.kind === 'info') haptics.tap();
    else haptics.success();
    AccessibilityInfo.announceForAccessibility(current.body ? `${current.title}. ${current.body}` : current.title);
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const api = useMemo(() => ({ show }), [show]);

  const celebrate = current && (current.kind === 'badge' || current.kind === 'level' || current.kind === 'points');
  const error = current?.kind === 'error';
  const background = error ? '#3A1614' : celebrate ? c.tag : c.solidAlt;
  const foreground = error ? c.danger : celebrate ? c.tagInk : c.ink;
  const iconName: IconName | string =
    current?.icon ??
    (current?.kind === 'points' ? 'star-four-points' : current?.kind === 'level' ? 'arrow-up-bold-circle' : current?.kind === 'error' ? 'alert-circle-outline' : 'check-circle');

  return (
    <ToastContext.Provider value={api}>
      {children}
      {confettiKey > 0 ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            key={confettiKey}
            count={70}
            origin={{ x: width / 2, y: -20 }}
            explosionSpeed={320}
            fallSpeed={2200}
            fadeOut
            colors={['#FFFFFF', '#E5E5EA', '#AEAEB2', '#8E8E93', '#48484A']}
          />
        </View>
      ) : null}
      {current ? (
        <View pointerEvents="box-none" style={[styles.host, { top: insets.top + space.sm }]}>
          <Animated.View
            style={{
              width: '100%',
              maxWidth: MAX_WIDTH - 2 * space.lg,
              opacity: slide,
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale: slide.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            }}>
            <Pressable onPress={dismiss} accessibilityRole="alert" style={[styles.toast, { backgroundColor: background, borderColor: celebrate ? background : c.lineStrong }]}>
              <GlassEdge radius={radius.lg} />
              <Icon name={iconName} size={26} color={foreground} />
              <View style={{ flex: 1 }}>
                <Txt variant="heading" color={foreground}>
                  {current.title}
                </Txt>
                {current.body ? (
                  <Txt variant="small" color={foreground} numberOfLines={2}>
                    {current.body}
                  </Txt>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
});
