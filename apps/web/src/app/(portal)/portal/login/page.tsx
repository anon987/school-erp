import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/core/auth/portalSession";
import { PortalLoginForm } from "./PortalLoginForm";

export default async function PortalLoginPage() {
  const session = await getPortalSession();
  if (session) redirect("/portal");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 text-card-foreground">
        <h1 className="mb-1 text-xl font-semibold">Parent &amp; Student Portal</h1>
        <p className="mb-4 text-sm text-muted-foreground">Sign in to view attendance, fees, and results.</p>
        <PortalLoginForm />
      </div>
    </main>
  );
}
