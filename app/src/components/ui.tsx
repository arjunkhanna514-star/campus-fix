// The building blocks every screen is made from: text, buttons, chips,
// inputs, glass cards and the page frame. Each control answers a touch:
// it presses in, springs back and gives a small vibration.

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ColorValue,
  Easing,
  LayoutChangeEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { haptics } from '../haptics';
import { fonts, MAX_WIDTH, motion, radius, space, useTheme } from '../theme';
import { GlassBlur, GlassEdge, GlassFill, Sheen } from './Glass';
import { Wallpaper } from './Wallpaper';
import { Mascot, Mood } from './Mascot';
import { useForever, wave } from '../motion';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName | string; size?: number; color?: ColorValue | null }) {
  const { c } = useTheme();
  return <MaterialCommunityIcons name={name as IconName} size={size} color={(color ?? c.ink) as string} />;
}

// ---------- text ----------
const TYPE = {
  display: { fontFamily: fonts.headBold, fontSize: 32, lineHeight: 36 },
  title: { fontFamily: fonts.headBold, fontSize: 26, lineHeight: 31 },
  heading: { fontFamily: fonts.head, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 15.5, lineHeight: 22 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13.5, lineHeight: 18 },
  micro: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  number: { fontFamily: fonts.headBold, fontSize: 20, lineHeight: 24 },
} satisfies Record<string, TextStyle>;

type TxtProps = TextProps & { variant?: keyof typeof TYPE; tone?: 'ink' | 'soft' | 'faint' | 'danger' | 'tagInk'; color?: string };

export function Txt({ variant = 'body', tone = 'ink', color, style, ...rest }: TxtProps) {
  const { c } = useTheme();
  const toneColour = { ink: c.ink, soft: c.inkSoft, faint: c.inkFaint, danger: c.danger, tagInk: c.tagInk }[tone];
  return <Text {...rest} style={[TYPE[variant], { color: color ?? toneColour }, style]} />;
}

// ---------- page frame ----------
// Ambient light behind, safe area respected, content centred at a readable width.
// "plain" leaves the wallpaper out (the map uses it, so nothing shows through).
export function Screen({ children, edges = ['top'], plain = false }: { children: React.ReactNode; edges?: ('top' | 'bottom')[]; plain?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {plain ? null : <Wallpaper />}
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        <View style={styles.frame}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

// A pane of glass: translucent fill, hairline border, bright top edge.
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const flat = StyleSheet.flatten(style) || {};
  const r = typeof flat.borderRadius === 'number' ? flat.borderRadius : radius.lg;
  return (
    <View style={[styles.card, { backgroundColor: 'rgba(74,74,92,0.46)', borderColor: c.line, borderTopColor: c.lineStrong }, style]}>
      <GlassBlur radius={r} />
      <GlassFill radius={r} />
      <GlassEdge radius={r} />
      {children}
    </View>
  );
}

// ---------- press feedback ----------
// Wraps anything pressable: it sinks slightly while held and springs back.
// Size and placement (flex, width, margins, position) go on the outer touch
// area so the button lays out like a plain View; the look goes on the part that scales.
const OUTER_KEYS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth', 'margin', 'marginHorizontal', 'marginVertical', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'position', 'top', 'left', 'right', 'bottom', 'zIndex'] as const;
function splitStyle(style: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) ((OUTER_KEYS as readonly string[]).includes(key) ? outer : inner)[key] = value;
  // A button that stretches keeps its look filling the stretched area.
  if (outer.flex !== undefined || outer.flexGrow !== undefined) inner.flexGrow = 1;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  feedback = 'tap',
  onPress,
  disabled,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; feedback?: 'tap' | 'select' | 'impact' | 'none'; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number, config: { speed: number; bounciness: number }) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, ...config }).start();
  const { outer, inner } = splitStyle(style);

  return (
    <Pressable
      {...rest}
      style={outer}
      disabled={disabled}
      onPressIn={(e) => {
        to(scaleTo, motion.press);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1, motion.release);
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback !== 'none') haptics[feedback]();
        onPress?.(e);
      }}>
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- buttons ----------
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'quiet' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, small, style, accessibilityLabel }: ButtonProps) {
  const { c } = useTheme();
  const off = disabled || loading;
  const [width, setWidth] = useState(0);
  const colours = {
    primary: { bg: c.tag, fg: c.tagInk, border: c.tag },
    outline: { bg: c.surface, fg: c.ink, border: c.lineStrong },
    quiet: { bg: 'transparent', fg: c.ink, border: 'transparent' },
    danger: { bg: c.dangerSoft, fg: c.danger, border: 'rgba(255,122,114,0.35)' },
  }[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      feedback={variant === 'primary' ? 'impact' : 'tap'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: colours.bg, borderColor: colours.border, opacity: off ? 0.5 : 1 },
        style,
      ]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} />
      {variant === 'outline' ? <GlassEdge radius={small ? radius.md : radius.pill} /> : null}
      {variant === 'primary' ? (
        // Polished silver: white at the top, a soft lavender sheen low down and a hint of blue at the edge.
        <LinearGradient pointerEvents="none" colors={['#FFFFFF', '#ECEAF8', '#C9C6E4', '#B9C8FF']} locations={[0, 0.45, 0.8, 1]} style={StyleSheet.absoluteFill} />
      ) : null}
      {variant === 'primary' && !off ? <Sheen width={width} strength={0.9} /> : null}
      {loading ? (
        <ActivityIndicator size="small" color={colours.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 19} color={colours.fg} /> : null}
          <Text style={[small ? styles.buttonTextSmall : styles.buttonText, { color: colours.fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ name, onPress, label, color, glass }: { name: IconName; onPress: () => void; label: string; color?: string; glass?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      scaleTo={0.9}
      style={[styles.iconButton, glass && { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }]}>
      {glass ? <GlassEdge radius={24} /> : null}
      <Icon name={name} size={22} color={color ?? c.ink} />
    </PressableScale>
  );
}

// ---------- chips and segmented control ----------
type ChipProps = { label: string; selected?: boolean; onPress?: () => void; icon?: IconName | string; count?: number };

export function Chip({ label, selected, onPress, icon, count }: ChipProps) {
  const { c } = useTheme();
  const fg = selected ? c.tagInk : c.ink;
  return (
    <PressableScale
      onPress={onPress}
      feedback="select"
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      style={[styles.chip, { backgroundColor: selected ? c.tag : c.surface, borderColor: selected ? c.tag : c.line }]}>
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
      {count === undefined ? null : <Text style={[styles.chipCount, { color: selected ? c.tagInk : c.inkFaint }]}>{count}</Text>}
    </PressableScale>
  );
}

// A glass track with a white thumb that slides to the chosen option.
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const x = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, damping: 20, stiffness: 260, mass: 0.8 }).start();
  }, [index, x]);

  const thumb = width > 0 ? (width - 6) / options.length : 0;

  return (
    <View
      style={[styles.segmented, { backgroundColor: c.surface, borderColor: c.line }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist">
      {thumb > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { width: thumb, backgroundColor: c.tag, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, thumb] }) }] }]}
        />
      ) : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!active) haptics.select();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.segment}>
            <Text style={[styles.segmentText, { color: active ? c.tagInk : c.inkSoft, fontFamily: active ? fonts.bodyBold : fonts.bodyMedium }]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- text input ----------
type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string; right?: React.ReactNode };

