import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { BatchDetailView } from "@/lib/core/import/components/BatchDetailView";

export default async function StudentImportBatchPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const session = await requireSession();

  return (
    <RequirePermission permission="school.manage_students">
      <BatchDetailView
        schoolId={session.schoolId!}
        batchId={batchId}
        redirectBasePath="/people/students/import"
        breadcrumbs={[
          { label: "Students", href: "/people/students" },
          { label: "Import", href: "/people/students/import" },
          { label: "Batch" },
        ]}
      />
    </RequirePermission>
  );
}
