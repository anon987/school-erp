import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { todayIsoIst } from "@/lib/core/dateIst";
import type { ExamStatus } from "./types";
import type { ExamDashboardStats } from "./dashboard.types";

function addDaysIso(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  const d = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return d.toISOString().slice(0, 10);
}

export async function getExamDashboardStats(schoolId: string, academicYearId: string): Promise<ExamDashboardStats> {
  const supabase = await createSupabaseServerClient();
  const today = todayIsoIst();
  const windowEnd = addDaysIso(today, 15);

  const [{ data: examRows, error: examError }, { data: statsRow, error: statsError }, { count: publishedSetupsCount, error: setupsError }] = await Promise.all([
    supabase.from("exam").select("id, status, start_date, end_date").eq("school_id", schoolId).eq("academic_year_id", academicYearId),
    supabase.rpc("fn_exam_dashboard_stats", { p_school_id: schoolId, p_academic_year_id: academicYearId }).maybeSingle(),
    supabase.from("report_card_setup").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("academic_year_id", academicYearId).eq("is_published", true),
  ]);
  if (examError) throw examError;
  if (statsError) throw statsError;
  if (setupsError) throw setupsError;

  const exams = (examRows ?? []) as unknown as { id: string; status: ExamStatus; start_date: string | null; end_date: string | null }[];
  const stats = statsRow as unknown as { total_subjects: number; subjects_with_marks: number; marks_present: number; marks_absent: number } | null;

  const upcomingCount = exams.filter((e) => e.start_date !== null && e.start_date >= today).length;
  const ongoingCount = exams.filter((e) => e.start_date !== null && e.end_date !== null && e.start_date <= today && today <= e.end_date).length;

  const statusCounts = new Map<ExamStatus, number>();
  for (const e of exams) statusCounts.set(e.status, (statusCounts.get(e.status) ?? 0) + 1);
  const statusBreakdown = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

  const scheduleCounts = new Map<string, number>();
  for (const e of exams) {
    if (e.start_date && e.start_date >= today && e.start_date <= windowEnd) {
      scheduleCounts.set(e.start_date, (scheduleCounts.get(e.start_date) ?? 0) + 1);
    }
  }
  const upcomingSchedule: ExamDashboardStats["upcomingSchedule"] = [];
  for (let i = 0; i <= 15; i++) {
    const date = addDaysIso(today, i);
    upcomingSchedule.push({ date, value: scheduleCounts.get(date) ?? 0 });
  }

  const totalSubjects = stats?.total_subjects ?? 0;
  const subjectsWithMarks = stats?.subjects_with_marks ?? 0;

  return {
    examsThisSessionCount: exams.length,
    upcomingCount,
    ongoingCount,
    marksEntryPercent: totalSubjects > 0 ? Math.round((subjectsWithMarks / totalSubjects) * 1000) / 10 : 0,
    publishedSetupsCount: publishedSetupsCount ?? 0,
    statusBreakdown,
    attendanceBreakdown: { present: stats?.marks_present ?? 0, absent: stats?.marks_absent ?? 0 },
    upcomingSchedule,
  };
}
