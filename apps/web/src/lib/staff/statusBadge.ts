import type { StatusState } from "@schoolerp/ui";

/**
 * Same rule as lib/students/statusBadge.ts, shared shape not shared code (the status vocabulary
 * differs): "active" is the default for nearly every staff record, so it gets no badge --
 * "inactive" is the exception worth flagging.
 */
export function staffStatusBadgeState(status: string): StatusState | null {
  return status === "inactive" ? "absent" : null;
}
