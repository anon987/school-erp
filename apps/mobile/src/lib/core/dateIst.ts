/**
 * Byte-for-byte port of apps/web/src/lib/core/dateIst.ts. Kept as a separate copy rather than a
 * shared package because packages/ui is explicitly web-only and there is no existing
 * cross-runtime "shared pure logic" package in this monorepo yet -- if a THIRD consumer of this
 * file ever appears, that's the trigger to extract one (packages/core-shared or similar), not
 * before. Every rule from the original file's comments applies unchanged: dd/mm/yyyy always,
 * never `.toLocaleDateString()`/`.toLocaleString()` with no explicit format, Hermes's Intl support
 * covers `Asia/Kolkata` + `en-CA`/`en-GB` so this works identically to the Node-side version.
 */

export function todayIsoIst(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function isSundayIso(dateIso: string): boolean {
  const parts = dateIso.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

export function monthBoundsIso(monthIso: string): { start: string; end: string; days: number } {
  const [yearStr, monthStr] = monthIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${monthIso}-01`, end: `${monthIso}-${String(days).padStart(2, "0")}`, days };
}

export function formatDateDisplay(dateIso: string | null | undefined): string {
  if (!dateIso) return "—";
  const [year, month, day] = dateIso.split("-");
  if (!year || !month || !day) return dateIso;
  return `${day}/${month}/${year}`;
}

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
