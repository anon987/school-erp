import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type {
  AcademicYearRow,
  AdmissionDocumentTypeRow,
  AdmissionStageRow,
  AdmissionStageType,
  ClassWithSections,
  PeriodRow,
  GradeBandRow,
  HolidayRow,
  HpcCriterionCategory,
  HpcCriterionRow,
  HpcRatingScaleRow,
  MasterDataOverview,
  NamedRow,
  SectionRow,
  StudentCategoryRow,
  SubjectRow,
} from "./types";

const toNamedRows = (data: { id: string; name: string }[] | null): NamedRow[] =>
  (data ?? []).map((r) => ({ id: r.id, name: r.name }));

/**
 * Everything the master-data settings page needs, in one call -- this is an admin config screen
 * a clerk moves through top to bottom in one sitting, not a paginated directory, so there's no
 * reason to shape this as N separate page loads the way Students/Staff directories are.
 */
/** Narrower than getMasterDataOverview -- for call sites (Portal's timetable tab) that only need
 *  the bell schedule, not the whole settings-page payload. Portal is parents on low-end phones
 *  over patchy 4G (CLAUDE.md perf expectations); fetching classes/subjects/departments/etc. just
 *  to read `.periods` off the result would be wasteful there. */
export async function getPeriods(schoolId: string): Promise<PeriodRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("period").select("id, period_number, label, start_time, end_time, is_break").eq("school_id", schoolId).order("period_number");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; period_number: number; label: string; start_time: string; end_time: string; is_break: boolean }[]).map(
    (p) => ({ id: p.id, periodNumber: p.period_number, label: p.label, startTime: p.start_time.slice(0, 5), endTime: p.end_time.slice(0, 5), isBreak: p.is_break }) satisfies PeriodRow,
  );
}

