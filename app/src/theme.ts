// Colours, fonts, spacing and motion for the whole app.
// The look is "glass spheres in the dark": a living wallpaper of large glass
// orbs on graphite, rim-lit in soft lavender and electric blue, with frosted
// glass panes on top. Screens never write a colour themselves; they read it here.

import type { Status } from './types';

const c = {
  bg: '#0D0D11',
  // Glass layers: white at low opacity, so the wallpaper glows through.
  surface: 'rgba(255,255,255,0.11)',
  surfaceAlt: 'rgba(255,255,255,0.18)',
  // Near-opaque graphite for places that must hide what is behind them (sheets, menus).
  solid: '#22222B',
  solidAlt: '#2E2E39',
  ink: '#FFFFFF',
  inkSoft: '#D6D5E2',
  inkFaint: '#A9A8BA',
  line: 'rgba(255,255,255,0.20)',
  lineStrong: 'rgba(235,232,255,0.42)',
  highlight: 'rgba(240,238,255,0.32)', // the bright top edge of a glass pane
  // The main action is polished silver with graphite text. ("tag" is kept as
  // the name for the primary colour so every component picks it up.)
  tag: '#FFFFFF',
  tagPressed: '#CFCDE2',
  tagInk: '#121217',
  tagSoft: 'rgba(215,212,250,0.20)',
  // The two lights of the theme.
  blue: '#5A82FF',
  lavender: '#C2BCF2',
  danger: '#FF7A72',
  dangerSoft: 'rgba(255,99,90,0.14)',
  overlay: 'rgba(6,6,9,0.7)',
};

// Status keeps a faint tint so it can be told apart at a glance: grey,
// blue, amber, green. Each status also has its own icon and text.
const status: Record<Status, { fg: string; bg: string; dot: string }> = {
  Reported: { fg: '#D2D1DE', bg: 'rgba(210,208,225,0.13)', dot: '#9A99AC' },
  Acknowledged: { fg: '#A8C7FA', bg: 'rgba(120,160,240,0.16)', dot: '#6E9BF0' },
  'In Progress': { fg: '#F8C88A', bg: 'rgba(240,170,90,0.16)', dot: '#E8A050' },
  Resolved: { fg: '#9FDDB0', bg: 'rgba(110,200,140,0.16)', dot: '#5DBB7A' },
};

// Each weight is its own font file, so we pick a family name instead of fontWeight.
export const fonts = {
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_600SemiBold',
  head: 'BarlowSemiCondensed_600SemiBold',
  headBold: 'BarlowSemiCondensed_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 22, pill: 999 };

// Content never grows wider than this, so tablets and laptops stay readable.
export const MAX_WIDTH = 760;

// The tab bar floats above the content, so scrolling lists leave this much room at the bottom.
export const TAB_CLEARANCE = 112;

// Springs used for presses and sheets, so every movement feels related.
export const motion = {
  press: { speed: 40, bounciness: 0 },
  release: { speed: 20, bounciness: 8 },
  sheet: { damping: 22, stiffness: 220, mass: 0.9 },
};

export type Colours = typeof c;

export function useTheme() {
  return { isDark: true, c, status };
}
