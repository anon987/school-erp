import { createSupabaseServerClient } from "../supabase/server";
import { getSession } from "./session";

/**
 * Maps the caller's identity to their own `staff` row, via `school_member` (staff.school_member_id
 * -> school_member.id -> auth_user_id). Two queries, not an embedded-resource filter: PostgREST
 * embedded-resource filters constrain which embedded rows come back, not which parent rows match,
 * so `staff.select('id, school_member:school_member_id(auth_user_id)').eq('school_member.auth_user_id', x)`
 * does not do what it looks like it does. `staff_one_row_per_school_member` (packages/db) makes
 * this mapping 1:1, so `maybeSingle()` is safe.
 *
 * Returns null for staff with no login (most support staff, per staff.sql's header) or for a
 * caller who isn't staff at all (e.g. a future parent/student role) -- callers decide what "no
 * staff record" means for them.
 */
export async function getCurrentStaffId(): Promise<string | null> {
  const session = await getSession();
  if (!session?.schoolId) return null;

  const supabase = await createSupabaseServerClient();

  const { data: member } = await supabase
    .from("school_member")
    .select("id")
    .eq("auth_user_id", session.authUserId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  const memberId = (member as unknown as { id: string } | null)?.id ?? null;
  if (!memberId) return null;

  const { data: staffRow } = await supabase.from("staff").select("id").eq("school_member_id", memberId).maybeSingle();
  return (staffRow as unknown as { id: string } | null)?.id ?? null;
}
