// Campus navigation: the map data, the walkway network, and the route
// finder. Routes use Dijkstra's shortest-path algorithm over the walkways,
// then the path is turned into turn-by-turn steps people can follow.

import raw from './campus.json';

// TypeScript reads JSON arrays as number[] rather than [x, y] pairs, so the data is typed by hand below.
const data = raw as any;

export type Point = [number, number];

export type Category = 'institute' | 'admin' | 'library' | 'food' | 'sport' | 'services';

export type BlockNames = { lines: string[]; x: number; y: number; size: number; anchor: 'middle' | 'start' | 'end'; outside: boolean };

export type Block = {
  id: string;
  name: string;
  title: string;
  category: Category;
  polygon: Point[];
  label: Point;
  entrance: Point;
  names: BlockNames;
};

export type Gate = { id: string; name: string; point: Point; label: Point; note?: string };

export type Place = {
  id: string;
  name: string;
  subtitle: string;
  kind: 'block' | 'gate' | 'start';
  category?: Category;
  point: Point; // where the route ends (the entrance)
  keywords: string; // everyday words people search with
};

export type Step = { icon: string; title: string; detail: string };

export type Route = {
  points: Point[];
  metres: number;
  minutes: number;
  steps: Step[];
};

export const campus = {
  viewBox: data.viewBox as [number, number, number, number],
  boundary: data.boundary as Point[],
  lawns: data.lawns as Point[][],
  courts: data.courts as Point[][],
  unlabelled: data.unlabelled as Point[][],
  roundabout: data.roundabout,
  blocks: data.blocks as Block[],
  gates: data.gates as Gate[],
  parking: data.parking as Point[],
  stairs: data.stairs as Point[],
  start: data.start as { id: string; name: string; point: Point },
  geo: data.geo as { anchorLat: number; anchorLng: number; anchorX: number; anchorY: number; rotationDeg: number },
  metresPerPixel: data.metresPerPixel as number,
};

const nodes = data.nodes as Record<string, Point>;
const edges = data.edges as [string, string][];
const entranceNode = data.entranceNode as Record<string, string>;
const nodeNear = data.nodeNear as Record<string, string>;

export const CATEGORY_LABEL: Record<Category, string> = {
  institute: 'Institute',
  admin: 'Administration',
  library: 'Library',
  food: 'Cafeteria',
  sport: 'Gym',
  services: 'Services',
};

export const CATEGORY_ICON: Record<Category, string> = {
  institute: 'school-outline',
  admin: 'briefcase-outline',
  library: 'book-open-page-variant-outline',
  food: 'silverware-fork-knife',
  sport: 'dumbbell',
  services: 'hand-heart-outline',
};

// Words people actually type, beyond the official names.
const KEYWORDS: Record<string, string> = {
  A: 'applied sciences science labs',
  B: 'business commerce management',
  C: 'administration admin reception office',
  D: 'electrical engineering',
  E: 'community service chinese medicine tcm',
  F: 'community service',
  G: 'chaplaincy campus connect chapel',
  H: 'mechanical engineering workshop',
  I: 'aviation aircraft',
  LB: 'automotive cars garage',
  M: 'ict it computing computers software information technology',
  N: 'building construction trades',
  S: 'cafeteria canteen food coffee students house youth hub multifaith prayer',
  MRC: 'library books study resource centre',
  LG: 'gym sports fitness lower',
  UG: 'gym sports fitness upper',
  U: 'child care childcare nursery creche',
  G4: 'parking car park indoor',
  HERE: 'students house you are here',
};

// Every place you can navigate to or from.
export const places: Place[] = [
  { id: campus.start.id, name: campus.start.name, subtitle: 'You are here', kind: 'start', point: campus.start.point, keywords: KEYWORDS.HERE },
  ...campus.blocks.map((b) => ({ id: b.id, name: b.name, subtitle: b.title, kind: 'block' as const, category: b.category, point: b.entrance, keywords: KEYWORDS[b.id] ?? '' })),
  ...campus.gates.map((g) => ({ id: g.id, name: g.name, subtitle: g.note ?? 'Campus entrance', kind: 'gate' as const, point: g.point, keywords: `gate entrance ${KEYWORDS[g.id] ?? ''}` })),
];