export function Field({ label, error, hint, right, style, multiline, ...rest }: FieldProps) {
  const { c } = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="small" tone="soft">
        {label}
      </Txt>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: focused ? c.surfaceAlt : c.surface, borderColor: error ? c.danger : focused ? c.ink : c.line, borderWidth: focused || error ? 1.5 : 1 },
          multiline && { alignItems: 'flex-start' },
        ]}>
        <TextInput
          {...rest}
          multiline={multiline}
          accessibilityLabel={label}
          placeholderTextColor={c.inkFaint}
          selectionColor={c.ink}
          cursorColor={c.ink}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: c.ink }, multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 }, style]}
        />
        {right}
      </View>
      {error ? (
        <Txt variant="small" tone="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="micro" tone="faint">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

// ---------- states ----------
const MOOD_FOR_ICON: Record<string, Mood> = {
  'text-box-search-outline': 'curious',
  'flag-outline': 'sleepy',
  'trophy-outline': 'proud',
  'map-marker-outline': 'sad',
  'check-circle': 'happy',
};

export function EmptyState({ icon, title, body, action, mood }: { icon: IconName; title: string; body: string; action?: React.ReactNode; mood?: Mood }) {
  return (
    <View style={styles.empty}>
      <Mascot mood={mood ?? MOOD_FOR_ICON[icon] ?? 'happy'} size={84} />
      <Txt variant="heading" style={{ textAlign: 'center', marginTop: space.sm }}>
        {title}
      </Txt>
      <Txt tone="soft" style={{ textAlign: 'center', maxWidth: 320 }}>
        {body}
      </Txt>
      {action}
    </View>
  );
}

export function Notice({ text, tone = 'danger' }: { text: string; tone?: 'danger' | 'info' }) {
  const { c } = useTheme();
  const danger = tone === 'danger';
  return (
    <View style={[styles.notice, { backgroundColor: danger ? c.dangerSoft : c.tagSoft, borderColor: danger ? 'rgba(255,122,114,0.3)' : c.line }]} accessibilityRole="alert">
      <Icon name={danger ? 'alert-circle-outline' : 'information-outline'} size={18} color={danger ? c.danger : c.ink} />
      <Txt variant="small" color={danger ? c.danger : c.ink} style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.loading} accessibilityLabel={label}>
      <Mascot mood="curious" size={64} />
      <Txt variant="small" tone="soft" style={{ marginTop: space.sm }}>
        {label}
      </Txt>
    </View>
  );
}

// Placeholder cards that pulse while a list loads, so the layout does not jump.
export function Skeleton({ rows = 4, height = 112 }: { rows?: number; height?: number }) {
  const { c } = useTheme();
  const pulse = wave(useForever(1400));
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            height,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.surface,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
          }}
        />
      ))}
    </View>
  );
}

export function Avatar({ text, size = 40, highlight }: { text: string; size?: number; highlight?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: highlight ? c.tag : c.surfaceAlt,
        borderWidth: highlight ? 0 : 1,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: fonts.headBold, fontSize: size * 0.4, color: highlight ? c.tagInk : c.ink }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    overflow: 'hidden',
  },
  buttonSmall: { minHeight: 42, paddingHorizontal: space.lg, borderRadius: radius.md },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  buttonTextSmall: { fontFamily: fonts.bodyBold, fontSize: 14 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chip: {
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  chipCount: { fontFamily: fonts.bodyBold, fontSize: 13 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 3, borderWidth: 1 },
  thumb: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: radius.pill },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentText: { fontSize: 14 },
  inputWrap: { borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingHorizontal: 14, paddingVertical: 10, outlineWidth: 0 } as TextStyle,
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
});
