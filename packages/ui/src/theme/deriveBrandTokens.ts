import { clamp, contrastRatio, hexToHsl, hslToCssValue, hslToHex, pickForegroundHex, type Hsl } from "./color";

export interface ModeTokens {
  primary: string; // CSS custom property value, e.g. "243.4 75.3% 45%"
  primaryForeground: string;
  accent: string;
  accentForeground: string;
}

export interface BrandTokens {
  light: ModeTokens;
  dark: ModeTokens;
  /** Set when the input hue had to be moved to clear WCAG AA. Shown back to the school on save. */
  adjustmentNote: string | null;
}

const AA_NORMAL_TEXT = 4.5;

/**
 * The ONE per-school input is a hue (docs/schoolerp_techstack.md §7a: "one brand hue in, a
 * validated ramp out"). This does not use the school's exact lightness/saturation verbatim for
 * the primary swatch -- it clamps lightness into a band that reads well as a button fill, then
 * makes sure a foreground text color clears AA against it, nudging lightness further if a
 * school's chosen hue genuinely can't clear AA at any point in the usable band (rare, but some
 * hues -- yellows especially -- can't hit AA with white OR near-black at moderate lightness).
 *
 * Status colours (success/danger/warning/info) never pass through this function -- they are
 * fixed constants in globals.css, full stop.
 */
export function deriveBrandTokens(brandHex: string): BrandTokens {
  const input = hexToHsl(brandHex);
  let adjustmentNote: string | null = null;

  const primaryLight = resolvePrimary(input, { min: 35, max: 50 }, () => {
    adjustmentNote = notePrimaryAdjusted(brandHex, "light");
  });
  const primaryDark = resolvePrimary(input, { min: 45, max: 60 }, () => {
    adjustmentNote = adjustmentNote ?? notePrimaryAdjusted(brandHex, "dark");
  });

  const accentLight = resolveAccent(input, { s: Math.min(input.s, 45), l: 96 });
  const accentDark = resolveAccent(input, { s: Math.min(input.s, 55), l: 26 });

  return {
    light: {
      primary: hslToCssValue(primaryLight.hsl),
      primaryForeground: hexToHslCssValue(primaryLight.foreground),
      accent: hslToCssValue(accentLight.hsl),
      accentForeground: hexToHslCssValue(accentLight.foreground),
    },
    dark: {
      primary: hslToCssValue(primaryDark.hsl),
      primaryForeground: hexToHslCssValue(primaryDark.foreground),
      accent: hslToCssValue(accentDark.hsl),
      accentForeground: hexToHslCssValue(accentDark.foreground),
    },
    adjustmentNote,
  };
}

function resolvePrimary(
  input: Hsl,
  band: { min: number; max: number },
  onAdjusted: () => void,
): { hsl: Hsl; foreground: string } {
  const l = clamp(input.l, band.min, band.max);
  let hsl: Hsl = { h: input.h, s: Math.max(input.s, 40), l };
  let hex = hslToHex(hsl);
  let picked = pickForegroundHex(hex, AA_NORMAL_TEXT);

  if (!picked.passes) {
    onAdjusted();
    // Walk lightness toward the middle of the band in 2% steps until a foreground clears AA,
    // or we exhaust the band -- at which point we take the best result found rather than loop
    // forever on a hue that structurally can't clear AA at any lightness in range.
    const mid = (band.min + band.max) / 2;
    const direction = l > mid ? -1 : 1;
    let best = picked;
    let bestHex = hex;
    for (let step = 1; step <= 10; step += 1) {
      const candidateL = clamp(l + direction * step * 2, band.min, band.max);
      const candidateHex = hslToHex({ ...hsl, l: candidateL });
      const candidate = pickForegroundHex(candidateHex, AA_NORMAL_TEXT);
      if (candidate.ratio > best.ratio) {
        best = candidate;
        bestHex = candidateHex;
        hsl = { ...hsl, l: candidateL };
      }
      if (candidate.passes) break;
    }
    hex = bestHex;
    picked = best;
  }

  return { hsl, foreground: picked.hex };
}

function resolveAccent(input: Hsl, target: { s: number; l: number }): { hsl: Hsl; foreground: string } {
  const hsl: Hsl = { h: input.h, s: target.s, l: target.l };
  const hex = hslToHex(hsl);
  const picked = pickForegroundHex(hex, AA_NORMAL_TEXT);
  return { hsl, foreground: picked.hex };
}

function hexToHslCssValue(hex: string): string {
  return hslToCssValue(hexToHsl(hex));
}

function notePrimaryAdjusted(originalHex: string, mode: "light" | "dark"): string {
  return `Your brand colour (${originalHex}) needed adjusting for ${mode} mode so button text stays readable (WCAG AA).`;
}

// Re-exported for anything that wants to sanity-check a specific pair independently of a full
// derivation (e.g. a future branding-editor live preview).
export { contrastRatio };
