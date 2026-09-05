import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type {
  AdmissionStageOption,
  AdmissionStageType,
  ApplicationDetail,
  ApplicationDocumentRow,
  ApplicationDocumentStatus,
  ApplicationListRow,
  EnquiryRow,
  EnquirySource,
  EnquiryStatus,
  StageEventRow,
} from "./types";

export async function getAdmissionStages(schoolId: string): Promise<AdmissionStageOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admission_stage")
    .select("id, name, sort_order, stage_type")
    .eq("school_id", schoolId)
    .order("sort_order");
  if (error) throw error;

  return ((data ?? []) as unknown as { id: string; name: string; sort_order: number; stage_type: AdmissionStageType }[]).map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sort_order,
    stageType: s.stage_type,
  }));
}

export async function getEnquiries(schoolId: string): Promise<EnquiryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enquiry")
    .select("id, first_name, last_name, phone, email, notes, source, status, created_at, class:class_interested_id(id, name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      first_name: string;
      last_name: string | null;
      phone: string | null;
      email: string | null;
      notes: string | null;
      source: EnquirySource;
      status: EnquiryStatus;
      created_at: string;
      class: { id: string; name: string } | null;
    }[]
  ).map((e) => ({
    id: e.id,
    firstName: e.first_name,
    lastName: e.last_name,
    phone: e.phone,
    email: e.email,
    classInterestedId: e.class?.id ?? null,
    classInterestedName: e.class?.name ?? null,
    source: e.source,
    status: e.status,
    notes: e.notes,
    createdAt: e.created_at,
  }));
}

export async function getApplications(schoolId: string, filters?: { stageId?: string }): Promise<ApplicationListRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("application")
    .select(
      "id, applicant_first_name, applicant_last_name, confirmed_student_id, created_at, class:class_applying_for_id(id, name), stage:current_stage_id(id, name, stage_type)",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (filters?.stageId) query = query.eq("current_stage_id", filters.stageId);

  const { data, error } = await query;
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      applicant_first_name: string;
      applicant_last_name: string;
      confirmed_student_id: string | null;
      created_at: string;
      class: { id: string; name: string } | null;
      stage: { id: string; name: string; stage_type: AdmissionStageType } | null;
    }[]
  ).map((a) => ({
    id: a.id,
    applicantFirstName: a.applicant_first_name,
    applicantLastName: a.applicant_last_name,
    classApplyingForId: a.class?.id ?? "",
    classApplyingForName: a.class?.name ?? "",
    currentStageId: a.stage?.id ?? "",
    currentStageName: a.stage?.name ?? "",
    currentStageType: a.stage?.stage_type ?? "in_progress",
    confirmedStudentId: a.confirmed_student_id,
    createdAt: a.created_at,
  }));
}

export async function getApplicationDetail(schoolId: string, applicationId: string): Promise<ApplicationDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("application")
    .select(
      `id, enquiry_id, academic_year_id, applicant_first_name, applicant_last_name, dob, gender, category_id,
       guardian_name, guardian_phone, guardian_email, confirmed_student_id, created_at,
       class:class_applying_for_id(id, name), stage:current_stage_id(id, name, stage_type)`,
    )
    .eq("school_id", schoolId)
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    enquiry_id: string | null;
    academic_year_id: string;
    applicant_first_name: string;
    applicant_last_name: string;
    dob: string | null;
    gender: "male" | "female" | "other" | null;
    category_id: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_email: string | null;
    confirmed_student_id: string | null;
    created_at: string;
    class: { id: string; name: string } | null;
    stage: { id: string; name: string; stage_type: AdmissionStageType } | null;
  };

  return {
    id: row.id,
    enquiryId: row.enquiry_id,
    academicYearId: row.academic_year_id,
    applicantFirstName: row.applicant_first_name,
    applicantLastName: row.applicant_last_name,
    dob: row.dob,
    gender: row.gender,
    categoryId: row.category_id,
    classApplyingForId: row.class?.id ?? "",
    classApplyingForName: row.class?.name ?? "",
    currentStageId: row.stage?.id ?? "",
    currentStageName: row.stage?.name ?? "",
    currentStageType: row.stage?.stage_type ?? "in_progress",
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
    guardianEmail: row.guardian_email,
    confirmedStudentId: row.confirmed_student_id,
    createdAt: row.created_at,
  };
}

export async function getStageEvents(schoolId: string, applicationId: string): Promise<StageEventRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("application_stage_event")
    .select("id, score, notes, occurred_at, stage:stage_id(id, name)")
    .eq("school_id", schoolId)
    .eq("application_id", applicationId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      score: number | null;
      notes: string | null;
      occurred_at: string;
      stage: { id: string; name: string } | null;
    }[]
  ).map((e) => ({
    id: e.id,
    stageId: e.stage?.id ?? "",
    stageName: e.stage?.name ?? "",
    score: e.score,
    notes: e.notes,
    occurredAt: e.occurred_at,
  }));
}

const SIGNED_URL_TTL_SECONDS = 3600;

export async function getApplicationDocuments(
  schoolId: string,
  applicationId: string,
): Promise<(ApplicationDocumentRow & { url: string | null })[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("application_document")
    .select("id, status, document_id, document_type:document_type_id(id, name, is_required), document:document_id(storage_path)")
    .eq("school_id", schoolId)
    .eq("application_id", applicationId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    status: ApplicationDocumentStatus;
    document_id: string | null;
    document_type: { id: string; name: string; is_required: boolean } | null;
    document: { storage_path: string } | null;
  }[];

  const paths = rows.map((r) => r.document?.storage_path).filter((p): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed, error: signedError } = await supabase.storage.from("documents").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signedError) throw signedError;
    for (const item of signed ?? []) {
      if (item.signedUrl && !item.error) urlByPath.set(item.path ?? "", item.signedUrl);
    }
  }

  return rows
    .map((d) => ({
      id: d.id,
      documentTypeId: d.document_type?.id ?? "",
      documentTypeName: d.document_type?.name ?? "",
      isRequired: d.document_type?.is_required ?? false,
      status: d.status,
      documentId: d.document_id,
      url: d.document?.storage_path ? (urlByPath.get(d.document.storage_path) ?? null) : null,
    }))
    .sort((a, b) => a.documentTypeName.localeCompare(b.documentTypeName));
}
