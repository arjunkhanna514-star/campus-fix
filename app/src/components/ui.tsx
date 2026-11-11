// The small building blocks every screen is made from: text, buttons,
// chips, inputs and the page frame. Keeping them here keeps the look consistent.

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  ColorValue,
  Pressable,
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
import { fonts, MAX_WIDTH, radius, space, useTheme } from '../theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName | string; size?: number; color?: ColorValue | null }) {
  const { c } = useTheme();
  return <MaterialCommunityIcons name={name as IconName} size={size} color={(color ?? c.ink) as string} />;
}

// ---------- text ----------
const TYPE = {
  display: { fontFamily: fonts.headBold, fontSize: 30, lineHeight: 34 },
  title: { fontFamily: fonts.headBold, fontSize: 23, lineHeight: 28 },
  heading: { fontFamily: fonts.head, fontSize: 18, lineHeight: 23 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
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
// Keeps content inside the safe area and centred at a readable width on tablets and laptops.
export function Screen({ children, edges = ['top'] }: { children: React.ReactNode; edges?: ('top' | 'bottom')[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        <View style={styles.frame}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
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
  const colours = {
    primary: { bg: c.tag, pressed: c.tagPressed, fg: c.tagInk, border: c.tag },
    outline: { bg: 'transparent', pressed: c.surfaceAlt, fg: c.ink, border: c.ink },
    quiet: { bg: 'transparent', pressed: c.surfaceAlt, fg: c.ink, border: 'transparent' },
    danger: { bg: 'transparent', pressed: c.dangerSoft, fg: c.danger, border: c.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: pressed ? colours.pressed : colours.bg, borderColor: colours.border, opacity: off ? 0.5 : 1 },
        style,
      ]}>
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
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, color }: { name: IconName; onPress: () => void; label: string; color?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? c.surfaceAlt : 'transparent' }]}>
      <Icon name={name} size={22} color={color ?? c.ink} />
    </Pressable>
  );
}

// ---------- chips and segmented control ----------
type ChipProps = { label: string; selected?: boolean; onPress?: () => void; icon?: IconName | string; count?: number };

export function Chip({ label, selected, onPress, icon, count }: ChipProps) {
  const { c } = useTheme();
  const fg = selected ? c.bg : c.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.ink : pressed ? c.surfaceAlt : c.surface, borderColor: selected ? c.ink : c.line },
      ]}>
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
      {count === undefined ? null : <Text style={[styles.chipCount, { color: selected ? c.bg : c.inkFaint }]}>{count}</Text>}
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: c.surface, borderColor: c.line }]}>
            <Text style={[styles.segmentText, { color: active ? c.ink : c.inkSoft, fontFamily: active ? fonts.bodyBold : fonts.bodyMedium }]} numberOfLines={1}>
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
          { backgroundColor: c.surface, borderColor: error ? c.danger : focused ? c.ink : c.line, borderWidth: focused || error ? 2 : 1 },
          multiline && { alignItems: 'flex-start' },
        ]}>
        <TextInput
          {...rest}
          multiline={multiline}
          accessibilityLabel={label}
          placeholderTextColor={c.inkFaint}
          selectionColor={c.tagPressed}
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
export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
        <Icon name={icon} size={26} color={c.inkSoft} />
      </View>
      <Txt variant="heading" style={{ textAlign: 'center' }}>
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
    <View style={[styles.notice, { backgroundColor: danger ? c.dangerSoft : c.tagSoft }]} accessibilityRole="alert">
      <Icon name={danger ? 'alert-circle-outline' : 'information-outline'} size={18} color={danger ? c.danger : c.ink} />
      <Txt variant="small" color={danger ? c.danger : c.ink} style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={c.inkSoft} />
    </View>
  );
}

export function Avatar({ text, size = 40, highlight }: { text: string; size?: number; highlight?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: highlight ? c.tag : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.headBold, fontSize: size * 0.4, color: highlight ? c.tagInk : c.ink }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.sm },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 16 },
  buttonTextSmall: { fontFamily: fonts.bodyBold, fontSize: 14 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  chipCount: { fontFamily: fonts.bodyBold, fontSize: 13 },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm + 1, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 6 },
  segmentText: { fontSize: 14 },
  inputWrap: { borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', minHeight: 50 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingHorizontal: 14, paddingVertical: 10, outlineWidth: 0 } as TextStyle,
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
});
