import Link from "next/link";
import { Plus, Upload, GraduationCap, SearchX, IdCard, FileBarChart } from "lucide-react";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { listStudents, getStudentFormOptions } from "@/lib/students/queries";
import type { StudentFeeStatus, StudentSortKey } from "@/lib/students/types";
import { Pagination } from "@/components/Pagination";
import { StudentFilterBar } from "@/lib/students/components/StudentFilterBar";
import { RowActionsMenu } from "@/components/RowActionsMenu";
import { TwoLineCell } from "@/components/TwoLineCell";
import { EmptyState } from "@/components/EmptyState";
import { studentStatusBadgeState } from "@/lib/students/statusBadge";

const DEFAULT_PAGE_SIZE = 25;

function isSortKey(value: string): value is StudentSortKey {
  return value === "admissionNumber" || value === "name";
}

function isFeeStatus(value: string | undefined): value is StudentFeeStatus {
  return value === "due" || value === "paid" || value === "none";
}

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
  const feeStatus = isFeeStatus(params.feeStatus) ? params.feeStatus : "";
  const sort = params.sort && isSortKey(params.sort) ? params.sort : "";
  const dir = params.dir === "desc" ? "desc" : "asc";
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE;
  const hasActiveFilters = Boolean(search || classId || sectionId || feeStatus);

  const [directory, options] = await Promise.all([
    listStudents(
      session.schoolId!,
      { search, classId: classId || undefined, sectionId: sectionId || undefined, feeStatus: feeStatus || undefined, sort: sort || undefined, dir },
      page,
      pageSize,
    ),
    getStudentFormOptions(session.schoolId!),
  ]);

  function hrefFor(nextPage: number): string {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (classId) qs.set("classId", classId);
    if (sectionId) qs.set("sectionId", sectionId);
    if (feeStatus) qs.set("feeStatus", feeStatus);
    if (sort) qs.set("sort", sort);
    if (dir !== "asc") qs.set("dir", dir);
    if (pageSize !== DEFAULT_PAGE_SIZE) qs.set("pageSize", String(pageSize));
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
              href="/people/students/reports"
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              <FileBarChart className="h-4 w-4" aria-hidden="true" />
              Reports
            </Link>
            <Link
              href="/people/students/id-cards"
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              <IdCard className="h-4 w-4" aria-hidden="true" />
              ID Cards
            </Link>
            <Link
              href="/people/students/import"
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import
            </Link>
            <Link
              href="/people/students/new"
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New student
            </Link>
          </div>
        ) : null}
      </div>

      <StudentFilterBar
        classes={options.classes}
        sections={options.sections}
        params={{ search, classId, sectionId, feeStatus, sort, dir, pageSize }}
        pagination={<Pagination page={directory.page} pageSize={directory.pageSize} total={directory.total} hrefFor={hrefFor} />}
      >
        {directory.items.map((student) => (
          <tr key={student.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
            <td className="px-3 py-1.5">
              <Link
                href={`/people/students/${student.id}`}
                className="font-figures font-medium underline-offset-2 hover:underline"
              >
                {student.admissionNumber}
              </Link>
            </td>
            <td className="px-3 py-1.5 font-medium">
              {student.firstName} {student.lastName}
            </td>
            <td className="px-3 py-1.5">
              <TwoLineCell
                primary={student.className ?? "—"}
                secondary={student.sectionName ? `Section ${student.sectionName}` : null}
              />
            </td>
            <td className="px-3 py-1.5 font-figures text-muted-foreground">{student.rollNumber ?? "—"}</td>
            <td className="px-3 py-1.5">
              {studentStatusBadgeState(student.status) ? (
                <StatusBadge state={studentStatusBadgeState(student.status)!} label={student.status} />
              ) : null}
            </td>
            <td className="px-3 py-1.5">
              {student.feeStatus === "none" ? (
                <span className="text-xs text-muted-foreground">No invoices</span>
              ) : student.feeStatus === "paid" ? (
                <StatusBadge state="paid" label="Paid" />
              ) : (
                <StatusBadge state="due" label={`Due ₹${(student.feeDueAmountPaise / 100).toLocaleString("en-IN")}`} />
              )}
            </td>
            <td className="px-3 py-1.5 text-right">
              <RowActionsMenu
                actions={[
                  { label: "View", href: `/people/students/${student.id}` },
                  ...(canManage ? [{ label: "Edit", href: `/people/students/${student.id}/edit` }] : []),
                ]}
              />
            </td>
          </tr>
        ))}
        {directory.items.length === 0 ? (
          <tr>
            <td colSpan={7}>
              {hasActiveFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="No students match these filters"
                  description="Try a different search term, or clear the filters."
                  action={{ label: "Clear filters", href: "/people/students" }}
                />
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title="No students yet"
                  description="Import the school's existing register to get started."
                  action={canManage ? { label: "Import students", href: "/people/students/import" } : undefined}
                />
              )}
            </td>
          </tr>
        ) : null}
      </StudentFilterBar>
    </div>
  );
}
