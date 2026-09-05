"use client";

import { useFormState, useFormStatus } from "react-dom";
import { deleteDocumentAction, uploadDocumentAction, type PhotoActionState } from "../actions";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS, type DocumentRecord } from "../types";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

const initialState: PhotoActionState = {};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:opacity-60">
      {pending ? "Uploading…" : "Upload"}
    </button>
  );
}

function UploadForm({ ownerType, ownerId }: { ownerType: "student" | "staff"; ownerId: string }) {
  const boundAction = uploadDocumentAction.bind(null, ownerType, ownerId);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type
        <select name="category" required defaultValue="" className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>
            Select…
          </option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {DOCUMENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        File
        <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="w-64 text-sm" />
      </label>
      <UploadButton />
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </form>
  );
}

function DeleteButton({ ownerType, ownerId, documentId }: { ownerType: "student" | "staff"; ownerId: string; documentId: string }) {
  const boundAction = deleteDocumentAction.bind(null, ownerType, ownerId, documentId);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <SubmitDeleteButton />
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
    </form>
  );
}

function SubmitDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-muted-foreground hover:text-danger-solid disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function DocumentsSection({
  ownerType,
  ownerId,
  documents,
  canManage,
}: {
  ownerType: "student" | "staff";
  ownerId: string;
  documents: DocumentRecord[];
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1 pr-3 font-medium">File</th>
              <th className="py-1 pr-3 font-medium">Type</th>
              <th className="py-1 pr-3 font-medium">Size</th>
              <th className="py-1 pr-3 font-medium">Uploaded</th>
              <th className="py-1 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-border last:border-0">
                <td className="py-1.5 pr-3">
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
                      {doc.fileName}
                    </a>
                  ) : (
                    doc.fileName
                  )}
                </td>
                <td className="py-1.5 pr-3">{DOCUMENT_CATEGORY_LABELS[doc.category]}</td>
                <td className="font-figures py-1.5 pr-3">{formatFileSize(doc.sizeBytes)}</td>
                <td className="font-figures py-1.5 pr-3 text-muted-foreground">{formatDateTimeDisplayIst(doc.createdAt)}</td>
                <td className="py-1.5 text-right">
                  {canManage ? <DeleteButton ownerType={ownerType} ownerId={ownerId} documentId={doc.id} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canManage ? <UploadForm ownerType={ownerType} ownerId={ownerId} /> : null}
    </div>
  );
}
