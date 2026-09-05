import { notFound } from "next/navigation";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getHomeworkDetail, getSubmissions } from "@/lib/homework/queries";
import { PublishHomeworkButton } from "@/lib/homework/components/PublishHomeworkButton";
import { ReviewSubmissionForm } from "@/lib/homework/components/ReviewSubmissionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDateDisplay } from "@/lib/core/dateIst";

const STATUS_BADGE: Record<string, "pending" | "due" | "approved"> = { pending: "pending", submitted: "due", reviewed: "approved" };

export default async function HomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const homework = await getHomeworkDetail(session.schoolId!, id);
  if (!homework) notFound();

  const submissions = await getSubmissions(session.schoolId!, id);
  const submittedCount = submissions.filter((s) => s.status !== "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Homework", href: "/academics/homework" }, { label: homework.title }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{homework.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {homework.className} {homework.sectionName} · {homework.subjectName} · Due {formatDateDisplay(homework.dueDate)}
          </p>
        </div>
        {!homework.publishedAt ? <PublishHomeworkButton homeworkId={homework.id} /> : <StatusBadge state="approved" label="Published" />}
      </div>

      <p className="rounded-md border border-border bg-card p-4 text-sm shadow-sm">{homework.description}</p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Submissions ({submittedCount}/{submissions.length})
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Response</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{s.studentName}</span>{" "}
                    <span className="font-figures text-xs text-muted-foreground">({s.admissionNumber})</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <StatusBadge state={STATUS_BADGE[s.status] ?? "pending"} label={s.status} />
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    {s.content ? <p className="max-w-xs">{s.content}</p> : null}
                    {s.documentUrl ? (
                      <a href={s.documentUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                        View attachment
                      </a>
                    ) : null}
                    {!s.content && !s.documentUrl ? <span className="text-muted-foreground">—</span> : null}
                  </td>
                  <td className="px-3 py-1.5">
                    {s.status === "pending" ? (
                      <span className="text-xs text-muted-foreground">Not submitted yet</span>
                    ) : (
                      <ReviewSubmissionForm submissionId={s.id} existingRemarks={s.teacherRemarks} />
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {homework.publishedAt ? "No students enrolled in this section." : "Publish this homework to create the submission roster."}
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
