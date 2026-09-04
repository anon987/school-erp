import Link from "next/link";
import { StatusBadge, type StatusState } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { listStudents, getStudentFormOptions } from "@/lib/students/queries";
import { Pagination } from "@/components/Pagination";
import { StudentFilterBar } from "@/lib/students/components/StudentFilterBar";

const PAGE_SIZE = 25;

function isNonActiveStatusState(value: string): value is StatusState {
  return ["transferred", "withdrawn", "alumni"].includes(value);
}

// student.status values don't map 1:1 onto StatusBadge's fixed semantics (which are
// present/absent/late/paid/due/overdue/approved/pending) -- "withdrawn"/"transferred" read as
// neutral-negative (danger), "alumni" as neutral (info). Mapped here rather than teaching
// StatusBadge a new vocabulary per module.
//
// "active" is deliberately NOT in this map -- it's the default state for essentially every row
// in the directory, so a badge on every line carries no information while still taking the most
// visual weight on the row. The badge only appears for the exception (transferred/withdrawn/
// alumni); an active student's status cell is blank, which is itself the signal ("nothing to
// flag here").
const STUDENT_STATUS_BADGE: Record<string, StatusState> = {
  transferred: "overdue",
  withdrawn: "absent",
  alumni: "pending",
};

export default async function StudentsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const permissions = await getPermissions();
  const canManage = permissions.includes("school.manage_students");
  const params = await searchParams;

  const page = Number(params.page ?? "0") || 0;
  const search = params.search ?? "";
  const classId = params.classId ?? "";
  const sectionId = params.sectionId ?? "";

  const [directory, options] = await Promise.all([
    listStudents(session.schoolId!, { search, classId: classId || undefined, sectionId: sectionId || undefined }, page, PAGE_SIZE),
    getStudentFormOptions(session.schoolId!),
  ]);

  function hrefFor(nextPage: number): string {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (classId) qs.set("classId", classId);
    if (sectionId) qs.set("sectionId", sectionId);
    qs.set("page", String(nextPage));
    return `/people/students?${qs.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Students</h1>
        {canManage ? (
          <div className="flex gap-2">
            <Link
              href="/people/students/import"
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              Import
            </Link>
            <Link
              href="/people/students/new"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              New student
            </Link>
          </div>
        ) : null}
      </div>

      <StudentFilterBar
        classes={options.classes}
        sections={options.sections}
        initialSearch={search}
        initialClassId={classId}
        initialSectionId={sectionId}
      >
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                <th className="px-3 py-2 font-medium">Admission #</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Roll #</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {directory.items.map((student) => (
                <tr key={student.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-3 py-2">
                    <Link
                      href={`/people/students/${student.id}`}
                      className="font-figures font-medium underline-offset-2 hover:underline"
                    >
                      {student.admissionNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {student.className ? `${student.className} - ${student.sectionName}` : "—"}
                  </td>
                  <td className="px-3 py-2 font-figures text-muted-foreground">{student.rollNumber ?? "—"}</td>
                  <td className="px-3 py-2">
                    {isNonActiveStatusState(student.status) ? (
                      <StatusBadge state={STUDENT_STATUS_BADGE[student.status]!} label={student.status} />
                    ) : null}
                  </td>
                </tr>
              ))}
              {directory.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No students match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Pagination page={directory.page} pageSize={directory.pageSize} total={directory.total} hrefFor={hrefFor} />
        </div>
      </StudentFilterBar>
    </div>
  );
}
