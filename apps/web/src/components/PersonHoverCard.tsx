import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Wraps a student/staff profile link with a photo preview on hover -- CSS-only (Tailwind's
 * `group`/`group-hover`), no JS state or event handlers, so this works unchanged whether it's
 * rendered from a Server Component (reports pages) or a Client Component (the marking screens).
 * Renders nothing extra when there's no photo -- the link behaves exactly as it did before this
 * existed, per docs/design-system.md's "never a broken image icon" rule (Avatar.tsx's same rule,
 * applied here to a hover target instead of a profile page).
 */
export function PersonHoverCard({
  href,
  photoUrl,
  name,
  className,
  children,
}: {
  href: string;
  photoUrl: string | null;
  name: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-block">
      <Link href={href} className={className ?? "underline-offset-2 hover:underline"}>
        {children}
      </Link>
      {photoUrl ? (
        <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden overflow-hidden rounded-md border border-border bg-card shadow-md group-hover:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={name} className="h-24 w-24 object-cover" />
        </span>
      ) : null}
    </span>
  );
}
