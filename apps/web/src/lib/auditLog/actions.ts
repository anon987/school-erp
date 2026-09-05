"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";

export interface SecurityPolicyFormState {
  error?: string;
}

/**
 * Stores the policy. `session_expiry_minutes` is enforced by lib/core/supabase/middleware.ts on
 * every request (soft app-level check against the JWT's `iat`, not a change to Supabase Auth's
 * project-wide JWT lifetime). `min_password_length` is NOT enforced -- there is no
 * password-set/invite/change flow in this codebase to check it against. Flagged in the UI, not
 * just this comment, so nobody assumes it's already protecting anything.
 */
export async function updateSecurityPolicyAction(_prevState: SecurityPolicyFormState, formData: FormData): Promise<SecurityPolicyFormState> {
  await requirePermission("school.manage_members");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const minLengthRaw = formData.get("minPasswordLength");
  const minPasswordLength = Number(minLengthRaw);
  if (!Number.isFinite(minPasswordLength) || minPasswordLength < 6) return { error: "Minimum password length must be at least 6." };

  const expiryRaw = formData.get("sessionExpiryMinutes");
  const expiryText = typeof expiryRaw === "string" ? expiryRaw.trim() : "";
  const sessionExpiryMinutes = expiryText ? Number(expiryText) : null;
  if (sessionExpiryMinutes !== null && (!Number.isFinite(sessionExpiryMinutes) || sessionExpiryMinutes < 15)) {
    return { error: "Session expiry must be at least 15 minutes, or left blank." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("school_security_policy")
    .upsert({ school_id: session.schoolId, min_password_length: minPasswordLength, session_expiry_minutes: sessionExpiryMinutes }, { onConflict: "school_id" });
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    school_id: session.schoolId,
    actor_auth_user_id: session.authUserId,
    action: "security_policy.updated",
    entity_type: "school_security_policy",
    entity_id: null,
    metadata: { minPasswordLength, sessionExpiryMinutes },
  });

  revalidatePath("/settings/audit-log");
  return {};
}