export async function getMasterDataOverview(schoolId: string): Promise<MasterDataOverview> {
  const supabase = await createSupabaseServerClient();

  const [
    yearsRes,
    classesRes,
    sectionsRes,
    subjectsRes,
    departmentsRes,
    designationsRes,
    housesRes,
    categoriesRes,
    holidaysRes,
    gradeBandsRes,
    admissionStagesRes,
    admissionDocumentTypesRes,
    periodsRes,
    hpcCriteriaRes,
    hpcRatingScalesRes,
  ] = await Promise.all([
    supabase
      .from("academic_year")
      .select("id, name, start_date, end_date, is_current")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase.from("class").select("id, name, sort_order").eq("school_id", schoolId).order("sort_order"),
    supabase.from("section").select("id, class_id, name").eq("school_id", schoolId).order("name"),
    supabase.from("subject").select("id, name, code").eq("school_id", schoolId).order("name"),
    supabase.from("department").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("designation").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("house").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("student_category").select("id, key, label").eq("school_id", schoolId).order("label"),
    supabase.from("holiday").select("id, date, name").eq("school_id", schoolId).order("date"),
    supabase
      .from("grade_band")
      .select("id, min_percentage, max_percentage, grade_label, grade_point, remark")
      .eq("school_id", schoolId)
      .order("min_percentage", { ascending: false }),
    supabase.from("admission_stage").select("id, name, sort_order, stage_type").eq("school_id", schoolId).order("sort_order"),
    supabase.from("admission_document_type").select("id, name, is_required, sort_order").eq("school_id", schoolId).order("sort_order"),
    supabase.from("period").select("id, period_number, label, start_time, end_time, is_break").eq("school_id", schoolId).order("period_number"),
    supabase.from("hpc_criterion").select("id, category, name, sort_order").eq("school_id", schoolId).order("category").order("sort_order"),
    supabase.from("hpc_rating_scale").select("id, code, label, sort_order").eq("school_id", schoolId).order("sort_order"),
  ]);

  for (const res of [
    yearsRes,
    classesRes,
    sectionsRes,
    subjectsRes,
    departmentsRes,
    designationsRes,
    housesRes,
    categoriesRes,
    holidaysRes,
    gradeBandsRes,
    admissionStagesRes,
    admissionDocumentTypesRes,
    periodsRes,
    hpcCriteriaRes,
    hpcRatingScalesRes,
  ]) {
    if (res.error) throw res.error;
  }

  const classes = (classesRes.data ?? []) as unknown as { id: string; name: string; sort_order: number }[];

  // class_subject has no school_id of its own (it's scoped through class, same as its RLS policy)
  // -- filtering by this school's own class ids (fetched above) is simpler and safer than an
  // embedded-resource filter, and classIds is already scoped to this school.
  const classIds = classes.map((c) => c.id);
  const classSubjectRes = classIds.length
    ? await supabase.from("class_subject").select("class_id, subject_id").in("class_id", classIds)
    : { data: [] as { class_id: string; subject_id: string }[], error: null };
  if (classSubjectRes.error) throw classSubjectRes.error;

  const academicYears = (
    (yearsRes.data ?? []) as unknown as { id: string; name: string; start_date: string; end_date: string; is_current: boolean }[]
  ).map((y) => ({ id: y.id, name: y.name, startDate: y.start_date, endDate: y.end_date, isCurrent: y.is_current }) satisfies AcademicYearRow);

  const sections = (sectionsRes.data ?? []) as unknown as { id: string; class_id: string; name: string }[];
  const classesWithSections: ClassWithSections[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
    sections: sections
      .filter((s) => s.class_id === c.id)
      .map((s) => ({ id: s.id, classId: s.class_id, name: s.name }) satisfies SectionRow),
  }));

  const subjects = ((subjectsRes.data ?? []) as unknown as { id: string; name: string; code: string | null }[]).map(
    (s) => ({ id: s.id, name: s.name, code: s.code }) satisfies SubjectRow,
  );

  const classSubjectPairs = new Set(
    (classSubjectRes.data ?? []).map((row) => `${row.class_id}:${row.subject_id}`),
  );

  const studentCategories = ((categoriesRes.data ?? []) as unknown as { id: string; key: string; label: string }[]).map(
    (c) => ({ id: c.id, key: c.key, label: c.label }) satisfies StudentCategoryRow,
  );

  return {
    academicYears,
    classesWithSections,
    subjects,
    classSubjectPairs,
    departments: toNamedRows(departmentsRes.data as { id: string; name: string }[] | null),
    designations: toNamedRows(designationsRes.data as { id: string; name: string }[] | null),
    houses: toNamedRows(housesRes.data as { id: string; name: string }[] | null),
    studentCategories,
    holidays: ((holidaysRes.data ?? []) as unknown as { id: string; date: string; name: string }[]).map(
      (h) => ({ id: h.id, date: h.date, name: h.name }) satisfies HolidayRow,
    ),
    gradeBands: (
      (gradeBandsRes.data ?? []) as unknown as {
        id: string;
        min_percentage: number;
        max_percentage: number;
        grade_label: string;
        grade_point: number | null;
        remark: string | null;
      }[]
    ).map(
      (g) =>
        ({
          id: g.id,
          minPercentage: g.min_percentage,
          maxPercentage: g.max_percentage,
          gradeLabel: g.grade_label,
          gradePoint: g.grade_point,
          remark: g.remark,
        }) satisfies GradeBandRow,
    ),
    admissionStages: (
      (admissionStagesRes.data ?? []) as unknown as { id: string; name: string; sort_order: number; stage_type: AdmissionStageType }[]
    ).map((s) => ({ id: s.id, name: s.name, sortOrder: s.sort_order, stageType: s.stage_type }) satisfies AdmissionStageRow),
    admissionDocumentTypes: (
      (admissionDocumentTypesRes.data ?? []) as unknown as { id: string; name: string; is_required: boolean; sort_order: number }[]
    ).map((d) => ({ id: d.id, name: d.name, isRequired: d.is_required, sortOrder: d.sort_order }) satisfies AdmissionDocumentTypeRow),
    periods: (
      (periodsRes.data ?? []) as unknown as { id: string; period_number: number; label: string; start_time: string; end_time: string; is_break: boolean }[]
    ).map(
      (p) =>
        ({ id: p.id, periodNumber: p.period_number, label: p.label, startTime: p.start_time.slice(0, 5), endTime: p.end_time.slice(0, 5), isBreak: p.is_break }) satisfies PeriodRow,
    ),
    hpcCriteria: ((hpcCriteriaRes.data ?? []) as unknown as { id: string; category: HpcCriterionCategory; name: string; sort_order: number }[]).map(
      (c) => ({ id: c.id, category: c.category, name: c.name, sortOrder: c.sort_order }) satisfies HpcCriterionRow,
    ),
    hpcRatingScales: ((hpcRatingScalesRes.data ?? []) as unknown as { id: string; code: string; label: string; sort_order: number }[]).map(
      (r) => ({ id: r.id, code: r.code, label: r.label, sortOrder: r.sort_order }) satisfies HpcRatingScaleRow,
    ),
  };
}
