import Link from "next/link";
import { StatusBadge, type StatusState } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { listStudents, getStudentFormOptions } from "@/lib/students/queries";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 25;

function isStatusState(value: string): value is StatusState {
  return ["active", "transferred", "withdrawn", "alumni"].includes(value);
}

// student.status values don't map 1:1 onto StatusBadge's fixed semantics (which are
// present/absent/late/paid/due/overdue/approved/pending) -- "active" reads as good (success),
// "withdrawn"/"transferred" as neutral-negative (danger), "alumni" as neutral (info). Mapped
// here rather than teaching StatusBadge a new vocabulary per module.
const STUDENT_STATUS_BADGE: Record<string, StatusState> = {
  active: "approved",
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

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-sm font-medium">
            Search
          </label>
          <input
            id="search"
            name="search"
            defaultValue={search}
            placeholder="Name or admission number"
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="classId" className="text-sm font-medium">
            Class
          </label>
          <select
            id="classId"
            name="classId"
            defaultValue={classId}
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          >
            <option value="">All classes</option>
            {options.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sectionId" className="text-sm font-medium">
            Section
          </label>
          <select
            id="sectionId"
            name="sectionId"
            defaultValue={sectionId}
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          >
            <option value="">All sections</option>
            {options.sections.map((s) => {
              const className = options.classes.find((c) => c.id === s.classId)?.name ?? "";
              return (
                <option key={s.id} value={s.id}>
                  {className} - {s.name}
                </option>
              );
            })}
          </select>
        </div>
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
          Filter
        </button>
      </form>

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
                  <Link href={`/people/students/${student.id}`} className="font-figures underline-offset-2 hover:underline">
                    {student.admissionNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {student.firstName} {student.lastName}
                </td>
                <td className="px-3 py-2">
                  {student.className ? `${student.className} - ${student.sectionName}` : "—"}
                </td>
                <td className="px-3 py-2 font-figures">{student.rollNumber ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    state={isStatusState(student.status) ? STUDENT_STATUS_BADGE[student.status]! : "pending"}
                    label={student.status}
                  />
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

      <Pagination page={directory.page} pageSize={directory.pageSize} total={directory.total} hrefFor={hrefFor} />
    </div>
  );
}
