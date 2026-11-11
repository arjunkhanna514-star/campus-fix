// Home: the first screen for students and admins. Live weather at MCAST
// with Tag dressed for it, quick actions, emergency help, the app tour,
// and what is happening on campus right now.

import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { BrandRow } from '@/src/components/Brand';
import { IssueCard } from '@/src/components/IssueCard';
import { LanguageButton, LanguageSheet } from '@/src/components/LanguagePicker';
import { HealthCard } from '@/src/components/Progress';
import { Card, Icon, PressableScale, Screen, Skeleton, Txt } from '@/src/components/ui';
import { WeatherAvatar } from '@/src/components/WeatherAvatar';
import { WeatherEffects } from '@/src/components/WeatherEffects';
import { haptics } from '@/src/haptics';
import { useT } from '@/src/i18n';
import { useSession } from '@/src/session';
import { getItem } from '@/src/storage';
import { fonts, MAX_WIDTH, radius, space, TAB_CLEARANCE, useTheme } from '@/src/theme';
import { AdminStats, CampusHealth, Issue } from '@/src/types';
import { SEASONS, useWeather, WEATHER_ICON, WEATHER_KINDS, WeatherKind } from '@/src/weather';

const RED = '#E5383B';

const CARD_BG: Record<WeatherKind, [string, string]> = {
  clear: ['#3B2F1F', '#16171B'],
  partly: ['#2E2B25', '#16171B'],
  cloudy: ['#2B2E34', '#17181C'],
  fog: ['#31333A', '#1B1C21'],
  drizzle: ['#202835', '#15171B'],
  rain: ['#1A2534', '#111318'],
  storm: ['#1D1729', '#0E0F14'],
  snow: ['#2C3543', '#171A20'],
  wind: ['#272B31', '#16181C'],
  night: ['#141B35', '#0B0D15'],
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { me } = useSession();
  const { c } = useTheme();
  const t = useT();
  const weather = useWeather();
  const isAdmin = user?.role === 'admin';
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((Math.min(width, MAX_WIDTH) - space.lg * 2 - space.sm * 2) / 3) - 1;

  const [latest, setLatest] = useState<Issue[] | null>(null);
  const [health, setHealth] = useState<CampusHealth | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [tourSeen, setTourSeen] = useState(true);

  const load = useCallback(async () => {
    try {
      const [list, campus, numbers] = await Promise.all([
        api<Issue[]>('/issues?sort=newest'),
        api<CampusHealth>('/campus-health'),
        isAdmin ? api<AdminStats>('/admin/stats') : Promise.resolve(null),
      ]);
      setLatest(list.slice(0, 3));
      setHealth(campus);
      setStats(numbers);
    } catch {
      setLatest((old) => old ?? []);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
      getItem('tour_seen').then((v) => setTourSeen(v === '1'));
    }, [load])
  );

  const pull = async () => {
    setRefreshing(true);
    weather.refresh();
    await load();
    setRefreshing(false);
  };

  const hour = new Date().getHours();
  const first = (user?.name ?? '').split(' ')[0];
  const greeting = t(hour < 12 ? 'home.morning' : hour < 18 ? 'home.afternoon' : 'home.evening', { name: first });

  const actions = isAdmin
    ? [
        { icon: 'clipboard-check-outline', label: t('home.manageReports'), go: () => router.navigate('/admin') },
        { icon: 'format-list-bulleted', label: t('home.allIssues'), go: () => router.navigate('/issues') },
        { icon: 'map-outline', label: t('home.campusMap'), go: () => router.navigate('/map') },
        { icon: 'phone-alert', label: t('common.emergency'), go: () => router.push('/emergency'), danger: true },
        { icon: 'play-circle-outline', label: t('home.tour'), go: () => router.push('/tour') },
        { icon: 'translate', label: t('common.language'), go: () => setLangOpen(true) },
      ]
    : [
        { icon: 'plus-thick', label: t('home.reportProblem'), go: () => router.navigate('/report'), primary: true },
        { icon: 'format-list-bulleted', label: t('home.allIssues'), go: () => router.navigate('/issues') },
        { icon: 'map-outline', label: t('home.campusMap'), go: () => router.navigate('/map') },
        { icon: 'trophy-outline', label: t('home.ranks'), go: () => router.navigate('/leaderboard') },
        { icon: 'phone-alert', label: t('common.emergency'), go: () => router.push('/emergency'), danger: true },
        { icon: 'play-circle-outline', label: t('home.tour'), go: () => router.push('/tour') },
      ];

  const sourceText = weather.source === 'live' ? t('home.liveWeather') : weather.source === 'season' ? t('home.seasonWeather') : t('home.preview');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={c.inkSoft} colors={[c.ink]} />}>
        <View style={styles.topRow}>
          <BrandRow compact={width < 440} />
          <View style={{ flex: 1 }} />
          <PressableScale
            onPress={() => router.push('/share')}
            accessibilityRole="button"
            accessibilityLabel={t('share.row')}
            style={[styles.iconPill, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Icon name="qrcode" size={18} />
          </PressableScale>
          <LanguageButton />
          <Pressable
            onPress={() => router.push('/emergency')}
            accessibilityRole="button"
            accessibilityLabel={t('common.emergency')}
            style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? '#B92B2E' : RED }]}>
            <Icon name="phone-alert" size={16} color="#FFFFFF" />
            <Txt variant="small" color="#FFFFFF" style={{ fontFamily: fonts.headBold }}>
              SOS
            </Txt>
          </Pressable>
        </View>

        <View style={{ gap: 2 }}>
          <Txt variant="title" accessibilityRole="header">
            {greeting}
          </Txt>
          <Txt tone="soft">{isAdmin ? t('home.adminLine') : t('home.studentLine')}</Txt>
        </View>

        {/* weather */}
        <View style={[styles.weather, { borderColor: c.lineStrong }]} testID="weather-card">
          <LinearGradient colors={CARD_BG[weather.kind]} style={StyleSheet.absoluteFill} />
          <WeatherEffects kind={weather.kind} season={weather.season} density={0.75} compact tint={false} />
          <View style={styles.weatherRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="small" color="rgba(255,255,255,0.75)">
                {t('home.weatherAt')}
              </Txt>
              <Txt variant="display" color="#FFFFFF" style={{ fontSize: 52, lineHeight: 58 }}>
                {weather.temperature !== null ? `${weather.temperature}°` : '--°'}
              </Txt>
              <Txt variant="heading" color="#FFFFFF" testID="weather-name">
                {t(`weather.${weather.kind}`)}
              </Txt>
              <Txt variant="small" color="rgba(255,255,255,0.75)">
                {t(`season.${weather.season}`)}
                {weather.wind !== null ? `, ${t('home.wind', { speed: weather.wind })}` : ''}
              </Txt>
            </View>
            <WeatherAvatar kind={weather.kind} season={weather.season} size={128} />
          </View>
          <View style={styles.bubble}>
            <Txt variant="small" color="#0A0A0B">
              {t(`tip.${weather.kind}`)}
            </Txt>
          </View>
          <View style={styles.sourceRow}>
            <View style={[styles.dot, { backgroundColor: weather.source === 'live' ? '#6FD08C' : weather.source === 'preview' ? '#FFD27A' : '#9AA0AA' }]} />
            <Txt variant="micro" color="rgba(255,255,255,0.75)" style={{ flex: 1 }}>
              {sourceText}
            </Txt>
            <PressableScale
              onPress={() => setPreviewOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityLabel={t('home.preview')}
              accessibilityState={{ expanded: previewOpen }}
              style={styles.previewBtn}>
              <Icon name="tune-variant" size={16} color="#FFFFFF" />
              <Txt variant="micro" color="#FFFFFF">
                {t('home.preview')}
              </Txt>
            </PressableScale>
          </View>
          {previewOpen ? (
            <View style={{ gap: space.sm }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
                <PreviewChip label={t('home.live')} icon="broadcast" selected={!weather.previewKind} onPress={() => weather.setPreview(null)} />
                {WEATHER_KINDS.map((k) => (
                  <PreviewChip key={k} label={t(`weather.${k}`)} icon={WEATHER_ICON[k]} selected={weather.previewKind === k} onPress={() => weather.setPreview(k)} />
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
                {SEASONS.map((s) => (
                  <PreviewChip
                    key={s}
                    label={t(`season.${s}`)}
                    icon={s === 'spring' ? 'flower-outline' : s === 'summer' ? 'white-balance-sunny' : s === 'autumn' ? 'leaf' : 'snowflake'}
                    selected={weather.previewSeason === s}
                    onPress={() => weather.setPreviewSeason(weather.previewSeason === s ? null : s)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {!tourSeen ? (
          <PressableScale onPress={() => router.push('/tour')} accessibilityRole="button" style={[styles.tourBanner, { backgroundColor: c.tag }]}>
            <View style={[styles.tourIcon, { backgroundColor: c.tagInk }]}>
              <Icon name="play" size={20} color={c.tag} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyBold" color={c.tagInk}>
                {t('home.tourTitle')}
              </Txt>
              <Txt variant="small" color={c.tagInk}>
                {t('home.tourBody')}
              </Txt>
            </View>
            <Icon name="chevron-right" size={22} color={c.tagInk} />
          </PressableScale>
        ) : null}

        {/* quick actions */}
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">{t('home.quick')}</Txt>
          <View style={styles.grid}>
            {actions.map((a) => (
              <PressableScale
                key={a.label}
                onPress={() => {
                  haptics.tap();
                  a.go();
                }}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={[
                  styles.tile,
                  { width: tileWidth },
                  width < 380 && { padding: 10 },
                  {
                    backgroundColor: a.primary ? c.tag : a.danger ? 'rgba(229,56,59,0.14)' : c.surface,
                    borderColor: a.primary ? c.tag : a.danger ? 'rgba(229,56,59,0.45)' : c.line,
                  },
                ]}>
                <View style={[styles.tileIcon, { backgroundColor: a.primary ? c.tagInk : a.danger ? RED : c.surfaceAlt }]}>
                  <Icon name={a.icon} size={20} color={a.primary ? c.tag : a.danger ? '#FFFFFF' : c.ink} />
                </View>
                <Txt variant="small" color={a.primary ? c.tagInk : c.ink} numberOfLines={2} style={[{ fontFamily: fonts.bodyBold }, width < 380 && { fontSize: 12.5, lineHeight: 16 }]}>
                  {a.label}
                </Txt>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* admin: open reports per department; student: points */}
        {isAdmin && stats ? (
          <Card style={{ gap: space.sm }}>
            <Txt variant="heading">{t('home.departments')}</Txt>
            {stats.byDepartment.map((d) => (
              <PressableScale
                key={d.id}
                onPress={() => router.navigate({ pathname: '/admin', params: { department: String(d.id) } })}
                accessibilityRole="button"
                accessibilityLabel={`${t(`dept.${d.name}`)}, ${d.open}`}
                style={[styles.deptRow, { borderColor: c.line }]}>
                <View style={[styles.deptIcon, { backgroundColor: c.surfaceAlt }]}>
                  <Icon name={d.icon} size={18} />
                </View>
                <Txt variant="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
                  {t(`dept.${d.name}`)}
                </Txt>
                <Txt variant="number" tone={d.open ? 'ink' : 'faint'}>
                  {d.open}
                </Txt>
                <Icon name="chevron-right" size={20} color={c.inkFaint} />
              </PressableScale>
            ))}
          </Card>
        ) : null}
        {!isAdmin && me ? (
          <PressableScale onPress={() => router.navigate('/profile')} accessibilityRole="button" style={[styles.points, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Icon name="star-four-points" size={22} />
            <View style={{ flex: 1 }}>
              <Txt variant="small" tone="soft">
                {t('home.yourPoints')}
              </Txt>
              <Txt variant="bodyBold">{me.level.name}</Txt>
            </View>
            <Txt variant="display" style={{ fontSize: 30, lineHeight: 34 }}>
              {me.points}
            </Txt>
          </PressableScale>
        ) : null}

        {health ? <HealthCard health={health} /> : null}

        <View style={{ gap: space.md }}>
          <View style={styles.sectionHead}>
            <Txt variant="heading">{t('home.latest')}</Txt>
            <Pressable onPress={() => router.navigate('/issues')} accessibilityRole="button" hitSlop={10}>
              <Txt variant="small" tone="soft">
                {t('common.seeAll')}
              </Txt>
            </Pressable>
          </View>
          {latest === null ? <Skeleton rows={2} /> : latest.map((issue) => <IssueCard key={issue.id} issue={issue} onChange={(u) => setLatest((l) => l?.map((x) => (x.id === u.id ? u : x)) ?? null)} />)}
        </View>
      </ScrollView>
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    </Screen>
  );
}

function PreviewChip({ label, icon, selected, onPress }: { label: string; icon: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      feedback="select"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.previewChip, { backgroundColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.10)', borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.22)' }]}>
      <Icon name={icon} size={15} color={selected ? '#0A0A0B' : '#FFFFFF'} />
      <Txt variant="micro" color={selected ? '#0A0A0B' : '#FFFFFF'}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: TAB_CLEARANCE, gap: space.lg, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill },
  iconPill: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  weather: { borderRadius: 28, borderWidth: 1, padding: space.lg, gap: space.md, overflow: 'hidden', minHeight: 260 },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  previewChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 32, borderRadius: radius.pill, borderWidth: 1 },
  tourBanner: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg },
  tourIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { minHeight: 96, borderRadius: radius.lg, borderWidth: 1, padding: space.md, gap: space.sm, justifyContent: 'space-between' },
  tileIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderTopWidth: 1 },
  deptIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  points: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
