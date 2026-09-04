import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStudentFormOptions } from "@/lib/students/queries";
import { StudentForm } from "@/lib/students/components/StudentForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function NewStudentPage() {
  const session = await requireSession();
  const options = await getStudentFormOptions(session.schoolId!);

  return (
    <RequirePermission permission="school.manage_students">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Students", href: "/people/students" }, { label: "New student" }]} />
        <h1 className="text-2xl font-semibold">New student</h1>
        <StudentForm options={options} cancelHref="/people/students" />
      </div>
    </RequirePermission>
  );
}
