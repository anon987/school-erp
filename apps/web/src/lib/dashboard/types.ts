export interface DashboardClassRow {
  id: string;
  name: string;
  sortOrder: number;
  sectionCount: number;
  studentCount: number;
}

export interface TrendPoint {
  date: string;
  value: number | null;
}

export interface DashboardAlertStudent {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
  detail: string;
}

export interface DashboardOverview {
  studentCount: number;
  staffCount: number;
  classes: DashboardClassRow[];

  todayAttendancePercent: number | null;
  todayStaffAttendancePercent: number | null;
  feesCollectedTodayPaise: number;
  feesCollectedMonthToDatePaise: number;
  pendingDuesPaise: number;
  defaulterCount: number;

  attendanceTrend: TrendPoint[];
  collectionTrend: TrendPoint[];
  admissionsTrend: TrendPoint[];

  lowAttendanceAlerts: DashboardAlertStudent[];
  largeDuesAlerts: DashboardAlertStudent[];
  resultsPendingApproval: { examId: string; examName: string }[];
}
