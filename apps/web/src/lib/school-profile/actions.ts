"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { schoolProfileInputSchema } from "./schemas";

export interface SchoolProfileFormState {
  error?: string;
  success?: boolean;
}

const PAGE_PATH = "/settings/school";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updateSchoolProfileAction(
  _prevState: SchoolProfileFormState,
  formData: FormData,
): Promise<SchoolProfileFormState> {
  await requirePermission("school.manage_profile");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = schoolProfileInputSchema.safeParse({
    legalName: readField(formData, "legalName"),
    board: readField(formData, "board"),
    address: readField(formData, "address"),
    contactPhone: readField(formData, "contactPhone"),
    contactEmail: readField(formData, "contactEmail"),
    gstin: readField(formData, "gstin"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error: updateError } = await supabase
    .from("school")
    .update({
      legal_name: parsed.data.legalName,
      board: parsed.data.board || null,
      address: parsed.data.address || null,
      contact_phone: parsed.data.contactPhone || null,
      contact_email: parsed.data.contactEmail || null,
      gstin: parsed.data.gstin || null,
    })
    .eq("id", session.schoolId);
  if (updateError) return { error: updateError.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "school_profile.updated",
    entity_type: "school",
    entity_id: session.schoolId,
    metadata: {},
  });

  revalidatePath(PAGE_PATH);
  return { success: true };
}
