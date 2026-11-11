// "How to use Campus Fix": a step-by-step tour for students and admins.
// Each step shows an animated finger tapping the real button for that
// feature, with a "Try it" button that takes you there. "Listen" reads
// every step aloud (preferring a male voice in the chosen language) and
// moves on by itself when each step has been read.

import * as Speech from 'expo-speech';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';

import { Mascot } from '@/src/components/Mascot';
import { Button, Icon, IconButton, PressableScale, Screen, Txt } from '@/src/components/ui';
import { useAuth } from '@/src/auth';
import { haptics } from '@/src/haptics';
import { useI18n } from '@/src/i18n';
import { setItem } from '@/src/storage';
import { useToast } from '@/src/toast';
import { fonts, radius, space, useTheme } from '@/src/theme';
import { useForever } from '@/src/motion';

type Step = { key: string; icon: string; demo: string; href?: string; danger?: boolean };

const STUDENT: Step[] = [
  { key: 'welcome', icon: 'hand-wave-outline', demo: 'tour.listen' },
  { key: 'home', icon: 'home-variant-outline', demo: 'tab.home', href: '/' },
  { key: 'report', icon: 'plus-thick', demo: 'tab.report', href: '/report' },
  { key: 'issues', icon: 'arrow-up-bold', demo: 'filter.department', href: '/issues' },
  { key: 'map', icon: 'map-marker-path', demo: 'map.directions', href: '/map' },
  { key: 'ranks', icon: 'trophy-outline', demo: 'tab.ranks', href: '/leaderboard' },
  { key: 'emergency', icon: 'phone-alert', demo: 'SOS', href: '/emergency', danger: true },
  { key: 'language', icon: 'translate', demo: 'common.language' },
];

const ADMIN: Step[] = [
  { key: 'welcome', icon: 'hand-wave-outline', demo: 'tour.listen' },
  { key: 'home', icon: 'home-variant-outline', demo: 'tab.home', href: '/' },
  { key: 'manage', icon: 'clipboard-check-outline', demo: 'filter.department', href: '/admin' },
  { key: 'issues', icon: 'format-list-bulleted', demo: 'tab.issues', href: '/issues' },
  { key: 'map', icon: 'map-marker-path', demo: 'map.directions', href: '/map' },
  { key: 'emergency', icon: 'phone-alert', demo: 'SOS', href: '/emergency', danger: true },
  { key: 'language', icon: 'translate', demo: 'common.language' },
];

// Voice names that are usually male on iPhone, Android and desktop browsers.
const MALE = /\b(male|man|daniel|alex|fred|aaron|arthur|gordon|oliver|david|mark|george|james|ryan|guy|rishi|thomas|luca|diego|jorge|reed|eddy|rocko|majed|maged|hemant|li-mu|yannick|markus|joana-no)\b|-(iol|iom|tpd|rjs|gbd|aud|tpc|iob)-/i;
const FEMALE = /female|woman/i;

type VoicePick = { id?: string; name?: string };

async function pickMaleVoice(locale: string): Promise<VoicePick> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const lang = locale.slice(0, 2).toLowerCase();
    const inLang = voices.filter((v) => (v.language || '').toLowerCase().replace('_', '-').startsWith(lang));
    const male = inLang.find((v) => MALE.test(`${v.name} ${v.identifier}`) && !FEMALE.test(`${v.name} ${v.identifier}`));
    if (male) return { id: male.identifier, name: male.name };
  } catch {
    // No voice list on this device: use the default voice with a lower pitch.
  }
  return {};
}

