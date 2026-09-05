"use client";

import { useState, useTransition } from "react";
import { updateAttendanceThreshold } from "../actions";

export function ThresholdEditor({ currentPercent }: { currentPercent: number }) {
  const [value, setValue] = useState(String(currentPercent));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setError("Enter a percentage between 0 and 100.");
      return;
    }
    setError(null);
    // See MarkingClient.tsx's handleSubmit for why this is wrapped instead of passed directly.
    startTransition(() => {
      void (async () => {
        const result = await updateAttendanceThreshold({ thresholdPercent: parsed });
        if (result.error) setError(result.error);
      })();
    });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-xs font-medium text-muted-foreground" htmlFor="attendance-threshold">
        Threshold
      </label>
      <input
        id="attendance-threshold"
        type="number"
        min={0}
        max={100}
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-md border border-input bg-background px-2 py-1 font-figures text-sm"
      />
      <span className="text-muted-foreground">%</span>
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60"
      >
        Save
      </button>
      {error ? <span className="text-xs text-danger-solid">{error}</span> : null}
    </div>
  );
}
