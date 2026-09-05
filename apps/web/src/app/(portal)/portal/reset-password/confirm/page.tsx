import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function PortalResetPasswordConfirmPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 text-card-foreground">
        <h1 className="mb-1 text-xl font-semibold">Set your password</h1>
        <p className="mb-4 text-sm text-muted-foreground">Choose a password for the parent portal.</p>
        <SetPasswordForm />
      </div>
    </main>
  );
}
