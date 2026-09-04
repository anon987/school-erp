"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * docs/design-system.md > Detail and record pages: a record's attached modules render as
 * collapsible sections, not one flat page -- deliberately over-built for what a module needs
 * today, because more sections (Attendance, Fees, Exams, Documents) attach to these records as
 * later phases ship. Adding one of those later means adding another <CollapsibleSection>, not
 * restructuring the page.
 */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-md border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
      </button>
      {open ? <div className="border-t border-border p-4">{children}</div> : null}
    </section>
  );
}
