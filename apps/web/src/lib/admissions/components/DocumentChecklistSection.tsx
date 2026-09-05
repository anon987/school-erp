"use client";

import { useFormState, useFormStatus } from "react-dom";
import { uploadApplicationDocumentAction, verifyApplicationDocumentAction, type AdmissionsFormState } from "../actions";
import type { ApplicationDocumentRow } from "../types";

const initialState: AdmissionsFormState = {};

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      Upload
    </button>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      Mark verified
    </button>
  );
}

function ChecklistRow({ applicationId, row }: { applicationId: string; row: ApplicationDocumentRow & { url: string | null } }) {
  const [uploadState, uploadFormAction] = useFormState(uploadApplicationDocumentAction.bind(null, applicationId, row.id), initialState);
  const [verifyState, verifyFormAction] = useFormState(verifyApplicationDocumentAction.bind(null, applicationId, row.id), initialState);

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <span className="min-w-[10rem] font-medium">
        {row.documentTypeName} {row.isRequired ? <span className="text-danger-solid">*</span> : null}
      </span>

      {row.status === "pending" ? (
        <form action={uploadFormAction} className="flex items-center gap-2">
          <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="text-xs" />
          <UploadButton />
          {uploadState.error ? <span className="text-xs text-danger-solid">{uploadState.error}</span> : null}
        </form>
      ) : (
        <div className="flex items-center gap-2">
          {row.url ? (
            <a href={row.url} target="_blank" rel="noreferrer" className="text-xs underline-offset-2 hover:underline">
              View file
            </a>
          ) : null}
          {row.status === "uploaded" ? (
            <form action={verifyFormAction} className="flex items-center gap-2">
              <VerifyButton />
              {verifyState.error ? <span className="text-xs text-danger-solid">{verifyState.error}</span> : null}
            </form>
          ) : (
            <span className="text-xs text-success-solid">Verified</span>
          )}
        </div>
      )}
    </li>
  );
}

export function DocumentChecklistSection({
  applicationId,
  documents,
}: {
  applicationId: string;
  documents: (ApplicationDocumentRow & { url: string | null })[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Document checklist</h2>
      {documents.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {documents.map((d) => (
            <ChecklistRow key={d.id} applicationId={applicationId} row={d} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No document types configured -- add some in Settings &gt; Master Data &gt; Admissions.</p>
      )}
    </section>
  );
}
