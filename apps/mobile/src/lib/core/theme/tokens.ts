/**
 * Mirrors apps/web/src/app/globals.css exactly -- same H/S/L numbers, expressed as `hsl()`
 * strings (React Native's color parser accepts `hsl()`/`hsla()` natively, same as CSS), so this
 * app renders the identical palette web does rather than an approximated one. Do not add a color
 * anywhere in this app that isn't one of these tokens -- see CLAUDE.md and docs/design-system.md.
 *
 * --primary/--accent are the only tokens a school may override at runtime (per-school branding,
 * apps/web/src/lib/core/school/getSchoolBranding.ts) -- not wired up on mobile in this pass, see
 * ThemeProvider's header comment. Status colors (success/danger/warning/info) are fixed for every
 * school in every mode, never brand-derived -- StatusBadge is the only consumer.
 */

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export interface ColorTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  successSolid: string;
  danger: string;
  dangerForeground: string;
  dangerSolid: string;
  warning: string;
  warningForeground: string;
  warningSolid: string;
  info: string;
  infoForeground: string;
  infoSolid: string;
}

export const lightTokens: ColorTokens = {
  background: hsl(210, 40, 98),
  foreground: hsl(222.2, 47.4, 11.2),
  card: hsl(0, 0, 100),
  cardForeground: hsl(222.2, 47.4, 11.2),
  secondary: hsl(210, 40, 96.1),
  secondaryForeground: hsl(222.2, 47.4, 11.2),
  muted: hsl(210, 40, 96.1),
  mutedForeground: hsl(215.3, 19.3, 34.5),
  border: hsl(212.7, 26.8, 83.9),
  input: hsl(215, 20.2, 65.1),
  ring: hsl(222.2, 47.4, 11.2),
  primary: hsl(243.4, 75.3, 58.6),
  primaryForeground: hsl(0, 0, 100),
  accent: hsl(225.9, 100, 96.7),
  accentForeground: hsl(243.6, 54.5, 41.4),
  destructive: hsl(0, 72.2, 50.6),
  destructiveForeground: hsl(0, 0, 100),
  success: hsl(140.7, 84.2, 92.5),
  successForeground: hsl(142.8, 64.2, 24.1),
  successSolid: hsl(142.1, 76.2, 36.3),
  danger: hsl(0, 93.4, 94.1),
  dangerForeground: hsl(0, 70, 35.3),
  dangerSolid: hsl(0, 72.2, 50.6),
  warning: hsl(48, 96.5, 88.8),
  warningForeground: hsl(22.7, 82.5, 31.4),
  warningSolid: hsl(32.1, 94.6, 43.7),
  info: hsl(214.3, 94.6, 92.7),
  infoForeground: hsl(225.9, 70.7, 40.2),
  infoSolid: hsl(221.2, 83.2, 53.3),
};

export const darkTokens: ColorTokens = {
  background: hsl(220, 48.9, 8.4),
  foreground: hsl(210, 40.1, 96.1),
  card: hsl(220.9, 39.3, 11),
  cardForeground: hsl(210, 40.1, 96.1),
  secondary: hsl(217.2, 32.6, 17.5),
  secondaryForeground: hsl(210, 40.1, 96.1),
  muted: hsl(217.2, 32.6, 17.5),
  mutedForeground: hsl(215, 20.2, 65.1),
  border: hsl(215.3, 25, 26.7),
  input: hsl(215.3, 19.3, 34.5),
  ring: hsl(210, 40.1, 96.1),
  primary: hsl(243.4, 75.3, 58.6),
  primaryForeground: hsl(0, 0, 100),
  accent: hsl(242.2, 47.4, 34.3),
  accentForeground: hsl(228, 96.5, 88.8),
  destructive: hsl(0, 62.8, 30.6),
  destructiveForeground: hsl(0, 0, 100),
  success: hsl(143.8, 61.2, 20.2),
  successForeground: hsl(141.7, 76.7, 73.1),
  successSolid: hsl(142.1, 76.2, 36.3),
  danger: hsl(0, 62.8, 30.6),
  dangerForeground: hsl(0, 93.6, 81.8),
  dangerSolid: hsl(0, 72.2, 50.6),
  warning: hsl(21.7, 77.8, 26.5),
  warningForeground: hsl(46, 96.7, 64.5),
  warningSolid: hsl(32.1, 94.6, 43.7),
  info: hsl(224.4, 64.3, 32.9),
  infoForeground: hsl(211.7, 96.4, 78.4),
  infoSolid: hsl(221.2, 83.2, 53.3),
};

export const radius = 8; // --radius: 0.375rem ~= 6px at 16px base; 8px reads better at RN's default touch scale.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
