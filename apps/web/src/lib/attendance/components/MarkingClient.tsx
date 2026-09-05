"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PersonHoverCard } from "@/components/PersonHoverCard";
import { markSectionAttendance } from "../actions";
import type { AttendanceStatus, SectionRosterResult } from "../types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; short: string }[] = [
  { value: "present", label: "Present", short: "P" },
  { value: "absent", label: "Absent", short: "A" },
  { value: "late", label: "Late", short: "L" },
  { value: "half_day", label: "Half-day", short: "H" },
  { value: "leave", label: "Leave", short: "Lv" },
];

const STATUS_BUTTON_CLASS: Record<AttendanceStatus, string> = {
  present: "bg-success text-success-foreground",
  absent: "bg-danger text-danger-foreground",
  late: "bg-warning text-warning-foreground",
  half_day: "bg-warning text-warning-foreground",
  leave: "bg-info text-info-foreground",
};

const DRAFT_PREFIX = "attendance-draft:";
const DRAFT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

interface DraftShape {
  savedAt: string;
  marks: Record<string, { status: AttendanceStatus; remarks?: string }>;
}

function draftKey(sectionId: string, attendanceDate: string, authUserId: string): string {
  // authUserId in the key, not just section+date: a shared staff phone or front-office computer
  // is realistic here (CLAUDE.md's target device profile), and without it one teacher's
  // in-progress draft would restore for the next person who opens the same section/date.
  return `${DRAFT_PREFIX}${sectionId}:${attendanceDate}:${authUserId}`;
}

function pruneStaleDrafts(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as DraftShape;
      if (now - new Date(parsed.savedAt).getTime() > DRAFT_MAX_AGE_MS) {
        window.localStorage.removeItem(key);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }
}

