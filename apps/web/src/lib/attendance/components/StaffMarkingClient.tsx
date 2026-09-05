"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PersonHoverCard } from "@/components/PersonHoverCard";
import { markStaffAttendance } from "../actions";
import type { AttendanceStatus, StaffRosterRow } from "../types";

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

const DRAFT_PREFIX = "staff-attendance-draft:";

export function StaffMarkingClient({ staff, attendanceDate }: { staff: StaffRosterRow[]; attendanceDate: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const key = `${DRAFT_PREFIX}${attendanceDate}`;

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    for (const s of staff) initial[s.staffId] = s.existingStatus ?? "present";
    return initial;
  });
  const [result, setResult] = useState<{ error?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Client-side, not URL-driven: the roster is already fully loaded (a school's whole active
  // staff, not a paginated directory), so filtering is purely "find this person faster in the
  // list" -- it never changes what gets submitted (handleSubmit below always sends every staff
  // member's mark, filtered or not) or what the summary counts (computed from ALL of `marks`),
  // only which rows render.
  const departments = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of staff) if (s.departmentId && s.departmentName) seen.set(s.departmentId, s.departmentName);
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff]);

  const visibleStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (departmentFilter && s.departmentId !== departmentFilter) return false;
      if (!query) return true;
      return `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) || s.employeeCode.toLowerCase().includes(query);
    });
  }, [staff, search, departmentFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      setMarks((current) => ({ ...current, ...(JSON.parse(raw) as Record<string, AttendanceStatus>) }));
    } catch {
      window.localStorage.removeItem(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(marks));
    }, 250);
    return () => clearTimeout(timeout);
  }, [key, marks]);

  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
    for (const status of Object.values(marks)) counts[status] += 1;
    return counts;
  }, [marks]);

  function handleSubmit() {
    setResult(null);
    // See MarkingClient.tsx's handleSubmit for why this is wrapped instead of passed directly.
    startTransition(() => {
      void (async () => {
        const response = await markStaffAttendance({
          attendanceDate,
          marks: staff.map((s) => ({ staffId: s.staffId, status: marks[s.staffId] ?? "present" })),
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
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or employee code"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Department
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm">
        {STATUS_OPTIONS.map((opt) => (
          <span key={opt.value} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_BUTTON_CLASS[opt.value]}`} aria-hidden="true" />
            {opt.label}: <span className="font-figures font-medium">{summary[opt.value]}</span>
          </span>
        ))}
        <span className="ml-auto font-figures text-muted-foreground">
          {visibleStaff.length === staff.length ? `${staff.length} staff` : `${visibleStaff.length} of ${staff.length} staff shown`}
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card shadow-sm">
        {visibleStaff.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">No staff match these filters.</li>
        ) : null}
        {visibleStaff.map((s) => (
          <li key={s.staffId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <div className="flex flex-col">
              <PersonHoverCard
                href={`/people/staff/${s.staffId}`}
                photoUrl={s.photoUrl}
                name={`${s.firstName} ${s.lastName}`}
                className="text-sm font-medium underline-offset-2 hover:underline"
              >
                {s.firstName} {s.lastName}
              </PersonHoverCard>
              <span className="font-figures text-xs text-muted-foreground">
                {s.employeeCode}
                {s.departmentName ? ` · ${s.departmentName}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = (marks[s.staffId] ?? "present") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMarks((current) => ({ ...current, [s.staffId]: opt.value }))}
                    aria-pressed={active}
                    className={`min-h-[44px] min-w-[44px] rounded-md px-3 text-sm font-medium ${
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
      </ul>

      {result?.error ? <p className="text-sm text-danger-solid">{result.error}</p> : null}
      {result && !result.error ? (
        <p className="flex items-center gap-1.5 text-sm text-success-solid">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Saved.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || staff.length === 0}
          className="min-h-[44px] rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
