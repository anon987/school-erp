/**
 * Minimal, dependency-free sRGB/HSL/contrast math. Used only by deriveBrandTokens -- kept
 * separate so the derivation algorithm itself reads as policy, not arithmetic.
 */

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(hsl: Hsl): string {
  const { r, g, b } = hslToRgb(hsl);
  return rgbToHex(r, g, b);
}

/** shadcn-style "H S% L%" string for a CSS custom property (wrapped in hsl(var(--x)) at use). */
export function hslToCssValue(hsl: Hsl): string {
  return `${round1(hsl.h)} ${round1(hsl.s)}% ${round1(hsl.l)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** WCAG contrast ratio between two hex colors, 1 (no contrast) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks whichever of pure white / near-black clears `minRatio` against `bgHex` by more margin. */
export function pickForegroundHex(bgHex: string, minRatio = 4.5): { hex: string; ratio: number; passes: boolean } {
  const white = "#FFFFFF";
  const black = "#0F172A"; // our --foreground, not pure #000 -- consistent with the rest of the palette
  const whiteRatio = contrastRatio(bgHex, white);
  const blackRatio = contrastRatio(bgHex, black);
  const best = whiteRatio >= blackRatio ? { hex: white, ratio: whiteRatio } : { hex: black, ratio: blackRatio };
  return { ...best, passes: best.ratio >= minRatio };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) =>
    Math.round(clamp(channel, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));

  let h: number;
  if (max === r) {
    h = 60 * (((g - b) / d) % 6);
  } else if (max === g) {
    h = 60 * ((b - r) / d + 2);
  } else {
    h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }: Hsl): { r: number; g: number; b: number } {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return { r: r + m, g: g + m, b: b + m };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
