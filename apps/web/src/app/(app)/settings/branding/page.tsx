import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function BrandingPage() {
  return (
    <RequirePermission permission="school.manage_branding">
      <h1 className="text-xl font-semibold">Branding</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The school_branding table and the brand-colour contrast-clamp logic exist (see
        docs/design-system.md). The edit form (logo upload, colour picker, live preview) is a
        feature build, not part of this P0 session.
      </p>
    </RequirePermission>
  );
}
