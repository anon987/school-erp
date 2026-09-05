/**
 * docs/design-system.md > Detail and record pages: circular photo, initials-on-color fallback
 * when there's no photo -- never a broken image icon. `photoUrl` is a short-lived Supabase
 * Storage signed URL (the `documents` bucket is private -- see
 * apps/web/src/lib/core/documents/queries.ts), not a stored/cached value, so a plain `<img>`
 * rather than `next/image` -- the URL is different on every request and next/image's remote-domain
 * allowlist + optimization cache would buy nothing for a value that never repeats.
 */
export function Avatar({ firstName, lastName, photoUrl }: { firstName: string; lastName: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        className="h-16 w-16 rounded-full object-cover"
      />
    );
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground"
    >
      {initials}
    </div>
  );
}
