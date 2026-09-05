import { z } from "zod";
import type { createSupabaseAdminClient } from "../supabaseAdmin";
import { env } from "../env";

const inputSchema = z.object({
  guardianId: z.string().uuid(),
  schoolId: z.string().uuid(),
  email: z.string().trim().email(),
});

export type CreateGuardianPortalAccountInput = z.infer<typeof inputSchema>;

export interface CreateGuardianPortalAccountResult {
  status: "invited" | "already_active" | "email_in_use";
  guardianPortalAccountId?: string;
  /** A one-time signup-completion link (Supabase invite type). No automated send channel exists
   * yet (Communication, P2, isn't built) -- the caller is responsible for getting this to the
   * guardian (copy it into a WhatsApp message, SMS, or email) until it does. */
  inviteLink?: string;
}

/**
 * The account-creation primitive both Admissions (confirm -> new admission) and an admin's
 * per-guardian "Invite to portal" action call -- one mechanism, two triggers, same shape as
 * setMemberRoles.ts. Bulk-inviting all 2,200 already-imported guardians at once is deliberately
 * NOT built on top of this yet: without an automated send channel, generating 2,200 one-time
 * links an admin would have to copy-paste one at a time has no real value over inviting
 * on-demand. Revisit once Communication (P2) ships and can dispatch these automatically.
 *
 * `generateLink({type: "invite", ...})` both creates the auth user (if one doesn't already exist
 * for this email) AND returns the completion link in one call -- simpler than createUser +
 * a separate link-generation step, and it's the Supabase-documented way to (re)send an
 * unconfirmed user's signup link, which matters here: a guardian whose status is still
 * 'invited' (admin's copy of the first link was lost, or it expired) can be re-invited by
 * calling this again -- it is not a one-shot operation.
 *
 * Idempotent for an ACTIVE account: a guardian who has already completed signup is left alone,
 * never re-invited.
 *
 * Known limitation, deliberately not solved here: the same real person can exist as TWO separate
 * `guardian` rows (one per student they're linked to -- see the guardian table's migration
 * comment on why import doesn't dedupe across students) and could share one email across both.
 * `generateLink` fails on an email already registered to a DIFFERENT unconfirmed/confirmed user
 * in some GoTrue versions; this function surfaces that as 'email_in_use' rather than guessing
 * which existing auth user to link to. Resolving that (finding the existing auth user by email
 * and reusing it) is a deliberate dedupe pass this function does not attempt.
 */
export async function createGuardianPortalAccount(
  client: ReturnType<typeof createSupabaseAdminClient>,
  rawInput: CreateGuardianPortalAccountInput,
): Promise<CreateGuardianPortalAccountResult> {
  const input = inputSchema.parse(rawInput);

  const { data: existing, error: existingError } = await client
    .from("guardian_portal_account")
    .select("id, status")
    .eq("school_id", input.schoolId)
    .eq("guardian_id", input.guardianId)
    .maybeSingle();
  if (existingError) throw existingError;

  const existingRow = existing as unknown as { id: string; status: string } | null;
  if (existingRow && existingRow.status === "active") {
    return { status: "already_active", guardianPortalAccountId: existingRow.id };
  }

  const { data: linkData, error: linkError } = await client.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: {
      redirectTo: `${env.APP_URL}/portal/reset-password`,
      data: { guardian_id: input.guardianId },
    },
  });

  if (linkError) {
    return { status: "email_in_use" };
  }

  const authUserId = linkData.user.id;
  const inviteLink = linkData.properties.action_link;

  const { data: row, error: upsertError } = await client
    .from("guardian_portal_account")
    .upsert(
      { school_id: input.schoolId, guardian_id: input.guardianId, auth_user_id: authUserId, status: "invited" },
      { onConflict: "school_id,guardian_id" },
    )
    .select("id")
    .single();
  if (upsertError) throw upsertError;

  return { status: "invited", guardianPortalAccountId: (row as unknown as { id: string }).id, inviteLink };
}

/**
 * Flips the CALLER's own guardian_portal_account row(s) to 'active' -- called once, right after
 * the guardian completes their password-set flow (`/portal/reset-password`). Self-service only:
 * there is no guardianId input, it always acts on whichever row(s) match the verified caller's
 * own auth_user_id, so there's no resource-ownership check to get wrong.
 */
export async function activateGuardianPortalAccount(
  client: ReturnType<typeof createSupabaseAdminClient>,
  authUserId: string,
): Promise<void> {
  const { error } = await client
    .from("guardian_portal_account")
    .update({ status: "active" })
    .eq("auth_user_id", authUserId)
    .eq("status", "invited");
  if (error) throw error;
}
