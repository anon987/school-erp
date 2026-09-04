"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

/**
 * docs/design-system.md > Tables: sortable columns get a visible chevron indicator and
 * aria-sort, cycling unsorted -> ascending -> descending -> unsorted. Sort state lives in the
 * URL, same as filters -- the parent passes the current (sortKey, dir) and a callback that
 * computes the next state and pushes it through the same useUrlTransition mechanism filters use.
 */
export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  currentDir: SortDir;
  onSort: (key: string) => void;
  align?: "left" | "right";
}) {
  const active = currentSort === sortKey;
  const Icon = !active ? ChevronsUpDown : currentDir === "asc" ? ChevronUp : ChevronDown;

  return (
    <th
      className="px-3 py-2 font-medium"
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 text-muted-foreground hover:text-foreground ${
          align === "right" ? "ml-auto flex-row-reverse" : ""
        }`}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

/** unsorted -> asc -> desc -> unsorted, per docs/design-system.md > Tables. */
export function nextSortState(
  key: string,
  currentSort: string,
  currentDir: SortDir,
): { sort: string; dir: SortDir } {
  if (currentSort !== key) return { sort: key, dir: "asc" };
  if (currentDir === "asc") return { sort: key, dir: "desc" };
  return { sort: "", dir: "asc" };
}
