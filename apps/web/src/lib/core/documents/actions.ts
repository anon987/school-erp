"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "./types";

export interface PhotoActionState {
  error?: string;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
type OwnerType = "student" | "staff" | "application";

function managePermissionFor(ownerType: OwnerType): string {
  if (ownerType === "student") return "school.manage_students";
  if (ownerType === "staff") return "school.manage_staff";
  return "school.manage_admissions";
}

function profilePathFor(ownerType: OwnerType, ownerId: string): string {
  if (ownerType === "student") return `/people/students/${ownerId}`;
  if (ownerType === "staff") return `/people/staff/${ownerId}`;
  return `/people/admissions/${ownerId}`;
}

/**
 * Shared by both student and staff profile pages -- same permission-per-owner-type shape the
 * `document` table's own RLS policy already enforces (packages/db), bound via
 * `.bind(null, ownerType, ownerId)` from the client the same way NamedListSection's row actions
 * are bound to an id.
 */
export async function uploadPhotoAction(
  ownerType: OwnerType,
  ownerId: string,
  _prevState: PhotoActionState,
  formData: FormData,
): Promise<PhotoActionState> {
  await requirePermission(managePermissionFor(ownerType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "File is too large (max 10 MB)." };

  const supabase = await createSupabaseServerClient();
  const documentId = crypto.randomUUID();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  // {school_id}/{owner_type}/{owner_id}/{document_id}-{filename} -- the exact path convention
  // documents_bucket_insert's RLS policy checks segments [1]/[2] against, see
  // packages/db/supabase/migrations/20260903214111_documents.sql.
  const storagePath = `${session.schoolId}/${ownerType}/${ownerId}/${documentId}-photo.${extension}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("document").insert({
    id: documentId,
    school_id: session.schoolId,
    owner_type: ownerType,
    owner_id: ownerId,
    category: "photo",
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by_auth_user_id: session.authUserId,
  });
  if (insertError) {
    // Don't leave an orphaned file in Storage if the metadata row failed to write.
    await supabase.storage.from("documents").remove([storagePath]);
    return { error: insertError.message };
  }

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: `${ownerType}.photo_uploaded`,
    entity_type: ownerType,
    entity_id: ownerId,
    metadata: { document_id: documentId },
  });

  revalidatePath(profilePathFor(ownerType, ownerId));
  return {};
}

/** Keeps the original filename readable in storage_path while staying safe as a URL/path segment. */
function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  return cleaned || "file";
}

export async function uploadDocumentAction(
  ownerType: OwnerType,
  ownerId: string,
  _prevState: PhotoActionState,
  formData: FormData,
): Promise<PhotoActionState> {
  await requirePermission(managePermissionFor(ownerType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const category = formData.get("category");
  if (typeof category !== "string" || !DOCUMENT_CATEGORIES.includes(category as DocumentCategory)) {
    return { error: "Choose a document type." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) return { error: "Only JPG, PNG, WEBP, or PDF files are allowed." };
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "File is too large (max 10 MB)." };

  const supabase = await createSupabaseServerClient();
  const documentId = crypto.randomUUID();
  const storagePath = `${session.schoolId}/${ownerType}/${ownerId}/${documentId}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("document").insert({
    id: documentId,
    school_id: session.schoolId,
    owner_type: ownerType,
    owner_id: ownerId,
    category,
    storage_path: storagePath,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by_auth_user_id: session.authUserId,
  });
  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return { error: insertError.message };
  }

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: `${ownerType}.document_uploaded`,
    entity_type: ownerType,
    entity_id: ownerId,
    metadata: { document_id: documentId, category },
  });

  revalidatePath(profilePathFor(ownerType, ownerId));
  return {};
}

export async function deleteDocumentAction(
  ownerType: OwnerType,
  ownerId: string,
  documentId: string,
  _prevState: PhotoActionState,
  _formData: FormData,
): Promise<PhotoActionState> {
  await requirePermission(managePermissionFor(ownerType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { data: row, error: fetchError } = await supabase
    .from("document")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("school_id", session.schoolId)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!row) return { error: "Document not found." };

  const { storage_path: storagePath } = row as unknown as { id: string; storage_path: string };
  const { error: deleteRowError } = await supabase.from("document").delete().eq("id", documentId);
  if (deleteRowError) return { error: deleteRowError.message };

  await supabase.storage.from("documents").remove([storagePath]);

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: `${ownerType}.document_deleted`,
    entity_type: ownerType,
    entity_id: ownerId,
    metadata: { document_id: documentId },
  });

  revalidatePath(profilePathFor(ownerType, ownerId));
  return {};
}

export async function removePhotoAction(
  ownerType: OwnerType,
  ownerId: string,
  _prevState: PhotoActionState,
  _formData: FormData,
): Promise<PhotoActionState> {
  await requirePermission(managePermissionFor(ownerType));
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const supabase = await createSupabaseServerClient();
  const { data: latest, error: fetchError } = await supabase
    .from("document")
    .select("id, storage_path")
    .eq("school_id", session.schoolId)
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .eq("category", "photo")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!latest) return {};

  const row = latest as unknown as { id: string; storage_path: string };
  const { error: deleteRowError } = await supabase.from("document").delete().eq("id", row.id);
  if (deleteRowError) return { error: deleteRowError.message };

  await supabase.storage.from("documents").remove([row.storage_path]);

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: `${ownerType}.photo_removed`,
    entity_type: ownerType,
    entity_id: ownerId,
    metadata: { document_id: row.id },
  });

  revalidatePath(profilePathFor(ownerType, ownerId));
  return {};
}
