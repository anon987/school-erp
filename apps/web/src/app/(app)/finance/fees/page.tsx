import Link from "next/link";
import { Settings2, HandCoins, AlertTriangle, FileBarChart } from "lucide-react";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const CARDS = [
  { href: "/finance/fees/setup", icon: Settings2, title: "Setup", description: "Fee heads, structures, concessions, installments, invoice generation." },
  { href: "/finance/fees/collect", icon: HandCoins, title: "Collect", description: "Find a student, view dues, record a payment." },
  { href: "/finance/fees/dues", icon: AlertTriangle, title: "Dues & Defaulters", description: "Every student with an overdue balance." },
  { href: "/finance/fees/reports", icon: FileBarChart, title: "Reports", description: "Collection totals and concessions granted, exportable to CSV." },
];

export default function FeesHubPage() {
  return (
    <RequirePermission permission="school.manage_fees">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Fees" }]} />
        <h1 className="text-2xl font-semibold">Fees</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CARDS.map((card) => (
            <Link key={card.href} href={card.href} className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-sm hover:bg-secondary">
              <card.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-lg font-semibold">{card.title}</span>
              <span className="text-sm text-muted-foreground">{card.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </RequirePermission>
  );
}
