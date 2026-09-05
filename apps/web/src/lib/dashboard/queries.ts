import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { todayIsoIst } from "@/lib/core/dateIst";
import { getDailyAttendanceSummary, getStaffRoster, getFlaggedLowAttendanceStudents } from "@/lib/attendance/queries";
import { getDefaulters } from "@/lib/fees/queries";
import { getExams } from "@/lib/exams/queries";
import type { DashboardClassRow, DashboardOverview, TrendPoint } from "./types";

const TREND_DAYS = 7;
const ALERT_LIMIT = 5;

/**
 * The owner dashboard's real widgets (docs/design-system.md > Typography: "dashboard KPI
 * labels"/"Large KPI figures"). Every figure here reuses an existing feature's own query
 * (attendance/fees/exams) or a small dedicated trend RPC -- never a second implementation of
 * "what counts as present" or "what counts as overdue" that could drift from the module that
 * owns that answer.
 */
export async function getDashboardOverview(schoolId: string): Promise<DashboardOverview> {
  const supabase = await createSupabaseServerClient();
  const academicYearId = await getCurrentAcademicYearId(schoolId);
  const today = todayIsoIst();

  const [staffCountRes, classesRes, sectionsRes] = await Promise.all([
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("employment_status", "active"),
    supabase.from("class").select("id, name, sort_order").eq("school_id", schoolId).order("sort_order"),
    supabase.from("section").select("id, class_id").eq("school_id", schoolId),
  ]);
  if (staffCountRes.error) throw staffCountRes.error;
  if (classesRes.error) throw classesRes.error;
  if (sectionsRes.error) throw sectionsRes.error;

  const classes = (classesRes.data ?? []) as unknown as { id: string; name: string; sort_order: number }[];
  const sections = (sectionsRes.data ?? []) as unknown as { id: string; class_id: string }[];

  let studentCount = 0;
  const studentCountByClass = new Map<string, number>();

  // Counted per class via `head: true` count queries, not a plain `.select("class_id")` over
  // every enrollment row: PostgREST caps unpaginated selects at its default max-rows (1000), and
  // enrollment_school_year_class_section_idx (school_id, academic_year_id, class_id, section_id)
  // makes an index-only scan the cheapest plan for that select, which returns rows grouped by
  // class_id -- so a silent 1000-row cap doesn't just under-count, it truncates whole classes to
  // zero once the cap is hit mid-class. `head: true` counts return no rows, so the cap never
  // applies, at the cost of one lightweight index-only count per class instead of one query.
  if (academicYearId) {
    const totalRes = await supabase
      .from("enrollment")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId);
    if (totalRes.error) throw totalRes.error;
    studentCount = totalRes.count ?? 0;

    const perClassCounts = await Promise.all(
      classes.map(async (c) => {
        const res = await supabase
          .from("enrollment")
          .select("id", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("academic_year_id", academicYearId)
          .eq("class_id", c.id);
        if (res.error) throw res.error;
        return { classId: c.id, count: res.count ?? 0 };
      }),
    );
    for (const { classId, count } of perClassCounts) {
      studentCountByClass.set(classId, count);
    }
  }

  const sectionCountByClass = new Map<string, number>();
  for (const section of sections) {
    sectionCountByClass.set(section.class_id, (sectionCountByClass.get(section.class_id) ?? 0) + 1);
  }

  const classRows: DashboardClassRow[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
    sectionCount: sectionCountByClass.get(c.id) ?? 0,
    studentCount: studentCountByClass.get(c.id) ?? 0,
  }));

  // Everything below is independent of the class/student counts above -- fetched in parallel.
  const [dailyAttendance, staffRoster, defaulters, pendingExams, attendanceTrendRes, collectionTrendRes, admissionsTrendRes, collectionKpisRes] =
    await Promise.all([
      getDailyAttendanceSummary(schoolId, today),
      getStaffRoster(schoolId, today),
      academicYearId ? getDefaulters(schoolId, academicYearId) : Promise.resolve([]),
      academicYearId ? getExams(schoolId, academicYearId) : Promise.resolve([]),
      academicYearId
        ? supabase.rpc("fn_attendance_trend", { p_school_id: schoolId, p_academic_year_id: academicYearId, p_days: TREND_DAYS })
        : Promise.resolve({ data: [], error: null }),
      supabase.rpc("fn_collection_trend", { p_school_id: schoolId, p_days: TREND_DAYS }),
      supabase.rpc("fn_admissions_trend", { p_school_id: schoolId, p_days: TREND_DAYS }),
      supabase.rpc("fn_collection_kpis", { p_school_id: schoolId }),
    ]);

  if (attendanceTrendRes.error) throw attendanceTrendRes.error;
  if (collectionTrendRes.error) throw collectionTrendRes.error;
  if (admissionsTrendRes.error) throw admissionsTrendRes.error;
  if (collectionKpisRes.error) throw collectionKpisRes.error;

  const todayMarked = dailyAttendance.reduce((sum, s) => sum + s.marked, 0);
  const todayEffectivePresent = dailyAttendance.reduce((sum, s) => sum + s.present + s.late + s.halfDay * 0.5, 0);
  const todayAttendancePercent = todayMarked > 0 ? Math.round((todayEffectivePresent / todayMarked) * 1000) / 10 : null;

  const staffWithStatus = staffRoster.filter((s) => s.existingStatus !== null);
  const staffPresent = staffWithStatus.filter((s) => s.existingStatus === "present" || s.existingStatus === "late").length;
  const todayStaffAttendancePercent = staffWithStatus.length > 0 ? Math.round((staffPresent / staffWithStatus.length) * 1000) / 10 : null;

  const kpis = (collectionKpisRes.data as unknown as { today_paise: number; month_to_date_paise: number }[])[0] ?? {
    today_paise: 0,
    month_to_date_paise: 0,
  };

  const pendingDuesPaise = defaulters.reduce((sum, d) => sum + d.dueAmountPaise, 0);

  function toTrend(rows: { date: string; value: number | null }[]): TrendPoint[] {
    return rows;
  }

  const attendanceTrend = toTrend(
    ((attendanceTrendRes.data ?? []) as unknown as { attendance_date: string; percent: number | null }[]).map((r) => ({ date: r.attendance_date, value: r.percent })),
  );
  const collectionTrend = toTrend(
    ((collectionTrendRes.data ?? []) as unknown as { collection_date: string; total_paise: number }[]).map((r) => ({ date: r.collection_date, value: r.total_paise })),
  );
  const admissionsTrend = toTrend(
    ((admissionsTrendRes.data ?? []) as unknown as { admission_date: string; new_students: number }[]).map((r) => ({ date: r.admission_date, value: r.new_students })),
  );

  const lowAttendanceAlerts = (await getFlaggedLowAttendanceStudents(schoolId)).slice(0, ALERT_LIMIT).map((s) => ({
    studentId: s.studentId,
    admissionNumber: s.admissionNumber,
    firstName: s.firstName,
    lastName: s.lastName,
    className: s.className,
    sectionName: s.sectionName,
    detail: `${s.percent}% attendance`,
  }));

  const largeDuesAlerts = [...defaulters]
    .sort((a, b) => b.dueAmountPaise - a.dueAmountPaise)
    .slice(0, ALERT_LIMIT)
    .map((d) => ({
      studentId: d.studentId,
      admissionNumber: d.admissionNumber,
      firstName: d.firstName,
      lastName: d.lastName,
      className: d.className,
      sectionName: d.sectionName,
      detail: `₹${(d.dueAmountPaise / 100).toLocaleString("en-IN")} due`,
    }));

  const resultsPendingApproval = pendingExams.filter((e) => e.status === "pending_approval").map((e) => ({ examId: e.id, examName: e.name }));

  return {
    studentCount,
    staffCount: staffCountRes.count ?? 0,
    classes: classRows,
    todayAttendancePercent,
    todayStaffAttendancePercent,
    feesCollectedTodayPaise: kpis.today_paise,
    feesCollectedMonthToDatePaise: kpis.month_to_date_paise,
    pendingDuesPaise,
    defaulterCount: defaulters.length,
    attendanceTrend,
    collectionTrend,
    admissionsTrend,
    lowAttendanceAlerts,
    largeDuesAlerts,
    resultsPendingApproval,
  };
}
