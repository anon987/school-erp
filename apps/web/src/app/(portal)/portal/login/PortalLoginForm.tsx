"use client";

import { useFormState, useFormStatus } from "react-dom";
import { portalSignInAction, type PortalFormState } from "@/lib/portal/actions";

const initialState: PortalFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      Sign in
    </button>
  );
}

export function PortalLoginForm() {
  const [state, formAction] = useFormState(portalSignInAction, initialState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="rounded-md border border-input bg-background px-3 py-2 text-base" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-base"
        />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-md bg-danger px-3 py-2 text-sm text-danger-foreground">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
