import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** docs/design-system.md > Detail and record pages. Every record/detail page gets one; list pages are one level deep already and don't need one. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
