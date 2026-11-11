// The coloured status label. Each status has its own icon as well as its
// own colour, so it can still be read by someone who cannot tell the colours apart.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, useTheme } from '../theme';
import type { Status } from '../types';
import { Icon, IconName } from './ui';

export const STATUS_ICON: Record<Status, IconName> = {
  Reported: 'flag-outline',
  Acknowledged: 'eye-check-outline',
  'In Progress': 'progress-wrench',
  Resolved: 'check-circle',
};

export const STATUS_LABEL: Record<Status, string> = {
  Reported: 'Reported',
  Acknowledged: 'Acknowledged',
  'In Progress': 'In progress',
  Resolved: 'Resolved',
};

export function StatusChip({ status, large }: { status: Status; large?: boolean }) {
  const { status: colours } = useTheme();
  const colour = colours[status];
  return (
    <View style={[styles.chip, large && styles.large, { backgroundColor: colour.bg }]} accessibilityLabel={`Status: ${STATUS_LABEL[status]}`}>
      <Icon name={STATUS_ICON[status]} size={large ? 17 : 14} color={colour.fg} />
      <Text style={[styles.text, large && { fontSize: 14 }, { color: colour.fg }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  large: { paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
});
