import { supabase } from "../supabase/client";

const SIGNED_URL_TTL_SECONDS = 3600;

type OwnerType = "student" | "staff" | "application";

/** Port of apps/web/src/lib/core/documents/queries.ts's getCurrentPhotoUrls -- only the piece the
 *  roster/student-list screens need (avatars). See that file's header comment for why "current
 *  photo" is derived (most recent `document` row with category='photo'), not a column, and why
 *  every photo display goes through a signed URL (the `documents` bucket is private). */
async function getLatestPhotoPaths(schoolId: string, ownerType: OwnerType, ownerIds: string[]): Promise<Map<string, string>> {
  if (ownerIds.length === 0) return new Map();

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

async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const { data, error } = await supabase.storage.from("documents").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;

  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && !item.error) map.set(item.path ?? "", item.signedUrl);
  }
  return map;
}

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
