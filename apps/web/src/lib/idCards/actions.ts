"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { ID_CARD_TEMPLATES } from "./idCardTemplates";

export interface IdCardFormState {
  error?: string;
}

const PERMISSION = "school.manage_master_data";

export async function updateIdCardSettingsAction(_prevState: IdCardFormState, formData: FormData): Promise<IdCardFormState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const studentTemplate = formData.get("studentTemplate");
  if (typeof studentTemplate !== "string" || !ID_CARD_TEMPLATES.some((t) => t.key === studentTemplate)) return { error: "Invalid student ID card template." };

  const staffTemplate = formData.get("staffTemplate");
  if (typeof staffTemplate !== "string" || !ID_CARD_TEMPLATES.some((t) => t.key === staffTemplate)) return { error: "Invalid staff ID card template." };

  const orientation = formData.get("orientation");
  if (orientation !== "horizontal" && orientation !== "vertical") return { error: "Invalid card orientation." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("id_card_settings").upsert(
    {
      school_id: session.schoolId,
      student_template: studentTemplate,
      staff_template: staffTemplate,
      orientation,
      show_blood_group: formData.get("showBloodGroup") === "on",
      show_dob: formData.get("showDob") === "on",
      show_father_name: formData.get("showFatherName") === "on",
      show_mother_name: formData.get("showMotherName") === "on",
      show_address: formData.get("showAddress") === "on",
      show_contact: formData.get("showContact") === "on",
    },
    { onConflict: "school_id" },
  );
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "id_card_settings.updated",
    entity_type: "id_card_settings",
    entity_id: null,
    metadata: { studentTemplate, staffTemplate, orientation },
  });

  revalidatePath("/settings/master-data");
  return {};
}
