"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateExamStatusAction, type ExamsFormState } from "../actions";
import type { ExamStatus } from "../types";

const initialState: ExamsFormState = {};

function ActionButton({ label, primary }: { label: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        primary
          ? "rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          : "rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? "Working…" : label}
    </button>
  );
}

function TransitionButton({ examId, targetStatus, label, primary }: { examId: string; targetStatus: ExamStatus; label: string; primary?: boolean }) {
  const boundAction = updateExamStatusAction.bind(null, examId, targetStatus);
  const [state, formAction] = useFormState(boundAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <ActionButton label={label} primary={primary ?? false} />
      {state.error ? <p className="text-xs text-danger-solid">{state.error}</p> : null}
    </form>
  );
}

/**
 * Only the transitions valid FROM the current status are offered -- draft->marks_entry,
 * marks_entry->pending_approval, pending_approval->approved, approved->published, plus a
 * "Reopen" escape hatch from approved/published back to marks_entry for corrections. The server
 * action re-validates every one of these regardless of what's rendered here (CLAUDE.md: hiding a
 * button is presentation, not security) -- this just avoids offering a transition that would
 * immediately fail.
 */
export function ExamStatusControls({ examId, status, canApprove }: { examId: string; status: ExamStatus; canApprove: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      {status === "draft" ? <TransitionButton examId={examId} targetStatus="marks_entry" label="Open marks entry" primary /> : null}
      {status === "marks_entry" ? <TransitionButton examId={examId} targetStatus="pending_approval" label="Submit for approval" primary /> : null}
      {status === "pending_approval" && canApprove ? <TransitionButton examId={examId} targetStatus="approved" label="Approve results" primary /> : null}
      {status === "approved" && canApprove ? <TransitionButton examId={examId} targetStatus="published" label="Publish results" primary /> : null}
      {(status === "approved" || status === "published") && canApprove ? (
        <TransitionButton examId={examId} targetStatus="marks_entry" label="Reopen for corrections" />
      ) : null}
    </div>
  );
}
