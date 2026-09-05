"use client";

import { useRef } from "react";
import { useFormState } from "react-dom";
import { upsertTimetableSlotAction, type TimetableFormState } from "../actions";
import { DAY_NAMES, type StaffClassSubjectOption, type TimetableSlotRow } from "../types";
import type { PeriodRow } from "@/lib/master-data/types";

const initialState: TimetableFormState = {};
const WORKING_DAYS = [1, 2, 3, 4, 5, 6];

function GridCell({
  classId,
  sectionId,
  academicYearId,
  dayOfWeek,
  periodId,
  options,
  existing,
}: {
  classId: string;
  sectionId: string;
  academicYearId: string;
  dayOfWeek: number;
  periodId: string;
  options: StaffClassSubjectOption[];
  existing: TimetableSlotRow | undefined;
}) {
  const [state, formAction] = useFormState(upsertTimetableSlotAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-0.5">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="academicYearId" value={academicYearId} />
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
      <input type="hidden" name="periodId" value={periodId} />
      <select
        name="staffClassSubjectId"
        defaultValue={existing?.staffClassSubjectId ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.subjectName} ({o.staffName})
          </option>
        ))}
      </select>
      <input
        name="room"
        defaultValue={existing?.room ?? ""}
        onBlur={() => formRef.current?.requestSubmit()}
        placeholder="Room"
        className="w-full rounded-md border border-input bg-background px-1.5 py-0.5 text-xs"
      />
      {state.error ? <span className="text-[10px] text-danger-solid">{state.error}</span> : null}
    </form>
  );
}

export function TimetableGrid({
  classId,
  sectionId,
  academicYearId,
  periods,
  options,
  slots,
}: {
  classId: string;
  sectionId: string;
  academicYearId: string;
  periods: PeriodRow[];
  options: StaffClassSubjectOption[];
  slots: TimetableSlotRow[];
}) {
  const slotByKey = new Map(slots.map((s) => [`${s.dayOfWeek}:${s.periodId}`, s]));

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-2 py-2">Period</th>
            {WORKING_DAYS.map((d) => (
              <th key={d} className="px-2 py-2">
                {DAY_NAMES[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-2 py-1.5 align-top text-xs text-muted-foreground">
                {p.label}
                <br />
                <span className="font-figures">
                  {p.startTime}-{p.endTime}
                </span>
              </td>
              {p.isBreak ? (
                <td colSpan={WORKING_DAYS.length} className="bg-secondary/30 px-2 py-1.5 text-center text-xs text-muted-foreground">
                  Break
                </td>
              ) : (
                WORKING_DAYS.map((d) => (
                  <td key={d} className="min-w-[9rem] px-2 py-1.5 align-top">
                    <GridCell
                      classId={classId}
                      sectionId={sectionId}
                      academicYearId={academicYearId}
                      dayOfWeek={d}
                      periodId={p.id}
                      options={options}
                      existing={slotByKey.get(`${d}:${p.id}`)}
                    />
                  </td>
                ))
              )}
            </tr>
          ))}
          {periods.length === 0 ? (
            <tr>
              <td colSpan={WORKING_DAYS.length + 1} className="px-3 py-6 text-center text-sm text-muted-foreground">
                No periods configured yet -- add them in Settings &gt; Master Data.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
