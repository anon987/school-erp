import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * @react-pdf/renderer's built-in base-14 fonts (Helvetica etc.) don't include the ₹ (Indian
 * Rupee, U+20B9) glyph -- it silently falls back to an unrelated character instead of erroring.
 * Bold is a SEPARATE font file, not a synthesized variant -- @react-pdf/renderer errors ("Could
 * not resolve font for Noto Sans, fontWeight 700") for any bold text if only the regular weight
 * is registered, confirmed by hitting exactly that error before bundling both weights. Shared by
 * every PDF document this app generates (Fees receipts, Exam report cards) -- one font asset,
 * one registration, not a copy per feature. See fonts/NOTICE.md for license/attribution.
 *
 * UNVERIFIED against a real production build: this path resolves correctly against the Next dev
 * server (confirmed by rendering and text-extracting real PDFs), but Next's production file
 * tracing doesn't always bundle a raw asset referenced via a runtime path.join the way it does a
 * static import or a literal fs.readFileSync path. Confirm the ₹ glyph still renders after the
 * first production deploy; if not, switch to `outputFileTracingIncludes` in next.config.js.
 */
let registered = false;

export const NOTO_SANS_FAMILY = "Noto Sans";

export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;
  Font.register({
    family: NOTO_SANS_FAMILY,
    fonts: [
      { src: path.join(process.cwd(), "src/lib/core/pdf/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
      { src: path.join(process.cwd(), "src/lib/core/pdf/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
    ],
  });
}
