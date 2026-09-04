import { notFound } from "next/navigation";
import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getStudent, getStudentFormOptions } from "@/lib/students/queries";
import { StudentForm } from "@/lib/students/components/StudentForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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
      <div className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: "Students", href: "/people/students" },
            { label: `${student.firstName} ${student.lastName}`, href: `/people/students/${student.id}` },
            { label: "Edit" },
          ]}
        />
        <h1 className="text-2xl font-semibold">
          Edit {student.firstName} {student.lastName}
        </h1>
        <StudentForm options={options} student={student} cancelHref={`/people/students/${student.id}`} />
      </div>
    </RequirePermission>
  );
}
