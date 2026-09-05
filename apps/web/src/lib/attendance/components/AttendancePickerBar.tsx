"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useUrlTransition } from "@/lib/core/useUrlTransition";
import type { MarkableSection } from "../queries";

/**
 * Class dropdown -> section dropdown (cascading), not one flat "Class - Section" list -- with
 * ~7 classes x 6 sections that's 40+ entries in a single select, which is exactly the kind of
 * picker docs/design-system.md's filter-bar conventions (StaffFilterBar, StudentFilterBar) exist
 * to avoid. Section options are always attendance.manage's or the caller's OWN section list
 * (getMarkableSections already scoped that server-side); this component only reshapes it into
 * two dependent selects, it doesn't widen what's selectable.
 */
export function AttendancePickerBar({
  sections,
  sectionId,
  attendanceDate,
  canManage,
}: {
  sections: MarkableSection[];
  sectionId: string;
  attendanceDate: string;
  canManage: boolean;
}) {
  const { isPending, navigate } = useUrlTransition();

  const classNames = useMemo(() => Array.from(new Set(sections.map((s) => s.className))), [sections]);
  const currentClassName = sections.find((s) => s.sectionId === sectionId)?.className ?? classNames[0] ?? "";
  const [selectedClass, setSelectedClass] = useState(currentClassName);

  const sectionsInClass = useMemo(() => sections.filter((s) => s.className === selectedClass), [sections, selectedClass]);

  function onClassChange(className: string) {
    setSelectedClass(className);
    const firstSection = sections.find((s) => s.className === className);
    if (firstSection) navigate({ sectionId: firstSection.sectionId, date: attendanceDate });
  }

  function onSectionChange(nextSectionId: string) {
    navigate({ sectionId: nextSectionId, date: attendanceDate });
  }

  function onDateChange(nextDate: string) {
    navigate({ sectionId, date: nextDate });
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
          onChange={(e) => onSectionChange(e.target.value)}
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
        Date
        <input
          type="date"
          defaultValue={attendanceDate}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      {isPending ? <span className="pb-2 text-sm text-muted-foreground">Updating…</span> : null}
      {!canManage ? (
        <Link href="/academics/attendance/reports" className="ml-auto pb-2 text-sm text-primary underline-offset-2 hover:underline">
          View reports
        </Link>
      ) : null}
    </div>
  );
}
