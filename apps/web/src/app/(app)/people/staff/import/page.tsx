import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { UploadForm } from "@/lib/core/import/components/UploadForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function StaffImportUploadPage() {
  return (
    <RequirePermission permission="school.manage_staff">
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Staff", href: "/people/staff" }, { label: "Import" }]} />
        <h1 className="text-2xl font-semibold">Import staff</h1>
        <UploadForm
          entityType="staff"
          redirectBasePath="/people/staff/import"
          templateHref="/templates/staff-import-template.csv"
          matchModeOptions={[
            {
              value: "employee_code",
              label: "Match by employee code",
              hint: "Rows with an employee code matching an existing staff record update that record. A blank or duplicate employee code in the file rejects that row.",
            },
            {
              value: "none",
              label: "Always create (no matching)",
              hint: "Every valid row creates a new staff record. Employee codes are auto-generated.",
            },
          ]}
        />
      </div>
    </RequirePermission>
  );
}
