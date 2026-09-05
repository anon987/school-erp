"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function ClassIdCardDownloadForm({ classes }: { classes: { id: string; name: string }[] }) {
  const [classId, setClassId] = useState("");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Class
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select a class…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {classId ? (
        <a
          href={`/api/id-cards/student/class/${classId}/pdf`}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download PDF
        </a>
      ) : (
        <span className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground opacity-60">Select a class first</span>
      )}
    </div>
  );
}
