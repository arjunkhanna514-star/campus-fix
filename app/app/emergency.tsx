// Emergency help, following the MCAST "Emergency? Act fast." poster.
// Every number is one tap away (the phone's dialer opens with it filled in),
// and the app works out where you are on campus so you can say it clearly.

import { router, Stack } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Card, Icon, IconButton, PressableScale, Screen, Txt } from '@/src/components/ui';
import { haptics } from '@/src/haptics';
import { useT } from '@/src/i18n';
import { describe, useLiveLocation } from '@/src/location';
import { fonts, radius, space, useTheme } from '@/src/theme';

const RED = '#E5383B';

// Numbers exactly as printed on the MCAST emergency poster.
const NURSE = [
  { place: 'Paola', number: '+356 7771 1140', thisCampus: true },
  { place: 'Mosta', number: '+356 7771 1139' },
];
const SECURITY = [
  { place: 'Paola', number: '+356 7946 4636', thisCampus: true },
  { place: 'Mosta', number: '+356 7959 6464' },
  { place: 'Gozo', number: '+356 7772 2242' },
  { place: 'Qormi', number: '+356 7770 0094' },
];

function call(number: string) {
  haptics.impact();
  Linking.openURL(`tel:${number.replace(/\s/g, '')}`).catch(() => {});
}

export default function EmergencyScreen() {
  const { c } = useTheme();
  const t = useT();
  const live = useLiveLocation(true);
  const where = describe(live);
  const gps = live.lat !== undefined && live.lng !== undefined ? `${live.lat.toFixed(5)}, ${live.lng.toFixed(5)}` : null;

  const shareLocation = () => {
    haptics.tap();
    const lines = [
      'Emergency at MCAST Paola campus.',
      live.status === 'live' ? `I am at: ${where}.` : 'I am on the MCAST Paola campus.',
      gps ? `GPS: ${gps} (https://maps.google.com/?q=${live.lat},${live.lng})` : null,
      'What happened: ',
    ].filter(Boolean);
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ animation: 'slide_from_bottom' }} />
      <View style={styles.header}>
        <IconButton name="close" label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} glass />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 2 }}>
          <Txt variant="display" color={RED} style={{ fontSize: 40, lineHeight: 44 }} accessibilityRole="header">
            {t('em.title1')}
          </Txt>
          <Txt variant="display" style={{ fontSize: 40, lineHeight: 44 }}>
            {t('em.title2')}
          </Txt>
          <Txt tone="soft" style={{ marginTop: space.xs }}>
            {t('em.sub')}
          </Txt>
        </View>

        <PressableScale onPress={() => call('112')} feedback="none" accessibilityRole="button" accessibilityLabel="Call 112, emergency services" style={[styles.big, { backgroundColor: RED }]}>
          <Icon name="phone" size={28} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Txt variant="title" color="#FFFFFF">
              {t('em.call112')}
            </Txt>
            <Txt variant="small" color="rgba(255,255,255,0.85)">
              {t('em.call112Sub')}
            </Txt>
          </View>
          <Icon name="chevron-right" size={26} color="#FFFFFF" />
        </PressableScale>

        <Card style={{ gap: space.sm }}>
          <View style={styles.row}>
            <Icon name="crosshairs-gps" size={20} color={c.inkSoft} />
            <Txt variant="small" tone="soft">
              {t('em.yourLocation')}
            </Txt>
          </View>
          <Txt variant="bodyBold">
            {live.status === 'live'
              ? where
              : live.status === 'denied'
                ? t('em.locOff')
                : live.status === 'unavailable'
                  ? t('em.locNone')
                  : t('em.finding')}
          </Txt>
          {gps ? (
            <Txt variant="micro" tone="faint">
              GPS {gps}
            </Txt>
          ) : null}
          <PressableScale onPress={shareLocation} accessibilityRole="button" style={[styles.share, { borderColor: c.lineStrong, backgroundColor: c.surface }]}>
            <Icon name="share-variant" size={18} />
            <Txt variant="bodyBold">{t('em.share')}</Txt>
          </PressableScale>
        </Card>

        <Step n={1} icon="account-heart-outline" title={t('em.step1')} detail={t('em.step1d')} />

        <Step n={2} icon="phone-in-talk-outline" title={t('em.step2')} detail={t('em.step2d')}>
          <NumberRow label={t('em.emergencyLabel')} number="112" onCall={() => call('112')} highlight />
        </Step>

        <Step n={3} icon="medical-bag" title={t('em.step3')}>
          {NURSE.map((n) => (
            <NumberRow key={n.place} label={n.place} number={n.number} note={n.thisCampus ? t('em.thisCampus') : undefined} onCall={() => call(n.number)} highlight={n.thisCampus} />
          ))}
        </Step>

        <Step n={4} icon="shield-check-outline" title={t('em.step4')}>
          {SECURITY.map((n) => (
            <NumberRow key={n.place} label={n.place} number={n.number} note={n.thisCampus ? t('em.thisCampus') : undefined} onCall={() => call(n.number)} highlight={n.thisCampus} />
          ))}
        </Step>

        <Step n={5} icon="map-marker-outline" title={t('em.step5')} detail={t('em.step5d')} />

        <Card style={{ gap: space.sm }}>
          <Txt variant="title">{t('em.spot')}</Txt>
          <Txt tone="soft">{t('em.spotBody')}</Txt>
          <PressableScale onPress={() => router.navigate('/report')} accessibilityRole="button" style={[styles.share, { borderColor: c.lineStrong, backgroundColor: c.surface }]}>
            <Icon name="flag-outline" size={18} />
            <Txt variant="bodyBold">{t('em.report')}</Txt>
          </PressableScale>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Step({ n, icon, title, detail, children }: { n: number; icon: string; title: string; detail?: string; children?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.stepHead}>
        <Txt variant="display" color={RED} style={{ width: 28, fontSize: 30 }}>
          {n}
        </Txt>
        <View style={[styles.stepIcon, { backgroundColor: c.surfaceAlt }]}>
          <Icon name={icon} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="heading">{title}</Txt>
          {detail ? (
            <Txt variant="small" tone="soft">
              {detail}
            </Txt>
          ) : null}
        </View>
      </View>
      {children ? <View style={{ gap: space.sm }}>{children}</View> : null}
    </Card>
  );
}

function NumberRow({ label, number, note, onCall, highlight }: { label: string; number: string; note?: string; onCall: () => void; highlight?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onCall}
      feedback="none"
      accessibilityRole="button"
      accessibilityLabel={`Call ${label}, ${number}`}
      style={[styles.number, { backgroundColor: highlight ? 'rgba(229,56,59,0.14)' : c.surface, borderColor: highlight ? 'rgba(229,56,59,0.45)' : c.line }]}>
      <View style={{ flex: 1 }}>
        <Txt variant="small" tone="soft">
          {label}
          {note ? `, ${note}` : ''}
        </Txt>
        <Txt variant="number" style={{ fontFamily: fonts.headBold }}>
          {number}
        </Txt>
      </View>
      <View style={[styles.callDot, { backgroundColor: highlight ? RED : c.tag }]}>
        <Icon name="phone" size={18} color={highlight ? '#FFFFFF' : c.tagInk} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.md, paddingTop: space.xs },
  content: { padding: space.lg, paddingTop: 0, paddingBottom: space.xxl, gap: space.lg },
  big: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 46, borderRadius: radius.pill, borderWidth: 1, marginTop: space.xs },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  number: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md },
  callDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
