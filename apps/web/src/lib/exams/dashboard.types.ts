import type { ExamStatus } from "./types";
import type { TrendPoint } from "@/lib/dashboard/types";

export interface ExamDashboardStats {
  examsThisSessionCount: number;
  upcomingCount: number;
  ongoingCount: number;
  marksEntryPercent: number;
  publishedSetupsCount: number;
  statusBreakdown: { status: ExamStatus; count: number }[];
  attendanceBreakdown: { present: number; absent: number };
  /** Count of exams starting on each of the next 15 days -- reuses the dashboard module's
   *  existing TrendChart shape ({date, value}), not a new chart type. */
  upcomingSchedule: TrendPoint[];
}
