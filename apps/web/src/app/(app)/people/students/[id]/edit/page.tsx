import { notFound } from "next/navigation";
import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStudent, getStudentFormOptions } from "@/lib/students/queries";
import { StudentForm } from "@/lib/students/components/StudentForm";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const [student, options] = await Promise.all([
    getStudent(session.schoolId!, id),
    getStudentFormOptions(session.schoolId!),
  ]);

  if (!student) notFound();

  return (
    <RequirePermission permission="school.manage_students">
      <h1 className="mb-4 text-2xl font-semibold">
        Edit {student.firstName} {student.lastName}
      </h1>
      <StudentForm options={options} student={student} />
    </RequirePermission>
  );
}
