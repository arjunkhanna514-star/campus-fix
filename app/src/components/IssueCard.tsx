// One report in a list. It is shaped like a maintenance tag: a tear-off
// stub on the left holds the upvote count, the body holds the details.

import { Image } from 'react-native';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { photoUrl } from '../api';
import { timeAgo, whereText } from '../format';
import { radius, space, useTheme } from '../theme';
import type { Issue } from '../types';
import { StatusChip } from './StatusChip';
import { Icon, Txt } from './ui';
import { UpvoteButton } from './UpvoteButton';

type Props = {
  issue: Issue;
  onChange: (issue: Issue) => void;
  footer?: React.ReactNode;
  fill?: boolean; // stretch to the height of the row (two-column layouts)
};

export function IssueCard({ issue, onChange, footer, fill }: Props) {
  const { c } = useTheme();
  const photo = photoUrl(issue.photo_url);

  return (
    <View style={[styles.card, fill && { flex: 1 }, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={[styles.row, fill && { flex: 1 }]}>
        <UpvoteButton issue={issue} onChange={onChange} />

        {/* The tear line between stub and body, with a notch at each end. */}
        <View style={[styles.tear, { backgroundColor: c.line }]}>
          <View style={[styles.notch, styles.notchTop, { backgroundColor: c.bg, borderColor: c.line }]} />
          <View style={[styles.notch, styles.notchBottom, { backgroundColor: c.bg, borderColor: c.line }]} />
        </View>

        <Pressable
          onPress={() => router.push(`/issue/${issue.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${issue.title}. ${whereText(issue)}. ${issue.status}. Open report.`}
          style={({ pressed }) => [styles.body, pressed && { backgroundColor: c.surfaceAlt }]}>
          <View style={styles.topLine}>
            <Icon name={issue.category.icon} size={15} color={c.inkSoft} />
            <Txt variant="micro" tone="soft" style={{ flex: 1 }} numberOfLines={1}>
              {issue.category.name}
            </Txt>
            <Txt variant="micro" tone="faint">
              {timeAgo(issue.created_at)}
            </Txt>
          </View>

          <View style={styles.main}>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="heading" numberOfLines={2}>
                {issue.title}
              </Txt>
              <View style={styles.where}>
                <Icon name="map-marker-outline" size={15} color={c.inkSoft} />
                <Txt variant="small" tone="soft" numberOfLines={1} style={{ flex: 1 }}>
                  {whereText(issue)}
                </Txt>
              </View>
            </View>
            {photo ? <Image source={{ uri: photo }} style={[styles.thumb, { backgroundColor: c.surfaceAlt }]} accessibilityIgnoresInvertColors /> : null}
          </View>

          <View style={styles.bottomLine}>
            <StatusChip status={issue.status} />
            {issue.impact === 'High' && issue.status !== 'Resolved' ? (
              <View style={styles.flag}>
                <Icon name="alert-circle-outline" size={14} color={c.danger} />
                <Txt variant="micro" tone="danger">
                  High impact
                </Txt>
              </View>
            ) : null}
            {issue.isMine ? (
              <Txt variant="micro" tone="faint">
                Your report
              </Txt>
            ) : null}
          </View>
        </Pressable>
      </View>
      {footer ? <View style={[styles.footer, { borderTopColor: c.line }]}>{footer}</View> : null}
    </View>
  );
}

const NOTCH = 14;

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  tear: { width: 1, alignSelf: 'stretch' },
  notch: { position: 'absolute', left: -NOTCH / 2, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, borderWidth: 1 },
  notchTop: { top: -NOTCH / 2 - 1 },
  notchBottom: { bottom: -NOTCH / 2 - 1 },
  body: { flex: 1, paddingVertical: space.md, paddingHorizontal: 14, gap: 8 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  main: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  where: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { borderTopWidth: 1, padding: space.sm },
});
