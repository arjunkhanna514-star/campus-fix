// Campus navigation. Find any block, gate or service on the MCAST campus,
// see what it is and how many problems are open there, and get walking
// directions with time, distance, arrival time and turn-by-turn steps.

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/src/api';
import { useAuth } from '@/src/auth';
import { CampusMap, MapHandle } from '@/src/components/CampusMap';
import { SatelliteView } from '@/src/components/SatelliteView';
import { calibrateTo, describe, isCalibrated, resetCalibration, useLiveLocation } from '@/src/location';
import { useToast } from '@/src/toast';
import { GlassEdge } from '@/src/components/Glass';
import { Mascot } from '@/src/components/Mascot';
import { StatusChip } from '@/src/components/StatusChip';
import { Button, Chip, Icon, IconButton, PressableScale, Screen, Txt } from '@/src/components/ui';
import { haptics } from '@/src/haptics';
import { WeatherEffects } from '@/src/components/WeatherEffects';
import { useT } from '@/src/i18n';
import { useWeather, WEATHER_ICON } from '@/src/weather';
import { blockById, blockByName, campus, CATEGORY_ICON, CATEGORY_LABEL, Category, findRoute, GPS_ID, Place, placeById, places, Point, pointInPolygon, Route } from '@/src/navigation';
import { getItem, setItem } from '@/src/storage';
import { fonts, radius, space, TAB_CLEARANCE, useTheme } from '@/src/theme';
import type { Issue } from '@/src/types';

type Filter = 'all' | Category | 'gates' | 'issues';

const FILTERS: { value: Filter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'map-outline' },
  { value: 'institute', label: 'Institutes', icon: CATEGORY_ICON.institute },
  { value: 'library', label: 'Library', icon: CATEGORY_ICON.library },
  { value: 'food', label: 'Cafeteria', icon: CATEGORY_ICON.food },
  { value: 'sport', label: 'Gyms', icon: CATEGORY_ICON.sport },
  { value: 'admin', label: 'Admin', icon: CATEGORY_ICON.admin },
  { value: 'services', label: 'Services', icon: CATEGORY_ICON.services },
  { value: 'gates', label: 'Gates', icon: 'gate' },
  { value: 'issues', label: 'Has issues', icon: 'alert-circle-outline' },
];

const RECENT_KEY = 'map_recent';
const SHEET_PLACE = 300;
const SHEET_ROUTE = 430;

function placeIcon(p: Place) {
  if (p.kind === 'gate') return 'gate';
  if (p.kind === 'start') return 'crosshairs-gps';
  return CATEGORY_ICON[p.category ?? 'institute'];
}

