"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUrlTransition } from "@/lib/core/useUrlTransition";
import { SortableHeader, nextSortState, type SortDir } from "@/components/SortableHeader";
import { PageSizeSelect } from "@/components/PageSizeSelect";
import type { ClassOption, SectionOption, StudentSortKey } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

export interface StudentDirectoryParams {
  search: string;
  classId: string;
  sectionId: string;
  sort: StudentSortKey | "";
  dir: SortDir;
  pageSize: number;
}

/**
 * Owns every interactive control on the Students directory -- search, class/section filters,
 * sortable column headers, and the per-page selector -- as one useTransition, so the table dims
 * for any of them, not just the filter fields. This is why the table's <thead> is built here
 * rather than in the Server Component page: the header cells need the same navigate()/isPending
 * this component already has for the filter fields, and splitting that across multiple
 * independent client islands would mean each control dims a different, smaller area instead of
 * the whole table reacting consistently (docs/design-system.md > Tables).
 *
 * `children` is the <tbody> content only -- still server-rendered and passed straight through,
 * per the existing Server-Component-children-into-a-Client-Component pattern.
 */
export function StudentFilterBar({
  classes,
  sections,
  params,
  pagination,
  children,
}: {
  classes: ClassOption[];
  sections: SectionOption[];
  params: StudentDirectoryParams;
  pagination: ReactNode;
  children: ReactNode;
}) {
  const { isPending, navigate } = useUrlTransition();
  const [search, setSearch] = useState(params.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function go(next: Partial<StudentDirectoryParams>) {
    const merged = { ...params, search, ...next };
    navigate({
      search: merged.search,
      classId: merged.classId,
      sectionId: merged.sectionId,
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
    go({ sort: sort as StudentSortKey | "", dir });
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
            placeholder="Name or admission number"
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="classId" className="text-xs font-medium text-muted-foreground">
            Class
          </label>
          <select
            id="classId"
            name="classId"
            value={params.classId}
            onChange={(e) => go({ classId: e.target.value, sectionId: "" })}
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sectionId" className="text-xs font-medium text-muted-foreground">
            Section
          </label>
          <select
            id="sectionId"
            name="sectionId"
            value={params.sectionId}
            onChange={(e) => go({ sectionId: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-base"
          >
            <option value="">All sections</option>
            {sections.map((s) => {
              const className = classes.find((c) => c.id === s.classId)?.name ?? "";
              return (
                <option key={s.id} value={s.id}>
                  {className} - {s.name}
                </option>
              );
            })}
          </select>
        </div>
        {isPending ? <span className="pb-2 text-sm text-muted-foreground">Updating…</span> : null}
      </div>

      <div className={isPending ? "opacity-50 transition-opacity duration-150" : "transition-opacity duration-150"}>
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                <SortableHeader label="Admission #" sortKey="admissionNumber" currentSort={params.sort} currentDir={params.dir} onSort={onSort} />
                <SortableHeader label="Name" sortKey="name" currentSort={params.sort} currentDir={params.dir} onSort={onSort} />
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Roll #</th>
                <th className="px-3 py-2 font-medium">Status</th>
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
