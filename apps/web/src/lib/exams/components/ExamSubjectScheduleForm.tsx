"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateExamSubjectScheduleAction, type AdmitCardFormState } from "../admitCard.actions";

const initialState: AdmitCardFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      {pending ? "…" : "Save"}
    </button>
  );
}

/** Inline edit for one exam_subject's datesheet fields (Admit Cards' core content) -- editable in
 *  place, unlike the marks fields on this same row which stay delete-and-recreate-only. */
export function ExamSubjectScheduleForm({
  examId,
  examSubjectId,
  examDate,
  startTime,
  endTime,
  roomNo,
}: {
  examId: string;
  examSubjectId: string;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  roomNo: string | null;
}) {
  const action = updateExamSubjectScheduleAction.bind(null, examSubjectId);
  const [state, formAction] = useFormState(action, initialState);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    const summary = examDate ? `${examDate}${startTime ? ` ${startTime.slice(0, 5)}-${endTime?.slice(0, 5) ?? ""}` : ""}${roomNo ? ` · Room ${roomNo}` : ""}` : "Not scheduled";
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{summary}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-primary underline-offset-2 hover:underline">
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setEditing(false);
      }}
      className="flex flex-wrap items-center gap-1"
    >
      <input type="hidden" name="examId" value={examId} />
      <input type="date" name="examDate" defaultValue={examDate ?? ""} className="rounded-md border border-input bg-background px-1.5 py-1 text-xs" />
      <input type="time" name="startTime" defaultValue={startTime?.slice(0, 5) ?? ""} className="rounded-md border border-input bg-background px-1.5 py-1 text-xs" />
      <input type="time" name="endTime" defaultValue={endTime?.slice(0, 5) ?? ""} className="rounded-md border border-input bg-background px-1.5 py-1 text-xs" />
      <input type="text" name="roomNo" placeholder="Room" defaultValue={roomNo ?? ""} className="w-16 rounded-md border border-input bg-background px-1.5 py-1 text-xs" />
      <SaveButton />
      {state.error ? <span className="text-danger-solid">{state.error}</span> : null}
    </form>
  );
}
