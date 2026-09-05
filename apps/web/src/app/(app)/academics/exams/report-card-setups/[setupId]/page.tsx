import Link from "next/link";
import { notFound } from "next/navigation";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getReportCardSetup, getReportCardSetupClasses } from "@/lib/exams/reportCardSetup.queries";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function ReportCardSetupClassesPage({ params }: { params: Promise<{ setupId: string }> }) {
  const { setupId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_exams">
      <Body schoolId={session.schoolId!} setupId={setupId} />
    </RequirePermission>
  );
}

async function Body({ schoolId, setupId }: { schoolId: string; setupId: string }) {
  const setup = await getReportCardSetup(schoolId, setupId);
  if (!setup) notFound();

  const classes = await getReportCardSetupClasses(setup);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Exams", href: "/academics/exams/manage" }, { label: "Report Cards", href: "/academics/exams/report-cards" }, { label: setup.name }]} />
      <h1 className="text-2xl font-semibold">{setup.name}</h1>
      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">None of this setup's exams have configured subjects yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/academics/exams/report-card-setups/${setupId}/${c.id}`}
                className="block rounded-md border border-border bg-card px-4 py-3 shadow-sm hover:bg-secondary"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
