"use client";

import { useFormState, useFormStatus } from "react-dom";
import { inviteGuardianToPortalAction, type InviteGuardianState } from "../actions";

const initialState: InviteGuardianState = {};

function InviteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
      Invite to portal
    </button>
  );
}

const STATUS_LABEL: Record<NonNullable<InviteGuardianState["status"]>, string> = {
  invited: "Invite link generated -- copy and send it:",
  already_active: "This guardian already has an active portal account.",
  email_in_use: "That email is already registered to a different account -- resolve manually.",
};

export function InviteGuardianButton({ guardianId, email }: { guardianId: string; email: string | null }) {
  const [state, formAction] = useFormState(inviteGuardianToPortalAction.bind(null, guardianId, email ?? ""), initialState);

  if (!email) return <span className="text-xs text-muted-foreground">No email on file</span>;

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <InviteButton />
      </form>
      {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
      {state.status ? <span className="text-xs text-muted-foreground">{STATUS_LABEL[state.status]}</span> : null}
      {state.inviteLink ? (
        <input readOnly value={state.inviteLink} onFocus={(e) => e.currentTarget.select()} className="rounded-md border border-input bg-background px-2 py-1 text-xs" />
      ) : null}
    </div>
  );
}
