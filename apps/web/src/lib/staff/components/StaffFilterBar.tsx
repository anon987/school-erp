"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUrlTransition } from "@/lib/core/useUrlTransition";
import { SortableHeader, nextSortState, type SortDir } from "@/components/SortableHeader";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import type { DepartmentOption, StaffSortKey } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

export interface StaffDirectoryParams {
  search: string;
  departmentId: string;
  sort: StaffSortKey | "";
  dir: SortDir;
  pageSize: number;
}

/** Staff's equivalent of lib/students/components/StudentFilterBar.tsx -- see that file for why the table shell lives here rather than in the Server Component page. */
export function StaffFilterBar({
  departments,
  params,
  pagination,
  children,
}: {
  departments: DepartmentOption[];
  params: StaffDirectoryParams;
  pagination: ReactNode;
  children: ReactNode;
}) {
  const { isPending, navigate } = useUrlTransition();
  const [search, setSearch] = useState(params.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function go(next: Partial<StaffDirectoryParams>) {
    const merged = { ...params, search, ...next };
    navigate({
      search: merged.search,
      departmentId: merged.departmentId,
      sort: merged.sort,
      dir: merged.dir,
      pageSize: String(merged.pageSize),
    });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => go({ search: value }), SEARCH_DEBOUNCE_MS);
  }

  function onSort(key: string) {
    const { sort, dir } = nextSortState(key, params.sort, params.dir);
    go({ sort: sort as StaffSortKey | "", dir });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <input
            id="search"
            name="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name or employee code"
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="departmentId" className="text-xs font-medium text-muted-foreground">
            Department
          </label>
          <select
            id="departmentId"
            name="departmentId"
            value={params.departmentId}
            onChange={(e) => go({ departmentId: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {isPending ? <span className="pb-2 text-sm text-muted-foreground">Updating…</span> : null}
      </div>

      <div className={isPending ? "opacity-50 transition-opacity duration-150" : "transition-opacity duration-150"}>
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                <SortableHeader label="Employee #" sortKey="employeeCode" currentSort={params.sort} currentDir={params.dir} onSort={onSort} />
                <SortableHeader label="Name" sortKey="name" currentSort={params.sort} currentDir={params.dir} onSort={onSort} />
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <PageSizeSelect value={params.pageSize} onChange={(size) => go({ pageSize: size })} />
          {pagination}
        </div>
      </div>
    </div>
  );
}
