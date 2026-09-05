import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getAdmitCardSettings } from "@/lib/exams/admitCard.queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import { AdmitCardSettingsSection } from "@/lib/exams/components/AdmitCardSettingsSection";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdmitCardSettingsPage() {
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} />
    </RequirePermission>
  );
}

async function Body({ schoolId }: { schoolId: string }) {
  const [settings, branding] = await Promise.all([getAdmitCardSettings(schoolId), getSchoolBranding(schoolId)]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams" }, { label: "Admit Card Settings" }]} />
      <h1 className="text-2xl font-semibold">Admit Card Settings</h1>
      <AdmitCardSettingsSection template={settings.template} schoolName={branding?.displayName ?? "School"} logoUrl={branding?.logoUrl ?? null} />
    </div>
  );
}
