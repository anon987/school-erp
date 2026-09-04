import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type {
  AcademicYearRow,
  ClassWithSections,
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
export async function getMasterDataOverview(schoolId: string): Promise<MasterDataOverview> {
  const supabase = await createSupabaseServerClient();

  const [yearsRes, classesRes, sectionsRes, subjectsRes, departmentsRes, designationsRes, housesRes, categoriesRes] =
    await Promise.all([
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
    ]);

  for (const res of [yearsRes, classesRes, sectionsRes, subjectsRes, departmentsRes, designationsRes, housesRes, categoriesRes]) {
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
  };
}
