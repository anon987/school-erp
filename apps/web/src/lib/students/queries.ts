import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import type {
  CategoryOption,
  ClassOption,
  ClassStrengthRow,
  GuardianInfo,
  HouseOption,
  SectionOption,
  StudentDetail,
  StudentDirectoryFilters,
  StudentDirectoryPage,
  StudentFormOptions,
  StudentListItem,
  StudentMasterReportRow,
} from "./types";

// Shapes for the nested-select queries below -- supabase-js's automatic type inference doesn't
// reach through embedded/joined selects, so these back the explicit .returns<T>() calls (the
// supported way to type a query PostgREST can serve but the client can't infer on its own).
interface StudentListRpcRow {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  status: string;
  gender: string | null;
  class_name: string | null;
  section_name: string | null;
  roll_number: string | null;
  due_amount_paise: number;
  has_invoices: boolean;
  total_count: number;
}

interface StudentDetailRow {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  gender: string | null;
  blood_group: string | null;
  status: string;
  status_since: string;
  category_id: string | null;
  house_id: string | null;
  previous_school_name: string | null;
  enrollment: { roll_number: string | null; class: { name: string } | null; section: { name: string } | null }[];
  student_guardian: {
    relationship_type: string;
    phone: string | null;
    email: string | null;
    is_primary_contact: boolean;
    guardian: { id: string; first_name: string } | null;
  }[];
}

function toListItem(row: StudentListRpcRow): StudentListItem {
  return {
    id: row.id,
    admissionNumber: row.admission_number,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    gender: row.gender,
    className: row.class_name,
    sectionName: row.section_name,
    rollNumber: row.roll_number,
    feeStatus: !row.has_invoices ? "none" : row.due_amount_paise > 0 ? "due" : "paid",
    feeDueAmountPaise: row.due_amount_paise,
  };
}

/**
 * Search/class/section/fee-status filters, sorting, and pagination all happen in one SQL
 * function (fn_list_students) -- never a `.in()` built from a JS-collected id list (the same
 * class of bug that crashed Fees Setup on the pilot school's 2,200 students). Fee status is
 * annotated per row from the same query, not a second per-page round trip.
 */
export async function listStudents(
  schoolId: string,
  filters: StudentDirectoryFilters,
  page: number,
  pageSize: number,
): Promise<StudentDirectoryPage> {
  const supabase = await createSupabaseServerClient();
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  if (!academicYearId) {
    return { items: [], total: 0, page, pageSize };
  }

  const rpcArgs = {
    p_school_id: schoolId,
    p_academic_year_id: academicYearId,
    ...(filters.search?.trim() ? { p_search: filters.search.trim() } : {}),
    ...(filters.classId ? { p_class_id: filters.classId } : {}),
    ...(filters.sectionId ? { p_section_id: filters.sectionId } : {}),
    ...(filters.feeStatus ? { p_fee_status: filters.feeStatus } : {}),
    p_sort: filters.sort === "admissionNumber" ? "admissionNumber" : "name",
    p_dir: filters.dir === "desc" ? "desc" : "asc",
    p_limit: pageSize,
    p_offset: page * pageSize,
  };

  const { data, error } = await supabase.rpc("fn_list_students", rpcArgs).returns<StudentListRpcRow[]>();
  if (error) throw error;

  if ((data ?? []).length > 0) {
    return { items: (data ?? []).map(toListItem), total: data![0]!.total_count, page, pageSize };
  }

  // Empty page: could mean zero matches, or the requested page overshot the real total (e.g.
  // filters just narrowed the result set). Re-check at offset 0 so `total` stays accurate for
  // the pagination UI instead of reporting 0 when matches actually exist.
  if (page === 0) {
    return { items: [], total: 0, page, pageSize };
  }
  const { data: firstPage, error: firstPageError } = await supabase
    .rpc("fn_list_students", { ...rpcArgs, p_offset: 0, p_limit: 1 })
    .returns<StudentListRpcRow[]>();
  if (firstPageError) throw firstPageError;
  return { items: [], total: firstPage?.[0]?.total_count ?? 0, page, pageSize };
}

export async function getStudent(schoolId: string, studentId: string): Promise<StudentDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student")
    .select(
      `
      id, admission_number, first_name, last_name, dob, gender, blood_group, status, status_since,
      category_id, house_id, previous_school_name,
      enrollment(roll_number, class:class_id(name), section:section_id(name)),
      student_guardian(relationship_type, phone, email, is_primary_contact, guardian:guardian_id(id, first_name))
    `,
    )
    .eq("school_id", schoolId)
    .eq("id", studentId)
    .maybeSingle()
    .returns<StudentDetailRow | null>();

  if (error) throw error;
  if (!data) return null;

  const enrollment = data.enrollment[0];
  const guardians: GuardianInfo[] = data.student_guardian
    .filter((sg) => sg.guardian !== null)
    .map((sg) => ({
      guardianId: sg.guardian!.id,
      firstName: sg.guardian!.first_name,
      relationshipType: sg.relationship_type,
      phone: sg.phone,
      email: sg.email,
      isPrimaryContact: sg.is_primary_contact,
    }));

  return {
    id: data.id,
    admissionNumber: data.admission_number,
    firstName: data.first_name,
    lastName: data.last_name,
    dob: data.dob,
    gender: data.gender,
    bloodGroup: data.blood_group,
    status: data.status,
    statusSince: data.status_since,
    categoryId: data.category_id,
    houseId: data.house_id,
    previousSchoolName: data.previous_school_name,
    className: enrollment?.class?.name ?? null,
    sectionName: enrollment?.section?.name ?? null,
    rollNumber: enrollment?.roll_number ?? null,
    guardians,
  };
}

