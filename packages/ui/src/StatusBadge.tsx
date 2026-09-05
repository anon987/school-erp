import { CheckCircle2, XCircle, AlertTriangle, Circle, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

/**
 * The states named in docs/schoolerp_features.md, collapsed to four fixed semantics (see
 * docs/design-system.md for why: present/paid/approved all mean "good," absent/overdue both mean
 * "bad" -- fewer, more distinguishable hues beat many similar ones, especially for colorblind
 * users). half_day and leave (Attendance, §E) join the same four buckets rather than getting a
 * fifth/sixth hue: half_day reads as a partial exception like late (warning), leave reads as a
 * known, sanctioned, non-problem state like due/pending (info).
 */
export type StatusState = "present" | "absent" | "late" | "half_day" | "leave" | "paid" | "due" | "overdue" | "approved" | "pending";

type Semantic = "success" | "danger" | "warning" | "info";

// lucide-react, 14px (h-3.5 w-3.5) -- see docs/design-system.md Foundations > Icons. Replaces
// the Unicode glyphs (✓ ✕ ! ●) this component used as a stopgap before there was a real icon
// system in the product.
const STATUS_SEMANTIC: Record<StatusState, { semantic: Semantic; Icon: LucideIcon }> = {
  present: { semantic: "success", Icon: CheckCircle2 },
  paid: { semantic: "success", Icon: CheckCircle2 },
  approved: { semantic: "success", Icon: CheckCircle2 },
  absent: { semantic: "danger", Icon: XCircle },
  overdue: { semantic: "danger", Icon: AlertTriangle },
  late: { semantic: "warning", Icon: AlertTriangle },
  half_day: { semantic: "warning", Icon: AlertTriangle },
  due: { semantic: "info", Icon: Circle },
  pending: { semantic: "info", Icon: Circle },
  leave: { semantic: "info", Icon: Circle },
};

const SEMANTIC_CLASSES: Record<Semantic, string> = {
  success: "bg-success text-success-foreground",
  danger: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
};

export interface StatusBadgeProps {
  state: StatusState;
  /**
   * Required, not optional: this component's whole reason to exist is "never color alone."
   * Callers pass already-translated text (packages/ui doesn't own an i18n dictionary).
   */
  label: string;
  className?: string;
}

export function StatusBadge({ state, label, className }: StatusBadgeProps) {
  const config = STATUS_SEMANTIC[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        SEMANTIC_CLASSES[config.semantic],
        className,
      )}
    >
      <config.Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}
