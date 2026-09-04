"use client";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** docs/design-system.md > Tables: a per-page selector so the user chooses their own density. */
export function PageSizeSelect({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Rows per page
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
