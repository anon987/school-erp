"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInstallmentsAction, generateInvoicesAction, type GenerateInvoicesState } from "../actions";

interface Progress {
  processed: number;
  invoiced: number;
  skippedNoStructure: number;
  remaining: number;
}

function ProgressReadout({ progress }: { progress: Progress }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-figures text-sm text-muted-foreground">
        Invoiced {progress.invoiced} · Examined {progress.processed} · {progress.remaining} left to scan
      </p>
      {progress.skippedNoStructure > 0 ? (
        <p className="text-sm text-danger-solid">
          {progress.skippedNoStructure} student(s) skipped — no fee structure matches their class/category yet. Add a matching structure in Setup
          above, then generate again to pick them up.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Same resumable-chunk client pattern as import/attendance: calls generateInvoicesAction
 * repeatedly (each call processes up to 50 students server-side, see
 * fn_generate_yearly_invoices) until it reports done, showing progress rather than one long
 * blocking request for a 2,000+ student school. `classId` scopes a run to one class -- kept as a
 * separate control from the all-students button (its own cursor/progress state) rather than a
 * dropdown bolted onto the existing button, so the two runs never share or clobber each other's
 * resume cursor.
 */
export function InvoiceGenerationPanel({
  uninvoicedCount,
  hasInstallments,
  classes,
}: {
  uninvoicedCount: number;
  hasInstallments: boolean;
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cursor from the last chunk, kept across renders (and across the 100-chunk safety stop) so
  // clicking "Generate" again resumes from where the previous run left off instead of
  // re-scanning already-examined students from the start.
  const lastStudentIdRef = useRef<string | undefined>(undefined);

  const [classId, setClassId] = useState("");
  const [classPending, startClassTransition] = useTransition();
  const [classProgress, setClassProgress] = useState<Progress | null>(null);
  const [classError, setClassError] = useState<string | null>(null);
  const classLastStudentIdRef = useRef<string | undefined>(undefined);

  function handleGenerateInstallments() {
    setError(null);
    // See attendance/components/MarkingClient.tsx's handleSubmit for why this is wrapped instead
    // of passing an async function directly.
    startTransition(() => {
      void (async () => {
        const result = await generateInstallmentsAction({}, new FormData());
        if (result.error) setError(result.error);
        else router.refresh();
      })();
    });
  }

  async function runGeneration(
    formClassId: string | undefined,
    lastStudentIdRefToUse: React.MutableRefObject<string | undefined>,
    setProgressFn: (p: Progress) => void,
    setErrorFn: (e: string | null) => void,
  ) {
    let done = false;
    let totalProcessed = 0;
    let totalInvoiced = 0;
    let totalSkipped = 0;
    let iterations = 0;
    while (!done) {
      iterations += 1;
      if (iterations > 100) {
        setErrorFn("Stopped after 100 chunks -- click Generate again to resume from where this left off.");
        break;
      }
      const formData = new FormData();
      if (formClassId) formData.set("classId", formClassId);
      const prevState: GenerateInvoicesState = { lastStudentId: lastStudentIdRefToUse.current };
      const result = await generateInvoicesAction(prevState, formData);
      if (result.error) {
        setErrorFn(result.error);
        break;
      }
      lastStudentIdRefToUse.current = result.lastStudentId ?? lastStudentIdRefToUse.current;
      totalProcessed += result.processed ?? 0;
      totalInvoiced += result.invoiced ?? 0;
      totalSkipped += result.skippedNoStructure ?? 0;
      setProgressFn({ processed: totalProcessed, invoiced: totalInvoiced, skippedNoStructure: totalSkipped, remaining: result.remaining ?? 0 });
      done = Boolean(result.done);
    }
    router.refresh();
  }

  function handleGenerateInvoices() {
    setError(null);
    // `runGeneration` returns a Promise (its internal while-loop awaits each chunk); the
    // callback passed to startTransition must not, per the same reasoning as
    // attendance/components/MarkingClient.tsx's handleSubmit.
    startTransition(() => {
      void runGeneration(undefined, lastStudentIdRef, setProgress, setError);
    });
  }

  function handleGenerateForClass() {
    if (!classId) return;
    setClassError(null);
    classLastStudentIdRef.current = undefined;
    setClassProgress(null);
    startClassTransition(() => {
      void runGeneration(classId, classLastStudentIdRef, setClassProgress, setClassError);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Generate</h2>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateInstallments}
          disabled={isPending}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {hasInstallments ? "Regenerate monthly schedule" : "Generate monthly installment schedule"}
        </button>
        <button
          type="button"
          onClick={handleGenerateInvoices}
          disabled={isPending || uninvoicedCount === 0 || !hasInstallments}
          title={hasInstallments ? undefined : "Generate the installment schedule first"}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Generating…" : `Generate invoices for ${uninvoicedCount} student(s)`}
        </button>
      </div>
      {!hasInstallments ? <p className="text-xs text-muted-foreground">Generate the installment schedule before generating invoices.</p> : null}
      {progress ? <ProgressReadout progress={progress} /> : null}
      {error ? <p className="text-sm text-danger-solid">{error}</p> : null}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="text-sm font-medium">Generate for one class</h3>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={classPending}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleGenerateForClass}
            disabled={classPending || !classId || !hasInstallments}
            title={hasInstallments ? undefined : "Generate the installment schedule first"}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {classPending ? "Generating…" : "Generate for this class"}
          </button>
        </div>
        {classProgress ? <ProgressReadout progress={classProgress} /> : null}
        {classError ? <p className="text-sm text-danger-solid">{classError}</p> : null}
      </div>
    </section>
  );
}