export default function TourScreen() {
  const { user } = useAuth();
  const { t, speechLocale } = useI18n();
  const { c } = useTheme();
  const { show } = useToast();
  const steps = user?.role === 'admin' ? ADMIN : STUDENT;
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState<VoicePick>({});
  const enter = useRef(new Animated.Value(0)).current;
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    pickMaleVoice(speechLocale).then(setVoice);
  }, [speechLocale]);

  // Slide each step in.
  useEffect(() => {
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
  }, [index, enter]);

  // Reading aloud. The first sentence starts inside the Listen tap itself, because
  // iPhone Safari only lets a page speak in direct response to a tap; each later
  // step starts when the previous one finishes. A phone with no voice "finishes"
  // instantly or reports an error: then the tour stops and says so, instead of
  // racing through the steps.
  const listeningRef = useRef(false);
  const spokenRef = useRef(-1);
  const speakStep = (i: number) => {
    const s2 = steps[i];
    const text = `${t(`tour.s.${s2.key}.t`)}. ${t(`tour.s.${s2.key}.b`)}`;
    const started = Date.now();
    spokenRef.current = i;
    Speech.stop();
    Speech.speak(text, {
      language: speechLocale,
      voice: voice.id,
      pitch: voice.id ? 1 : 0.8,
      rate: 0.96,
      onDone: () => {
        if (!listeningRef.current || spokenRef.current !== i) return;
        if (Date.now() - started < 600) return noVoice();
        if (i >= steps.length - 1) stopListening();
        else setTimeout(() => listeningRef.current && spokenRef.current === i && setIndex(i + 1), 500);
      },
      onError: () => noVoice(),
    });
  };
  const stopListening = () => {
    listeningRef.current = false;
    setListening(false);
    Speech.stop();
  };
  const noVoice = () => {
    if (!listeningRef.current) return;
    stopListening();
    show({ kind: 'info', title: t('tour.noVoice') });
  };
  const toggleListening = () => {
    if (listeningRef.current) return stopListening();
    listeningRef.current = true;
    setListening(true);
    speakStep(index);
  };
  // Moving to another step while listening (by itself or with Next) reads that step.
  useEffect(() => {
    if (listeningRef.current && spokenRef.current !== index) speakStep(index);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => void Speech.stop(), []);

  const finish = (href?: string) => {
    listeningRef.current = false;
    Speech.stop();
    setItem('tour_seen', '1');
    if (router.canGoBack()) router.back();
    if (href) setTimeout(() => router.navigate(href as never), 250);
    else if (!router.canGoBack()) router.replace('/');
  };

  const go = (next: number) => {
    haptics.tap();
    setIndex(Math.max(0, Math.min(steps.length - 1, next)));
  };

  const demoLabel = step.demo === 'SOS' ? 'SOS' : t(step.demo);

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ animation: 'slide_from_bottom' }} />
      <View style={styles.header}>
        <Txt variant="small" tone="soft" style={{ flex: 1 }}>
          {t('tour.step', { n: index + 1, total: steps.length })}
        </Txt>
        <PressableScale
          onPress={toggleListening}
          accessibilityRole="button"
          accessibilityLabel={listening ? t('tour.stop') : t('tour.listen')}
          style={[styles.listen, { backgroundColor: listening ? c.tag : c.surface, borderColor: listening ? c.tag : c.line }]}>
          <Icon name={listening ? 'stop' : 'account-voice'} size={18} color={listening ? c.tagInk : c.ink} />
          <Txt variant="small" color={listening ? c.tagInk : c.ink} style={{ fontFamily: fonts.bodyBold }}>
            {listening ? t('tour.stop') : t('tour.listen')}
          </Txt>
        </PressableScale>
        <IconButton name="close" label={t('common.close')} onPress={() => finish()} glass />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Txt variant="title" accessibilityRole="header">
          {t('tour.title')}
        </Txt>

        <Animated.View
          style={{
            gap: space.lg,
            opacity: enter,
            transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          }}>
          <View style={[styles.stage, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={{ position: 'absolute', left: space.md, bottom: space.sm }}>
              <Mascot mood={last ? 'proud' : listening ? 'curious' : 'happy'} size={64} />
            </View>
            <TapDemo key={step.key} icon={step.icon} label={demoLabel} danger={step.danger} />
            {listening ? <SoundWaves /> : null}
          </View>

          <View style={{ gap: space.sm }}>
            <Txt variant="title" style={{ fontSize: 26 }} testID="tour-step-title">
              {t(`tour.s.${step.key}.t`)}
            </Txt>
            <Txt style={{ fontSize: 17, lineHeight: 25 }}>{t(`tour.s.${step.key}.b`)}</Txt>
          </View>

          {step.href ? <Button label={t('tour.tryIt')} icon="gesture-tap" variant="outline" onPress={() => finish(step.href)} /> : null}
        </Animated.View>

        <View style={styles.dots}>
          {steps.map((s, i) => (
            <PressableScale key={s.key} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={t('tour.step', { n: i + 1, total: steps.length })} hitSlop={8}>
              <View style={[styles.dot, { width: i === index ? 22 : 8, backgroundColor: i === index ? c.ink : c.lineStrong }]} />
            </PressableScale>
          ))}
        </View>

        {voice.name ? (
          <Txt variant="micro" tone="faint" style={{ textAlign: 'center' }}>
            {voice.name}
          </Txt>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderColor: c.line }]}>
        <Button label={t('common.back')} variant="outline" disabled={index === 0} onPress={() => go(index - 1)} style={{ flex: 1 }} />
        <Button label={last ? t('tour.finish') : t('common.next')} icon={last ? 'check' : 'arrow-right'} onPress={() => (last ? finish() : go(index + 1))} style={{ flex: 1.4 }} />
      </View>
    </Screen>
  );
}

