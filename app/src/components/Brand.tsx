// The Campus Fix mark: a yellow maintenance tag with a tick on it.

import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon, Txt } from './ui';

export function BrandMark({ size = 44 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size * 1.18,
        borderRadius: size * 0.2,
        backgroundColor: c.tag,
        transform: [{ rotate: '-9deg' }],
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: size * 0.12,
      }}>
      {/* the punched hole at the top of the tag */}
      <View style={{ position: 'absolute', top: size * 0.14, width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: c.bg }} />
      <Icon name="check-bold" size={size * 0.56} color={c.tagInk} />
    </View>
  );
}

export function BrandRow() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <BrandMark size={24} />
      <Txt variant="title" accessibilityRole="header">
        Campus Fix
      </Txt>
    </View>
  );
}
