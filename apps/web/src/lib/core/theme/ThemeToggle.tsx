"use client";

import { setThemePreference } from "./actions";
import type { ThemePreference } from "./constants";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Three plain forms, each bound to a specific preference value -- works with JS disabled
 * (progressive enhancement, per CLAUDE.md's low-end-Android performance priority) since each
 * is a real form submission to a Server Action, not a client-side-only state toggle.
 */
export function ThemeToggle() {
  return (
    <div role="group" aria-label="Theme" className="inline-flex gap-1">
      {OPTIONS.map((option) => (
        <form key={option.value} action={setThemePreference.bind(null, option.value)}>
          <button type="submit" className="rounded px-2 py-1 text-sm hover:bg-secondary">
            {option.label}
          </button>
        </form>
      ))}
    </div>
  );
}
