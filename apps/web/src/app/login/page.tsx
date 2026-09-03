import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 text-card-foreground">
        <h1 className="mb-4 text-xl font-semibold">{t("auth.login.title")}</h1>
        <LoginForm />
      </div>
    </main>
  );
}
