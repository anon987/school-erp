import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStudentFormOptions } from "@/lib/students/queries";
import { StudentForm } from "@/lib/students/components/StudentForm";

export default async function NewStudentPage() {
  const session = await requireSession();
  const options = await getStudentFormOptions(session.schoolId!);

  return (
    <RequirePermission permission="school.manage_students">
      <h1 className="mb-4 text-2xl font-semibold">New student</h1>
      <StudentForm options={options} />
    </RequirePermission>
  );
}
