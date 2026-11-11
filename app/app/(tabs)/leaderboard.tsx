// The leaderboard: who has contributed most, this week or of all time.

import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/src/api';
import { Avatar, Card, EmptyState, Loading, Notice, Screen, Segmented, Txt } from '@/src/components/ui';
import { initials, ordinal } from '@/src/format';
import { radius, space, TAB_CLEARANCE, useTheme } from '@/src/theme';
import type { Leaderboard, LeaderRow } from '@/src/types';

type Period = 'week' | 'all';

export default function LeaderboardScreen() {
  const { c } = useTheme();
  const [period, setPeriod] = useState<Period>('week');
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoard(await api<Leaderboard>(`/leaderboard?period=${period}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pullToRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const ready = board && board.period === period;
  const scored = ready ? board.top.filter((row) => row.points > 0) : [];
  const podium = scored.slice(0, 3);
  const rest = scored.slice(3);
  const me = ready ? board.me : null;
  const meOnBoard = !!me && scored.some((row) => row.id === me.id);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={c.inkSoft} colors={[c.ink]} />}>
        <View style={{ gap: space.xs }}>
          <Txt variant="title" accessibilityRole="header">
            Leaderboard
          </Txt>
          <Txt tone="soft">Points come from reports that staff confirm and fix, and from upvotes.</Txt>
        </View>

        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'week', label: 'This week' },
            { value: 'all', label: 'All time' },
          ]}
        />

        {error ? <Notice text={error} /> : null}

        {!ready ? (
          error ? null : (
            <Loading />
          )
        ) : scored.length === 0 ? (
          <EmptyState icon="trophy-outline" title="No points yet this week" body="The first confirmed report or upvote puts someone on the board. It could be you." />
        ) : (
          <>
            <View style={styles.podium} accessibilityLabel="Top three">
              {/* Shown as 2nd, 1st, 3rd so the winner stands in the middle. */}
              {[podium[1], podium[0], podium[2]].map((row, index) =>
                row ? <PodiumPlace key={row.id} row={row} height={[72, 104, 52][index]} /> : <View key={`gap-${index}`} style={{ flex: 1 }} />
              )}
            </View>

            {rest.length > 0 ? (
              <Card style={{ padding: 0 }}>
                {rest.map((row, index) => (
                  <Row key={row.id} row={row} divider={index > 0} />
                ))}
              </Card>
            ) : null}

            {me && !meOnBoard ? (
              <View style={[styles.mine, { backgroundColor: c.tagSoft }]}>
                <Txt variant="bodyBold">
                  {me.points > 0 ? `You are ${ordinal(me.rank)} with ${me.points} ${me.points === 1 ? 'point' : 'points'}` : period === 'week' ? 'You have no points this week yet' : 'You have no points yet'}
                </Txt>
                <Txt variant="small" tone="soft">
                  Report a problem or upvote one you are affected by to climb.
                </Txt>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function PodiumPlace({ row, height }: { row: LeaderRow; height: number }) {
  const { c } = useTheme();
  const first = row.rank === 1;
  return (
    <View style={styles.place} accessibilityLabel={`${ordinal(row.rank)}: ${row.name}, ${row.points} points`}>
      <Avatar text={initials(row.name)} size={first ? 56 : 46} highlight={row.isMe} />
      <Txt variant="bodyBold" numberOfLines={1} style={{ textAlign: 'center' }}>
        {row.isMe ? 'You' : row.name.split(' ')[0]}
      </Txt>
      <Txt variant="micro" tone="soft" numberOfLines={1}>
        {row.level}
      </Txt>
      <View style={[styles.block, { height, backgroundColor: first ? c.tag : c.surface, borderColor: first ? c.tag : c.line }]}>
        <Txt variant="display" color={first ? c.tagInk : c.ink} style={{ fontSize: 26, lineHeight: 30 }}>
          {row.points}
        </Txt>
        <Txt variant="micro" color={first ? c.tagInk : c.inkSoft}>
          {ordinal(row.rank)}
        </Txt>
      </View>
    </View>
  );
}

function Row({ row, divider }: { row: LeaderRow; divider: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={[styles.row, divider && { borderTopWidth: 1, borderTopColor: c.line }, row.isMe && { backgroundColor: c.tagSoft }]}
      accessibilityLabel={`${ordinal(row.rank)}: ${row.name}, ${row.points} points`}>
      <Txt variant="number" tone="soft" style={{ width: 28, textAlign: 'center' }}>
        {row.rank}
      </Txt>
      <Avatar text={initials(row.name)} size={36} highlight={row.isMe} />
      <View style={{ flex: 1 }}>
        <Txt variant="bodyBold" numberOfLines={1}>
          {row.isMe ? `${row.name} (you)` : row.name}
        </Txt>
        <Txt variant="micro" tone="soft">
          {row.level}
        </Txt>
      </View>
      <Txt variant="number">{row.points}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: TAB_CLEARANCE, gap: space.lg },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingTop: space.sm },
  place: { flex: 1, alignItems: 'center', gap: 3 },
  block: { alignSelf: 'stretch', marginTop: space.sm, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg },
  mine: { borderRadius: radius.lg, padding: space.lg, gap: 2 },
});
