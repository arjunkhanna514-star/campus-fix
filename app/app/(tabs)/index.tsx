// The feed: every report on campus, with search, filters and sorting.
// It refreshes itself every 10 seconds while it is on screen, so a report
// made on one phone appears on the others without anyone pulling to refresh.

import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { api, errorMessage } from '@/src/api';
import { useAuth } from '@/src/auth';
import { BrandRow } from '@/src/components/Brand';
import { IssueCard } from '@/src/components/IssueCard';
import { HealthCard } from '@/src/components/Progress';
import { STATUS_LABEL } from '@/src/components/StatusChip';
import { Button, Chip, EmptyState, Icon, Loading, Notice, Screen, Segmented, Txt } from '@/src/components/ui';
import { useSession } from '@/src/session';
import { fonts, MAX_WIDTH, radius, space, useTheme } from '@/src/theme';
import { CampusHealth, Issue, Status, STATUSES } from '@/src/types';

type Sort = 'trending' | 'newest' | 'mine';
const REFRESH_MS = 10000;

export default function FeedScreen() {
  const { user } = useAuth();
  const { me, meta } = useSession();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const isAdmin = user?.role === 'admin';

  const [sort, setSort] = useState<Sort>('trending');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(''); // the query after the user pauses typing
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [health, setHealth] = useState<CampusHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const latestRequest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    const params = new URLSearchParams();
    params.set('sort', sort === 'trending' ? 'trending' : 'newest');
    if (sort === 'mine') params.set('mine', '1');
    if (search) params.set('q', search);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', String(categoryFilter));
    try {
      const [list, campus] = await Promise.all([api<Issue[]>(`/issues?${params}`), api<CampusHealth>('/campus-health')]);
      if (requestId !== latestRequest.current) return; // a newer request has already replaced this one
      setIssues(list);
      setHealth(campus);
      setError(null);
    } catch (err) {
      if (requestId === latestRequest.current) setError(errorMessage(err));
    }
  }, [sort, search, statusFilter, categoryFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  const pullToRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const replaceIssue = (updated: Issue) => setIssues((list) => list?.map((item) => (item.id === updated.id ? updated : item)) ?? null);

  const activeFilters = (statusFilter ? 1 : 0) + (categoryFilter ? 1 : 0);
  const filtering = activeFilters > 0 || search.length > 0;
  const clearFilters = () => {
    setStatusFilter(null);
    setCategoryFilter(null);
    setQuery('');
  };

  const columns = Math.min(width, MAX_WIDTH) >= 700 ? 2 : 1;

  const header = (
    <View style={{ gap: space.lg, paddingBottom: space.md }}>
      <View style={styles.topRow}>
        <BrandRow />
        {isAdmin ? (
          <View style={[styles.pill, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="shield-account" size={16} />
            <Txt variant="small">Admin</Txt>
          </View>
        ) : me ? (
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={`${me.points} points, level ${me.level.name}. Open your profile.`}
            style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? c.tagPressed : c.tag }]}>
            <Txt variant="number" tone="tagInk" style={{ fontSize: 17, lineHeight: 20 }}>
              {me.points}
            </Txt>
            <Txt variant="small" tone="tagInk">
              pts, {me.level.name}
            </Txt>
          </Pressable>
        ) : null}
      </View>

      {health ? <HealthCard health={health} /> : null}

      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Icon name="magnify" size={20} color={c.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by problem, building or room"
            placeholderTextColor={c.inkFaint}
            accessibilityLabel="Search reports"
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, { color: c.ink }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={12}>
              <Icon name="close-circle" size={18} color={c.inkFaint} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setFiltersOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={activeFilters ? `Filters, ${activeFilters} active` : 'Filters'}
          accessibilityState={{ expanded: filtersOpen }}
          style={[styles.filterButton, { backgroundColor: filtersOpen || activeFilters ? c.ink : c.surface, borderColor: filtersOpen || activeFilters ? c.ink : c.line }]}>
          <Icon name="tune-variant" size={20} color={filtersOpen || activeFilters ? c.bg : c.ink} />
          {activeFilters ? <Txt variant="small" color={c.bg}>{activeFilters}</Txt> : null}
        </Pressable>
      </View>

      {filtersOpen ? (
        <View style={{ gap: space.md }}>
          <View style={{ gap: space.sm }}>
            <Txt variant="small" tone="soft">
              Status
            </Txt>
            <View style={styles.chips}>
              {STATUSES.map((status) => (
                <Chip key={status} label={STATUS_LABEL[status]} selected={statusFilter === status} onPress={() => setStatusFilter(statusFilter === status ? null : status)} />
              ))}
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Txt variant="small" tone="soft">
              Category
            </Txt>
            <View style={styles.chips}>
              {(meta?.categories ?? []).map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  icon={category.icon}
                  selected={categoryFilter === category.id}
                  onPress={() => setCategoryFilter(categoryFilter === category.id ? null : category.id)}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <Segmented<Sort>
        value={sort}
        onChange={setSort}
        options={
          isAdmin
            ? [
                { value: 'trending', label: 'Most upvoted' },
                { value: 'newest', label: 'Newest' },
              ]
            : [
                { value: 'trending', label: 'Most upvoted' },
                { value: 'newest', label: 'Newest' },
                { value: 'mine', label: 'My reports' },
              ]
        }
      />

      {error ? <Notice text={error} /> : null}
    </View>
  );

  const empty =
    issues === null ? (
      error ? undefined : (
        <Loading />
      )
    ) : filtering ? (
      <EmptyState
        icon="text-box-search-outline"
        title="No reports match"
        body="Try a different word, or clear the filters to see everything."
        action={<Button label="Clear search and filters" variant="outline" small onPress={clearFilters} style={{ marginTop: space.sm }} />}
      />
    ) : sort === 'mine' ? (
      <EmptyState
        icon="flag-outline"
        title="You have not reported anything yet"
        body="Seen something broken? Your first report earns points and a badge."
        action={<Button label="Report a problem" icon="plus-thick" small onPress={() => router.push('/report')} style={{ marginTop: space.sm }} />}
      />
    ) : (
      <EmptyState icon="check-circle" title="Nothing reported yet" body="When students report problems, they show up here for everyone to see." />
    );

  return (
    <Screen>
      <FlatList
        key={columns}
        data={issues ?? []}
        numColumns={columns}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1, maxWidth: '50%' } : undefined}>
            <IssueCard issue={item} onChange={replaceIssue} fill={columns > 1} />
          </View>
        )}
        columnWrapperStyle={columns > 1 ? { gap: space.md } : undefined}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={c.inkSoft} colors={[c.ink]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: space.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill },
  searchRow: { flexDirection: 'row', gap: space.sm },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 48 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, paddingVertical: 8, outlineWidth: 0 } as any,
  filterButton: { minWidth: 48, height: 48, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
