import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import { decodeAccessTokenClaims } from "./jwt";
import type { AuthState } from "./types";

interface AuthContextValue {
  state: AuthState;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Re-runs role resolution against the current session -- e.g. after activating a portal
   *  account, or after an admin grants a role, without forcing a full sign-out/sign-in. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Resolves "who is this" exactly once per Supabase session change: a guardian_portal_account row
 * (guardian, no school_member row, no JWT school_id/roles claims -- see
 * apps/web/src/lib/core/auth/portalSession.ts) or a school_member row (staff, JWT-carried
 * school_id/roles -- see apps/web/src/lib/core/auth/session.ts). CLAUDE.md's product model: never
 * both for the same person. Both lookups run under the user's own authenticated client, scoped by
 * the same RLS policies web relies on -- this file holds no service-role key and never will.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  async function resolveFromSession(session: Session | null): Promise<void> {
    if (!session) {
      setState({ status: "signedOut" });
      return;
    }

    const authUserId = session.user.id;
    const email = session.user.email ?? null;

    const { data: guardianRow, error: guardianError } = await supabase
      .from("guardian_portal_account")
      .select("guardian_id, school_id, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (guardianError) {
      setState({ status: "unresolved", authUserId });
      return;
    }
    if (guardianRow) {
      setState({
        status: "guardian",
        session: {
          authUserId,
          email,
          guardianId: guardianRow.guardian_id,
          schoolId: guardianRow.school_id,
          status: guardianRow.status as never,
        },
      });
      return;
    }

    const { data: memberRow, error: memberError } = await supabase
      .from("school_member")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (memberError) {
      setState({ status: "unresolved", authUserId });
      return;
    }
    if (memberRow) {
      const claims = decodeAccessTokenClaims(session.access_token);
      setState({
        status: "staff",
        session: { authUserId, email, schoolId: claims.schoolId ?? "", roles: claims.roles },
      });
      return;
    }

    setState({ status: "unresolved", authUserId });
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => resolveFromSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveFromSession(session);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      async signInWithPassword(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async refresh() {
        const { data } = await supabase.auth.getSession();
        await resolveFromSession(data.session);
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