function clock(minutesFromNow: number) {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MapScreen() {
  const { block: blockParam } = useLocalSearchParams<{ block?: string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const weather = useWeather();
  const map = useRef<MapHandle>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromChoice, setFromChoice] = useState<string>('AUTO'); // AUTO = your live position when on campus
  const live = useLiveLocation(true);
  const { show } = useToast();
  const onCampus = live.status === 'live' && !!live.place?.onCampus && !!live.point;
  const fromId = fromChoice === 'AUTO' ? (onCampus ? GPS_ID : campus.start.id) : fromChoice;
  const fromPoint: Point | undefined = fromId === GPS_ID ? live.point : undefined;
  const [satellite, setSatellite] = useState(false);
  const [following, setFollowing] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  const [tilted, setTilted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  // Open problems per block, from the same reports the rest of the app shows.
  useFocusEffect(
    useCallback(() => {
      api<Issue[]>('/issues?sort=trending')
        .then(setIssues)
        .catch(() => {});
    }, [])
  );
  const openByBlock = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      const b = blockByName(issue.building);
      if (b && issue.status !== 'Resolved') counts[b.id] = (counts[b.id] || 0) + 1;
    }
    return counts;
  }, [issues]);

  const dimmed = useMemo(() => {
    if (filter === 'all') return null;
    const faded = new Set<string>();
    for (const b of campus.blocks) {
      const keep = filter === 'issues' ? !!openByBlock[b.id] : filter === 'gates' ? false : b.category === filter;
      if (!keep) faded.add(b.id);
    }
    return faded;
  }, [filter, openByBlock]);

  const selected = selectedId ? placeById(selectedId) ?? null : null;
  const sheetHeight = route ? SHEET_ROUTE : selected ? SHEET_PLACE : 0;

  // Opened from a report ("Show on map"): select that block straight away.
  useEffect(() => {
    if (blockParam && blockById(blockParam)) select(blockParam);
  }, [blockParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: string) => {
    const place = placeById(id);
    if (!place) return;
    haptics.impact();
    setRoute(null);
    setSelectedId(id);
    const block = blockById(id);
    map.current?.focus(block ? block.label : place.point, 0.95);
    rememberRecent(id);
  };

  const close = () => {
    haptics.tap();
    setSelectedId(null);
    setRoute(null);
  };

  const startRoute = (from = fromId) => {
    if (!selectedId) return;
    const r = findRoute(from, selectedId, from === GPS_ID ? live.point : undefined);
    if (!r) return;
    haptics.success();
    setRoute(r);
    setFollowing(from === GPS_ID);
    setTimeout(() => map.current?.fit(r.points), 60);
  };

  const changeFrom = (id: string) => {
    setFromOpen(false);
    setFromChoice(id);
    if (route) startRoute(id === 'AUTO' ? (onCampus ? GPS_ID : campus.start.id) : id);
  };

  // Walking with directions on: redraw the route from where you are now, keep you
  // in view, and celebrate when you reach the door.
  const liveKey = live.point ? `${Math.round(live.point[0])},${Math.round(live.point[1])}` : '';
  useEffect(() => {
    if (!route || fromId !== GPS_ID || !selectedId || !live.point) return;
    const destination = route.points[route.points.length - 1];
    const target = blockById(selectedId);
    const atDoor = Math.hypot(destination[0] - live.point[0], destination[1] - live.point[1]) * campus.metresPerPixel < 15;
    if (atDoor || (target && pointInPolygon(live.point, target.polygon))) {
      haptics.success();
      show({ kind: 'points', title: t('map.arrived'), body: placeById(selectedId)?.name, icon: 'map-marker-check' });
      setRoute(null);
      setFollowing(false);
      return;
    }
    const r = findRoute(GPS_ID, selectedId, live.point);
    if (r) setRoute(r);
    if (following) map.current?.focus(live.point);
  }, [liveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const centredOnce = useRef(false);
  useEffect(() => {
    if (centredOnce.current || !onCampus || !live.point || selectedId) return;
    centredOnce.current = true;
    map.current?.focus(live.point, 0.8);
  }, [onCampus, liveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const calibrate = async (id: string) => {
    setCalibrating(false);
    const place = placeById(id);
    const block = blockById(id);
    if (!place || live.lat === undefined || live.lng === undefined) return;
    await calibrateTo(live.lat, live.lng, block ? block.label : place.point);
    haptics.success();
    show({ kind: 'info', title: 'Position fixed', body: `The map now shows you at ${place.name}.`, icon: 'crosshairs-gps' });
  };

  const filterTo = (value: Filter) => {
    setFilter(value);
    if (value === 'gates' || value === 'all') return;
    // Bring the matching buildings into view.
    const match = campus.blocks.filter((b) => (value === 'issues' ? !!openByBlock[b.id] : b.category === value));
    if (match.length) map.current?.fit(match.flatMap((b) => b.polygon));
  };

  // Places looked at recently, for the search screen.
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    getItem(RECENT_KEY).then((saved) => saved && setRecent(JSON.parse(saved)));
  }, []);
  const rememberRecent = (id: string) => {
    setRecent((list) => {
      const next = [id, ...list.filter((x) => x !== id)].slice(0, 5);
      setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const selectedBlock = selectedId ? blockById(selectedId) : undefined;
  const issuesHere = selectedBlock ? issues.filter((i) => i.building === selectedBlock.name && i.status !== 'Resolved') : [];
  const preview = selectedId && !route ? findRoute(fromId, selectedId, fromPoint) : null;
  const fromPlace = fromId === GPS_ID ? { name: t('map.yourLocation') } : placeById(fromId);

  return (
    <Screen edges={[]} plain>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {satellite ? (
          <SatelliteView route={route?.points ?? null} selectedId={selectedId} follow={following} bottomInset={sheetHeight + TAB_CLEARANCE} onSelect={select} user={live.lat !== undefined && live.lng !== undefined ? { latitude: live.lat, longitude: live.lng } : null} />
        ) : (
          <CampusMap
            ref={map}
            selectedId={selectedId}
            route={route?.points ?? null}
            dimmed={dimmed}
            issueCounts={openByBlock}
            tilted={tilted}
            bottomInset={sheetHeight + TAB_CLEARANCE}
            user={onCampus && live.point ? { point: live.point, heading: live.heading ?? null, accuracyM: live.accuracyM } : null}
            onSelect={select}
          />
        )}

        {/* live weather over the campus: rain, sun, snow, fog, wind, night */}
        {satellite ? null : <WeatherEffects kind={weather.kind} season={weather.season} />}

        {/* search and filters */}
        <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
          <View style={styles.topSearch}>
          <PressableScale
            onPress={() => setSearchOpen(true)}
            accessibilityRole="search"
            accessibilityLabel={t('map.search')}
            style={[styles.search, { backgroundColor: c.solidAlt, borderColor: c.line }]}>
            <GlassEdge radius={radius.pill} />
            <Icon name="magnify" size={21} color={c.inkSoft} />
            <Txt tone="faint" style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
              {t('map.search')}
            </Txt>
            <View style={[styles.kbd, { borderColor: c.line }]}>
              <Txt variant="micro" tone="soft">
                {t('map.places', { n: campus.blocks.length })}
              </Txt>
            </View>
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/emergency')}
            feedback="impact"
            accessibilityRole="button"
            accessibilityLabel="Emergency help"
            style={[styles.sos, { borderColor: 'rgba(255,255,255,0.3)' }]}>
            <Txt variant="small" color="#FFFFFF" style={{ fontFamily: fonts.headBold }}>
              SOS
            </Txt>
          </PressableScale>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} keyboardShouldPersistTaps="handled">
            {FILTERS.map((f) => (
              <Chip
                key={f.value}
                label={f.value === 'issues' ? `${f.label}` : f.label}
                icon={f.icon}
                selected={filter === f.value}
                count={f.value === 'issues' ? Object.keys(openByBlock).length : undefined}
                onPress={() => filterTo(f.value)}
              />
            ))}
          </ScrollView>
          <View style={[styles.weatherPill, { backgroundColor: c.solidAlt, borderColor: c.line }]} accessibilityLabel={`${t(`weather.${weather.kind}`)}${weather.temperature !== null ? `, ${weather.temperature}°` : ''}`} testID="map-weather">
            <Icon name={WEATHER_ICON[weather.kind]} size={16} />
            <Txt variant="micro">
              {weather.temperature !== null ? `${weather.temperature}°  ` : ''}
              {t(`weather.${weather.kind}`)}
            </Txt>
          </View>
        </View>

        {/* map controls */}
        <View style={[styles.controls, { bottom: sheetHeight + TAB_CLEARANCE + space.md }]} pointerEvents="box-none">
          <PressableScale
            onPress={() => setSatellite((s) => !s)}
            feedback="impact"
            accessibilityRole="button"
            accessibilityLabel={satellite ? 'Switch to campus map' : 'Switch to satellite view'}
            style={[styles.control, { backgroundColor: satellite ? c.tag : c.solidAlt, borderColor: c.line }]}>
            <Icon name={satellite ? 'map-outline' : 'earth'} size={21} color={satellite ? c.tagInk : c.ink} />
          </PressableScale>
          {satellite ? null : (
          <>
          <PressableScale
            onPress={() => setTilted((t) => !t)}
            feedback="impact"
            accessibilityRole="button"
            accessibilityLabel={tilted ? 'Switch to flat map' : 'Switch to 3D map'}
            style={[styles.control, { backgroundColor: tilted ? c.tag : c.solidAlt, borderColor: c.line }]}>
            <Txt variant="bodyBold" color={tilted ? c.tagInk : c.ink}>
              {tilted ? '2D' : '3D'}
            </Txt>
          </PressableScale>
          {sheetHeight ? null : (
          <View style={[styles.zoomPill, { backgroundColor: c.solidAlt, borderColor: c.line }]}>
            <IconButton name="plus" label="Zoom in" onPress={() => map.current?.zoomBy(1.4)} />
            <View style={{ height: 1, backgroundColor: c.line, marginHorizontal: 10 }} />
            <IconButton name="minus" label="Zoom out" onPress={() => map.current?.zoomBy(1 / 1.4)} />
          </View>
          )}
          </>
          )}
          <PressableScale
            onPress={() => {
              if (onCampus) setFollowing(true);
              map.current?.recentre();
            }}
            accessibilityRole="button"
            accessibilityLabel="Re-centre on you"
            style={[styles.recentre, { backgroundColor: c.solidAlt, borderColor: c.line }]}>
            <Icon name="navigation-variant" size={18} />
            <Txt variant="small">{following ? t('map.following') : t('map.recentre')}</Txt>
          </PressableScale>
        </View>

        {/* bottom card */}
        {selected ? (
          <Sheet key={`${selected.id}-${route ? 'route' : 'place'}`} bottom={TAB_CLEARANCE - 18}>
            {route ? (
              <View style={{ gap: space.md }}>
                <SheetHeader icon={placeIcon(selected)} title={selected.name} subtitle={t('map.walkingDirections')} onClose={close} />
                <Pressable
                  onPress={() => {
                    haptics.select();
                    setFromOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Starting from ${fromPlace?.name}. Change`}
                  style={[styles.from, { backgroundColor: c.surface, borderColor: c.line }]}>
                  <Icon name="crosshairs-gps" size={17} color={c.inkSoft} />
                  <Txt variant="small" tone="soft">
                    From
                  </Txt>
                  <Txt variant="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
                    {fromPlace?.name}
                  </Txt>
                  <Icon name="chevron-down" size={20} color={c.inkSoft} />
                </Pressable>
                <View style={styles.stats}>
                  <Stat value={`${route.minutes} min`} label="Walk" />
                  <Stat value={`${route.metres} m`} label="Distance" />
                  <Stat value={clock(route.minutes)} label="Arrive" />
                </View>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                  {route.steps.map((step, i) => (
                    <View key={i} style={styles.step}>
                      <View style={[styles.stepIcon, { backgroundColor: i === route.steps.length - 1 ? c.tag : c.surfaceAlt }]}>
                        <Icon name={step.icon} size={17} color={i === route.steps.length - 1 ? c.tagInk : c.ink} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyBold">{step.title}</Txt>
                        <Txt variant="small" tone="soft" numberOfLines={2}>
                          {step.detail}
                        </Txt>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <Button label={t('map.endRoute')} icon="close" variant="outline" small onPress={() => setRoute(null)} />
              </View>
            ) : (
              <View style={{ gap: space.md }}>
                <SheetHeader icon={placeIcon(selected)} title={selected.name} subtitle={selected.subtitle} onClose={close} />
                <View style={styles.tags}>
                  <Tag text={selected.kind === 'gate' ? 'Gate' : selected.kind === 'start' ? 'You are here' : CATEGORY_LABEL[selected.category ?? 'institute']} />
                  {selectedBlock ? <Tag text={`Code ${selectedBlock.id}`} /> : null}
                  {selectedBlock ? <Tag text={issuesHere.length ? `${issuesHere.length} open ${issuesHere.length === 1 ? 'issue' : 'issues'}` : 'No open issues'} warn={issuesHere.length > 0} /> : null}
                </View>
                {preview ? (
                  <Txt variant="small" tone="soft">
                    About {preview.minutes} min walk, {preview.metres} m from {fromPlace?.name}
                  </Txt>
                ) : null}
                <View style={styles.actions}>
                  {selected.id !== fromId ? <Button label={t('map.directions')} icon="navigation-variant" onPress={() => startRoute()} style={{ flex: 1 }} /> : null}
                  {selectedBlock && user?.role === 'student' ? (
                    <Button
                      label={t('map.reportHere')}
                      icon="flag-outline"
                      variant="outline"
                      onPress={() => router.navigate({ pathname: '/report', params: { building: selectedBlock.name } })}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                </View>
                {issuesHere.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                    {issuesHere.slice(0, 5).map((issue) => (
                      <PressableScale
                        key={issue.id}
                        onPress={() => router.push(`/issue/${issue.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`${issue.title}. ${issue.status}. Open report.`}
                        style={[styles.issueChip, { backgroundColor: c.surface, borderColor: c.line }]}>
                        <Txt variant="small" numberOfLines={1} style={{ maxWidth: 190 }}>
                          {issue.title}
                        </Txt>
                        <StatusChip status={issue.status} />
                      </PressableScale>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            )}
          </Sheet>
        ) : (
          <Sheet bottom={TAB_CLEARANCE - 18} compact>
            <View style={styles.hint}>
              <Mascot mood={onCampus ? 'happy' : 'curious'} size={44} />
              <View style={{ flex: 1 }}>
                <Txt variant="bodyBold">{onCampus ? t('map.youAreHere') : t('map.whereTo')}</Txt>
                <Txt variant="small" tone="soft" numberOfLines={2}>
                  {live.status === 'live'
                    ? onCampus
                      ? describe(live)
                      : `${describe(live)}. Directions start from the Students' House.`
                    : live.status === 'denied'
                      ? 'Location is off. Directions start from the Students\' House.'
                      : live.status === 'unavailable'
                        ? 'Location is not available on this device.'
                        : 'Finding your position on campus...'}
                </Txt>
              </View>
              {live.status === 'denied' ? (
                <Button label="Turn on" small variant="outline" onPress={live.retry} />
              ) : onCampus ? (
                <Button label={t('map.fixPosition')} small variant="outline" onPress={() => setCalibrating(true)} />
              ) : null}
            </View>
          </Sheet>
        )}
      </View>

      <SearchOverlay
        visible={searchOpen}
        recent={recent}
        fromId={fromId}
        fromPoint={fromPoint}
        onClose={() => setSearchOpen(false)}
        onPick={(id) => {
          setSearchOpen(false);
          setTimeout(() => select(id), 120);
        }}
      />

      <Modal visible={fromOpen} transparent animationType="fade" onRequestClose={() => setFromOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setFromOpen(false)}>
          <View style={[styles.fromSheet, { backgroundColor: c.solid, borderColor: c.line, paddingBottom: insets.bottom + space.lg }]}>
            <Txt variant="heading" style={{ marginBottom: space.sm }}>
              Start from
            </Txt>
            <ScrollView style={{ maxHeight: 420 }}>
              {onCampus ? (
                <PlaceRow
                  place={{ id: 'AUTO', name: 'Your location', subtitle: `Live: ${describe(live)}`, kind: 'start', point: live.point as Point, keywords: '' }}
                  active={fromId === GPS_ID}
                  onPress={() => changeFrom('AUTO')}
                />
              ) : null}
              {places
                .filter((p) => p.id !== selectedId)
                .map((p) => (
                  <PlaceRow key={p.id} place={p} active={p.id === fromId} onPress={() => changeFrom(p.id)} />
                ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Calibration: say which building you are at, and the map lines up your GPS with it. */}
      <Modal visible={calibrating} transparent animationType="fade" onRequestClose={() => setCalibrating(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setCalibrating(false)}>
          <View style={[styles.fromSheet, { backgroundColor: c.solid, borderColor: c.line, paddingBottom: insets.bottom + space.lg }]}>
            <Txt variant="heading">Where are you right now?</Txt>
            <Txt variant="small" tone="soft" style={{ marginBottom: space.sm }}>
              Pick the building you are standing at. Your GPS position is lined up with it, and the map stays accurate from then on.
            </Txt>
            <ScrollView style={{ maxHeight: 380 }}>
              {places
                .filter((p) => p.kind !== 'start')
                .map((p) => (
                  <PlaceRow key={p.id} place={p} onPress={() => calibrate(p.id)} />
                ))}
            </ScrollView>
            {isCalibrated() ? <Button label="Undo calibration" variant="quiet" small onPress={() => { resetCalibration(); setCalibrating(false); }} /> : null}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

// ---------- pieces ----------

function Sheet({ children, bottom, compact }: { children: React.ReactNode; bottom: number; compact?: boolean }) {
  const { c } = useTheme();
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 210, mass: 0.9 }).start();
  }, [rise]);
  return (
    <Animated.View
      style={[
        styles.sheet,
        compact && { paddingVertical: space.md },
        {
          bottom,
          backgroundColor: c.solid,
          borderColor: c.lineStrong,
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }, { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
        },
      ]}>
      <GlassEdge radius={28} />
      {compact ? null : <View style={[styles.handle, { backgroundColor: c.lineStrong }]} />}
      {children}
    </Animated.View>
  );
}

function SheetHeader({ icon, title, subtitle, onClose }: { icon: string; title: string; subtitle: string; onClose: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.sheetHead}>
      <View style={[styles.placeIcon, { backgroundColor: c.tag }]}>
        <Icon name={icon} size={22} color={c.tagInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="title" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="small" tone="soft" numberOfLines={2}>
          {subtitle}
        </Txt>
      </View>
      <IconButton name="close" label="Close" onPress={onClose} glass />
    </View>
  );
}

function Tag({ text, warn }: { text: string; warn?: boolean }) {
  const { c, status } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: warn ? status['In Progress'].bg : c.surfaceAlt }]}>
      <Txt variant="micro" color={warn ? status['In Progress'].fg : c.ink}>
        {text}
      </Txt>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Txt variant="number">{value}</Txt>
      <Txt variant="micro" tone="soft">
        {label}
      </Txt>
    </View>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <Txt variant="bodyBold">{text}</Txt>;
  return (
    <Txt variant="body" tone="soft">
      {text.slice(0, at)}
      <Txt variant="bodyBold">{text.slice(at, at + q.length)}</Txt>
      {text.slice(at + q.length)}
    </Txt>
  );
}

function PlaceRow({ place, active, onPress, query = '', minutes, recent }: { place: Place; active?: boolean; onPress: () => void; query?: string; minutes?: number; recent?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      feedback="select"
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}. ${place.subtitle}`}
      style={[styles.placeRow, active && { backgroundColor: c.surfaceAlt }]}>
      <View style={[styles.rowIcon, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name={recent ? 'history' : placeIcon(place)} size={19} color={c.inkSoft} />
      </View>
      <View style={{ flex: 1 }}>
        <Highlight text={place.name} query={query} />
        <Txt variant="small" tone="soft" numberOfLines={1}>
          {place.subtitle}
        </Txt>
      </View>
      {minutes !== undefined ? (
        <Txt variant="small" tone="faint">
          {minutes} min
        </Txt>
      ) : active ? (
        <Icon name="check" size={20} />
      ) : null}
    </PressableScale>
  );
}

const SUGGESTIONS: { label: string; id: string; icon: string }[] = [
  { label: 'Library', id: 'MRC', icon: CATEGORY_ICON.library },
  { label: 'Cafeteria', id: 'S', icon: CATEGORY_ICON.food },
  { label: 'Administration', id: 'C', icon: CATEGORY_ICON.admin },
  { label: 'ICT', id: 'M', icon: 'laptop' },
  { label: 'Upper Gym', id: 'UG', icon: CATEGORY_ICON.sport },
  { label: 'Indoor parking', id: 'G4', icon: 'car-outline' },
];

function SearchOverlay({ visible, recent, fromId, fromPoint, onClose, onPick }: { visible: boolean; recent: string[]; fromId: string; fromPoint?: Point; onClose: () => void; onPick: (id: string) => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const weather = useWeather();
  const [query, setQuery] = useState('');
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setQuery('');
      slide.setValue(0);
      Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, slide]);

  const q = query.trim().toLowerCase();
  const results = q
    ? places.filter(
        (p) =>
          p.kind !== 'start' &&
          (p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q) || p.id.toLowerCase() === q || p.keywords.split(' ').some((word) => word.startsWith(q)))
      )
    : [];
  const minutesTo = (id: string) => findRoute(fromId, id, fromPoint)?.minutes;

  const pick = (id: string) => {
    Keyboard.dismiss();
    onPick(id);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.searchPage,
          {
            backgroundColor: c.solid,
            paddingTop: insets.top + space.sm,
            opacity: slide,
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          },
        ]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchField, { backgroundColor: c.surfaceAlt, borderColor: c.lineStrong }]}>
            <Icon name="magnify" size={21} color={c.inkSoft} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Where do you want to go?"
              placeholderTextColor={c.inkFaint}
              accessibilityLabel="Search places"
              returnKeyType="search"
              autoCorrect={false}
              cursorColor={c.ink}
              selectionColor={c.ink}
              onSubmitEditing={() => results[0] && pick(results[0].id)}
              style={[styles.searchInput, { color: c.ink }]}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
                <Icon name="close-circle" size={18} color={c.inkFaint} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
            <Txt variant="bodyBold">Cancel</Txt>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled">
          {q ? (
            results.length ? (
              <View>
                {results.map((p) => (
                  <PlaceRow key={p.id} place={p} query={query} minutes={minutesTo(p.id)} onPress={() => pick(p.id)} />
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
                <Mascot mood="curious" size={72} />
                <Txt variant="heading">No place called "{query.trim()}"</Txt>
                <Txt tone="soft" style={{ textAlign: 'center' }}>
                  Try a block letter like "M", or a word like "library" or "gym".
                </Txt>
              </View>
            )
          ) : (
            <>
              <View style={{ gap: space.sm }}>
                <View style={styles.sectionTitle}>
                  <Icon name="star-four-points-outline" size={16} color={c.inkSoft} />
                  <Txt variant="small" tone="soft">
                    Popular places
                  </Txt>
                </View>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Chip key={s.id} label={s.label} icon={s.icon} onPress={() => pick(s.id)} />
                  ))}
                </View>
              </View>
              {recent.length ? (
                <View style={{ gap: space.xs }}>
                  <View style={styles.sectionTitle}>
                    <Icon name="history" size={16} color={c.inkSoft} />
                    <Txt variant="small" tone="soft">
                      You looked at
                    </Txt>
                  </View>
                  {recent
                    .map((id) => placeById(id))
                    .filter((p): p is Place => !!p)
                    .map((p) => (
                      <PlaceRow key={p.id} place={p} recent minutes={minutesTo(p.id)} onPress={() => pick(p.id)} />
                    ))}
                </View>
              ) : null}
              <View style={{ gap: space.xs }}>
                <View style={styles.sectionTitle}>
                  <Icon name="office-building-outline" size={16} color={c.inkSoft} />
                  <Txt variant="small" tone="soft">
                    All buildings
                  </Txt>
                </View>
                {places
                  .filter((p) => p.kind === 'block')
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                  .map((p) => (
                    <PlaceRow key={p.id} place={p} minutes={minutesTo(p.id)} onPress={() => pick(p.id)} />
                  ))}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, gap: space.sm },
  weatherPill: { alignSelf: 'flex-start', marginLeft: space.lg, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  topSearch: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginHorizontal: space.lg },
  sos: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5383B' },
  search: { flex: 1, minWidth: 0, minHeight: 52, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, overflow: 'hidden' },
  kbd: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  filters: { paddingHorizontal: space.lg, gap: space.sm },
  controls: { position: 'absolute', right: space.lg, alignItems: 'flex-end', gap: space.sm },
  control: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  zoomPill: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  recentre: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1 },
  sheet: { position: 'absolute', left: space.md, right: space.md, borderRadius: 28, borderWidth: 1, padding: space.lg, paddingTop: space.md, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  placeIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: space.sm },
  issueChip: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 6 },
  from: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 46 },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: 6 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  fromSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: space.lg },
  searchPage: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  searchField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.lg, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: 8, outlineWidth: 0, outlineStyle: 'none' } as any,
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.md },
  rowIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