export function MarkingClient({
  roster,
  canForceEdit,
  authUserId,
}: {
  roster: SectionRosterResult;
  canForceEdit: boolean;
  authUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const key = draftKey(roster.sectionId, roster.attendanceDate, authUserId);
  const editable = canForceEdit || roster.isToday;

  const editableStudents = useMemo(() => roster.students.filter((s) => !s.markedInOtherSection), [roster.students]);
  const lockedStudents = useMemo(() => roster.students.filter((s) => s.markedInOtherSection), [roster.students]);

  const [marks, setMarks] = useState<Record<string, { status: AttendanceStatus; remarks?: string }>>(() => {
    const initial: Record<string, { status: AttendanceStatus; remarks?: string }> = {};
    for (const s of editableStudents) initial[s.studentId] = { status: s.existingStatus ?? "present" };
    return initial;
  });
  const [acknowledgedNonTeaching, setAcknowledgedNonTeaching] = useState(false);
  const [result, setResult] = useState<{ error?: string; skippedOtherSection?: string[] } | null>(null);
  const loadedFromDraft = useRef(false);

  // Restore a newer local draft over the server-provided initial state, and prune old drafts --
  // both on mount only, not on every render.
  useEffect(() => {
    pruneStaleDrafts();
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as DraftShape;
      if (Date.now() - new Date(draft.savedAt).getTime() <= DRAFT_MAX_AGE_MS) {
        setMarks((current) => ({ ...current, ...draft.marks }));
        loadedFromDraft.current = true;
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
    // key changes when section/date/user changes -- re-run for the new roster.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced local persistence -- every tap updates React state instantly (no network call);
  // this just mirrors it to localStorage so a dropped connection or accidental reload doesn't
  // lose the in-progress roster. See docs/design-system.md's marking-screen plan.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (typeof window === "undefined") return;
      const draft: DraftShape = { savedAt: new Date().toISOString(), marks };
      window.localStorage.setItem(key, JSON.stringify(draft));
    }, 250);
    return () => clearTimeout(timeout);
  }, [key, marks]);

  const setStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setMarks((current) => ({ ...current, [studentId]: { ...current[studentId], status } }));
  }, []);

  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
    for (const mark of Object.values(marks)) counts[mark.status] += 1;
    return counts;
  }, [marks]);

  const totalToMark = editableStudents.length;
  const markedCount = Object.keys(marks).length;

  function handleSubmit() {
    setResult(null);
    // startTransition requires a synchronous callback (stable React's `TransitionFunction` type
    // rejects one returning a Promise); the async work still runs the same as before, just
    // fired-and-not-returned from the callback itself, matching what actually happened at
    // runtime already -- React 18 stable never awaited this callback's return value either.
    startTransition(() => {
      void (async () => {
        const response = await markSectionAttendance({
          sectionId: roster.sectionId,
          attendanceDate: roster.attendanceDate,
          marks: editableStudents.map((s) => ({ studentId: s.studentId, status: marks[s.studentId]?.status ?? "present" })),
        });
        setResult(response);
        if (!response.error) {
          if (typeof window !== "undefined") window.localStorage.removeItem(key);
          router.refresh();
        }
      })();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {roster.isNonTeachingDay ? (
        <div className="flex items-start gap-2 rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span>
              {roster.nonTeachingDayLabel ?? "Non-teaching day"} -- this date is a declared holiday or a Sunday. Are you sure you want to
              mark attendance?
            </span>
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <input type="checkbox" checked={acknowledgedNonTeaching} onChange={(e) => setAcknowledgedNonTeaching(e.target.checked)} />
              Mark anyway
            </label>
          </div>
        </div>
      ) : null}

      {!editable ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
          Only today can be marked or corrected here. Ask an admin for changes to a past date.
        </p>
      ) : null}

      {/* Live running summary -- pinned, client-side only, no round trip per tap. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm">
        {STATUS_OPTIONS.map((opt) => (
          <span key={opt.value} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_BUTTON_CLASS[opt.value]}`} aria-hidden="true" />
            {opt.label}: <span className="font-figures font-medium">{summary[opt.value]}</span>
          </span>
        ))}
        <span className="ml-auto font-figures text-muted-foreground">
          {markedCount} of {totalToMark} marked
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card shadow-sm">
        {editableStudents.map((s) => (
          <li key={s.studentId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <div className="flex flex-col">
              <PersonHoverCard
                href={`/people/students/${s.studentId}`}
                photoUrl={s.photoUrl}
                name={`${s.firstName} ${s.lastName}`}
                className="text-sm font-medium underline-offset-2 hover:underline"
              >
                {s.firstName} {s.lastName}
              </PersonHoverCard>
              <span className="font-figures text-xs text-muted-foreground">Roll {s.rollNumber ?? "-"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = (marks[s.studentId]?.status ?? "present") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!editable}
                    onClick={() => setStatus(s.studentId, opt.value)}
                    aria-pressed={active}
                    className={`min-h-[44px] min-w-[44px] rounded-md px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                      active ? STATUS_BUTTON_CLASS[opt.value] : "border border-border bg-background hover:bg-secondary"
                    }`}
                  >
                    {opt.short}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
        {lockedStudents.map((s) => (
          <li key={s.studentId} className="flex items-center justify-between gap-2 bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            <span>
              <PersonHoverCard href={`/people/students/${s.studentId}`} photoUrl={s.photoUrl} name={`${s.firstName} ${s.lastName}`}>
                {s.firstName} {s.lastName}
              </PersonHoverCard>{" "}
              (Roll {s.rollNumber ?? "-"})
            </span>
            <span>Already marked in another section today</span>
          </li>
        ))}
      </ul>

      {result?.error ? <p className="text-sm text-danger-solid">{result.error}</p> : null}
      {result?.skippedOtherSection && result.skippedOtherSection.length > 0 ? (
        <p className="text-sm text-warning-solid">
          {result.skippedOtherSection.length} student(s) were already marked in another section today and were not changed.
        </p>
      ) : null}
      {result && !result.error ? (
        <p className="flex items-center gap-1.5 text-sm text-success-solid">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!editable || isPending || (roster.isNonTeachingDay && !acknowledgedNonTeaching) || totalToMark === 0}
          className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Submitting..." : `Submit (${markedCount} of ${totalToMark})`}
        </button>
      </div>
    </div>
  );
}
