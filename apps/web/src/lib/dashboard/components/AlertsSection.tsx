import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DashboardAlertStudent } from "../types";

function AlertList({ title, items, hrefFor, emptyLabel }: { title: string; items: DashboardAlertStudent[]; hrefFor: (studentId: string) => string; emptyLabel: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success-solid" aria-hidden="true" />
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((s) => (
            <li key={s.studentId} className="flex items-center justify-between py-1.5 text-sm">
              <Link href={hrefFor(s.studentId)} className="hover:underline">
                {s.firstName} {s.lastName} <span className="font-figures text-muted-foreground">({s.admissionNumber})</span>
              </Link>
              <span className="font-figures text-danger-solid">{s.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AlertsSection({
  lowAttendance,
  largeDues,
  resultsPendingApproval,
}: {
  lowAttendance: DashboardAlertStudent[];
  largeDues: DashboardAlertStudent[];
  resultsPendingApproval: { examId: string; examName: string }[];
}) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <AlertTriangle className="h-5 w-5 text-warning-solid" aria-hidden="true" />
        Alerts
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AlertList title="Low attendance" items={lowAttendance} hrefFor={(id) => `/people/students/${id}`} emptyLabel="No students below the threshold." />
        <AlertList title="Large dues" items={largeDues} hrefFor={(id) => `/people/students/${id}`} emptyLabel="No outstanding dues." />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Results pending approval</h3>
          {resultsPendingApproval.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success-solid" aria-hidden="true" />
              Nothing waiting on approval.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {resultsPendingApproval.map((e) => (
                <li key={e.examId} className="py-1.5 text-sm">
                  <Link href={`/academics/exams/${e.examId}`} className="hover:underline">
                    {e.examName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
