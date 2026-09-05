import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type {
  AssignmentFormOptions,
  DepartmentOption,
  DesignationOption,
  LeaveRequest,
  LeaveType,
  StaffAssignment,
  StaffDetail,
  StaffDirectoryFilters,
  StaffDirectoryPage,
  StaffFormOptions,
} from "./types";

interface StaffDirectoryRow {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  employment_status: string;
  department: { name: string } | null;
  designation: { name: string } | null;
}

interface StaffDetailRow {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  joining_date: string;
  employment_status: string;
  department_id: string | null;
  designation_id: string | null;
  department: { name: string } | null;
  designation: { name: string } | null;
  school_member_id: string | null;
  staff_qualification: { id: string; degree: string; institution: string | null; year_completed: number | null }[];
}

const DIRECTORY_SELECT = `
  id, employee_code, first_name, last_name, employment_status,
  department:department_id(name), designation:designation_id(name)
`;

export async function listStaff(
  schoolId: string,
  filters: StaffDirectoryFilters,
  page: number,
  pageSize: number,
): Promise<StaffDirectoryPage> {
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("staff").select(DIRECTORY_SELECT, { count: "exact" }).eq("school_id", schoolId);

  if (filters.departmentId) {
    query = query.eq("department_id", filters.departmentId);
  }
  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,employee_code.ilike.%${term}%`);
    }
  }

  const ascending = filters.dir !== "desc";
  if (filters.sort === "employeeCode") {
    query = query.order("employee_code", { ascending });
  } else {
    query = query.order("last_name", { ascending }).order("first_name", { ascending });
  }

  const from = page * pageSize;
  const { data, error, count } = await query
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1)
    .returns<StaffDirectoryRow[]>();

  if (error) throw error;

  const items = (data ?? []).map((row) => ({
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    employmentStatus: row.employment_status,
    departmentName: row.department?.name ?? null,
    designationName: row.designation?.name ?? null,
  }));

  return { items, total: count ?? 0, page, pageSize };
}

export async function getStaff(schoolId: string, staffId: string): Promise<StaffDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select(
      `
      id, employee_code, first_name, last_name, dob, gender, phone, email, joining_date, employment_status,
      department_id, designation_id, department:department_id(name), designation:designation_id(name),
      school_member_id,
      staff_qualification(id, degree, institution, year_completed)
    `,
    )
    .eq("school_id", schoolId)
    .eq("id", staffId)
    .maybeSingle()
    .returns<StaffDetailRow | null>();

  if (error) throw error;
  if (!data) return null;

  let roles: string[] = [];
  if (data.school_member_id) {
    const { data: roleRows } = await supabase
      .from("school_member_role")
      .select("role:role_id(key)")
      .eq("school_member_id", data.school_member_id)
      .returns<{ role: { key: string } | null }[]>();
    roles = (roleRows ?? []).map((r) => r.role?.key).filter((k): k is string => Boolean(k));
  }

  return {
    id: data.id,
    employeeCode: data.employee_code,
    firstName: data.first_name,
    lastName: data.last_name,
    dob: data.dob,
    gender: data.gender,
    phone: data.phone,
    email: data.email,
    joiningDate: data.joining_date,
    employmentStatus: data.employment_status,
    departmentId: data.department_id,
    departmentName: data.department?.name ?? null,
    designationId: data.designation_id,
    designationName: data.designation?.name ?? null,
    hasLogin: Boolean(data.school_member_id),
    roles,
    qualifications: (data.staff_qualification ?? []).map((q) => ({
      id: q.id,
      degree: q.degree,
      institution: q.institution,
      yearCompleted: q.year_completed,
    })),
  };
}

export async function getStaffFormOptions(schoolId: string): Promise<StaffFormOptions> {
  const supabase = await createSupabaseServerClient();
  const [departmentsRes, designationsRes] = await Promise.all([
    supabase.from("department").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("designation").select("id, name").eq("school_id", schoolId).order("name"),
  ]);
  if (departmentsRes.error) throw departmentsRes.error;
  if (designationsRes.error) throw designationsRes.error;

  return {
    departments: (departmentsRes.data ?? []) as unknown as DepartmentOption[],
    designations: (designationsRes.data ?? []) as unknown as DesignationOption[],
  };
}

/** This staff member's class/section/subject assignments for one academic year -- drives the
 *  "Assignments" tab on their profile. */
export async function getStaffAssignments(schoolId: string, staffId: string, academicYearId: string): Promise<StaffAssignment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff_class_subject")
    .select("id, class:class_id(name), section:section_id(name), subject:subject_id(name)")
    .eq("school_id", schoolId)
    .eq("staff_id", staffId)
    .eq("academic_year_id", academicYearId)
    .order("class_id");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; class: { name: string } | null; section: { name: string } | null; subject: { name: string } | null }[]).map((r) => ({
    id: r.id,
    className: r.class?.name ?? "",
    sectionName: r.section?.name ?? "",
    subjectName: r.subject?.name ?? "",
  }));
}

export async function getAssignmentFormOptions(schoolId: string): Promise<AssignmentFormOptions> {
  const supabase = await createSupabaseServerClient();
  const [classesRes, sectionsRes, subjectsRes] = await Promise.all([
    supabase.from("class").select("id, name").eq("school_id", schoolId).order("sort_order"),
    supabase.from("section").select("id, class_id, name").eq("school_id", schoolId).order("name"),
    supabase.from("subject").select("id, name").eq("school_id", schoolId).order("name"),
  ]);
  if (classesRes.error) throw classesRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (subjectsRes.error) throw subjectsRes.error;

  return {
    classes: (classesRes.data ?? []) as unknown as { id: string; name: string }[],
    sections: ((sectionsRes.data ?? []) as unknown as { id: string; class_id: string; name: string }[]).map((s) => ({ id: s.id, classId: s.class_id, name: s.name })),
    subjects: (subjectsRes.data ?? []) as unknown as { id: string; name: string }[],
  };
}

export async function getLeaveTypes(schoolId: string): Promise<LeaveType[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("leave_type").select("id, name, is_paid").eq("school_id", schoolId).order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as { id: string; name: string; is_paid: boolean }[]).map((r) => ({ id: r.id, name: r.name, isPaid: r.is_paid }));
}

/** Inclusive day count between two YYYY-MM-DD dates, computed via Date.UTC (no timezone
 *  ambiguity) -- same reasoning as dateIst.ts's isSundayIso. */
function inclusiveDayCount(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = Date.UTC(sy ?? 1970, (sm ?? 1) - 1, sd ?? 1);
  const end = Date.UTC(ey ?? 1970, (em ?? 1) - 1, ed ?? 1);
  return Math.round((end - start) / 86400000) + 1;
}

export async function getStaffLeaveRequests(schoolId: string, staffId: string): Promise<LeaveRequest[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leave_request")
    .select("id, leave_type_id, leave_type:leave_type_id(name), start_date, end_date, reason, status, created_at")
    .eq("school_id", schoolId)
    .eq("staff_id", staffId)
    .order("start_date", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as unknown as {
      id: string;
      leave_type_id: string;
      leave_type: { name: string } | null;
      start_date: string;
      end_date: string;
      reason: string | null;
      status: LeaveRequest["status"];
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    leaveTypeId: r.leave_type_id,
    leaveTypeName: r.leave_type?.name ?? "",
    startDate: r.start_date,
    endDate: r.end_date,
    dayCount: inclusiveDayCount(r.start_date, r.end_date),
    reason: r.reason,
    status: r.status,
    appliedAt: r.created_at,
  }));
}
