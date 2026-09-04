/**
 * docs/design-system.md > Tables: two related fields (class + section, department +
 * designation) stack in one cell instead of adding a column, so both fit without increasing
 * row height.
 */
export function TwoLineCell({ primary, secondary }: { primary: string; secondary?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-sm text-foreground">{primary}</span>
      {secondary ? <span className="text-xs text-muted-foreground">{secondary}</span> : null}
    </div>
  );
}
