import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type {
  CategoryOption,
  ClassOption,
  GuardianInfo,
  HouseOption,
  SectionOption,
  StudentDetail,
  StudentDirectoryFilters,
  StudentDirectoryPage,
  StudentFormOptions,
} from "./types";

// Shapes for the nested-select queries below -- supabase-js's automatic type inference doesn't
// reach through embedded/joined selects, so these back the explicit .returns<T>() calls (the
// supported way to type a query PostgREST can serve but the client can't infer on its own).
interface StudentDirectoryRow {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  status: string;
  gender: string | null;
  enrollment: { roll_number: string | null; class: { name: string } | null; section: { name: string } | null }[];
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

async function getCurrentAcademicYearId(schoolId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("academic_year")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

const DIRECTORY_SELECT = `
  id, admission_number, first_name, last_name, status, gender,
  enrollment!inner(roll_number, class:class_id(name), section:section_id(name))
`;

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

  let query = supabase
    .from("student")
    .select(DIRECTORY_SELECT, { count: "exact" })
    .eq("school_id", schoolId)
    .eq("enrollment.academic_year_id", academicYearId);

  if (filters.classId) {
    query = query.eq("enrollment.class_id", filters.classId);
  }
  if (filters.sectionId) {
    query = query.eq("enrollment.section_id", filters.sectionId);
  }
  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_number.ilike.%${term}%`);
    }
  }

  const ascending = filters.dir !== "desc";
  if (filters.sort === "admissionNumber") {
    query = query.order("admission_number", { ascending });
  } else {
    query = query.order("last_name", { ascending }).order("first_name", { ascending });
  }

  const from = page * pageSize;
  const { data, error, count } = await query
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1)
    .returns<StudentDirectoryRow[]>();

  if (error) throw error;

  const items = (data ?? []).map((row) => {
    const enrollment = row.enrollment[0];
    return {
      id: row.id,
      admissionNumber: row.admission_number,
      firstName: row.first_name,
      lastName: row.last_name,
      status: row.status,
      gender: row.gender,
      className: enrollment?.class?.name ?? null,
      sectionName: enrollment?.section?.name ?? null,
      rollNumber: enrollment?.roll_number ?? null,
    };
  });

  return { items, total: count ?? 0, page, pageSize };
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
