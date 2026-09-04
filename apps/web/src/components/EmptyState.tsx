import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * docs/design-system.md > States: never a bare "No records" line. An icon, a specific reason
 * (a filtered-to-empty result is a different situation than a genuinely new/unimported school),
 * and, when something would fix it, that action right there.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string } | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <Link href={action.href} className="mt-1 text-sm font-medium text-primary underline-offset-2 hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
