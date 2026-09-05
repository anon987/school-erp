import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getCurrentPhotoUrl, getCurrentPhotoUrls } from "@/lib/core/documents/queries";
import { getCurrentAcademicYearName } from "@/lib/core/school/getCurrentAcademicYear";
import { DEFAULT_ID_CARD_TEMPLATE, DEFAULT_ID_CARD_ORIENTATION } from "./idCardTemplates";
import type { IdCardData, IdCardSettings } from "./types";

const DEFAULT_ID_CARD_SETTINGS: IdCardSettings = {
  studentTemplate: DEFAULT_ID_CARD_TEMPLATE,
  staffTemplate: DEFAULT_ID_CARD_TEMPLATE,
  orientation: DEFAULT_ID_CARD_ORIENTATION,
  showBloodGroup: true,
  showDob: true,
  showFatherName: true,
  showMotherName: false,
  showAddress: true,
  showContact: true,
};

type GuardianRow = {
  relationship_type: string;
  phone: string | null;
  is_primary_contact: boolean;
  guardian: { first_name: string; last_name: string | null } | null;
};

/** Derives father/mother display name and the best contact phone from a student's guardian rows -- shared by the single-student and class-bulk queries so the "which phone wins" rule lives in one place. */
function deriveGuardianInfo(guardians: GuardianRow[]): { fatherName: string | null; motherName: string | null; contactPhone: string | null } {
  const father = guardians.find((g) => g.relationship_type === "father");
  const mother = guardians.find((g) => g.relationship_type === "mother");
  const primary = guardians.find((g) => g.is_primary_contact) ?? father ?? guardians[0];
  const guardianName = (g: GuardianRow | undefined) => (g?.guardian ? `${g.guardian.first_name}${g.guardian.last_name ? ` ${g.guardian.last_name}` : ""}` : null);
  return {
    fatherName: guardianName(father),
    motherName: guardianName(mother),
    contactPhone: primary?.phone ?? null,
  };
}

export async function getClassOptions(schoolId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("class").select("id, name").eq("school_id", schoolId).order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; name: string }[];
}

export async function getIdCardSettings(schoolId: string): Promise<IdCardSettings> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("id_card_settings")
    .select("student_template, staff_template, orientation, show_blood_group, show_dob, show_father_name, show_mother_name, show_address, show_contact")
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_ID_CARD_SETTINGS;
  const row = data as unknown as {
    student_template: string;
    staff_template: string;
    orientation: "horizontal" | "vertical";
    show_blood_group: boolean;
    show_dob: boolean;
    show_father_name: boolean;
    show_mother_name: boolean;
    show_address: boolean;
    show_contact: boolean;
  };
  return {
    studentTemplate: row.student_template,
    staffTemplate: row.staff_template,
    orientation: row.orientation,
    showBloodGroup: row.show_blood_group,
    showDob: row.show_dob,
    showFatherName: row.show_father_name,
    showMotherName: row.show_mother_name,
    showAddress: row.show_address,
    showContact: row.show_contact,
  };
}

export async function getStudentIdCardData(schoolId: string, studentId: string): Promise<IdCardData | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student")
    .select("first_name, last_name, admission_number, dob, blood_group, address, guardians:student_guardian(relationship_type, phone, is_primary_contact, guardian:guardian_id(first_name, last_name))")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    first_name: string;
    last_name: string;
    admission_number: string;
    dob: string | null;
    blood_group: string | null;
    address: string | null;
    guardians: GuardianRow[];
  };

  const [enrollmentRes, photoUrl, academicYearName] = await Promise.all([
    supabase
      .from("enrollment")
      .select("roll_number, class:class_id(name), section:section_id(name)")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getCurrentPhotoUrl(schoolId, "student", studentId),
    getCurrentAcademicYearName(schoolId),
  ]);
  const enrollment = enrollmentRes.data as unknown as { roll_number: string | null; class: { name: string } | null; section: { name: string } | null } | null;
  const subtitle = enrollment?.class ? `Class ${enrollment.class.name}${enrollment.section ? ` - ${enrollment.section.name}` : ""}` : "—";
  const { fatherName, motherName, contactPhone } = deriveGuardianInfo(row.guardians ?? []);

  return {
    personId: studentId,
    name: `${row.first_name} ${row.last_name}`,
    idLabel: "Admission No.",
    idNumber: row.admission_number,
    subtitle,
    fatherName,
    motherName,
    rollNumber: enrollment?.roll_number ?? null,
    address: row.address,
    contactPhone,
    bloodGroup: row.blood_group,
    dob: row.dob,
    photoUrl,
    academicYearName,
  };
}

