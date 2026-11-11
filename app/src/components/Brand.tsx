// The Campus Fix logo: a glass backpack with a report clipboard, a map pin
// and a shield, on a dark tile. Used on the login screen and in headers.

import React from 'react';
import { Image, View } from 'react-native';
import { Txt } from './ui';

const LOGO = require('../../assets/images/logo.png');

export function BrandMark({ size = 44, glow }: { size?: number; glow?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        // A soft halo so the glass tile lifts off the black background.
        shadowColor: '#DCE3F2',
        shadowOpacity: glow ? 0.35 : 0.15,
        shadowRadius: glow ? size * 0.35 : size * 0.15,
        shadowOffset: { width: 0, height: 0 },
        elevation: glow ? 12 : 4,
        backgroundColor: '#1A1D24',
      }}>
      <Image source={LOGO} style={{ width: size, height: size, borderRadius: size * 0.22 }} resizeMode="cover" />
    </View>
  );
}

export function BrandRow({ compact }: { compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }} accessibilityLabel="Campus Fix">
      <BrandMark size={34} />
      {compact ? null : (
        <Txt variant="title" accessibilityRole="header" numberOfLines={1}>
          Campus Fix
        </Txt>
      )}
    </View>
  );
}
