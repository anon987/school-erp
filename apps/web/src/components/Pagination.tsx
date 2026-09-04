import Link from "next/link";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Base path + existing query params (page gets appended/overridden) -- e.g. "/people/students?search=ravi" */
  hrefFor: (page: number) => string;
}

/**
 * Plain links, not client-side state -- works with JavaScript disabled, and each page is its
 * own real URL (bookmarkable, back-button-correct). Cross-feature (Students, Staff, and every
 * future directory need this), so it lives in src/components, not one feature's lib folder.
 */
export function Pagination({ page, pageSize, total, hrefFor }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
      <span className="font-figures text-muted-foreground">
        Page {page + 1} of {totalPages} &middot; {total} total
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={hrefFor(page - 1)} className="rounded border border-border px-2 py-1 hover:bg-secondary">
            Previous
          </Link>
        ) : (
          <span className="rounded border border-border px-2 py-1 text-muted-foreground opacity-50">Previous</span>
        )}
        {hasNext ? (
          <Link href={hrefFor(page + 1)} className="rounded border border-border px-2 py-1 hover:bg-secondary">
            Next
          </Link>
        ) : (
          <span className="rounded border border-border px-2 py-1 text-muted-foreground opacity-50">Next</span>
        )}
      </div>
    </nav>
  );
}
