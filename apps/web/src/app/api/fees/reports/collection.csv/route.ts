import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/core/auth/session";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getCollectionReport } from "@/lib/fees/queries";
import { buildCsv, csvResponseHeaders } from "@/lib/core/reports/csv";
import { formatDateDisplay, todayIsoIst } from "@/lib/core/dateIst";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.schoolId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!(await hasPermission("school.manage_fees"))) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const today = todayIsoIst();
  const startDate = request.nextUrl.searchParams.get("startDate") || `${today.slice(0, 8)}01`;
  const endDate = request.nextUrl.searchParams.get("endDate") || today;

  const report = await getCollectionReport(session.schoolId, startDate, endDate);
  const csv = buildCsv(["Date", "Payment Count", "Amount (paise)"], report.byDate.map((d) => [formatDateDisplay(d.date), d.count, d.totalPaise]));

  return new NextResponse(csv, { status: 200, headers: csvResponseHeaders(`fee-collection-${startDate}-to-${endDate}.csv`) });
}
