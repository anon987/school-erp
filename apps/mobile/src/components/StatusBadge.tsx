import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Circle, XCircle, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import type { ColorTokens } from "@/lib/core/theme/tokens";

/**
 * Mobile port of packages/ui/src/StatusBadge.tsx -- same semantic collapsing (present/paid/
 * approved = success, absent/overdue = danger, late/half_day = warning, due/pending/leave = info)
 * and the same "icon + label, never color alone" rule. Status colors are NOT themeable (CLAUDE.md)
 * -- these four semantics use the fixed success/danger/warning/info tokens in every school, every
 * mode, same as web.
 */
export type StatusState = "present" | "absent" | "late" | "half_day" | "leave" | "paid" | "due" | "overdue" | "approved" | "pending";

type Semantic = "success" | "danger" | "warning" | "info";

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

function semanticColors(semantic: Semantic, colors: ColorTokens): { bg: string; fg: string } {
  switch (semantic) {
    case "success":
      return { bg: colors.success, fg: colors.successForeground };
    case "danger":
      return { bg: colors.danger, fg: colors.dangerForeground };
    case "warning":
      return { bg: colors.warning, fg: colors.warningForeground };
    case "info":
      return { bg: colors.info, fg: colors.infoForeground };
  }
}

export function StatusBadge({ state, label }: { state: StatusState; label: string }) {
  const { colors } = useTheme();
  const config = STATUS_SEMANTIC[state];
  const { bg, fg } = semanticColors(config.semantic, colors);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <config.Icon size={14} color={fg} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
