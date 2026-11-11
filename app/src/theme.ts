// Colours, fonts and spacing for the whole app, in light and dark.
// Screens never write a hex colour themselves; they read it from here.

import { useColorScheme } from 'react-native';
import type { Status } from './types';

const light = {
  bg: '#F2F4F3',
  surface: '#FFFFFF',
  surfaceAlt: '#E8ECEA',
  ink: '#18212B',
  inkSoft: '#55606C',
  inkFaint: '#87919B',
  line: '#D9DFDC',
  // The yellow of a maintenance tag. Used for the main action and "you voted".
  tag: '#FFC53D',
  tagPressed: '#F0B429',
  tagInk: '#2A2100',
  tagSoft: '#FFF2C7',
  danger: '#B42318',
  dangerSoft: '#FCE8E6',
  overlay: 'rgba(24, 33, 43, 0.55)',
};

const dark: typeof light = {
  bg: '#11161C',
  surface: '#1A2129',
  surfaceAlt: '#242D37',
  ink: '#EEF1F4',
  inkSoft: '#AAB3BD',
  inkFaint: '#74808C',
  line: '#2D3742',
  tag: '#FFC53D',
  tagPressed: '#F0B429',
  tagInk: '#2A2100',
  tagSoft: '#3B3110',
  danger: '#FF8A80',
  dangerSoft: '#3B1E1B',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

type StatusColours = { fg: string; bg: string; dot: string };

const statusLight: Record<Status, StatusColours> = {
  Reported: { fg: '#4A5560', bg: '#E8ECEA', dot: '#7B8794' },
  Acknowledged: { fg: '#1B4BB0', bg: '#E2EBFD', dot: '#2F6FED' },
  'In Progress': { fg: '#A04307', bg: '#FDE8D8', dot: '#E8590C' },
  Resolved: { fg: '#1C6631', bg: '#DCF2E2', dot: '#2F9E44' },
};

const statusDark: Record<Status, StatusColours> = {
  Reported: { fg: '#C3CAD2', bg: '#2A333D', dot: '#8F9AA6' },
  Acknowledged: { fg: '#A9C4FF', bg: '#1C2C4D', dot: '#5B8DEF' },
  'In Progress': { fg: '#FFBE94', bg: '#44260F', dot: '#F27A32' },
  Resolved: { fg: '#9DE0AE', bg: '#173622', dot: '#40B35A' },
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
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

// Content never grows wider than this, so tablets and laptops stay readable.
export const MAX_WIDTH = 760;

export type Colours = typeof light;

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  return {
    isDark,
    c: isDark ? dark : light,
    status: isDark ? statusDark : statusLight,
  };
}
