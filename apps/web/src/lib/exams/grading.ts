import type { GradeBandOption } from "./types";

/**
 * Pure, no server imports -- deliberately its own module, not part of queries.ts. MarksEntryGrid
 * (a Client Component) needs this for live grade preview; importing anything from queries.ts
 * there would pull createSupabaseServerClient (and next/headers) into the client bundle and
 * crash the page. Confirmed by hitting exactly that crash before extracting this.
 */
export function resolveGradeLabel(bands: GradeBandOption[], percentage: number): string | null {
  const band = bands.find((b) => percentage >= b.minPercentage && percentage <= b.maxPercentage);
  return band?.gradeLabel ?? null;
}
