/**
 * "Today" in Asia/Kolkata, as YYYY-MM-DD -- matches fn_today_ist() (packages/db, attendance
 * migration), the SQL side of the same comparison. attendance_date has no timezone attached, so
 * "is this today" has to be evaluated in the school's local day, not the server's UTC day, or a
 * mark made late evening IST would compare against the wrong date. Kept in sync manually with the
 * SQL function -- both are one-line and unlikely to drift, and a round trip to ask Postgres "what
 * day is it" for every form render would be worse.
 */
export function todayIsoIst(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Day-of-week for a YYYY-MM-DD string, computed from the date parts via `Date.UTC` rather than
 * `new Date(isoDate).getDay()` -- the latter's result depends on the server process's local
 * timezone (getDay() reads the local calendar day of a UTC-parsed instant), which would make
 * "is this a Sunday" answer differently depending on where the Node process happens to run.
 * `getUTCDay()` on a `Date.UTC`-constructed instant has no such ambiguity.
 */
export function isSundayIso(dateIso: string): boolean {
  const parts = dateIso.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

/**
 * Start date, end date, and day count for a YYYY-MM month string -- used by every monthly grid/
 * report (student attendance, staff attendance) that needs to enumerate every day of a month.
 * Date.UTC-based, not `new Date(monthIso)` parsing, for the same no-timezone-ambiguity reason as
 * isSundayIso above.
 */
export function monthBoundsIso(monthIso: string): { start: string; end: string; days: number } {
  const [yearStr, monthStr] = monthIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${monthIso}-01`, end: `${monthIso}-${String(days).padStart(2, "0")}`, days };
}

/**
 * Display format for the app: dd/mm/yyyy, everywhere a plain date (no time component -- dob,
 * joining_date, attendance_date, academic_year start/end) is shown as text. Deliberately NOT
 * `new Date(iso).toLocaleDateString()` -- that reads the server process's default locale (Node's
 * default is commonly en-US, giving mm/dd/yyyy) rather than anything this app controls, which is
 * exactly the bug this function replaces (see BatchDetailView.tsx's prior committedAt display).
 * Plain string slicing on a YYYY-MM-DD input -- no Date parsing, so no timezone involved at all
 * (a bare date has none), and no locale dependency.
 */
export function formatDateDisplay(dateIso: string | null | undefined): string {
  if (!dateIso) return "—";
  const [year, month, day] = dateIso.split("-");
  if (!year || !month || !day) return dateIso;
  return `${day}/${month}/${year}`;
}

/**
 * Display format for a UTC timestamptz value (committed_at, marked_at, created_at, ...): dd/mm/yyyy,
 * hh:mm, converted to Asia/Kolkata -- CLAUDE.md: "Timestamps are UTC in the database, rendered in
 * IST." Built from `Intl.DateTimeFormat` parts assembled explicitly, not the formatter's own
 * locale-ordered string output, so the dd/mm/yyyy order is guaranteed regardless of server locale.
 */
export function formatDateTimeDisplayIst(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) return "—";
  const date = new Date(utcTimestamp);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}, ${get("hour")}:${get("minute")} IST`;
}
