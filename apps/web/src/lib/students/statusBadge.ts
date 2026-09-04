import type { StatusState } from "@schoolerp/ui";

/**
 * Shared by the directory row and the profile left rail so the "no badge for active" rule
 * (docs/design-system.md > Specific fixes / Detail pages) can't drift between the two places it
 * applies. student.status values don't map 1:1 onto StatusBadge's fixed semantics --
 * "withdrawn"/"transferred" read as neutral-negative (danger), "alumni" as neutral (info).
 * "active" is deliberately absent: it's the default for nearly every student, so a badge for it
 * carries no information while taking the most visual weight on the row/rail.
 */
const STUDENT_STATUS_BADGE: Record<string, StatusState> = {
  transferred: "overdue",
  withdrawn: "absent",
  alumni: "pending",
};

export function studentStatusBadgeState(status: string): StatusState | null {
  return STUDENT_STATUS_BADGE[status] ?? null;
}
