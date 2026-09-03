import { cn } from "./cn";

/**
 * The seven states named in docs/schoolerp_features.md, collapsed to four fixed semantics
 * (see docs/design-system.md for why: present/paid/approved all mean "good," absent/overdue
 * both mean "bad" -- fewer, more distinguishable hues beat seven similar ones, especially for
 * colorblind users).
 */
export type StatusState = "present" | "absent" | "late" | "paid" | "due" | "overdue" | "approved" | "pending";

type Semantic = "success" | "danger" | "warning" | "info";

const STATUS_SEMANTIC: Record<StatusState, { semantic: Semantic; glyph: string }> = {
  present: { semantic: "success", glyph: "✓" },
  paid: { semantic: "success", glyph: "✓" },
  approved: { semantic: "success", glyph: "✓" },
  absent: { semantic: "danger", glyph: "✕" },
  overdue: { semantic: "danger", glyph: "!" },
  late: { semantic: "warning", glyph: "!" },
  due: { semantic: "info", glyph: "●" },
  pending: { semantic: "info", glyph: "●" },
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
      <span aria-hidden="true">{config.glyph}</span>
      <span>{label}</span>
    </span>
  );
}
