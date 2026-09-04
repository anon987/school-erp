"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ClassOption, SectionOption } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Filters apply as you change them -- no separate "Filter" button. A select applies immediately
 * (a discrete choice, nothing to debounce); the free-text search field debounces so it doesn't
 * fire a navigation per keystroke. Either way the navigation itself runs inside startTransition,
 * so typing/clicking never blocks, and `children` (the table + pagination, still rendered
 * server-side and passed straight through) dims via isPending instead of the whole page
 * flashing to a blank loading state.
 */
export function StudentFilterBar({
  classes,
  sections,
  initialSearch,
  initialClassId,
  initialSectionId,
  children,
}: {
  classes: ClassOption[];
  sections: SectionOption[];
  initialSearch: string;
  initialClassId: string;
  initialSectionId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function navigate(next: { search: string; classId: string; sectionId: string }) {
    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.classId) params.set("classId", next.classId);
    if (next.sectionId) params.set("sectionId", next.sectionId);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => navigate({ search: value, classId: initialClassId, sectionId: initialSectionId }),
      SEARCH_DEBOUNCE_MS,
    );
  }

  function onClassChange(classId: string) {
    // Changing class clears section -- the previously-selected section may not belong to the
    // newly-chosen class, and silently keeping it would filter to an impossible combination.
    navigate({ search, classId, sectionId: "" });
  }

  function onSectionChange(sectionId: string) {
    navigate({ search, classId: initialClassId, sectionId });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-sm font-medium">
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
          <label htmlFor="classId" className="text-sm font-medium">
            Class
          </label>
          <select
            id="classId"
            name="classId"
            value={initialClassId}
            onChange={(e) => onClassChange(e.target.value)}
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
          <label htmlFor="sectionId" className="text-sm font-medium">
            Section
          </label>
          <select
            id="sectionId"
            name="sectionId"
            value={initialSectionId}
            onChange={(e) => onSectionChange(e.target.value)}
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
        {children}
      </div>
    </div>
  );
}
