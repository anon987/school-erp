import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import type { GuardianSession } from "@/lib/core/auth/types";
import { getLinkedStudents, getPortalExamsForStudent, getLeaveApplications } from "@/lib/portal/queries";
import { getStudentAttendanceSummary } from "@/lib/attendance/queries";
import { getStudentInvoices, getInvoicePayments } from "@/lib/fees/queries";
import { submitLeaveApplication } from "@/lib/portal/actions";
import type { LinkedStudentRow, LeaveApplicationRow, PortalExamRow } from "@/lib/portal/types";
import type { StudentAttendanceHistoryRow } from "@/lib/attendance/types";
import type { PaymentRow, StudentInvoiceRow } from "@/lib/fees/types";
import { formatDateDisplay, formatDateTimeDisplayIst, todayIsoIst } from "@/lib/core/dateIst";
import { formatPaiseAsRupees } from "@/lib/core/validation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { DateField } from "@/components/DateField";
import { LoadingView } from "@/components/LoadingView";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SegmentedTabs, type TabDef } from "@/components/SegmentedTabs";
import { StatusBadge, type StatusState } from "@/components/StatusBadge";

const ATTENDANCE_BADGE: Record<string, StatusState> = { present: "present", absent: "absent", late: "late", half_day: "half_day", leave: "leave" };
const LEAVE_BADGE: Record<string, StatusState> = { pending: "pending", approved: "approved", rejected: "due" };
const INVOICE_BADGE: Record<string, StatusState> = { paid: "paid", pending: "due", partially_paid: "due", overdue: "overdue", cancelled: "due" };

export default function StudentDetailScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { state } = useAuth();
  const { colors } = useTheme();

  const [student, setStudent] = useState<LinkedStudentRow | null>(null);
  const [attendance, setAttendance] = useState<{ history: StudentAttendanceHistoryRow[]; daysMarked: number; percent: number | null } | null>(null);
  const [exams, setExams] = useState<PortalExamRow[] | null>(null);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplicationRow[] | null>(null);
  const [invoices, setInvoices] = useState<StudentInvoiceRow[] | null>(null);
  const [paymentsByInvoice, setPaymentsByInvoice] = useState<Record<string, PaymentRow[]>>({});
  const [error, setError] = useState<string | null>(null);

  const session = state.status === "guardian" ? state.session : null;

  const load = useCallback(async () => {
    if (!session || !studentId) return;
    setError(null);
    try {
      const students = await getLinkedStudents(session.schoolId, session.guardianId);
      const match = students.find((s) => s.id === studentId);
      if (!match) {
        setError("This student is not linked to your account.");
        return;
      }
      setStudent(match);

      const [attendanceSummary, examRows, leaveRows, invoiceRows] = await Promise.all([
        getStudentAttendanceSummary(session.schoolId, studentId),
        getPortalExamsForStudent(studentId),
        getLeaveApplications(studentId),
        getStudentInvoices(session.schoolId, studentId),
      ]);
      setAttendance(attendanceSummary);
      setExams(examRows);
      setLeaveApplications(leaveRows);
      setInvoices(invoiceRows);

      const paymentEntries = await Promise.all(invoiceRows.map(async (inv): Promise<[string, PaymentRow[]]> => [inv.invoiceId, await getInvoicePayments(inv.invoiceId)]));
      setPaymentsByInvoice(Object.fromEntries(paymentEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this student.");
    }
  }, [session, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) return <LoadingView />;
  if (error) {
    return (
      <Screen scroll={false}>
        <ErrorBanner message={error} onRetry={load} />
      </Screen>
    );
  }
  if (!student || !attendance || !exams || !leaveApplications || !invoices) return <LoadingView />;

  const tabs: TabDef[] = [
    {
      id: "attendance",
      label: "Attendance",
      content: <AttendanceTab attendance={attendance} />,
    },
    {
      id: "fees",
      label: "Fees",
      content: <FeesTab invoices={invoices} paymentsByInvoice={paymentsByInvoice} />,
    },
    {
      id: "results",
      label: "Results",
      content: <ResultsTab exams={exams} />,
    },
    {
      id: "leave",
      label: "Leave",
      content: <LeaveTab studentId={studentId} session={session} leaveApplications={leaveApplications} onSubmitted={load} />,
    },
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: `${student.firstName} ${student.lastName}` }} />
      <Text style={[styles.name, { color: colors.foreground }]}>
        {student.firstName} {student.lastName}
      </Text>
      <Text style={{ color: colors.mutedForeground, marginBottom: 4 }}>
        {student.className ? `${student.className}${student.sectionName ? ` - ${student.sectionName}` : ""}` : "—"} · Admission no. {student.admissionNumber}
      </Text>
      <SegmentedTabs tabs={tabs} />
    </Screen>
  );
}

