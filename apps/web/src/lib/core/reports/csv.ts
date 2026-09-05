/**
 * Shared CSV writer for every exportable report (docs/schoolerp_features.md §T: "All reports
 * export to PDF, Excel, and CSV"). Extracted from the import module's rejected-rows.csv route,
 * which had this exact escape/join logic first -- once report routes needed the identical thing
 * for the second and third time, duplicating it a dozen times stopped being the right call.
 *
 * CSV, not a native .xlsx writer, is this pass's "Excel" -- Excel opens CSV natively, and for
 * tabular reports (the entire P1 baseline list) that's what accountants/admins actually use day
 * to day. A real .xlsx library (formatting, multiple sheets) is a bigger dependency than this
 * pass's reports need; noted as a deliberate scope cut, not a silent gap. PDF export per report
 * is deferred for the same reason -- eleven bespoke print layouts is a much larger project than
 * "get the data out," which CSV already solves.
 */
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsvRow(values: string[]): string {
  return values.map(csvEscape).join(",");
}

export function buildCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [toCsvRow(headers), ...rows.map((row) => toCsvRow(row.map((v) => (v === null || v === undefined ? "" : String(v)))))];
  return lines.join("\r\n");
}

export function csvResponseHeaders(fileName: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
  };
}
