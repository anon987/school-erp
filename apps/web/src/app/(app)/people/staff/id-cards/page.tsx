import { Download } from "lucide-react";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function StaffIdCardsPage() {
  return (
    <RequirePermission permission="school.manage_staff">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Staff", href: "/people/staff" }, { label: "ID Cards" }]} />
        <h1 className="text-2xl font-semibold">Staff ID Cards</h1>
        <p className="text-sm text-muted-foreground">One PDF with every active staff member's ID card, one per page -- print and cut.</p>
        <a
          href="/api/id-cards/staff/all/pdf"
          className="flex items-center gap-2 self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download all active staff
        </a>
      </div>
    </RequirePermission>
  );
}
