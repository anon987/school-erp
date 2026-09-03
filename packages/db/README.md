# @schoolerp/db

Supabase migrations, RLS policies, and seed data. This package is the single source of truth
for the schema — types in `packages/types` are generated from it, never hand-written.

## Local development

Requires Docker (Supabase CLI runs Postgres + Auth + Storage locally in containers) and the
Supabase CLI (`npm install -g supabase`).

```bash
pnpm --filter @schoolerp/db start   # supabase start — first run pulls images, can take a while
pnpm --filter @schoolerp/db reset   # applies all migrations + seed.sql fresh
pnpm --filter @schoolerp/db gen-types
```

`db reset` is the normal workflow for iterating on a migration: edit the `.sql` file, reset,
repeat. Never hand-edit the schema through a dashboard — see the migration list in
`supabase/migrations/` for the order they run in.

## Connecting to a real project

```bash
supabase link --project-ref <your-project-ref>
pnpm --filter @schoolerp/db push    # supabase db push — applies pending migrations remotely
supabase config push                # applies supabase/config.toml's [auth] section remotely too
```

`supabase config push` is what actually wires up the JWT expiry (900s) and the Custom Access
Token hook (`public.custom_access_token_hook`) on the linked project — `db push` only applies
SQL migrations, it doesn't touch Auth service settings. **Without `config push`, tokens carry no
`school_id`/`roles` claim and every RLS policy in this schema fails closed** (returns no rows
for anyone, including the row's own owner) because `current_school_id()`/`current_roles()` read
those claims. This was verified directly: the isolation test suite initially failed with the
hook disabled (everything blocked, even self-reads) and passed cleanly — all 8 cases, including
the positive control — once `config push` enabled it.

`config push` also overwrites `site_url`/`additional_redirect_urls`/email-OTP settings with
whatever's in your local `config.toml` (currently the local-dev placeholders) — fine for a
disposable dev project, but review the diff it prints before running it against anything else.

Do **not** run `seed.sql` against a real school's project — it inserts fixed dev credentials
directly into `auth.users`. It exists for local dev and the isolation test only.

## Why identity and membership are separate tables

`auth.users` is a global identity (email, eventually phone, unique project-wide).
`school_member` is a join between an identity and a school. A person can hold membership in
more than one school — a teacher moonlighting at a second institution, a staff member whose own
child studies at another pilot school — without needing two logins. P0 enforces "one active
membership per identity" only at the application layer; the schema has no constraint that would
block a second one later (see the comment in `20260902212005_identity_and_roles.sql`).