export async function getStudentFormOptions(schoolId: string): Promise<StudentFormOptions> {
  const supabase = await createSupabaseServerClient();

  const [classesRes, sectionsRes, housesRes, categoriesRes] = await Promise.all([
    supabase.from("class").select("id, name").eq("school_id", schoolId).order("sort_order"),
    supabase.from("section").select("id, class_id, name").order("name"),
    supabase.from("house").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("student_category").select("id, key, label").eq("school_id", schoolId).order("label"),
  ]);

  if (classesRes.error) throw classesRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (housesRes.error) throw housesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const classes = (classesRes.data ?? []) as unknown as ClassOption[];
  const sections = ((sectionsRes.data ?? []) as unknown as { id: string; class_id: string; name: string }[]).map(
    (s) => ({ id: s.id, classId: s.class_id, name: s.name }),
  ) satisfies SectionOption[];
  const houses = (housesRes.data ?? []) as unknown as HouseOption[];
  const categories = (categoriesRes.data ?? []) as unknown as CategoryOption[];

  return { classes, sections, houses, categories };
}

type GuardianRow = { relationship_type: string; phone: string | null; is_primary_contact: boolean; guardian: { first_name: string; last_name: string | null } | null };

/** P1 baseline "student master" report -- every enrolled student for one academic year. */
export async function getStudentMasterReport(schoolId: string, academicYearId: string): Promise<StudentMasterReportRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enrollment")
    .select(
      "roll_number, class:class_id(name), section:section_id(name), student:student_id!inner(admission_number, first_name, last_name, dob, gender, status, guardians:student_guardian(relationship_type, phone, is_primary_contact, guardian:guardian_id(first_name, last_name)))",
    )
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .order("student(first_name)");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    roll_number: string | null;
    class: { name: string } | null;
    section: { name: string } | null;
    student: { admission_number: string; first_name: string; last_name: string; dob: string | null; gender: string | null; status: string; guardians: GuardianRow[] };
  }[];

  return rows.map((r) => {
    const guardians = r.student.guardians ?? [];
    const father = guardians.find((g) => g.relationship_type === "father");
    const primary = guardians.find((g) => g.is_primary_contact) ?? father ?? guardians[0];
    return {
      admissionNumber: r.student.admission_number,
      firstName: r.student.first_name,
      lastName: r.student.last_name,
      dob: r.student.dob,
      gender: r.student.gender,
      className: r.class?.name ?? "",
      sectionName: r.section?.name ?? "",
      rollNumber: r.roll_number,
      status: r.student.status,
      fatherName: father?.guardian ? `${father.guardian.first_name}${father.guardian.last_name ? ` ${father.guardian.last_name}` : ""}` : null,
      contactPhone: primary?.phone ?? null,
    };
  });
}

/** P1 baseline "class strength" report -- enrolled headcount per class/section, by gender. */
export async function getClassStrengthReport(schoolId: string, academicYearId: string): Promise<ClassStrengthRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enrollment")
    .select("class:class_id(name, sort_order), section:section_id(name), student:student_id!inner(gender)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId);
  if (error) throw error;

  const rows = (data ?? []) as unknown as { class: { name: string; sort_order: number } | null; section: { name: string } | null; student: { gender: string | null } }[];

  const byKey = new Map<string, ClassStrengthRow & { sortOrder: number }>();
  for (const r of rows) {
    const key = `${r.class?.name ?? ""}::${r.section?.name ?? ""}`;
    const existing = byKey.get(key) ?? { className: r.class?.name ?? "", sectionName: r.section?.name ?? "", male: 0, female: 0, other: 0, total: 0, sortOrder: r.class?.sort_order ?? 0 };
    if (r.student.gender === "male") existing.male += 1;
    else if (r.student.gender === "female") existing.female += 1;
    else existing.other += 1;
    existing.total += 1;
    byKey.set(key, existing);
  }

  return Array.from(byKey.values())
    .sort((a, b) => a.sortOrder - b.sortOrder || a.sectionName.localeCompare(b.sectionName))
    .map(({ sortOrder: _sortOrder, ...rest }) => rest);
}
