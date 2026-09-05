import Link from "next/link";
import { Award } from "lucide-react";
import { StatusBadge, type StatusState } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { getCurrentAcademicYearId, getCurrentAcademicYearName } from "@/lib/core/school/getCurrentAcademicYear";
import { getExams, getClassOptions } from "@/lib/exams/queries";
import { CreateExamForm } from "@/lib/exams/components/CreateExamForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { formatDateDisplay } from "@/lib/core/dateIst";
import type { ExamStatus } from "@/lib/exams/types";

function statusBadge(status: ExamStatus): { state: StatusState; label: string } | null {
  switch (status) {
    case "pending_approval":
      return { state: "pending", label: "Pending approval" };
    case "approved":
      return { state: "approved", label: "Approved" };
    case "published":
      return { state: "approved", label: "Published" };
    default:
      return null;
  }
}

export default async function ManageExamsPage() {
  const session = await requireSession();
  const permissions = await getPermissions();
  const canManage = permissions.includes("school.manage_exams");
  const academicYearId = await getCurrentAcademicYearId(session.schoolId!);

  if (!academicYearId) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams" }, { label: "Manage Exams" }]} />
        <p className="text-sm text-muted-foreground">No current academic year set -- configure one in Master Data first.</p>
      </div>
    );
  }

  const [exams, classes, academicYearName] = await Promise.all([
    getExams(session.schoolId!, academicYearId),
    getClassOptions(session.schoolId!),
    getCurrentAcademicYearName(session.schoolId!),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams" }, { label: "Manage Exams" }]} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Manage Exams</h1>
        {canManage ? (
          <Link href="/academics/exams/report-cards" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
            Report Cards
          </Link>
        ) : null}
      </div>

      {canManage ? <CreateExamForm academicYearId={academicYearId} classes={classes} /> : null}

      {exams.length === 0 ? (
        <EmptyState icon={Award} title="No exams yet" description="Create the first exam for this academic year above." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Exam Name</th>
                <th className="px-3 py-2 font-medium">Session</th>
                <th className="px-3 py-2 font-medium">Applies To</th>
                <th className="px-3 py-2 font-medium">Start Date</th>
                <th className="px-3 py-2 font-medium">End Date</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => {
                const badge = statusBadge(exam.status);
                return (
                  <tr key={exam.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-3 py-2">
                      <Link href={`/academics/exams/${exam.id}`} className="font-medium underline-offset-2 hover:underline">
                        {exam.name}
                      </Link>
                      {exam.term ? <span className="ml-2 text-xs text-muted-foreground">{exam.term}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{academicYearName ?? "—"}</td>
                    <td className="px-3 py-2">
                      {exam.appliesToAllClasses ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">All classes</span>
                      ) : (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {exam.scopedClassCount} {exam.scopedClassCount === 1 ? "class" : "classes"}
                        </span>
                      )}
                    </td>
                    <td className="font-figures px-3 py-2">{exam.startDate ? formatDateDisplay(exam.startDate) : "—"}</td>
                    <td className="font-figures px-3 py-2">{exam.endDate ? formatDateDisplay(exam.endDate) : "—"}</td>
                    <td className="px-3 py-2">
                      {badge ? <StatusBadge state={badge.state} label={badge.label} /> : <span className="text-xs capitalize text-muted-foreground">{exam.status.replace("_", " ")}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/academics/exams/${exam.id}`} className="text-xs text-primary underline-offset-2 hover:underline">
                          Subjects
                        </Link>
                        {canManage ? (
                          <Link href={`/academics/exams/${exam.id}/admit-cards`} className="text-xs text-primary underline-offset-2 hover:underline">
                            Admit Cards
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
