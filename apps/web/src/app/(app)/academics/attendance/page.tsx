import Link from "next/link";
import { ClipboardCheck, Users, BarChart3 } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const CARDS = [
  { href: "/academics/attendance/mark", icon: ClipboardCheck, title: "Mark Attendance", description: "Today's class-wise roster." },
  { href: "/academics/attendance/staff", icon: Users, title: "Staff Attendance", description: "Daily roll-call for all active staff." },
  { href: "/academics/attendance/reports", icon: BarChart3, title: "Reports", description: "Daily summary, monthly grid, and the low-attendance list." },
];

export default function AttendanceHubPage() {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Attendance" }]} />
      <h1 className="text-2xl font-semibold">Attendance</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm hover:bg-secondary"
          >
            <card.icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-semibold">{card.title}</span>
            <span className="text-sm text-muted-foreground">{card.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
