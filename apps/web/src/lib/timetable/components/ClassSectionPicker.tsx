"use client";

import { useRouter } from "next/navigation";
import type { ClassWithSections } from "@/lib/master-data/types";

export function ClassSectionPicker({
  classes,
  classId,
  sectionId,
  basePath,
}: {
  classes: ClassWithSections[];
  classId: string;
  sectionId: string;
  basePath: string;
}) {
  const router = useRouter();
  const selectedClass = classes.find((c) => c.id === classId);

  return (
    <div className="flex gap-2">
      <select
        value={classId}
        onChange={(e) => router.push(`${basePath}?classId=${e.target.value}`)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Select a class</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={sectionId}
        disabled={!selectedClass}
        onChange={(e) => router.push(`${basePath}?classId=${classId}&sectionId=${e.target.value}`)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Select a section</option>
        {(selectedClass?.sections ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
