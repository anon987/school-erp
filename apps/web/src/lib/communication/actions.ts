"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getAccessToken, getSession } from "@/lib/core/auth/session";
import { requirePermission } from "@/lib/core/auth/permissions";
import { workerEnv } from "@/lib/core/worker/env";
import { composeNoticeSchema } from "./schemas";

export interface ComposeNoticeState {
  error?: string;
  success?: boolean;
}

const LIST_PATH = "/communication/notices";
const PERMISSION = "school.manage_communication";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function resolveIndividualScopeId(
  schoolId: string,
  audienceKind: "guardians" | "staff",
  code: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();

  if (audienceKind === "guardians") {
    const { data } = await supabase.from("student").select("id").eq("school_id", schoolId).eq("admission_number", code).maybeSingle();
    const row = data as unknown as { id: string } | null;
    return row ? { id: row.id } : { error: `No student found with admission number "${code}".` };
  }

  const { data } = await supabase
    .from("staff")
    .select("school_member:school_member_id(auth_user_id)")
    .eq("school_id", schoolId)
    .eq("employee_code", code)
    .maybeSingle();
  const row = data as unknown as { school_member: { auth_user_id: string } | null } | null;
  return row?.school_member ? { id: row.school_member.auth_user_id } : { error: `No staff member found with employee code "${code}" (or they have no login account).` };
}

export async function composeNoticeAction(_prevState: ComposeNoticeState, formData: FormData): Promise<ComposeNoticeState> {
  await requirePermission(PERMISSION);
  const session = await getSession();
  if (!session?.schoolId) return { error: "No school in session." };

  const parsed = composeNoticeSchema.safeParse({
    title: readField(formData, "title"),
    body: readField(formData, "body"),
    audienceKind: readField(formData, "audienceKind"),
    channels: formData.getAll("channels"),
    scopeType: readField(formData, "scopeType"),
    scopeId: readField(formData, "scopeId"),
    individualCode: readField(formData, "individualCode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const input = parsed.data;

  let scopeId: string | null = null;
  if (input.scopeType === "individual") {
    if (!input.individualCode) return { error: "Enter an admission number or employee code." };
    const resolved = await resolveIndividualScopeId(session.schoolId, input.audienceKind, input.individualCode);
    if ("error" in resolved) return { error: resolved.error };
    scopeId = resolved.id;
  } else if (input.scopeType !== "whole_school") {
    if (!input.scopeId) return { error: "Select a target." };
    scopeId = input.scopeId;
  }

  const supabase = await createSupabaseServerClient();

  const { data: notice, error: noticeError } = await supabase
    .from("notice")
    .insert({
      school_id: session.schoolId,
      title: input.title,
      body: input.body,
      audience_kind: input.audienceKind,
      channels: input.channels,
      created_by_auth_user_id: session.authUserId,
    })
    .select("id")
    .single();
  if (noticeError || !notice) return { error: noticeError?.message ?? "Could not create notice." };
  const noticeId = (notice as unknown as { id: string }).id;

  const { error: audienceError } = await supabase
    .from("notice_audience")
    .insert({ school_id: session.schoolId, notice_id: noticeId, scope_type: input.scopeType, scope_id: scopeId });
  if (audienceError) return { error: audienceError.message };

  const { error: publishError } = await supabase.rpc("fn_publish_notice", { p_notice_id: noticeId, p_school_id: session.schoolId });
  if (publishError) return { error: publishError.message };

  // Best-effort: dispatching sms/whatsapp/email must never block "the notice was created and
  // published" -- a failed trigger here just means the worker's queue sits until the next
  // trigger (e.g. composing the next notice, or a future "retry" action).
  const needsDispatch = input.channels.some((c) => c !== "in_app");
  if (needsDispatch) {
    const accessToken = await getAccessToken();
    if (accessToken) {
      try {
        await fetch(`${workerEnv.WORKER_URL}/internal/notifications/dispatch`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "X-Internal-Secret": workerEnv.WORKER_INTERNAL_SECRET },
        });
      } catch (err) {
        console.error("[communication] notification dispatch trigger failed:", err);
      }
    }
  }

  revalidatePath(LIST_PATH);
  return { success: true };
}
