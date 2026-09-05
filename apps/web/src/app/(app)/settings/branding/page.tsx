import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { BrandingForm } from "@/lib/branding/components/BrandingForm";

export default async function BrandingPage() {
  const session = await requireSession();
  const branding = session.schoolId ? await getSchoolBranding(session.schoolId) : null;

  return (
    <RequirePermission permission="school.manage_branding">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Branding</h1>
        {branding ? (
          <BrandingForm branding={branding} />
        ) : (
          <p className="text-sm text-muted-foreground">No school in session.</p>
        )}
      </div>
    </RequirePermission>
  );
}
