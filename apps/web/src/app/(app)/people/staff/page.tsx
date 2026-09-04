import Link from "next/link";
import { Plus, Upload, Users, SearchX } from "lucide-react";
import { StatusBadge } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { listStaff, getStaffFormOptions } from "@/lib/staff/queries";
import type { StaffSortKey } from "@/lib/staff/types";
import { staffStatusBadgeState } from "@/lib/staff/statusBadge";
import { Pagination } from "@/components/Pagination";
import { StaffFilterBar } from "@/lib/staff/components/StaffFilterBar";
import { RowActionsMenu } from "@/components/RowActionsMenu";
import { TwoLineCell } from "@/components/TwoLineCell";
import { EmptyState } from "@/components/EmptyState";

const DEFAULT_PAGE_SIZE = 25;

function isSortKey(value: string): value is StaffSortKey {
  return value === "employeeCode" || value === "name";
}

export default async function StaffDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const permissions = await getPermissions();
  const canManage = permissions.includes("school.manage_staff");
  const params = await searchParams;

  const page = Number(params.page ?? "0") || 0;
  const search = params.search ?? "";
  const departmentId = params.departmentId ?? "";
  const sort = params.sort && isSortKey(params.sort) ? params.sort : "";
  const dir = params.dir === "desc" ? "desc" : "asc";
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE;
  const hasActiveFilters = Boolean(search || departmentId);

  const [directory, options] = await Promise.all([
    listStaff(session.schoolId!, { search, departmentId: departmentId || undefined, sort: sort || undefined, dir }, page, pageSize),
    getStaffFormOptions(session.schoolId!),
  ]);

  function hrefFor(nextPage: number): string {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (departmentId) qs.set("departmentId", departmentId);
    if (sort) qs.set("sort", sort);
    if (dir !== "asc") qs.set("dir", dir);
    if (pageSize !== DEFAULT_PAGE_SIZE) qs.set("pageSize", String(pageSize));
    qs.set("page", String(nextPage));
    return `/people/staff?${qs.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Staff</h1>
        {canManage ? (
          <div className="flex gap-2">
            <Link
              href="/people/staff/import"
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import
            </Link>
            <Link
              href="/people/staff/new"
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New staff record
            </Link>
          </div>
        ) : null}
      </div>

      <StaffFilterBar
        departments={options.departments}
        params={{ search, departmentId, sort, dir, pageSize }}
        pagination={<Pagination page={directory.page} pageSize={directory.pageSize} total={directory.total} hrefFor={hrefFor} />}
      >
        {directory.items.map((staff) => (
          <tr key={staff.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
            <td className="px-3 py-1.5">
              <Link href={`/people/staff/${staff.id}`} className="font-figures font-medium underline-offset-2 hover:underline">
                {staff.employeeCode}
              </Link>
            </td>
            <td className="px-3 py-1.5 font-medium">
              {staff.firstName} {staff.lastName}
            </td>
            <td className="px-3 py-1.5">
              <TwoLineCell primary={staff.departmentName ?? "—"} secondary={staff.designationName} />
            </td>
            <td className="px-3 py-1.5">
              {staffStatusBadgeState(staff.employmentStatus) ? (
                <StatusBadge state={staffStatusBadgeState(staff.employmentStatus)!} label={staff.employmentStatus} />
              ) : null}
            </td>
            <td className="px-3 py-1.5 text-right">
              <RowActionsMenu
                actions={[
                  { label: "View", href: `/people/staff/${staff.id}` },
                  ...(canManage ? [{ label: "Edit", href: `/people/staff/${staff.id}/edit` }] : []),
                ]}
              />
            </td>
          </tr>
        ))}
        {directory.items.length === 0 ? (
          <tr>
            <td colSpan={5}>
              {hasActiveFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="No staff match these filters"
                  description="Try a different search term, or clear the filters."
                  action={{ label: "Clear filters", href: "/people/staff" }}
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title="No staff yet"
                  description="Import the school's existing staff records to get started."
                  action={canManage ? { label: "Import staff", href: "/people/staff/import" } : undefined}
                />
              )}
            </td>
          </tr>
        ) : null}
      </StaffFilterBar>
    </div>
  );
}
