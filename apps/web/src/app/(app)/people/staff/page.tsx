import Link from "next/link";
import { StatusBadge, type StatusState } from "@schoolerp/ui";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getPermissions } from "@/lib/core/auth/permissions";
import { listStaff, getStaffFormOptions } from "@/lib/staff/queries";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 25;

const EMPLOYMENT_STATUS_BADGE: Record<string, StatusState> = {
  active: "approved",
  inactive: "absent",
};

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

  const [directory, options] = await Promise.all([
    listStaff(session.schoolId!, { search, departmentId: departmentId || undefined }, page, PAGE_SIZE),
    getStaffFormOptions(session.schoolId!),
  ]);

  function hrefFor(nextPage: number): string {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (departmentId) qs.set("departmentId", departmentId);
    qs.set("page", String(nextPage));
    return `/people/staff?${qs.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Staff</h1>
        {canManage ? (
          <div className="flex gap-2">
            <Link href="/people/staff/import" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
              Import
            </Link>
            <Link
              href="/people/staff/new"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              New staff record
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
            placeholder="Name or employee code"
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="departmentId" className="text-sm font-medium">
            Department
          </label>
          <select
            id="departmentId"
            name="departmentId"
            defaultValue={departmentId}
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          >
            <option value="">All departments</option>
            {options.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
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
              <th className="px-3 py-2 font-medium">Employee #</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Designation</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {directory.items.map((staff) => (
              <tr key={staff.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                <td className="px-3 py-2">
                  <Link href={`/people/staff/${staff.id}`} className="font-figures underline-offset-2 hover:underline">
                    {staff.employeeCode}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {staff.firstName} {staff.lastName}
                </td>
                <td className="px-3 py-2">{staff.departmentName ?? "—"}</td>
                <td className="px-3 py-2">{staff.designationName ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    state={EMPLOYMENT_STATUS_BADGE[staff.employmentStatus] ?? "pending"}
                    label={staff.employmentStatus}
                  />
                </td>
              </tr>
            ))}
            {directory.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No staff match these filters.
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