function AttendanceTab({ attendance }: { attendance: { history: StudentAttendanceHistoryRow[]; daysMarked: number; percent: number | null } }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.foreground }}>
        {attendance.percent !== null ? (
          <>
            <Text style={{ fontWeight: "700" }}>{attendance.percent}%</Text> present ({attendance.daysMarked} days marked)
          </>
        ) : (
          "No attendance marked yet."
        )}
      </Text>
      {attendance.history.length === 0 ? <EmptyState message="No records yet." /> : null}
      {attendance.history.slice(0, 60).map((row) => (
        <Card key={row.attendanceDate} style={styles.listRow}>
          <Text style={{ color: colors.foreground, fontVariant: ["tabular-nums"] }}>{formatDateDisplay(row.attendanceDate)}</Text>
          <StatusBadge state={ATTENDANCE_BADGE[row.status] ?? "present"} label={row.status.replace("_", " ")} />
        </Card>
      ))}
    </View>
  );
}

function FeesTab({ invoices, paymentsByInvoice }: { invoices: StudentInvoiceRow[]; paymentsByInvoice: Record<string, PaymentRow[]> }) {
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (invoices.length === 0) return <EmptyState message="No invoices yet." />;

  return (
    <View style={{ gap: 8 }}>
      {invoices.map((inv) => {
        const balance = inv.totalAmountPaise - inv.paidAmountPaise;
        const expanded = expandedId === inv.invoiceId;
        return (
          <Card key={inv.invoiceId}>
            <View style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>{inv.installmentLabel || inv.invoiceNumber}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  {inv.academicYearName} · Due {formatDateDisplay(inv.dueDate)}
                </Text>
              </View>
              <StatusBadge state={INVOICE_BADGE[inv.status] ?? "due"} label={inv.status.replace("_", " ")} />
            </View>
            <Text style={{ color: colors.foreground, fontVariant: ["tabular-nums"] }}>
              {formatPaiseAsRupees(inv.paidAmountPaise)} paid of {formatPaiseAsRupees(inv.totalAmountPaise)}
              {balance > 0 ? ` · ${formatPaiseAsRupees(balance)} due` : ""}
            </Text>
            <Button
              label={expanded ? "Hide payment history" : "View payment history"}
              variant="ghost"
              onPress={() => setExpandedId(expanded ? null : inv.invoiceId)}
            />
            {expanded ? (
              <View style={{ gap: 6 }}>
                {(paymentsByInvoice[inv.invoiceId] ?? []).length === 0 ? (
                  <EmptyState message="No payments recorded yet." />
                ) : (
                  paymentsByInvoice[inv.invoiceId]?.map((p) => (
                    <View key={p.id} style={[styles.paymentRow, { borderColor: colors.border }]}>
                      <Text style={{ color: colors.foreground, fontVariant: ["tabular-nums"] }}>{formatPaiseAsRupees(p.amountPaise)}</Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                        {p.method} · {formatDateTimeDisplayIst(p.createdAt)}
                      </Text>
                      {p.receiptNumber ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Receipt {p.receiptNumber}</Text> : null}
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

function ResultsTab({ exams }: { exams: PortalExamRow[] }) {
  const { colors } = useTheme();
  if (exams.length === 0) return <EmptyState message="No published results yet." />;
  return (
    <View style={{ gap: 8 }}>
      {exams.map((e) => (
        <Card key={e.id} style={styles.listRow}>
          <Text style={{ color: colors.foreground, flex: 1 }}>
            {e.name}
            {e.term ? ` (${e.term})` : ""}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Report card: web portal only</Text>
        </Card>
      ))}
    </View>
  );
}

function LeaveTab({
  studentId,
  session,
  leaveApplications,
  onSubmitted,
}: {
  studentId: string;
  session: GuardianSession;
  leaveApplications: LeaveApplicationRow[];
  onSubmitted: () => Promise<void>;
}) {
  const { colors } = useTheme();
  const [fromDate, setFromDate] = useState<string | null>(todayIsoIst());
  const [toDate, setToDate] = useState<string | null>(todayIsoIst());
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!fromDate || !toDate) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitLeaveApplication(session, studentId, { fromDate, toDate, reason });
    setSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setReason("");
    await onSubmitted();
  }

  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 10 }}>
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>Apply for leave</Text>
        {submitError ? <ErrorBanner message={submitError} /> : null}
        <DateField label="From" valueIso={fromDate} onChange={setFromDate} />
        <DateField label="To" valueIso={toDate} onChange={setToDate} />
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Family function"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.textArea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
          />
        </View>
        <Button label="Submit" onPress={() => void handleSubmit()} loading={submitting} disabled={!reason.trim() || !fromDate || !toDate} />
      </Card>

      {leaveApplications.length === 0 ? (
        <EmptyState message="No leave requests yet." />
      ) : (
        leaveApplications.map((l) => (
          <Card key={l.id} style={{ gap: 4 }}>
            <View style={styles.listRow}>
              <Text style={{ color: colors.foreground }}>
                {formatDateDisplay(l.fromDate)} - {formatDateDisplay(l.toDate)}
              </Text>
              <StatusBadge state={LEAVE_BADGE[l.status] ?? "pending"} label={l.status} />
            </View>
            <Text style={{ color: colors.mutedForeground }}>{l.reason}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Submitted {formatDateTimeDisplayIst(l.createdAt)}</Text>
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 20,
    fontWeight: "700",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  paymentRow: {
    borderTopWidth: 1,
    paddingTop: 6,
    gap: 2,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
});
