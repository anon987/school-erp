"use client";

import { useRouter } from "next/navigation";

export function ClassSectionPicker({
  basePath,
  classes,
  sections,
  selectedClassId,
  selectedSectionId,
}: {
  basePath: string;
  classes: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  selectedClassId: string;
  selectedSectionId: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Class
        <select
          value={selectedClassId}
          onChange={(e) => router.push(e.target.value ? `${basePath}?classId=${e.target.value}` : basePath)}
          className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select a class…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {selectedClassId ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Section
          <select
            value={selectedSectionId}
            onChange={(e) => router.push(e.target.value ? `${basePath}?classId=${selectedClassId}&sectionId=${e.target.value}` : `${basePath}?classId=${selectedClassId}`)}
            className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a section…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
