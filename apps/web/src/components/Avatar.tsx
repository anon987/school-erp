/**
 * docs/design-system.md > Detail and record pages: circular photo, initials-on-color fallback
 * when there's no photo -- never a broken image icon. No photo-upload feature exists yet for
 * students/staff, so this is always the fallback today; the component exists so a real photo
 * slots in later without changing the left rail's layout.
 */
export function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
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
