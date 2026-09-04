/**
 * Wraps page.tsx (and, absent a more specific loading.tsx, every nested route under
 * people/students/) in a Suspense boundary automatically -- this is what makes clicking into the
 * directory or a student's profile feel instant instead of blocking on the server round trip.
 */
export default function StudentsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-secondary" />
        <div className="h-9 w-28 animate-pulse rounded bg-secondary" />
      </div>
      <div className="h-16 animate-pulse rounded-md bg-secondary" />
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-secondary" style={{ opacity: 1 - i * 0.06 }} />
        ))}
      </div>
    </div>
  );
}
