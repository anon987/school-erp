import { redirect } from "next/navigation";
import { getSession, type AppSession } from "./session";

/** For use at the top of a Server Component page/layout that requires sign-in. */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
