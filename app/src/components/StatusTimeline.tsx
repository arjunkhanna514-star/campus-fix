// The four steps of a report, top to bottom, with the date each one
// happened and any note the admin left.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { dateTime } from '../format';
import { radius, space, useTheme } from '../theme';
import { HistoryEntry, Status, STATUSES } from '../types';
import { STATUS_ICON, STATUS_LABEL } from './StatusChip';
import { Icon, Txt } from './ui';

const WAITING_TEXT: Record<Status, string> = {
  Reported: '',
  Acknowledged: 'Waiting for campus staff to confirm it',
  'In Progress': 'Not started yet',
  Resolved: 'Not fixed yet',
};

export function StatusTimeline({ history, current }: { history: HistoryEntry[]; current: Status }) {
  const { c, status: colours } = useTheme();
  const reachedIndex = STATUSES.indexOf(current);

  return (
    <View accessibilityLabel={`Progress: ${STATUS_LABEL[current]}, step ${reachedIndex + 1} of 4`}>
      {STATUSES.map((step, index) => {
        const entry = history.find((item) => item.new_status === step);
        const reached = index <= reachedIndex;
        const isLast = index === STATUSES.length - 1;
        const colour = colours[step];

        return (
          <View key={step} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.dot, reached ? { backgroundColor: colour.dot, borderColor: colour.dot } : { backgroundColor: c.surface, borderColor: c.line }]}>
                <Icon name={STATUS_ICON[step]} size={15} color={reached ? '#FFFFFF' : c.inkFaint} />
              </View>
              {isLast ? null : <View style={[styles.line, { backgroundColor: index < reachedIndex ? colours[STATUSES[index + 1]].dot : c.line }]} />}
            </View>

            <View style={[styles.content, !isLast && { paddingBottom: space.lg }]}>
              <Txt variant="bodyBold" tone={reached ? 'ink' : 'faint'}>
                {STATUS_LABEL[step]}
              </Txt>
              {entry ? (
                <Txt variant="small" tone="soft">
                  {dateTime(entry.changed_at)}
                  {entry.changed_by_role === 'admin' ? `, by ${entry.changed_by_name}` : ''}
                </Txt>
              ) : (
                <Txt variant="small" tone="faint">
                  {WAITING_TEXT[step]}
                </Txt>
              )}
              {entry?.note ? (
                <View style={[styles.note, { backgroundColor: c.surfaceAlt }]}>
                  <Txt variant="small">{entry.note}</Txt>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 30 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: 14, marginVertical: 2, borderRadius: 1 },
  content: { flex: 1, paddingTop: 3, gap: 2 },
  note: { marginTop: 6, padding: space.md, borderRadius: radius.sm },
});
