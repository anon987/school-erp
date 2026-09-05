/**
 * Re-exports the shared document-template palette (lib/core/pdf/documentTemplates.ts) under this
 * module's original names -- kept so existing imports (actions.ts, receiptPdf.tsx,
 * ReceiptDesignSection.tsx, the receipt page, getSchoolBranding.ts) don't need to change. The
 * template definitions themselves now live in one place, shared with report cards and ID cards.
 */
export {
  DOCUMENT_TEMPLATES as RECEIPT_TEMPLATES,
  DEFAULT_DOCUMENT_TEMPLATE as DEFAULT_RECEIPT_TEMPLATE,
  getDocumentTemplate as getReceiptTemplate,
  type DocumentTemplateConfig as ReceiptTemplateConfig,
  type DocumentTemplateKey as ReceiptTemplateKey,
} from "@/lib/core/pdf/documentTemplates";
