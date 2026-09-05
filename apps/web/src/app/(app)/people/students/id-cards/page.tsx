import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getClassOptions } from "@/lib/idCards/queries";
import { ClassIdCardDownloadForm } from "@/lib/idCards/components/ClassIdCardDownloadForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function StudentIdCardsPage() {
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_students">
      <Body schoolId={session.schoolId!} />
    </RequirePermission>
  );
}

async function Body({ schoolId }: { schoolId: string }) {
  const classes = await getClassOptions(schoolId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Students", href: "/people/students" }, { label: "ID Cards" }]} />
      <h1 className="text-2xl font-semibold">Student ID Cards</h1>
      <p className="text-sm text-muted-foreground">Pick a class to download one PDF with every enrolled student's ID card, one per page -- print and cut.</p>
      <ClassIdCardDownloadForm classes={classes} />
    </div>
  );
}
