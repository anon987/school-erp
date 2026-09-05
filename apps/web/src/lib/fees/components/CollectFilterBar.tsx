"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUrlTransition } from "@/lib/core/useUrlTransition";

const SEARCH_DEBOUNCE_MS = 300;

export interface CollectFilterParams {
  q: string;
  classId: string;
  sectionId: string;
}

/**
 * Search by name/admission number, OR browse by class/section with no text at all -- an
 * accountant collecting fees class-by-class doesn't necessarily know who they're looking for.
 * Same debounced-search + auto-navigate-on-select shape as StudentFilterBar, minus sorting/
 * pagination (browseStudentsForCollection caps at 100 results, narrower than a full directory
 * listing needs to be).
 */
export function CollectFilterBar({
  classes,
  sections,
  params,
  children,
}: {
  classes: { id: string; name: string }[];
  sections: { id: string; classId: string; name: string }[];
  params: CollectFilterParams;
  children: ReactNode;
}) {
  const { isPending, navigate } = useUrlTransition();
  const [q, setQ] = useState(params.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function go(next: Partial<CollectFilterParams>) {
    const merged = { ...params, q, ...next };
    navigate({ q: merged.q, classId: merged.classId, sectionId: merged.sectionId });
  }

  function onSearchChange(value: string) {
    setQ(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => go({ q: value }), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search
          <input
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name or admission number"
            className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Class
          <select
            value={params.classId}
            onChange={(e) => go({ classId: e.target.value, sectionId: "" })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Section
          <select value={params.sectionId} onChange={(e) => go({ sectionId: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All sections</option>
            {sections
              .filter((s) => !params.classId || s.classId === params.classId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        {isPending ? <span className="pb-2 text-sm text-muted-foreground">Updating…</span> : null}
      </div>
      <div className={isPending ? "opacity-50 transition-opacity duration-150" : "transition-opacity duration-150"}>{children}</div>
    </div>
  );
}