// A mock of the feature's button with a finger that taps it, again and again.
function TapDemo({ icon, label, danger }: { icon: string; label: string; danger?: boolean }) {
  const { c } = useTheme();
  const t = useForever(2400);

  const press = t.interpolate({ inputRange: [0, 0.38, 0.45, 0.55, 1], outputRange: [1, 1, 0.93, 1, 1] });
  const fingerY = t.interpolate({ inputRange: [0, 0.3, 0.42, 0.55, 0.8, 1], outputRange: [60, 18, 8, 18, 60, 60] });
  const fingerX = t.interpolate({ inputRange: [0, 0.3, 0.8, 1], outputRange: [50, 10, 50, 50] });
  const ring = t.interpolate({ inputRange: [0, 0.42, 0.75, 1], outputRange: [0, 0, 1, 1] });

  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <View style={[styles.featureIcon, { backgroundColor: danger ? '#E5383B' : c.tag }]}>
        <Icon name={icon} size={34} color={danger ? '#FFFFFF' : c.tagInk} />
      </View>
      <View>
        <Animated.View
          style={{
            position: 'absolute',
            left: -14,
            right: -14,
            top: -14,
            bottom: -14,
            borderRadius: radius.pill,
            borderWidth: 2,
            borderColor: danger ? '#E5383B' : c.ink,
            opacity: ring.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.8, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
          }}
        />
        <Animated.View style={[styles.mockButton, { backgroundColor: danger ? '#E5383B' : c.solidAlt, borderColor: c.lineStrong, transform: [{ scale: press }] }]}>
          <Txt variant="bodyBold" color={danger ? '#FFFFFF' : c.ink}>
            {label}
          </Txt>
        </Animated.View>
        <Animated.View style={{ position: 'absolute', right: -6, top: 14, transform: [{ translateY: fingerY }, { translateX: fingerX }] }}>
          <Icon name="hand-pointing-up" size={38} color="#FFFFFF" />
        </Animated.View>
      </View>
    </View>
  );
}

function SoundWaves() {
  const v = useForever(900, 0, true, Easing.inOut(Easing.sin));
  return (
    <View style={{ position: 'absolute', right: space.md, top: space.md, flexDirection: 'row', gap: 3, alignItems: 'center', height: 22 }}>
      {[0.4, 1, 0.6, 0.9, 0.5].map((h, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 20,
            borderRadius: 2,
            backgroundColor: '#FFFFFF',
            transform: [{ scaleY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [h * 0.4, h, h * 0.4] }) }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xs },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: radius.pill, borderWidth: 1 },
  content: { padding: space.lg, gap: space.xl },
  stage: { height: 240, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  featureIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  mockButton: { paddingHorizontal: 26, paddingVertical: 14, borderRadius: radius.pill, borderWidth: 1, minWidth: 150, alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', gap: space.sm, padding: space.lg, borderTopWidth: 1 },
});
