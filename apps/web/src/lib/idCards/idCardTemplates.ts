/**
 * ID-card-specific design gallery. Deliberately separate from the shared
 * `lib/core/pdf/documentTemplates.ts` palette used by Fees receipts and Exam report cards --
 * those are plain letterhead-style A4 documents (a colored header band is enough variety), while
 * a physical ID card is a small photo-centric badge where schools expect real visual variety
 * (curved wave panels, diagonal ribbons, arched photo frames -- see the reference designs this
 * gallery was built from). Reusing the 3-style receipt palette here would have meant flattening
 * all of that back down to "boxed/line/band", which is why this is its own module and its own
 * DB-backed key set (`id_card_settings.student_template` / `staff_template`), not a reuse of
 * `DocumentTemplateKey`.
 *
 * `layout` drives which shape a card renders in `IdCardView.tsx` (HTML preview) and
 * `idCardPdf.tsx` (PDF) -- both interpret the same seven layout kinds identically so the on-screen
 * preview never drifts from the printed output. Orientation (horizontal/vertical) is an
 * orthogonal, independently-configurable setting -- every layout adapts to both.
 */
export interface IdCardTemplateConfig {
  key: string;
  label: string;
  description: string;
  primary: string;
  secondary: string;
  layout: "boxed" | "boxed_thin" | "band" | "diagonal" | "wave" | "arch" | "photo_badge";
}

export const ID_CARD_TEMPLATES: readonly IdCardTemplateConfig[] = [
  {
    key: "classic_frame",
    label: "Classic Frame",
    description: "Black & white, bordered -- a plain formal frame around photo and details.",
    primary: "#1f2937",
    secondary: "#1f2937",
    layout: "boxed",
  },
  {
    key: "minimal_line",
    label: "Minimal Line",
    description: "Black & white, thin rules only -- the least ink on the card.",
    primary: "#334155",
    secondary: "#334155",
    layout: "boxed_thin",
  },
  {
    key: "azure_band",
    label: "Azure Band",
    description: "A solid blue header band across the top.",
    primary: "#2563eb",
    secondary: "#1d4ed8",
    layout: "band",
  },
  {
    key: "emerald_band",
    label: "Emerald Band",
    description: "A solid green header band across the top.",
    primary: "#059669",
    secondary: "#047857",
    layout: "band",
  },
  {
    key: "sunrise_diagonal",
    label: "Sunrise Diagonal",
    description: "An orange diagonal ribbon under the header, logo top-left.",
    primary: "#ea580c",
    secondary: "#fed7aa",
    layout: "diagonal",
  },
  {
    key: "crimson_wave",
    label: "Crimson Wave",
    description: "A curved red panel with the photo overlapping the wave.",
    primary: "#dc2626",
    secondary: "#fecaca",
    layout: "wave",
  },
  {
    key: "royal_arch",
    label: "Royal Arch",
    description: "A purple arched header with a circular photo overlapping the curve.",
    primary: "#7c3aed",
    secondary: "#ddd6fe",
    layout: "arch",
  },
  {
    key: "golden_badge",
    label: "Golden Badge",
    description: "A circular badge-style photo frame with gold accents.",
    primary: "#b45309",
    secondary: "#fde68a",
    layout: "photo_badge",
  },
] as const;

export type IdCardTemplateKey = (typeof ID_CARD_TEMPLATES)[number]["key"];

export const DEFAULT_ID_CARD_TEMPLATE: IdCardTemplateKey = "classic_frame";

export function getIdCardTemplate(key: string): IdCardTemplateConfig {
  return ID_CARD_TEMPLATES.find((t) => t.key === key) ?? ID_CARD_TEMPLATES.find((t) => t.key === DEFAULT_ID_CARD_TEMPLATE)!;
}

export type IdCardOrientation = "horizontal" | "vertical";
export const DEFAULT_ID_CARD_ORIENTATION: IdCardOrientation = "horizontal";
