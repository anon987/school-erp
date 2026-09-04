/**
 * Minimal RFC 4180-ish CSV parser -- handles quoted fields, escaped quotes ("") inside quoted
 * fields, and commas/newlines inside quoted fields (a guardian's "Sharma, Verma & Sons"-style
 * address is realistic). No external dependency for something this small and stable.
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  while (i < normalized.length) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  const headerRow = nonEmptyRows[0] ?? [];
  const headers = headerRow.map((h) => h.trim());

  const dataRows = nonEmptyRows.slice(1).map((r) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (r[index] ?? "").trim();
    });
    return record;
  });

  return { headers, rows: dataRows };
}
