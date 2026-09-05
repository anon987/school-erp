import { supabase } from "../supabase/client";

/** Mirrors apps/web/src/lib/core/auth/currentStaff.ts's getCurrentStaffId -- see that file's
 *  header for why this is two queries (school_member -> staff), not an embedded-resource filter. */
export async function getCurrentStaffId(authUserId: string, schoolId: string): Promise<string | null> {
  const { data: member } = await supabase.from("school_member").select("id").eq("auth_user_id", authUserId).eq("school_id", schoolId).maybeSingle();
  const memberId = (member as unknown as { id: string } | null)?.id ?? null;
  if (!memberId) return null;

  const { data: staffRow } = await supabase.from("staff").select("id").eq("school_member_id", memberId).maybeSingle();
  return (staffRow as unknown as { id: string } | null)?.id ?? null;
}
