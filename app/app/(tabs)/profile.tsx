// The profile: level, points, badges, how points are earned, and the
// recent entries from the points ledger.

import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/src/auth';
import { BadgeList, LevelBar } from '@/src/components/Progress';
import { ServerStatus } from '@/src/components/ServerStatus';
import { Avatar, Button, Card, Icon, Loading, Screen, Txt } from '@/src/components/ui';
import { initials, ordinal, timeAgo } from '@/src/format';
import { LanguageSheet } from '@/src/components/LanguagePicker';
import { LANGUAGES, useI18n } from '@/src/i18n';
import { useSession } from '@/src/session';
import { space, TAB_CLEARANCE, useTheme } from '@/src/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { t, lang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const { me, meta, refreshMe } = useSession();
  const { c, status } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshMe();
    }, [refreshMe])
  );

  const pullToRefresh = async () => {
    setRefreshing(true);
    await refreshMe();
    setRefreshing(false);
  };

  if (!user) return null;
  const isAdmin = user.role === 'admin';
  const earnedCount = me ? me.badges.filter((badge) => badge.earned).length : 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={c.inkSoft} colors={[c.ink]} />}>
        <View style={styles.identity}>
          <Avatar text={initials(user.name)} size={60} highlight />
          <View style={{ flex: 1 }}>
            <Txt variant="title" accessibilityRole="header" numberOfLines={1}>
              {user.name}
            </Txt>
            <Txt variant="small" tone="soft" numberOfLines={1}>
              {isAdmin ? 'Administrator' : 'Student'}, {user.email}
            </Txt>
          </View>
        </View>

        {isAdmin ? (
          <Card style={{ gap: space.sm }}>
            <Txt variant="heading">You manage reports</Txt>
            <Txt tone="soft">Open the Manage tab to see what students need most and move each report through its four steps. Admin accounts do not report, upvote or earn points.</Txt>
            <Button label="Open Manage" icon="clipboard-check-outline" variant="outline" small onPress={() => router.push('/admin')} style={{ alignSelf: 'flex-start', marginTop: space.xs }} />
          </Card>
        ) : !me ? (
          <Loading />
        ) : (
          <>
            <Card style={{ gap: space.md }}>
              <View style={styles.levelTop}>
                <View style={{ flex: 1 }}>
                  <Txt variant="small" tone="soft">
                    Level {me.level.index + 1} of {meta?.levels.length ?? 5}
                  </Txt>
                  <Txt variant="display">{me.level.name}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="display">{me.points}</Txt>
                  <Txt variant="micro" tone="faint">
                    points
                  </Txt>
                </View>
              </View>
              <LevelBar level={me.level} points={me.points} />
              <Txt variant="small" tone="soft">
                {me.level.nextName ? `${me.level.pointsToNext} more ${me.level.pointsToNext === 1 ? 'point' : 'points'} to become a ${me.level.nextName}.` : 'You have reached the top level.'}
                {me.rank ? ` You are ${ordinal(me.rank)} on campus.` : ''}
              </Txt>
            </Card>

            <View style={styles.stats}>
              <Stat value={me.stats.reports} label="Reports" />
              <Stat value={me.stats.resolved} label="Got fixed" />
              <Stat value={me.stats.upvotesGiven} label="Upvotes given" />
            </View>

            <View style={{ gap: space.md }}>
              <View style={styles.sectionHead}>
                <Txt variant="heading" accessibilityRole="header">
                  Badges
                </Txt>
                <Txt variant="small" tone="soft">
                  {earnedCount} of {me.badges.length} earned
                </Txt>
              </View>
              <BadgeList badges={me.badges} />
            </View>

            <Card style={{ gap: space.md }}>
              <Pressable onPress={() => setRulesOpen((open) => !open)} accessibilityRole="button" accessibilityState={{ expanded: rulesOpen }} style={styles.sectionHead} hitSlop={8}>
                <Txt variant="heading">How points work</Txt>
                <Icon name={rulesOpen ? 'chevron-up' : 'chevron-down'} size={22} />
              </Pressable>
              {rulesOpen ? (
                <View style={{ gap: space.sm }}>
                  {(meta?.pointRules ?? []).map((rule) => (
                    <View key={rule.label} style={styles.rule}>
                      <Txt style={{ flex: 1 }}>{rule.label}</Txt>
                      <Txt variant="number">+{rule.amount}</Txt>
                    </View>
                  ))}
                  <Txt variant="small" tone="soft">
                    Most points arrive only after staff confirm a report is real, so careful reports beat lots of reports. Withdrawing an upvote takes its points back.
                  </Txt>
                </View>
              ) : null}
            </Card>

            <View style={{ gap: space.md }}>
              <Txt variant="heading" accessibilityRole="header">
                Recent activity
              </Txt>
              {me.events.length === 0 ? (
                <Txt tone="soft">Nothing yet. Your first report or upvote will show up here.</Txt>
              ) : (
                <Card style={{ padding: 0 }}>
                  {me.events.map((event, index) => (
                    <Pressable
                      key={event.id}
                      onPress={() => event.issue_id && router.push(`/issue/${event.issue_id}`)}
                      disabled={!event.issue_id}
                      accessibilityRole={event.issue_id ? 'button' : undefined}
                      style={[styles.event, index > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}>
                      <Txt variant="number" color={event.amount >= 0 ? status.Resolved.fg : c.danger} style={{ width: 44 }}>
                        {event.amount >= 0 ? `+${event.amount}` : event.amount}
                      </Txt>
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyBold">{event.reason}</Txt>
                        <Txt variant="small" tone="soft" numberOfLines={1}>
                          {event.issue_title ? `${event.issue_title}, ` : ''}
                          {timeAgo(event.created_at)}
                        </Txt>
                      </View>
                    </Pressable>
                  ))}
                </Card>
              )}
            </View>
          </>
        )}

        <Card style={{ gap: space.md }}>
          <Txt variant="heading">Connection</Txt>
          <ServerStatus />
        </Card>

        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          <SettingRow icon="translate" label={t('common.language')} value={LANGUAGES.find((l) => l.code === lang)?.name} onPress={() => setLangOpen(true)} />
          <SettingRow icon="play-circle-outline" label={t('home.tour')} onPress={() => router.push('/tour')} />
          <SettingRow icon="qrcode" label={t('share.row')} onPress={() => router.push('/share')} />
          <SettingRow icon="phone-alert" label={t('common.emergency')} onPress={() => router.push('/emergency')} />
        </Card>

        <Button label="Log out" icon="logout" variant="danger" onPress={logout} />
      </ScrollView>
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card style={{ flex: 1, padding: space.md, gap: 0 }}>
      <Txt variant="display">{value}</Txt>
      <Txt variant="small" tone="soft">
        {label}
      </Txt>
    </Card>
  );
}

function SettingRow({ icon, label, value, onPress }: { icon: string; label: string; value?: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={20} color={c.inkSoft} />
      <Txt variant="bodyBold" style={{ flex: 1 }}>
        {label}
      </Txt>
      {value ? (
        <Txt variant="small" tone="soft">
          {value}
        </Txt>
      ) : null}
      <Icon name="chevron-right" size={20} color={c.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: TAB_CLEARANCE, gap: space.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  levelTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  stats: { flexDirection: 'row', gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg },
});
