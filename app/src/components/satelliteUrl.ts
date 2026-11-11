// The address of Google's own satellite map for what the map screen is showing:
// the walking route, the selected block, you (while following), or the whole
// campus. This is Google's free map embed: no key, no account, real Google
// imagery with place names on top.

import { toLatLng } from '../location';
import { campus, Point } from '../navigation';

export type SatelliteTarget = {
  route: Point[] | null;
  selectedId: string | null;
  follow: boolean;
  user?: { latitude: number; longitude: number } | null;
};

const CAMPUS = toLatLng([756, 391]);
// About 11 m: the map only reloads when you have really moved, not on every GPS wobble.
const fix = (n: number) => n.toFixed(4);
const at = (p: { latitude: number; longitude: number }) => `${fix(p.latitude)},${fix(p.longitude)}`;

export function satelliteUrl({ route, selectedId, follow, user }: SatelliteTarget): string {
  if (route && route.length > 1) {
    // Walking directions from the start of the route to its end, on satellite.
    return `https://maps.google.com/maps?saddr=${at(toLatLng(route[0]))}&daddr=${at(toLatLng(route[route.length - 1]))}&dirflg=w&t=k&output=embed`;
  }
  const block = campus.blocks.find((b) => b.id === selectedId);
  if (block) return `https://maps.google.com/maps?q=${at(toLatLng(block.label))}&t=k&z=19&output=embed`;
  if (follow && user) return `https://maps.google.com/maps?q=${at(user)}&t=k&z=19&output=embed`;
  return `https://maps.google.com/maps?ll=${at(CAMPUS)}&t=k&z=18&output=embed`;
}
