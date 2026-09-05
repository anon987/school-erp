import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { DocumentCategory, DocumentRecord } from "./types";

const SIGNED_URL_TTL_SECONDS = 3600;

type OwnerType = "student" | "staff" | "application";

const UUID_PREFIX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

/** Strips the `{document_id}-` prefix `uploadDocumentAction` writes into storage_path, leaving the
 * original filename for display. A plain `indexOf("-")` would stop at the first hyphen inside the
 * UUID itself, not the separator after it -- match the whole UUID shape instead. */
function fileNameFromStoragePath(storagePath: string): string {
  const lastSegment = storagePath.split("/").pop() ?? storagePath;
  return lastSegment.replace(UUID_PREFIX_PATTERN, "");
}

/**
 * `document` (packages/db) is an append-only log -- multiple photos per owner are legitimate
 * history, not a bug -- so "the current photo" isn't a column anywhere, it's derived as the most
 * recently uploaded row with category='photo'. Fetches every matching row for the given owners
 * (bounded by how many owners were asked for -- a class roster or the active staff list, not the
 * whole school) and keeps only the first (most recent, since ordered desc) per owner_id in JS.
 */
async function getLatestPhotoPaths(
  schoolId: string,
  ownerType: OwnerType,
  ownerIds: string[],
): Promise<Map<string, string>> {
  if (ownerIds.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document")
    .select("owner_id, storage_path, created_at")
    .eq("school_id", schoolId)
    .eq("owner_type", ownerType)
    .eq("category", "photo")
    .in("owner_id", ownerIds)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of (data ?? []) as unknown as { owner_id: string; storage_path: string }[]) {
    if (!map.has(row.owner_id)) map.set(row.owner_id, row.storage_path);
  }
  return map;
}

/** `documents` is a private bucket -- every display of a photo goes through a signed URL, never a stored/public path. */
async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("documents").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;

  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && !item.error) map.set(item.path ?? "", item.signedUrl);
  }
  return map;
}

/** Batch form -- one query for the paths, one batched Storage call for signed URLs, not N round trips for an N-student roster. */
export async function getCurrentPhotoUrls(schoolId: string, ownerType: OwnerType, ownerIds: string[]): Promise<Map<string, string>> {
  const pathByOwner = await getLatestPhotoPaths(schoolId, ownerType, ownerIds);
  const urlByPath = await getSignedUrls(Array.from(new Set(pathByOwner.values())));

  const result = new Map<string, string>();
  for (const [ownerId, path] of pathByOwner) {
    const url = urlByPath.get(path);
    if (url) result.set(ownerId, url);
  }
  return result;
}

export async function getCurrentPhotoUrl(schoolId: string, ownerType: OwnerType, ownerId: string): Promise<string | null> {
  const urls = await getCurrentPhotoUrls(schoolId, ownerType, [ownerId]);
  return urls.get(ownerId) ?? null;
}

/**
 * Unlike photos (one "current" derived by recency), id_proof/certificate/other documents are a
 * library -- every uploaded row is shown and individually deletable, not superseded by the next
 * upload in the same category.
 */
export async function listDocuments(schoolId: string, ownerType: OwnerType, ownerId: string): Promise<DocumentRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document")
    .select("id, category, storage_path, mime_type, size_bytes, created_at")
    .eq("school_id", schoolId)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .neq("category", "photo")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    category: DocumentCategory;
    storage_path: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
  }[];

  const urlByPath = await getSignedUrls(rows.map((r) => r.storage_path));

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    fileName: fileNameFromStoragePath(r.storage_path),
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
    url: urlByPath.get(r.storage_path) ?? null,
  }));
}
