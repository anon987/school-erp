import type { TrendPoint } from "../types";

/**
 * A plain div-based bar chart, not an SVG/canvas library -- no charting dependency exists in
 * this repo, and seven data points don't need one. Bars use the school's own --primary token
 * (hsl(var(--primary))), the same theming mechanism every other themed element in the app uses,
 * so a school's brand color shows up here too, not a hardcoded chart color.
 */
export function TrendChart({ title, points, formatValue }: { title: string; points: TrendPoint[]; formatValue: (value: number) => string }) {
  const numericValues = points.map((p) => p.value ?? 0);
  const max = Math.max(1, ...numericValues);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex items-end gap-2" style={{ height: 96 }}>
        {points.map((p, i) => {
          const heightPercent = p.value === null || p.value === 0 ? 2 : Math.max(4, (p.value / max) * 100);
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end justify-center">
                <div
                  className="w-full max-w-[28px] rounded-t"
                  style={{ height: `${heightPercent}%`, backgroundColor: p.value === null ? "hsl(var(--muted))" : "hsl(var(--primary))" }}
                  title={p.value !== null ? formatValue(p.value) : "No data"}
                />
              </div>
              <span className="font-figures text-[10px] text-muted-foreground">{formatDayLabel(p.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDayLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}
