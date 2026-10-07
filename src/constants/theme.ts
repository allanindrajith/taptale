import '@/global.css';
import { Platform } from 'react-native';

export const WiseColors = {
  primary: '#1d5c38',          // Deep refined forest green (no neon/highlighter)
  forestGreen: '#1d5c38',      // Forest green brand color alias
  primaryHover: '#174d2e',
  primaryActive: '#123d24',
  primaryPale: '#eaf4ee',      // Soft muted sage-green tint
  primaryNeutral: '#cbe4d4',
  onPrimary: '#ffffff',        // Crisp white text on dark green
  ink: '#111813',
  inkDeep: '#0c2415',
  body: '#47544b',
  mute: '#7a8a7f',
  canvas: '#ffffff',
  canvasSoft: '#f2f5f3',       // Clean, soft muted background
  forestBorder: '#dbe3dd',
  positive: '#1d5c38',
  positiveDeep: '#0c2415',
  accentOrange: '#e67e22',
  accentCyan: '#0284c7',
} as const;

/**
 * Calm & minimal palette used by the redesigned screens.
 * Warm paper background + a single forest-green accent.
 */
export const Palette = {
  bg: '#F6F5F1',          // warm paper
  surface: '#FFFFFF',
  surfaceMuted: '#EFEEE8',
  ink: '#131A15',
  inkSoft: '#3E4842',
  mute: '#858D88',
  hairline: '#E5E3DC',
  green: '#1d5c38',
  greenDeep: '#123d24',
  greenTint: '#E7F1EA',
  gold: '#B98A3E',        // "collected" accent
  goldTint: '#F6EEDD',
  danger: '#B4442F',
  dangerTint: '#F8E7E3',
  overlay: 'rgba(10, 16, 12, 0.45)',
} as const;

export const Type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.8, color: Palette.ink },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4, color: Palette.ink },
  heading: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2, color: Palette.ink },
  body: { fontSize: 15, lineHeight: 22, color: Palette.inkSoft },
  small: { fontSize: 13, color: Palette.mute },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.6, color: Palette.mute },
};

export const Colors = {
  light: {
    text: WiseColors.ink,
    background: WiseColors.canvasSoft,
    backgroundElement: WiseColors.canvas,
    backgroundSelected: WiseColors.primaryPale,
    textSecondary: WiseColors.body,
    border: WiseColors.forestBorder,
  },
  dark: {
    text: '#ffffff',
    background: '#0d160c',
    backgroundElement: '#152414',
    backgroundSelected: 'rgba(29, 92, 56, 0.2)',
    textSecondary: '#a3baa0',
    border: '#233821',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 64,
  // Backward compatibility
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Rounded = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Fonts = {
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  sans: Platform.select({ ios: 'System', default: 'sans-serif' }),
};

