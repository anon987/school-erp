"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { cn } from "@schoolerp/ui";

export interface RowAction {
  label: string;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
}

/**
 * One icon-only trigger + a Level 3 popover (docs/design-system.md > Elevation), not a row full
 * of individual buttons -- "more than one visible action button per row is what crowding looks
 * like" at real row heights on a 360px screen. No dependency on a menu/popover library: this is
 * small enough (open/close + click-outside + Escape) that pulling in Radix or similar for one
 * component would cost more bundle weight than it saves engineering time, and this stack already
 * avoids heavier UI libraries (CLAUDE.md: keep client JS small).
 */
export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const primary = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded hover:bg-secondary"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {primary.map((action) => (
            <MenuItem key={action.label} action={action} onDone={() => setOpen(false)} />
          ))}
          {primary.length > 0 && destructive.length > 0 ? <div role="separator" className="my-1 h-px bg-border" /> : null}
          {destructive.map((action) => (
            <MenuItem key={action.label} action={action} onDone={() => setOpen(false)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ action, onDone }: { action: RowAction; onDone: () => void }) {
  const className = cn(
    "block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-secondary",
    action.destructive ? "text-danger-solid" : "text-foreground",
  );
  if (action.href) {
    return (
      <Link href={action.href} role="menuitem" className={className} onClick={onDone}>
        {action.label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      onClick={() => {
        action.onSelect?.();
        onDone();
      }}
    >
      {action.label}
    </button>
  );
}
