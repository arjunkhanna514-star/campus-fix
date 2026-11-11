// The interactive campus map. Drawn as vector shapes traced from the official
// MCAST map, so it stays sharp at any zoom. Drag to move, pinch or use the
// buttons to zoom, tap a building to select it. A selected route is drawn
// on with an animation, and the "you are here" dot pulses.

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { campus, Point } from '../navigation';
import { fonts } from '../theme';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const [VX, VY, VW, VH] = campus.viewBox;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 4;
const EXTRUDE = 9; // how far the dark "wall" below each building drops, for depth

export type MapHandle = {
  recentre: () => void;
  focus: (point: Point, zoom?: number) => void;
  fit: (points: Point[]) => void;
  zoomBy: (factor: number) => void;
};

type Props = {
  selectedId: string | null;
  route: Point[] | null;
  dimmed: Set<string> | null; // blocks to fade when a category filter is on
  issueCounts: Record<string, number>;
  tilted: boolean;
  bottomInset: number; // height covered by the sheet, so focusing keeps things visible
  user: { point: Point; heading: number | null; accuracyM?: number } | null; // live GPS position, when on campus
  onSelect: (id: string) => void;
};

const pts = (poly: Point[], dy = 0) => poly.map(([x, y]) => `${x - VX},${y - VY + dy}`).join(' ');
const length = (line: Point[]) => line.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);