export function placeById(id: string): Place | undefined {
  return places.find((p) => p.id === id);
}

export function blockById(id: string): Block | undefined {
  return campus.blocks.find((b) => b.id === id);
}

// Report buildings are stored by name ("Block A", "MRC Library"); this finds the map block.
export function blockByName(name: string): Block | undefined {
  return campus.blocks.find((b) => b.name === name);
}

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const toMetres = (px: number) => Math.round(px * data.metresPerPixel);
export const toMinutes = (m: number) => Math.max(1, Math.round(m / data.walkMetresPerMinute));

// Neighbour list built once from the edge list.
const graph: Record<string, { to: string; w: number }[]> = {};
for (const id of Object.keys(nodes)) graph[id] = [];
for (const [a, b] of edges) {
  const w = dist(nodes[a], nodes[b]);
  graph[a].push({ to: b, w });
  graph[b].push({ to: a, w });
}

// ---------- geometry helpers ----------
export function pointInPolygon([x, y]: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point) {
  const o = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return o(p3, p4, p1) * o(p3, p4, p2) < 0 && o(p1, p2, p3) * o(p1, p2, p4) < 0;
}

function crossesBuilding(a: Point, b: Point) {
  const polys = [...campus.blocks.map((blk) => blk.polygon), ...campus.unlabelled];
  return polys.some((poly) => poly.some((p, i) => segmentsCross(a, b, p, poly[(i + 1) % poly.length])));
}

// The walkway point to join from an arbitrary spot (your GPS position):
// the closest one you can walk to in a straight line without going through a building.
export function nearestNode(p: Point): string {
  const ranked = Object.keys(nodes).sort((a, b) => dist(nodes[a], p) - dist(nodes[b], p));
  return ranked.find((id) => !crossesBuilding(p, nodes[id])) ?? ranked[0];
}

// Where a map point is: inside a block, next to one, elsewhere on campus, or off campus.
export function locate(p: Point): { onCampus: boolean; inside?: Block; near?: Block; metresAway?: number } {
  const onCampus = pointInPolygon(p, campus.boundary);
  const inside = campus.blocks.find((b) => pointInPolygon(p, b.polygon));
  if (inside) return { onCampus: true, inside };
  let near: Block | undefined;
  let best = Infinity;
  for (const b of campus.blocks) {
    const d = Math.min(...b.polygon.map((q) => dist(q, p)), dist(b.entrance, p));
    if (d < best) {
      best = d;
      near = b;
    }
  }
  if (!onCampus) {
    const edge = Math.min(...campus.boundary.map((q) => dist(q, p)));
    return { onCampus: false, metresAway: toMetres(edge) };
  }
  return { onCampus: true, near: toMetres(best) <= 40 ? near : undefined };
}

// Dijkstra: always expand the closest unvisited node until we reach the goal.
function shortestPath(from: string, to: string): string[] | null {
  const best: Record<string, number> = { [from]: 0 };
  const previous: Record<string, string> = {};
  const done = new Set<string>();
  while (true) {
    let current: string | null = null;
    for (const [id, d] of Object.entries(best)) {
      if (!done.has(id) && (current === null || d < best[current])) current = id;
    }
    if (current === null) return null;
    if (current === to) break;
    done.add(current);
    for (const { to: next, w } of graph[current]) {
      const candidate = best[current] + w;
      if (best[next] === undefined || candidate < best[next]) {
        best[next] = candidate;
        previous[next] = current;
      }
    }
  }
  const path = [to];
  while (path[0] !== from) path.unshift(previous[path[0]]);
  return path;
}

function heading(a: Point, b: Point) {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
}

