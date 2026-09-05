"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/core/auth/permissions";
import { getAccessToken, getSession } from "@/lib/core/auth/session";
import { workerEnv } from "@/lib/core/worker/env";
import { getAssignableRoles } from "./queries";

export interface UpdateMemberRolesState {
  error?: string;
  success?: boolean;
}

const PAGE_PATH = "/settings/members";

/**
 * Server-side authorization happens TWICE, deliberately, not redundantly: this check is the fast
 * failure before a network call is even made; apps/worker's HTTP endpoint re-checks independently
 * (via RLS + fn_has_permission under the caller's own forwarded token) because it cannot assume
 * this action's check actually ran -- the service-role mutation it guards is too sensitive to
 * trust a single layer. See apps/worker/src/http/membersRoutes.ts.
 *
 * Submits the FULL desired membership within the assignable (P1) role set, not a diff against
 * prior state: every checkbox in the form (MembersTable.tsx) becomes either addRoleKeys (checked)
 * or removeRoleKeys (unchecked), computed against the fixed assignable-role list, not against
 * whatever this member happened to hold before. Idempotent either way -- upserting a role they
 * already have, or deleting one they don't, are both no-ops -- so there's no need to re-fetch
 * "current roles" here just to compute a diff.
 */
export async function updateMemberRolesAction(
  schoolMemberId: string,
  _prevState: UpdateMemberRolesState,
  formData: FormData,
): Promise<UpdateMemberRolesState> {
  await requirePermission("school.manage_members");
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "Your session has expired -- sign in again." };

  const assignableRoles = await getAssignableRoles();
  const checkedKeys = new Set(formData.getAll("roleKeys").filter((v): v is string => typeof v === "string"));
  const addRoleKeys = assignableRoles.filter((r) => checkedKeys.has(r.key)).map((r) => r.key);
  const removeRoleKeys = assignableRoles.filter((r) => !checkedKeys.has(r.key)).map((r) => r.key);

  let response: Response;
  try {
    response = await fetch(`${workerEnv.WORKER_URL}/internal/school-members/${schoolMemberId}/roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Internal-Secret": workerEnv.WORKER_INTERNAL_SECRET,
      },
      body: JSON.stringify({ addRoleKeys, removeRoleKeys }),
    });
  } catch {
    return { error: "Could not reach the role-management service. Try again in a moment." };
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return { error: body?.error ?? `Role update failed (${response.status}).` };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}
