// Satellite view in the browser version (the shared link / Add to Home Screen).
// Google's own satellite map, the same imagery as Google Maps, centred on what
// you are looking at: the walking route (with Google's walking directions), the
// selected block, you while following, or the whole campus.

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { satelliteUrl } from './satelliteUrl';
import type { Point } from '../navigation';

type Props = {
  route: Point[] | null;
  selectedId: string | null;
  follow: boolean;
  bottomInset: number;
  onSelect: (id: string) => void;
  user?: { latitude: number; longitude: number } | null;
};

export function SatelliteView({ route, selectedId, follow, bottomInset, user }: Props) {
  const src = satelliteUrl({ route, selectedId, follow, user });
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D0D11' }]} testID="satellite-map">
      {/* the map stops above the bottom sheet, so Google's own controls and credit stay visible */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: Math.max(0, bottomInset - 20) }}>
        {React.createElement('iframe', {
          key: src,
          src,
          title: 'Satellite view of MCAST Paola (Google Maps)',
          style: { border: 0, width: '100%', height: '100%', display: 'block' },
          loading: 'eager',
          referrerPolicy: 'no-referrer-when-downgrade',
          allowFullScreen: true,
          'data-testid': 'satellite-frame',
        })}
      </View>
    </View>
  );
}

export const satelliteAvailable = true;