export const CampusMap = forwardRef<MapHandle, Props>(function CampusMap({ selectedId, route, dimmed, issueCounts, tilted, bottomInset, user, onSelect }, ref) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  // k: screen pixels per map pixel at zoom 1, chosen so the map fills the height.
  const k = box.h > 0 ? (box.h / VH) * 1.05 : 1;
  const W = VW * k;
  const H = VH * k;

  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const state = useRef({ tx: 0, ty: 0, zoom: 1 });
  // Full institute names appear once you zoom in far enough to read them, so the overview stays clean.
  const [showNames, setShowNames] = useState(false);
  const namesShown = useRef(false);

  // Where map point p must sit (tx, ty) so that it shows at screen position (sx, sy).
  const placement = (p: Point, z: number, sx: number, sy: number) => {
    const lx = (p[0] - VX) * k;
    const ly = (p[1] - VY) * k;
    return { tx: sx - W / 2 - (lx - W / 2) * z, ty: sy - H / 2 - (ly - H / 2) * z };
  };

  const clamp = (next: { tx: number; ty: number; zoom: number }) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom));
    // Keep at least half the screen covered by the map in each direction.
    const halfW = (W * z) / 2;
    const halfH = (H * z) / 2;
    const minTx = box.w * 0.5 - W / 2 - halfW;
    const maxTx = box.w * 0.5 - W / 2 + halfW;
    const minTy = box.h * 0.4 - H / 2 - halfH;
    const maxTy = box.h * 0.6 - H / 2 + halfH;
    return { zoom: z, tx: Math.min(maxTx, Math.max(minTx, next.tx)), ty: Math.min(maxTy, Math.max(minTy, next.ty)) };
  };

  const apply = (next: { tx: number; ty: number; zoom: number }, animate: boolean) => {
    const c = clamp(next);
    state.current = c;
    const readable = c.zoom * k >= 0.95;
    if (readable !== namesShown.current) {
      namesShown.current = readable;
      setShowNames(readable);
    }
    if (animate) {
      const cfg = { useNativeDriver: true, duration: 520, easing: Easing.out(Easing.cubic) };
      Animated.parallel([
        Animated.timing(tx, { toValue: c.tx, ...cfg }),
        Animated.timing(ty, { toValue: c.ty, ...cfg }),
        Animated.timing(zoom, { toValue: c.zoom, ...cfg }),
      ]).start();
    } else {
      tx.setValue(c.tx);
      ty.setValue(c.ty);
      zoom.setValue(c.zoom);
    }
  };

  const visibleCentre = () => ({ x: box.w / 2, y: (box.h - bottomInset) / 2 + 40 });

  const focus = (p: Point, z = state.current.zoom, animate = true) => {
    const { x, y } = visibleCentre();
    apply({ ...placement(p, z, x, y), zoom: z }, animate);
  };

  const recentre = () => focus(user ? user.point : campus.start.point, user ? 1 : 0.6);

  useImperativeHandle(ref, () => ({
    recentre,
    focus: (p, z) => focus(p, z),
    zoomBy: (factor) => {
      // Zoom around the middle of the visible area.
      const { x, y } = visibleCentre();
      const s = state.current;
      const lx = (x - s.tx - W / 2) / s.zoom + W / 2;
      const ly = (y - s.ty - H / 2) / s.zoom + H / 2;
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s.zoom * factor));
      apply({ zoom: z, tx: x - W / 2 - (lx - W / 2) * z, ty: y - H / 2 - (ly - H / 2) * z }, true);
    },
    fit: (line) => {
      if (!line.length || !box.w) return;
      const xs = line.map((p) => p[0]);
      const ys = line.map((p) => p[1]);
      const spanX = (Math.max(...xs) - Math.min(...xs)) * k + 90;
      const spanY = (Math.max(...ys) - Math.min(...ys)) * k + 140;
      const z = Math.min(2.2, Math.max(MIN_ZOOM, Math.min(box.w / spanX, (box.h - bottomInset - 60) / spanY)));
      focus([(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2], z);
    },
  }));

  // First layout: start centred on "you are here".
  const placed = useRef(false);
  useEffect(() => {
    if (box.w && !placed.current) {
      placed.current = true;
      focus(campus.start.point, 0.6, false);
    }
  }, [box.w]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Animated.spring(tilt, { toValue: tilted ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 140 }).start();
  }, [tilted, tilt]);

  // Drag with one finger, pinch with two. Taps are left for the buildings.
  const gesture = useRef({ startTx: 0, startTy: 0, startZoom: 1, startDist: 0, pinching: false });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4 || g.numberActiveTouches > 1,
        onPanResponderGrant: () => {
          const s = state.current;
          gesture.current = { startTx: s.tx, startTy: s.ty, startZoom: s.zoom, startDist: 0, pinching: false };
        },
        onPanResponderMove: (evt, g) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const d = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (!gesture.current.pinching) {
              gesture.current.pinching = true;
              gesture.current.startDist = d;
              gesture.current.startZoom = state.current.zoom;
              gesture.current.startTx = state.current.tx;
              gesture.current.startTy = state.current.ty;
              return;
            }
            const s0 = gesture.current;
            const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s0.startZoom * (d / s0.startDist)));
            const cx = box.w / 2;
            const cy = box.h / 2;
            const lx = (cx - s0.startTx - W / 2) / s0.startZoom + W / 2;
            const ly = (cy - s0.startTy - H / 2) / s0.startZoom + H / 2;
            apply({ zoom: z, tx: cx - W / 2 - (lx - W / 2) * z, ty: cy - H / 2 - (ly - H / 2) * z }, false);
          } else if (!gesture.current.pinching) {
            apply({ zoom: state.current.zoom, tx: gesture.current.startTx + g.dx, ty: gesture.current.startTy + g.dy }, false);
          }
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [box.w, box.h, k] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Pulsing ring around "you are here".
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // The route draws itself from start to finish, then a dash pattern flows along it.
  const routeLen = route ? length(route) : 0;
  const draw = useRef(new Animated.Value(1)).current;
  const flow = useRef(new Animated.Value(0)).current;
  const pin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!route) return;
    draw.setValue(1);
    pin.setValue(0);
    Animated.sequence([
      Animated.timing(draw, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.spring(pin, { toValue: 1, useNativeDriver: false, damping: 9, stiffness: 160 }),
    ]).start();
    const loop = Animated.loop(Animated.timing(flow, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [route, draw, flow, pin]);

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const selectedBlock = campus.blocks.find((b) => b.id === selectedId);
  const destination = route ? route[route.length - 1] : selectedBlock?.entrance ?? null;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} {...responder.panHandlers}>
      {box.w > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: W,
            height: H,
            transform: [
              { translateX: tx },
              { translateY: ty },
              { scale: zoom },
              { perspective: 1000 },
              { rotateX: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '48deg'] }) },
              { scale: tilt.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
            ],
          }}>
          <Svg width={W} height={H} viewBox={`0 0 ${VW} ${VH}`}>
            <Defs>
              <LinearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#4A4A4F" />
                <Stop offset="1" stopColor="#2A2A2E" />
              </LinearGradient>
              <LinearGradient id="roofSelected" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="1" stopColor="#D8D8DE" />
              </LinearGradient>
            </Defs>

            {/* campus grounds */}
            <Polygon points={pts(campus.boundary)} fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
            {campus.lawns.map((poly, i) => (
              <Polygon key={`lawn${i}`} points={pts(poly)} fill="rgba(170,180,175,0.10)" />
            ))}
            {campus.courts.map((poly, i) => (
              <Polygon key={`court${i}`} points={pts(poly)} fill="rgba(255,255,255,0.06)" />
            ))}
            {/* football pitch markings */}
            <Rect x={640 - VX} y={203 - VY} width={110} height={110} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} />
            <Circle cx={695 - VX} cy={258 - VY} r={16} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} />
            {campus.unlabelled.map((poly, i) => (
              <G key={`un${i}`}>
                <Polygon points={pts(poly, EXTRUDE)} fill="#0B0B0D" />
                <Polygon points={pts(poly)} fill="#232326" stroke="rgba(255,255,255,0.10)" strokeWidth={1.2} />
              </G>
            ))}
            <Circle cx={campus.roundabout.x - VX} cy={campus.roundabout.y - VY} r={campus.roundabout.r} fill="#2A2A2E" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />

            {/* buildings: dark wall first, then the roof on top */}
            {campus.blocks.map((b) => {
              const selected = b.id === selectedId;
              const faded = dimmed ? dimmed.has(b.id) : false;
              return (
                <G key={b.id} opacity={faded ? 0.28 : 1} onPress={() => onSelect(b.id)}>
                  <Polygon points={pts(b.polygon, EXTRUDE)} fill={selected ? '#9A9AA0' : '#08080A'} />
                  <Polygon
                    points={pts(b.polygon)}
                    fill={selected ? 'url(#roofSelected)' : 'url(#roof)'}
                    stroke={selected ? '#FFFFFF' : 'rgba(255,255,255,0.22)'}
                    strokeWidth={selected ? 2.5 : 1.3}
                  />
                  <SvgText
                    x={b.label[0] - VX}
                    y={b.label[1] - VY + 7}
                    fill={selected ? '#0A0A0B' : '#F5F5F7'}
                    fontSize={b.id.length > 2 ? 17 : 21}
                    fontFamily={fonts.headBold}
                    textAnchor="middle">
                    {b.id}
                  </SvgText>
                  {issueCounts[b.id] ? (
                    <G>
                      <Circle cx={b.label[0] - VX + 20} cy={b.label[1] - VY - 14} r={11} fill="#E8A050" stroke="#000" strokeWidth={2} />
                      <SvgText x={b.label[0] - VX + 20} y={b.label[1] - VY - 9.5} fill="#0A0A0B" fontSize={13} fontFamily={fonts.headBold} textAnchor="middle">
                        {issueCounts[b.id]}
                      </SvgText>
                    </G>
                  ) : null}
                </G>
              );
            })}

            {/* full institute names: inside the building where they fit, beside it where they don't */}
            {showNames
              ? campus.blocks.map((b) => {
                  const n = b.names;
                  const onWhite = b.id === selectedId && !n.outside;
                  const faded = dimmed ? dimmed.has(b.id) : false;
                  return (
                    <G key={`names-${b.id}`} opacity={faded ? 0.25 : 1} onPress={() => onSelect(b.id)}>
                      {n.lines.map((line, i) => (
                        <SvgText
                          key={i}
                          x={n.x - VX}
                          y={n.y - VY + i * n.size * 1.18}
                          fill={onWhite ? (i === 0 ? '#0A0A0B' : '#3A3A3C') : i === 0 ? '#F2F2F7' : '#AEAEB2'}
                          fontSize={n.size}
                          fontFamily={i === 0 ? fonts.headBold : fonts.head}
                          textAnchor={n.anchor}>
                          {line}
                        </SvgText>
                      ))}
                    </G>
                  );
                })
              : null}

            {/* gates and parking */}
            {campus.gates.map((g) => (
              <G key={g.id} onPress={() => onSelect(g.id)} opacity={dimmed ? 0.35 : 1}>
                <Rect x={g.point[0] - VX - 17} y={g.point[1] - VY - 11} width={34} height={22} rx={7} fill={g.id === selectedId ? '#FFFFFF' : '#1C1C1F'} stroke="rgba(255,255,255,0.35)" strokeWidth={1.2} />
                <SvgText x={g.point[0] - VX} y={g.point[1] - VY + 5} fill={g.id === selectedId ? '#0A0A0B' : '#C7C7CC'} fontSize={13} fontFamily={fonts.headBold} textAnchor="middle">
                  {g.id}
                </SvgText>
              </G>
            ))}
            {campus.parking.map(([x, y], i) => (
              <G key={`p${i}`} opacity={dimmed ? 0.35 : 0.9}>
                <Circle cx={x - VX} cy={y - VY} r={12} fill="#1C1C1F" stroke="rgba(255,255,255,0.4)" strokeWidth={1.2} />
                <SvgText x={x - VX} y={y - VY + 5} fill="#E5E5EA" fontSize={14} fontFamily={fonts.headBold} textAnchor="middle">
                  P
                </SvgText>
              </G>
            ))}

            {/* the route: soft glow, solid line drawn on, then dashes flowing towards the destination */}
            {route ? (
              <G>
                <Polyline points={pts(route)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
                <AnimatedPolyline
                  points={pts(route)}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${routeLen} ${routeLen}`}
                  strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [0, routeLen] })}
                />
                <AnimatedPolyline
                  points={pts(route)}
                  fill="none"
                  stroke="#0A0A0B"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray="2 16"
                  strokeDashoffset={flow.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })}
                  opacity={draw.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0.8, 0, 0] })}
                />
              </G>
            ) : null}

            {/* destination pin */}
            {destination ? (
              <AnimatedG opacity={route ? pin : 1}>
                <Path
                  d={`M ${destination[0] - VX} ${destination[1] - VY} c -14 -18 -18 -24 -18 -32 a 18 18 0 1 1 36 0 c 0 8 -4 14 -18 32 z`}
                  fill="#FFFFFF"
                  stroke="#000"
                  strokeWidth={2}
                />
                <Circle cx={destination[0] - VX} cy={destination[1] - VY - 32} r={6.5} fill="#0A0A0B" />
              </AnimatedG>
            ) : null}

            {/* you are here: your live GPS position when on campus, otherwise the Students' House */}
            {user && user.accuracyM ? (
              <Circle cx={user.point[0] - VX} cy={user.point[1] - VY} r={Math.min(120, user.accuracyM / campus.metresPerPixel)} fill="rgba(140,170,255,0.12)" stroke="rgba(140,170,255,0.35)" strokeWidth={1} />
            ) : null}
            {user && user.heading !== null ? (
              <G transform={`rotate(${user.heading} ${user.point[0] - VX} ${user.point[1] - VY})`}>
                <Path d={`M ${user.point[0] - VX} ${user.point[1] - VY - 30} l 11 20 l -11 -5 l -11 5 z`} fill="#FFFFFF" opacity={0.9} />
              </G>
            ) : null}
            <AnimatedCircle
              cx={(user ? user.point : campus.start.point)[0] - VX}
              cy={(user ? user.point : campus.start.point)[1] - VY}
              r={pulse.interpolate({ inputRange: [0, 1], outputRange: [10, 34] })}
              fill="rgba(255,255,255,0.35)"
              opacity={pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] })}
            />
            <Circle cx={(user ? user.point : campus.start.point)[0] - VX} cy={(user ? user.point : campus.start.point)[1] - VY} r={10} fill={user ? '#8AB4FF' : '#FFFFFF'} stroke="#000" strokeWidth={3} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
});
