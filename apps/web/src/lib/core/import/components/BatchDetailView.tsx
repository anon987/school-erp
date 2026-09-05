import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getImportBatch, getRejectedRows } from "../queries";
import { CommitButtonForm, RevertButtonForm } from "./BatchActions";
import { ColumnMappingForm } from "./ColumnMappingForm";
import type { ImportEntityType } from "../types";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

const REVERT_WINDOW_DAYS = 7;

function withinRevertWindow(committedAt: string | null): boolean {
  if (!committedAt) return false;
  const committed = new Date(committedAt).getTime();
  return Date.now() - committed < REVERT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Shared between /people/students/import/[batchId] and /people/staff/import/[batchId] -- the
 * preview/commit/revert screen is identical shape for both entities, only the permission and
 * redirect path differ (both threaded through as props by the thin route pages).
 */
export async function BatchDetailView({
  schoolId,
  batchId,
  redirectBasePath,
  breadcrumbs,
}: {
  schoolId: string;
  batchId: string;
  redirectBasePath: string;
  breadcrumbs: BreadcrumbItem[];
}) {
  const batch = await getImportBatch(schoolId, batchId);
  if (!batch) notFound();

  const entityType: ImportEntityType = batch.entityType;

  // Mapping hasn't been confirmed yet -- uploadImportAction stages rows and stops here rather
  // than guessing the file's columns already match our field keys (see that action's comment).
  // Nothing below this (totals, rejected rows, commit/revert) means anything until mapping runs.
  if (batch.status === "staged") {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={breadcrumbs} />
        <div>
          <h1 className="text-2xl font-semibold">{batch.fileName}</h1>
          <p className="text-sm text-muted-foreground">Uploaded -- confirm the column mapping below to validate.</p>
        </div>
        <ColumnMappingForm
          entityType={entityType}
          batchId={batch.id}
          redirectBasePath={redirectBasePath}
          csvHeaders={batch.rawHeaders ?? []}
        />
      </div>
    );
  }

  const rejectedRows = batch.rejectedCount > 0 ? await getRejectedRows(batchId) : [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={breadcrumbs} />

      <div>
        <h1 className="text-2xl font-semibold">{batch.fileName}</h1>
        <p className="text-sm text-muted-foreground">
          {batch.matchMode === "none" ? "Always create" : `Matched by ${batch.matchMode}`}
          {batch.isDryRun ? " · dry run" : ""} · status: {batch.status}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-4 shadow-sm sm:grid-cols-4">
        <div>
          <p className="font-figures text-2xl font-semibold">{batch.totalRows}</p>
          <p className="text-xs text-muted-foreground">Total rows</p>
        </div>
        <div>
          <p className="font-figures text-2xl font-semibold text-success-solid">{batch.createdCount}</p>
          <p className="text-xs text-muted-foreground">Will create</p>
        </div>
        <div>
          <p className="font-figures text-2xl font-semibold text-info-solid">{batch.updatedCount}</p>
          <p className="text-xs text-muted-foreground">Will update</p>
        </div>
        <div>
          <p className="font-figures text-2xl font-semibold text-danger-solid">{batch.rejectedCount}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      {rejectedRows.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing the first {rejectedRows.length}{batch.rejectedCount > rejectedRows.length ? ` of ${batch.rejectedCount}` : ""} rejected
              rows.
            </p>
            <a
              href={`/api/import/${batch.id}/rejected-rows.csv`}
              download
              className="flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download all {batch.rejectedCount} rejected rows (CSV)
            </a>
          </div>
          <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {rejectedRows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-figures">{row.rowNumber}</td>
                    <td className="px-3 py-1.5 text-danger-solid">{row.rejectionReason}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {row.mappedData.first_name} {row.mappedData.last_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {batch.isDryRun ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          This was a dry run. Fix the source file and re-upload to actually import -- this batch cannot be committed.
        </p>
      ) : null}

      {!batch.isDryRun && (batch.status === "validated" || batch.status === "committing") ? (
        <CommitButtonForm entityType={entityType} batchId={batch.id} redirectBasePath={redirectBasePath} />
      ) : null}
      {batch.status === "committing" ? (
        <p className="text-sm text-muted-foreground">
          A previous commit attempt didn&apos;t finish -- click Commit again to resume from where it left off; already-
          committed rows are not repeated.
        </p>
      ) : null}

      {!batch.isDryRun && batch.status === "committed" ? (
        withinRevertWindow(batch.committedAt) ? (
          <RevertButtonForm entityType={entityType} batchId={batch.id} redirectBasePath={redirectBasePath} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Committed {formatDateTimeDisplayIst(batch.committedAt)} -- the {REVERT_WINDOW_DAYS}
            -day revert window has closed.
          </p>
        )
      ) : null}

      {batch.status === "reverted" ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">This import was reverted.</p>
      ) : null}
    </div>
  );
}
