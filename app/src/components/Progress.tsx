// Three small visual pieces used by the gamification screens:
// the community goal card, the level bar and the badge list.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { shortDate } from '../format';
import { radius, space, useTheme } from '../theme';
import type { Badge, CampusHealth, Level } from '../types';
import { Card, Icon, Txt } from './ui';

// One tick per fix towards the shared campus goal. Counting ticks is the point:
// every resolved report visibly fills one.
export function HealthCard({ health }: { health: CampusHealth }) {
  const { c, status } = useTheme();
  const done = Math.min(health.resolvedLast30Days, health.goal);
  const left = Math.max(health.goal - health.resolvedLast30Days, 0);

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.healthTop}>
        <View style={{ flex: 1 }}>
          <Txt variant="small" tone="soft">
            Campus goal, last 30 days
          </Txt>
          <Txt variant="heading">
            {left > 0 ? `${left} more ${left === 1 ? 'fix' : 'fixes'} to reach ${health.goal}` : 'Goal reached. Nice work, everyone.'}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt variant="display">{health.resolvedLast30Days}</Txt>
          <Txt variant="micro" tone="faint">
            fixed
          </Txt>
        </View>
      </View>
      <View style={styles.ticks} accessibilityLabel={`${health.resolvedLast30Days} of ${health.goal} fixes`}>
        {Array.from({ length: health.goal }, (_, index) => (
          <View key={index} style={[styles.tick, { backgroundColor: index < done ? status.Resolved.dot : c.surfaceAlt }]} />
        ))}
      </View>
      <Txt variant="micro" tone="faint">
        {health.open} still open across campus. Upvotes tell staff what to fix first.
      </Txt>
    </Card>
  );
}

export function LevelBar({ level, points }: { level: Level; points: number }) {
  const { c } = useTheme();
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, { toValue: level.progress, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [level.progress, fill]);

  return (
    <View style={{ gap: 6 }} accessibilityLabel={`Level ${level.name}, ${points} points`}>
      <View style={[styles.barTrack, { backgroundColor: c.surfaceAlt }]}>
        <Animated.View style={[styles.barFill, { backgroundColor: c.tag, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <View style={styles.barLabels}>
        <Txt variant="micro" tone="soft">
          {level.name}, {level.min}
        </Txt>
        <Txt variant="micro" tone="soft">
          {level.nextName ? `${level.nextName}, ${level.nextMin}` : 'Top level'}
        </Txt>
      </View>
    </View>
  );
}

export function BadgeList({ badges }: { badges: Badge[] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      {badges.map((badge) => (
        <View
          key={badge.code}
          style={[styles.badge, { borderColor: c.line, backgroundColor: badge.earned ? c.surface : 'transparent' }]}
          accessibilityLabel={`${badge.name}. ${badge.description}. ${badge.earned ? 'Earned' : 'Not earned yet'}.`}>
          <View style={[styles.badgeIcon, { backgroundColor: badge.earned ? c.tag : c.surfaceAlt }]}>
            <Icon name={badge.earned ? badge.icon : 'lock-outline'} size={22} color={badge.earned ? c.tagInk : c.inkFaint} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="bodyBold" tone={badge.earned ? 'ink' : 'soft'}>
              {badge.name}
            </Txt>
            <Txt variant="small" tone={badge.earned ? 'soft' : 'faint'}>
              {badge.description}
            </Txt>
          </View>
          {badge.earned && badge.earned_at ? (
            <Txt variant="micro" tone="faint">
              {shortDate(badge.earned_at)}
            </Txt>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  healthTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  ticks: { flexDirection: 'row', gap: 3 },
  tick: { flex: 1, height: 12, borderRadius: 3 },
  barTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  badgeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
