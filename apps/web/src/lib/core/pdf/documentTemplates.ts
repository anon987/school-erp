/**
 * Fixed design tokens shared by every printable document this app generates (Fees receipts, Exam
 * report cards, ID cards) -- not user-customizable colors/layout, just a gallery of pre-built
 * looks each school picks one default from per document type. Originally built for receipts only
 * (lib/fees/receiptTemplates.ts re-exports from here for backward compatibility with existing
 * imports); pulled up to a shared module once report cards and ID cards needed the exact same
 * palette instead of three copies of the same five designs.
 *
 * `accent: null` marks the two black & white designs -- CLAUDE.md's "no hardcoded hex values in
 * components" is about the app's OWN themeable UI; these are fixed print-document identities
 * (the same reasoning a letterhead's ink color isn't a themeable token), so a literal hex per
 * template is the correct choice here, not an exception to work around.
 */
export interface DocumentTemplateConfig {
  key: string;
  label: string;
  description: string;
  /** null = pure black & white, no accent color anywhere. */
  accent: string | null;
  /** "boxed" = thick bordered frame (classic register style); "line" = minimal, thin rules only; "band" = colored header bar + colored table header row. */
  style: "boxed" | "line" | "band";
}

export const DOCUMENT_TEMPLATES: readonly DocumentTemplateConfig[] = [
  {
    key: "classic_bw",
    label: "Classic",
    description: "Black & white, bordered -- the traditional register-style look.",
    accent: null,
    style: "boxed",
  },
  {
    key: "minimal_bw",
    label: "Minimal",
    description: "Black & white, thin rules instead of boxes -- the least ink on the page.",
    accent: null,
    style: "line",
  },
  {
    key: "modern_blue",
    label: "Modern Blue",
    description: "Colorful -- a blue header band and matching accents.",
    accent: "#2563eb",
    style: "band",
  },
  {
    key: "emerald_green",
    label: "Emerald Green",
    description: "Colorful -- a green header band and matching accents.",
    accent: "#059669",
    style: "band",
  },
  {
    key: "amber_gold",
    label: "Amber Gold",
    description: "Colorful -- a warm amber header band and matching accents.",
    accent: "#b45309",
    style: "band",
  },
] as const;

export type DocumentTemplateKey = (typeof DOCUMENT_TEMPLATES)[number]["key"];

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplateKey = "classic_bw";

export function getDocumentTemplate(key: string): DocumentTemplateConfig {
  return DOCUMENT_TEMPLATES.find((t) => t.key === key) ?? DOCUMENT_TEMPLATES.find((t) => t.key === DEFAULT_DOCUMENT_TEMPLATE)!;
}
