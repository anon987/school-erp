"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateMemberRolesAction, type UpdateMemberRolesState } from "../actions";
import type { AssignableRole, SchoolMemberRow } from "../types";

const initialState: UpdateMemberRolesState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save roles"}
    </button>
  );
}

function MemberRow({ member, roles }: { member: SchoolMemberRow; roles: AssignableRole[] }) {
  const boundAction = updateMemberRolesAction.bind(null, member.schoolMemberId);
  const [state, formAction] = useFormState(boundAction, initialState);

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="px-3 py-2">
        <div className="font-medium">{member.displayName}</div>
        <div className="text-xs text-muted-foreground">{member.email ?? "—"}</div>
        <div className="font-figures text-xs text-muted-foreground">{member.phone}</div>
        {!member.isActive ? <div className="text-xs text-danger-solid">Inactive</div> : null}
      </td>
      <td className="px-3 py-2">
        <form action={formAction} className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {roles.map((role) => (
              <label key={role.key} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="roleKeys" value={role.key} defaultChecked={member.roleKeys.includes(role.key)} />
                {role.label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SaveButton />
            {state.error ? <span className="text-xs text-danger-solid">{state.error}</span> : null}
            {state.success ? <span className="text-xs text-success-solid">Saved -- their session will refresh on next request.</span> : null}
          </div>
        </form>
      </td>
    </tr>
  );
}

export function MembersTable({ members, roles }: { members: SchoolMemberRow[]; roles: AssignableRole[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff have a login yet -- accounts are created from a staff record.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
            <th className="px-3 py-2 font-medium">Member</th>
            <th className="px-3 py-2 font-medium">Roles</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <MemberRow key={member.schoolMemberId} member={member} roles={roles} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