// Map x grows right and y grows down, so north is "up" on the screen.
function compass(a: Point, b: Point) {
  const h = heading(a, b);
  const dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  return dirs[(Math.round(h / 45) + 8) % 8];
}

export const GPS_ID = 'GPS';

// fromPoint is used when starting from your live GPS position instead of a named place.
export function findRoute(fromId: string, toId: string, fromPoint?: Point): Route | null {
  const live = fromId === GPS_ID && !!fromPoint;
  const from: Place | undefined = live
    ? { id: GPS_ID, name: 'Your location', subtitle: 'Live position', kind: 'start', point: fromPoint as Point, keywords: '' }
    : placeById(fromId);
  const to = placeById(toId);
  if (!from || !to || fromId === toId) return null;
  const startNode = live ? nearestNode(fromPoint as Point) : entranceNode[fromId];
  const path = shortestPath(startNode, entranceNode[toId]);
  if (!path) return null;

  // The route starts at the doorway, follows the walkways and ends at the destination door.
  const points: Point[] = [from.point, ...path.map((id) => nodes[id]), to.point];
  // Drop walkway points that sit right next to a doorway, so steps don't say "turn after 4 m".
  const cleaned = points.filter((p, i) => i === 0 || dist(p, points[i - 1]) > 2);
  if (cleaned.length > 2 && dist(cleaned[0], cleaned[1]) < 20) cleaned.splice(1, 1);
  if (cleaned.length > 2 && dist(cleaned[cleaned.length - 1], cleaned[cleaned.length - 2]) < 20) cleaned.splice(cleaned.length - 2, 1);
  const px = cleaned.slice(1).reduce((sum, p, i) => sum + dist(cleaned[i], p), 0);
  const metres = toMetres(px);

  // Turn-by-turn: a step wherever the walk bends by more than 35 degrees.
  const steps: Step[] = [];
  // The opening direction comes from the first real stretch, not a few steps out of a doorway.
  let ahead = 1;
  while (ahead < cleaned.length - 1 && dist(cleaned[0], cleaned[ahead]) < 30) ahead++;
  steps.push({
    icon: 'walk',
    title: `Head ${compass(cleaned[0], cleaned[ahead])}`,
    detail: `From ${from.name}`,
  });
  let run = dist(cleaned[0], cleaned[1]);
  for (let i = 1; i < cleaned.length - 1; i++) {
    const turn = ((heading(cleaned[i], cleaned[i + 1]) - heading(cleaned[i - 1], cleaned[i]) + 540) % 360) - 180;
    const segment = dist(cleaned[i], cleaned[i + 1]);
    if (Math.abs(turn) > 35 && toMetres(run) >= 10) {
      const nodeId = Object.keys(nodes).find((id) => dist(nodes[id], cleaned[i]) < 1);
      const landmark = nodeId ? nodeNear[nodeId] : undefined;
      const right = turn > 0; // y points down, so a positive angle is a right turn
      steps.push({
        icon: right ? 'arrow-right-top' : 'arrow-left-top',
        title: `${Math.abs(turn) > 120 ? 'Sharp ' : ''}${right ? 'right' : 'left'}${landmark ? ` at ${landmark}` : ''}`.replace(/^./, (s) => s.toUpperCase()),
        detail: `After ${toMetres(run)} m`,
      });
      run = segment;
    } else {
      run += segment;
    }
  }
  steps.push({
    icon: 'map-marker-check',
    title: `Arrive at ${to.name}`,
    detail: to.kind === 'block' ? `${to.subtitle}. The entrance is ahead.` : to.subtitle,
  });

  return { points: cleaned, metres, minutes: toMinutes(metres), steps };
}

// Straight-line walking estimate, used for search results before a route is drawn.
export function walkingEstimate(fromId: string, toId: string) {
  const route = findRoute(fromId, toId);
  return route ? { metres: route.metres, minutes: route.minutes } : null;
}

export function polygonCentre(poly: Point[]): Point {
  const x = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const y = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return [x, y];
}
