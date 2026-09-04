import { notFound } from "next/navigation";
import { getImportBatch, getRejectedRows } from "../queries";
import { CommitButtonForm, RevertButtonForm } from "./BatchActions";
import type { ImportEntityType } from "../types";

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
}: {
  schoolId: string;
  batchId: string;
  redirectBasePath: string;
}) {
  const batch = await getImportBatch(schoolId, batchId);
  if (!batch) notFound();

  const rejectedRows = batch.rejectedCount > 0 ? await getRejectedRows(batchId) : [];
  const entityType: ImportEntityType = batch.entityType;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{batch.fileName}</h1>
        <p className="text-sm text-muted-foreground">
          {batch.matchMode === "none" ? "Always create" : `Matched by ${batch.matchMode}`}
          {batch.isDryRun ? " · dry run" : ""} · status: {batch.status}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-4">
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
        <section className="overflow-x-auto rounded-md border border-border">
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
                  <td className="px-3 py-2 font-figures">{row.rowNumber}</td>
                  <td className="px-3 py-2 text-danger-solid">{row.rejectionReason}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.rawData.first_name} {row.rawData.last_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            Committed {batch.committedAt ? new Date(batch.committedAt).toLocaleDateString() : ""} -- the {REVERT_WINDOW_DAYS}
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
