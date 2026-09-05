/**
 * A plain conic-gradient div, not an SVG/canvas charting library -- same "no charting dependency
 * for a couple of shapes" reasoning as lib/dashboard/components/TrendChart.tsx. Segment colors
 * are always one of the app's four fixed status semantics (success/danger/warning/info, the same
 * ones StatusBadge uses) -- never a school-overridable brand token, per CLAUDE.md's "status
 * colours are not themeable" rule; this chart depicts status-like breakdowns, not arbitrary data.
 */
export function DonutChart({ title, segments }: { title: string; segments: { label: string; value: number; colorVar: "success" | "danger" | "warning" | "info" }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (cumulative / total) * 360;
      cumulative += s.value;
      const end = (cumulative / total) * 360;
      return `hsl(var(--${s.colorVar}-solid)) ${start}deg ${end}deg`;
    });
  const background = total > 0 ? `conic-gradient(${stops.join(", ")})` : "hsl(var(--muted))";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background }}>
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-card font-figures text-sm font-semibold">{total}</div>
        </div>
        <ul className="flex flex-col gap-1 text-xs">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `hsl(var(--${s.colorVar}-solid))` }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-figures font-medium">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
