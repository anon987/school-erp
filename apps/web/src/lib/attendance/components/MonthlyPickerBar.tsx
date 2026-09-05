"use client";

import { useMemo, useState } from "react";
import { useUrlTransition } from "@/lib/core/useUrlTransition";
import type { MarkableSection } from "../queries";

/** Same class -> section cascade as AttendancePickerBar, with a month picker instead of a date. */
export function MonthlyPickerBar({ sections, sectionId, month }: { sections: MarkableSection[]; sectionId: string; month: string }) {
  const { isPending, navigate } = useUrlTransition();

  const classNames = useMemo(() => Array.from(new Set(sections.map((s) => s.className))), [sections]);
  const currentClassName = sections.find((s) => s.sectionId === sectionId)?.className ?? classNames[0] ?? "";
  const [selectedClass, setSelectedClass] = useState(currentClassName);

  const sectionsInClass = useMemo(() => sections.filter((s) => s.className === selectedClass), [sections, selectedClass]);

  function onClassChange(className: string) {
    setSelectedClass(className);
    const firstSection = sections.find((s) => s.className === className);
    if (firstSection) navigate({ sectionId: firstSection.sectionId, month });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Class
        <select
          value={selectedClass}
          onChange={(e) => onClassChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {classNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Section
        <select
          value={sectionId}
          onChange={(e) => navigate({ sectionId: e.target.value, month })}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {sectionsInClass.map((s) => (
            <option key={s.sectionId} value={s.sectionId}>
              {s.sectionName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Month
        <input
          type="month"
          defaultValue={month}
          onChange={(e) => e.target.value && navigate({ sectionId, month: e.target.value })}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      {isPending ? <span className="pb-2 text-sm text-muted-foreground">Updating…</span> : null}
    </div>
  );
}
