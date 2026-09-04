import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { UploadForm } from "@/lib/core/import/components/UploadForm";

export default function StudentImportUploadPage() {
  return (
    <RequirePermission permission="school.manage_students">
      <h1 className="mb-4 text-2xl font-semibold">Import students</h1>
      <UploadForm
        entityType="student"
        redirectBasePath="/people/students/import"
        templateHref="/templates/students-import-template.csv"
        matchModeOptions={[
          {
            value: "admission_number",
            label: "Match by admission number",
            hint: "Rows with an admission number matching an existing student update that student. A blank or duplicate admission number in the file rejects that row.",
          },
          {
            value: "none",
            label: "Always create (no matching)",
            hint: "Every valid row creates a new student. Use this for a first-time import from paper registers with no admission numbers yet -- numbers are auto-generated.",
          },
        ]}
      />
    </RequirePermission>
  );
}
