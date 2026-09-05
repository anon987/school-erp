import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";

const PAGE_SIZE = 1000;

/**
 * The uncapped half of the import fix-and-reupload loop: getRejectedRows (queries.ts) caps its
 * on-screen preview at 100 rows on purpose (a table isn't meant to scroll 2,000 rows), but the
 * school fixing their data in Excel needs every rejected row, not the first 100 -- so this is a
 * separate Route Handler, not that same query with a bigger limit inlined into a page render.
 *
 * Paged internally in chunks of 1,000, not a single unbounded select -- the same PostgREST
 * default-max-rows lesson as the dashboard/attendance-percentage fixes earlier in this build:
 * an unpaginated .select() over a batch that could have thousands of rejected rows would silently
 * truncate at PostgREST's default cap, exporting an incomplete file with no error.
 *
 * Columns are the uploaded file's OWN headers (raw_data), not our field names (mapped_data) --
 * the school opens this in Excel next to their original file, fixes the flagged cells using
 * their own column names, and re-uploads. rejection_reason is appended as the last column.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;

  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data: batch, error: batchError } = await supabase
    .from("import_batch")
    .select("id, entity_type, file_name, raw_headers")
    .eq("id", batchId)
    .eq("school_id", session.schoolId)
    .maybeSingle();
  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
  if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 });

  const entityType = (batch as unknown as { entity_type: string }).entity_type;
  const permission = entityType === "student" ? "school.manage_students" : "school.manage_staff";
  if (!(await hasPermission(permission))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const headers = (batch as unknown as { raw_headers: string[] | null }).raw_headers ?? [];

  const rows: { row_number: number; rejection_reason: string | null; raw_data: Record<string, string> }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("import_row")
      .select("row_number, rejection_reason, raw_data")
      .eq("batch_id", batchId)
      .eq("validation_status", "rejected")
      .order("row_number", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
      .returns<{ row_number: number; rejection_reason: string | null; raw_data: Record<string, string> }[]>();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const csv = buildCsv(
    [...headers, "rejection_reason"],
    rows.map((row) => [...headers.map((h) => row.raw_data[h] ?? ""), row.rejection_reason ?? ""]),
  );

  const fileName = (batch as unknown as { file_name: string }).file_name.replace(/\.csv$/i, "");
  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders(`${fileName}-rejected.csv`) });
}
