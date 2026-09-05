import Link from "next/link";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getCurrentStaffId } from "@/lib/core/auth/currentStaff";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getHomeworkList, getMyStaffClassSubjects } from "@/lib/homework/queries";
import { ComposeHomeworkForm } from "@/lib/homework/components/ComposeHomeworkForm";
import { PublishHomeworkButton } from "@/lib/homework/components/PublishHomeworkButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateDisplay, formatDateTimeDisplayIst } from "@/lib/core/dateIst";

export default async function HomeworkPage() {
  const session = await requireSession();
  const [staffId, academicYearId] = await Promise.all([getCurrentStaffId(), getCurrentAcademicYearId(session.schoolId!)]);

  const [homeworkList, myOptions] = await Promise.all([
    getHomeworkList(session.schoolId!),
    staffId && academicYearId ? getMyStaffClassSubjects(session.schoolId!, staffId, academicYearId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Homework" }]} />
      <h1 className="text-2xl font-semibold">Homework &amp; assignments</h1>

      {staffId ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">New homework</h2>
          <ComposeHomeworkForm options={myOptions} />
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">All homework</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Teacher</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {homeworkList.map((h) => (
                <tr key={h.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-3 py-1.5">
                    <Link href={`/academics/homework/${h.id}`} className="font-medium underline-offset-2 hover:underline">
                      {h.title}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">
                    {h.className} {h.sectionName}
                  </td>
                  <td className="px-3 py-1.5">{h.subjectName}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{h.staffName}</td>
                  <td className="px-3 py-1.5 font-figures">{formatDateDisplay(h.dueDate)}</td>
                  <td className="px-3 py-1.5">
                    {h.publishedAt ? (
                      <StatusBadge state="approved" label={`Published ${formatDateTimeDisplayIst(h.publishedAt)}`} />
                    ) : (
                      <StatusBadge state="pending" label="Draft" />
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">{!h.publishedAt ? <PublishHomeworkButton homeworkId={h.id} /> : null}</td>
                </tr>
              ))}
              {homeworkList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No homework yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