export async function getStaffIdCardData(schoolId: string, staffId: string): Promise<IdCardData | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select("first_name, last_name, employee_code, dob, blood_group, phone, designation:designation_id(name), department:department_id(name)")
    .eq("id", staffId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    first_name: string;
    last_name: string;
    employee_code: string;
    dob: string | null;
    blood_group: string | null;
    phone: string | null;
    designation: { name: string } | null;
    department: { name: string } | null;
  };

  const [photoUrl, academicYearName] = await Promise.all([getCurrentPhotoUrl(schoolId, "staff", staffId), getCurrentAcademicYearName(schoolId)]);
  const subtitle = [row.designation?.name, row.department?.name].filter(Boolean).join(", ") || "—";

  return {
    personId: staffId,
    name: `${row.first_name} ${row.last_name}`,
    idLabel: "Employee Code",
    idNumber: row.employee_code,
    subtitle,
    fatherName: null,
    motherName: null,
    rollNumber: null,
    address: null,
    contactPhone: row.phone,
    bloodGroup: row.blood_group,
    dob: row.dob,
    photoUrl,
    academicYearName,
  };
}

/** For bulk generation -- every enrolled student in a class, or every active staff member, in one batch of ID card data. */
export async function getStudentIdCardDataForClass(schoolId: string, classId: string, academicYearId: string): Promise<IdCardData[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("enrollment")
    .select(
      "roll_number, class:class_id(name), section:section_id(name), student:student_id!inner(id, first_name, last_name, admission_number, dob, blood_group, address, guardians:student_guardian(relationship_type, phone, is_primary_contact, guardian:guardian_id(first_name, last_name)))",
    )
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("class_id", classId)
    .order("student(first_name)");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    roll_number: string | null;
    class: { name: string } | null;
    section: { name: string } | null;
    student: {
      id: string;
      first_name: string;
      last_name: string;
      admission_number: string;
      dob: string | null;
      blood_group: string | null;
      address: string | null;
      guardians: GuardianRow[];
    };
  }[];
  if (rows.length === 0) return [];

  const [photoUrls, academicYearName] = await Promise.all([
    getCurrentPhotoUrls(schoolId, "student", rows.map((r) => r.student.id)),
    getCurrentAcademicYearName(schoolId),
  ]);

  return rows.map((r) => {
    const { fatherName, motherName, contactPhone } = deriveGuardianInfo(r.student.guardians ?? []);
    return {
      personId: r.student.id,
      name: `${r.student.first_name} ${r.student.last_name}`,
      idLabel: "Admission No.",
      idNumber: r.student.admission_number,
      subtitle: r.class ? `Class ${r.class.name}${r.section ? ` - ${r.section.name}` : ""}` : "—",
      fatherName,
      motherName,
      rollNumber: r.roll_number,
      address: r.student.address,
      contactPhone,
      bloodGroup: r.student.blood_group,
      dob: r.student.dob,
      photoUrl: photoUrls.get(r.student.id) ?? null,
      academicYearName,
    };
  });
}

export async function getAllStaffIdCardData(schoolId: string): Promise<IdCardData[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, first_name, last_name, employee_code, dob, blood_group, phone, designation:designation_id(name), department:department_id(name)")
    .eq("school_id", schoolId)
    .eq("employment_status", "active")
    .order("first_name");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    dob: string | null;
    blood_group: string | null;
    phone: string | null;
    designation: { name: string } | null;
    department: { name: string } | null;
  }[];
  if (rows.length === 0) return [];

  const [photoUrls, academicYearName] = await Promise.all([getCurrentPhotoUrls(schoolId, "staff", rows.map((r) => r.id)), getCurrentAcademicYearName(schoolId)]);

  return rows.map((r) => ({
    personId: r.id,
    name: `${r.first_name} ${r.last_name}`,
    idLabel: "Employee Code",
    idNumber: r.employee_code,
    subtitle: [r.designation?.name, r.department?.name].filter(Boolean).join(", ") || "—",
    fatherName: null,
    motherName: null,
    rollNumber: null,
    address: null,
    contactPhone: r.phone,
    bloodGroup: r.blood_group,
    dob: r.dob,
    photoUrl: photoUrls.get(r.id) ?? null,
    academicYearName,
  }));
}
