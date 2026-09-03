import { RequirePermission } from "@/lib/core/auth/RequirePermission";

export default function SchoolProfilePage() {
  return (
    <RequirePermission permission="school.manage_profile">
      <h1 className="text-xl font-semibold">School Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Academic structure configuration (classes, sections, grading, fee heads) is P1.
      </p>
    </RequirePermission>
  );
}
