// Admin only. Shows the numbers, then the queue of reports grouped by the
// department that fixes them (IT, Estates, Cleaning, Health & Safety,
// Student Services), most upvoted first. Each card has a one-tap "next step".

import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { api, errorMessage } from '@/src/api';
import { useAuth } from '@/src/auth';
import { IssueCard } from '@/src/components/IssueCard';
import { STATUS_ICON, STATUS_LABEL } from '@/src/components/StatusChip';
import { Button, Card, Chip, EmptyState, Icon, Notice, Screen, Skeleton, Txt } from '@/src/components/ui';
import { radius, space, TAB_CLEARANCE, useTheme } from '@/src/theme';
import { useT } from '@/src/i18n';
import { useToast } from '@/src/toast';
import { AdminStats, Issue, NEXT_STATUS, Status, STATUSES } from '@/src/types';

type Filter = 'Open' | Status;
const REFRESH_MS = 10000;

export default function AdminScreen() {
  const { user } = useAuth();
  const { c, status: statusColours } = useTheme();
  const { show } = useToast();
  const { width } = useWindowDimensions();
  const narrow = width < 480; // phones: show the four numbers as a 2 x 2 grid

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [filter, setFilter] = useState<Filter>('Open');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const t = useT();
  const params = useLocalSearchParams<{ department?: string }>();
  const [department, setDepartment] = useState<number | null>(null);
  useEffect(() => {
    if (params.department) setDepartment(Number(params.department));
  }, [params.department]);

  const load = useCallback(async () => {
    try {
      const [numbers, list] = await Promise.all([api<AdminStats>('/admin/stats'), api<Issue[]>('/issues?sort=trending')]);
      setStats(numbers);
      setIssues(list);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin') return <Redirect href="/" />;

  const pullToRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const advance = async (issue: Issue) => {
    const next = NEXT_STATUS[issue.status];
    if (!next) return;
    setSavingId(issue.id);
    try {
      await api(`/admin/issues/${issue.id}/status`, { method: 'PATCH', body: { status: next } });
      await load();
      show({ kind: 'info', title: `Marked as ${STATUS_LABEL[next].toLowerCase()}`, body: issue.title });
    } catch (err) {
      show({ kind: 'error', title: errorMessage(err) });
      load();
    } finally {
      setSavingId(null);
    }
  };

  const visible = (issues ?? [])
    .filter((issue) => (filter === 'Open' ? issue.status !== 'Resolved' : issue.status === filter))
    .filter((issue) => !department || issue.department?.id === department);

  // With no department chosen, list the reports under a heading per department.
  type Row = { kind: 'head'; id: number; name: string; icon: string; count: number } | { kind: 'issue'; issue: Issue };
  const rows: Row[] = [];
  if (department) visible.forEach((issue) => rows.push({ kind: 'issue', issue }));
  else
    for (const d of stats?.byDepartment ?? []) {
      const mine = visible.filter((issue) => issue.department?.id === d.id);
      if (!mine.length) continue;
      rows.push({ kind: 'head', id: d.id, name: d.name, icon: d.icon, count: mine.length });
      mine.forEach((issue) => rows.push({ kind: 'issue', issue }));
    }
  const replaceIssue = (updated: Issue) => setIssues((list) => list?.map((item) => (item.id === updated.id ? updated : item)) ?? null);

  const header = (
    <View style={{ gap: space.lg, paddingBottom: space.md }}>
      <View style={{ gap: space.xs }}>
        <Txt variant="title" accessibilityRole="header">
          {t('admin.title')}
        </Txt>
        <Txt tone="soft">{t('admin.sub')}</Txt>
      </View>

      {error ? <Notice text={error} /> : null}

      {stats ? (
        <>
          <View style={styles.statGrid}>
            {STATUSES.map((status) => (
              <Pressable
                key={status}
                onPress={() => setFilter(filter === status ? 'Open' : status)}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === status }}
                accessibilityLabel={`${stats.byStatus[status]} ${STATUS_LABEL[status]}. Show only these.`}
                style={[styles.stat, narrow ? { flexBasis: '47%', flexGrow: 1 } : { flex: 1 }, { backgroundColor: c.surface, borderColor: filter === status ? c.ink : c.line, borderWidth: filter === status ? 2 : 1 }]}>
                <View style={styles.statTop}>
                  <Icon name={STATUS_ICON[status]} size={17} color={statusColours[status].fg} />
                  <Txt variant="display" style={{ fontSize: 26, lineHeight: 30 }}>
                    {stats.byStatus[status]}
                  </Txt>
                </View>
                <Txt variant="small" tone="soft" numberOfLines={1}>
                  {STATUS_LABEL[status]}
                </Txt>
              </Pressable>
            ))}
          </View>

          <Card style={{ gap: space.sm }}>
            <InfoLine icon="timer-sand" text={stats.avgResolveHours === null ? 'No report has been resolved yet.' : `Reports take about ${formatHours(stats.avgResolveHours)} from reported to resolved.`} />
            {stats.byCategory[0] ? (
              <InfoLine icon={stats.byCategory[0].icon} text={`Most open reports: ${stats.byCategory[0].name} (${stats.byCategory[0].open}).`} />
            ) : null}
            {stats.topOpen[0] ? (
              <InfoLine icon="arrow-up-bold" text={`Most upvoted open report: "${stats.topOpen[0].title}" with ${stats.topOpen[0].upvotes}.`} />
            ) : null}
          </Card>
        </>
      ) : null}

      {stats ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="small" tone="soft">
            {t('filter.department')}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
            <DeptTile icon="view-grid-outline" name={t('filter.allDepartments')} count={stats.open} selected={!department} onPress={() => setDepartment(null)} />
            {stats.byDepartment.map((d) => (
              <DeptTile key={d.id} icon={d.icon} name={t(`dept.${d.name}`)} count={d.open} selected={department === d.id} onPress={() => setDepartment(department === d.id ? null : d.id)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.chips}>
        <Chip label={t('admin.allOpen')} selected={filter === 'Open'} onPress={() => setFilter('Open')} count={stats?.open} />
        <Chip label={t('status.Resolved')} selected={filter === 'Resolved'} onPress={() => setFilter(filter === 'Resolved' ? 'Open' : 'Resolved')} count={stats?.byStatus.Resolved} />
      </View>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'head' ? `d${row.id}` : String(row.issue.id))}
        renderItem={({ item: row }) => {
          if (row.kind === 'head') {
            return (
              <View style={styles.groupHead} accessibilityRole="header">
                <Icon name={row.icon} size={18} color={c.inkSoft} />
                <Txt variant="heading" style={{ flex: 1 }}>
                  {t(`dept.${row.name}`)}
                </Txt>
                <Txt variant="small" tone="soft">
                  {row.count}
                </Txt>
              </View>
            );
          }
          const item = row.issue;
          const next = NEXT_STATUS[item.status];
          return (
            <IssueCard
              issue={item}
              onChange={replaceIssue}
              footer={
                next ? (
                  <Button
                    label={`Mark as ${STATUS_LABEL[next].toLowerCase()}`}
                    icon="arrow-right"
                    variant="quiet"
                    small
                    loading={savingId === item.id}
                    disabled={savingId !== null && savingId !== item.id}
                    onPress={() => advance(item)}
                  />
                ) : undefined
              }
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          issues === null ? (
            error ? undefined : (
              <Skeleton rows={3} />
            )
          ) : (
            <EmptyState icon="check-circle" title={filter === 'Open' ? 'No open reports' : `Nothing is ${STATUS_LABEL[filter as Status].toLowerCase()}`} body="When students report or staff update a problem, it appears here." />
          )
        }
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={c.inkSoft} colors={[c.ink]} />}
      />
    </Screen>
  );
}

function DeptTile({ icon, name, count, selected, onPress }: { icon: string; name: string; count: number; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${count}`}
      style={[styles.dept, { backgroundColor: selected ? c.tag : c.surface, borderColor: selected ? c.tag : c.line }]}>
      <View style={styles.statTop}>
        <Icon name={icon} size={18} color={selected ? c.tagInk : c.inkSoft} />
        <Txt variant="display" color={selected ? c.tagInk : c.ink} style={{ fontSize: 22, lineHeight: 26 }}>
          {count}
        </Txt>
      </View>
      <Txt variant="small" color={selected ? c.tagInk : c.ink} numberOfLines={2}>
        {name}
      </Txt>
    </Pressable>
  );
}

function InfoLine({ icon, text }: { icon: string; text: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.info}>
      <Icon name={icon} size={18} color={c.inkSoft} />
      <Txt variant="small" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

function formatHours(hours: number): string {
  if (hours < 48) return `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: TAB_CLEARANCE },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.md, gap: 2, minHeight: 72 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  info: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  dept: { width: 132, minHeight: 84, borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: space.xs, justifyContent: 'space-between' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm },
});
