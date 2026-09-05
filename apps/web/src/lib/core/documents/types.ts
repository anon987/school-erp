export const DOCUMENT_CATEGORIES = ["id_proof", "certificate", "other"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  id_proof: "ID proof",
  certificate: "Certificate",
  other: "Other",
};

export interface DocumentRecord {
  id: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string | null;
}
