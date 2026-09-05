"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateSecurityPolicyAction, type SecurityPolicyFormState } from "../actions";
import type { SecurityPolicy } from "../types";

const initialState: SecurityPolicyFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function SecurityPolicyForm({ policy }: { policy: SecurityPolicy }) {
  const [state, formAction] = useFormState(updateSecurityPolicyAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Security Policy</h2>
        <p className="text-sm text-muted-foreground">
          Session expiry is enforced: a signed-in user is signed out and sent back to the login page once this many minutes have passed since their
          session was issued. Minimum password length is configured here for reference only and is not enforced yet -- there is no
          password-set/invite/change flow anywhere in this app to check it against; that is a separate, larger piece of work.
        </p>
      </div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Minimum password length
          <input
            name="minPasswordLength"
            type="number"
            min={6}
            defaultValue={policy.minPasswordLength}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Session expiry (minutes)
          <input
            name="sessionExpiryMinutes"
            type="number"
            min={15}
            placeholder="No override"
            defaultValue={policy.sessionExpiryMinutes ?? ""}
            className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <SaveButton />
      </form>
      {state.error ? <p className="text-sm text-danger-solid">{state.error}</p> : null}
    </section>
  );
}
