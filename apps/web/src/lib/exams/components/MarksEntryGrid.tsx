"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMarksAction } from "../actions";
import { resolveGradeLabel } from "../grading";
import type { GradeBandOption, StudentMarkEntryRow } from "../types";

interface RowState {
  studentId: string;
  marksObtained: string;
  internalMarksObtained: string;
  isAbsent: boolean;
  remarks: string;
}

function toRowState(s: StudentMarkEntryRow): RowState {
  return {
    studentId: s.studentId,
    marksObtained: s.marksObtained !== null ? String(s.marksObtained) : "",
    internalMarksObtained: s.internalMarksObtained !== null ? String(s.internalMarksObtained) : "",
    isAbsent: s.isAbsent,
    remarks: s.remarks ?? "",
  };
}

/**
 * All editing happens client-side against local state; "Save all" serializes the whole grid into
 * one JSON payload for fn_save_marks (one round trip, per-row validation server-side) -- not a
 * save-per-cell pattern, which would be both slower for a ~60-row class and noisier to recover
 * from if one row fails.
 */
export function MarksEntryGrid({
  examId,
  examSubjectId,
  students,
  maxMarks,
  hasInternal,
  internalMaxMarks,
  gradeBands,
  readOnly,
}: {
  examId: string;
  examSubjectId: string;
  students: StudentMarkEntryRow[];
  maxMarks: number;
  hasInternal: boolean;
  internalMaxMarks: number | null;
  gradeBands: GradeBandOption[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>(() => Object.fromEntries(students.map((s) => [s.studentId, toRowState(s)])));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const externalMax = hasInternal && internalMaxMarks !== null ? maxMarks - internalMaxMarks : maxMarks;

  function updateRow(studentId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId]!, ...patch } }));
  }

  const grades = useMemo(() => {
    const result: Record<string, string | null> = {};
    for (const s of students) {
      const row = rows[s.studentId];
      if (!row || row.isAbsent) {
        result[s.studentId] = null;
        continue;
      }
      const external = Number(row.marksObtained) || 0;
      const internal = hasInternal ? Number(row.internalMarksObtained) || 0 : 0;
      const total = external + internal;
      const percentage = maxMarks > 0 ? (total / maxMarks) * 100 : 0;
      result[s.studentId] = row.marksObtained === "" ? null : resolveGradeLabel(gradeBands, percentage);
    }
    return result;
  }, [rows, students, hasInternal, maxMarks, gradeBands]);

  function handleSave() {
    setError(null);
    setSavedCount(null);
    // See attendance/components/MarkingClient.tsx's handleSubmit for why this is wrapped instead
    // of passed directly.
    startTransition(() => {
      void (async () => {
        const payload = {
          examSubjectId,
          marks: students.map((s) => {
            const row = rows[s.studentId]!;
            return {
              studentId: s.studentId,
              marksObtained: row.isAbsent || row.marksObtained === "" ? undefined : Number(row.marksObtained),
              internalMarksObtained: row.isAbsent || row.internalMarksObtained === "" ? undefined : Number(row.internalMarksObtained),
              isAbsent: row.isAbsent,
              remarks: row.remarks || undefined,
            };
          }),
        };
        const formData = new FormData();
        formData.set("payload", JSON.stringify(payload));
        const result = await saveMarksAction(examId, {}, formData);
        if (result.error) setError(result.error);
        if (typeof result.written === "number") setSavedCount(result.written);
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
              <th className="px-3 py-2 font-medium">Admission #</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 text-right font-medium">Marks (/{externalMax})</th>
              {hasInternal ? <th className="px-3 py-2 text-right font-medium">Internal (/{internalMaxMarks})</th> : null}
              <th className="px-3 py-2 font-medium">Absent</th>
              <th className="px-3 py-2 font-medium">Grade</th>
              <th className="px-3 py-2 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const row = rows[s.studentId]!;
              return (
                <tr key={s.studentId} className="border-b border-border last:border-0">
                  <td className="font-figures px-3 py-1.5">{s.admissionNumber}</td>
                  <td className="px-3 py-1.5 font-medium">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      max={externalMax}
                      step="0.5"
                      disabled={readOnly || row.isAbsent}
                      value={row.marksObtained}
                      onChange={(e) => updateRow(s.studentId, { marksObtained: e.target.value })}
                      className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right text-sm disabled:opacity-50"
                    />
                  </td>
                  {hasInternal ? (
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        min={0}
                        max={internalMaxMarks ?? undefined}
                        step="0.5"
                        disabled={readOnly || row.isAbsent}
                        value={row.internalMarksObtained}
                        onChange={(e) => updateRow(s.studentId, { internalMarksObtained: e.target.value })}
                        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right text-sm disabled:opacity-50"
                      />
                    </td>
                  ) : null}
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={row.isAbsent}
                      onChange={(e) => updateRow(s.studentId, { isAbsent: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-sm text-muted-foreground">{grades[s.studentId] ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <input
                      disabled={readOnly}
                      value={row.remarks}
                      onChange={(e) => updateRow(s.studentId, { remarks: e.target.value })}
                      className="w-full min-w-[8rem] rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save all"}
          </button>
          {savedCount !== null && !error ? <span className="text-sm text-muted-foreground">Saved {savedCount} student(s).</span> : null}
          {error ? <span className="text-sm text-danger-solid">{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
