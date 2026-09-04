"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Filtering, sorting, and page-size are all the same shape of problem: a URL param changes, the
 * server re-renders with new data, and the transition should dim the existing content instead of
 * blocking navigation or flashing blank (docs/design-system.md > Tables). One hook for all three,
 * so a screen's filter bar doesn't reimplement router.push/startTransition wiring per param group.
 */
export function useUrlTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(params: Record<string, string | undefined>): void {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${qs.toString()}`);
    });
  }

  return { isPending, navigate };
}
