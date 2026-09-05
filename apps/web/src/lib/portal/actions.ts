"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { emailPasswordStrategy } from "@schoolerp/integrations";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getPortalAccessToken, getPortalSession, requirePortalSession } from "@/lib/core/auth/portalSession";
import { workerEnv } from "@/lib/core/worker/env";
import { isoDateSchema } from "@/lib/core/validation";

export interface PortalFormState {
  error?: string;
}

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function portalSignInAction(_prevState: PortalFormState, formData: FormData): Promise<PortalFormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Could not sign in. Check your email and password." };

  const supabase = await createSupabaseServerClient();
  const result = await emailPasswordStrategy.signIn(supabase, parsed.data);
  if (!result.ok) return { error: "Could not sign in. Check your email and password." };

  const session = await getPortalSession();
  if (!session) {
    await supabase.auth.signOut();
    return { error: "This account is not registered for parent portal access." };
  }

  redirect("/portal");
}

export async function portalSignOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}

const setPasswordSchema = z
  .object({ password: z.string().min(8, "Password must be at least 8 characters"), confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

/**
 * Completes the invite flow: the guardian arrived here via Supabase's invite-link redirect (see
 * app/(portal)/portal/reset-password/route.ts, which exchanges the link's code for a session
 * before this page ever renders), so `supabase.auth.updateUser` already has a session to act on.
 * Activation (guardian_portal_account.status -> 'active') goes through apps/worker -- that
 * table has no update grant for `authenticated` at all (CLAUDE.md: service-role only), matching
 * every other write to it.
 */
export async function setPortalPasswordAction(_prevState: PortalFormState, formData: FormData): Promise<PortalFormState> {
  const parsed = setPasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) return { error: updateError.message };

  const accessToken = await getPortalAccessToken();
  if (accessToken) {
    try {
      await fetch(`${workerEnv.WORKER_URL}/internal/portal/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "X-Internal-Secret": workerEnv.WORKER_INTERNAL_SECRET },
      });
    } catch (err) {
      console.error("[portal] activation request failed:", err);
    }
  }

  redirect("/portal");
}

const leaveApplicationSchema = z
  .object({ fromDate: isoDateSchema, toDate: isoDateSchema, reason: z.string().trim().min(1, "Reason is required") })
  .refine((v) => v.toDate >= v.fromDate, { message: "End date must be on or after the start date", path: ["toDate"] });

export async function submitLeaveApplicationAction(
  studentId: string,
  _prevState: PortalFormState,
  formData: FormData,
): Promise<PortalFormState> {
  const session = await requirePortalSession();

  const parsed = leaveApplicationSchema.safeParse({
    fromDate: formData.get("fromDate"),
    toDate: formData.get("toDate"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("student_leave_application").insert({
    school_id: session.schoolId,
    student_id: studentId,
    guardian_id: session.guardianId,
    from_date: parsed.data.fromDate,
    to_date: parsed.data.toDate,
    reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidatePath(`/portal/students/${studentId}/leave`);
  return {};
}
