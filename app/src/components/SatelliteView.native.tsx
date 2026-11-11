// Satellite view on phones: real aerial imagery of the MCAST Paola campus
// with your live blue dot, the route, and a label on every block. It follows
// you while you walk.
//
// iPhone and Expo Go use the phone's own maps (Apple Maps / Google Maps).
// An installed Android app has no Google Maps key, so it shows Google's own
// free satellite map (the same one as the web version) in a WebView instead
// of a blank map.

import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { WebView as RNWebView } from 'react-native-webview';
import { toLatLng } from '../location';
import { satelliteUrl } from './satelliteUrl';
import { campus, Point } from '../navigation';
import { fonts } from '../theme';

type Props = {
  route: Point[] | null;
  selectedId: string | null;
  follow: boolean;
  bottomInset: number;
  onSelect: (id: string) => void;
  user?: { latitude: number; longitude: number } | null; // phones draw their own blue dot
};

const centre = toLatLng([756, 391]);
// The library's type definitions do not match this React version yet; the component itself works.
const WebView = RNWebView as unknown as React.ComponentType<Record<string, unknown> & { ref?: React.Ref<{ injectJavaScript: (js: string) => void }> }>;

const hasGoogleKey = !!(Constants.expoConfig?.android as { config?: { googleMaps?: { apiKey?: string } } } | undefined)?.config?.googleMaps?.apiKey;
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const useWebSatellite = Platform.OS === 'android' && !inExpoGo && !hasGoogleKey;

export function SatelliteView(props: Props) {
  return useWebSatellite ? <WebSatellite {...props} /> : <NativeSatellite {...props} />;
}

function WebSatellite({ route, selectedId, follow, user }: Props) {
  const uri = satelliteUrl({ route, selectedId, follow, user });
  return <WebView key={uri} source={{ uri }} style={[StyleSheet.absoluteFill, { backgroundColor: '#0D0D11' }]} javaScriptEnabled domStorageEnabled />;
}

function NativeSatellite({ route, selectedId, follow, bottomInset, onSelect }: Props) {
  const map = useRef<MapView>(null);

  // When a route appears, frame the whole walk.
  useEffect(() => {
    if (route && route.length > 1) {
      map.current?.fitToCoordinates(route.map(toLatLng), { edgePadding: { top: 160, right: 60, bottom: bottomInset + 40, left: 60 }, animated: true });
    }
  }, [route, bottomInset]);

  // Selecting a block flies the camera to it.
  useEffect(() => {
    const block = campus.blocks.find((b) => b.id === selectedId);
    if (block && !route) map.current?.animateCamera({ center: toLatLng(block.label), zoom: 18.5 }, { duration: 600 });
  }, [selectedId, route]);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      mapType={Platform.OS === 'ios' ? 'hybridFlyover' : 'hybrid'}
      initialRegion={{ ...centre, latitudeDelta: 0.0055, longitudeDelta: 0.0055 }}
      showsUserLocation
      followsUserLocation={follow}
      showsCompass
      showsBuildings
      pitchEnabled
      rotateEnabled
      toolbarEnabled={false}
      mapPadding={{ top: 140, right: 0, bottom: bottomInset, left: 0 }}>
      {route ? <Polyline coordinates={route.map(toLatLng)} strokeColor="#FFFFFF" strokeWidth={6} lineCap="round" lineJoin="round" /> : null}
      {campus.blocks.map((b) => {
        const selected = b.id === selectedId;
        return (
          <Marker key={b.id} coordinate={toLatLng(b.label)} onPress={() => onSelect(b.id)} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.pill, selected && styles.pillSelected]}>
              <Text style={[styles.code, selected && { color: '#0A0A0B' }]}>{b.id}</Text>
              {selected ? <Text style={styles.name} numberOfLines={1}>{b.names.lines[0]}</Text> : null}
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

export const satelliteAvailable = true;

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(17,19,24,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  pillSelected: { backgroundColor: '#F5F5F7', borderColor: '#F5F5F7' },
  code: { fontFamily: fonts.headBold, fontSize: 13, color: '#F5F5F7' },
  name: { fontFamily: fonts.head, fontSize: 12, color: '#0A0A0B', maxWidth: 160 },
});
