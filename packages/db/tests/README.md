# RLS isolation tests

```bash
pnpm --filter @schoolerp/db start   # first time: pulls Docker images, can take a few minutes
pnpm --filter @schoolerp/db reset   # applies migrations + seed.sql
supabase status                     # prints "API URL" and "anon key" — copy into .env.test
cp .env.test.example .env.test      # then fill in the values from `supabase status`
pnpm --filter @schoolerp/db test
```

`rls-isolation.test.ts` signs in as the two seeded school owners and proves School A cannot
read School B's rows — including on explicit, deliberately-cross-tenant queries, not just
unfiltered ones. If this test ever needs an app-layer `.eq('school_id', ...)` filter to pass,
that's a sign the RLS policy itself has a gap, not that the test is wrong.

Can also run against a linked remote project instead of local (`supabase link`, then
`supabase db push`, `supabase config push`, and `supabase db query --linked -f supabase/seed.sql`
against a **disposable dev project**, never a real school's) — this is how the suite was
actually verified end-to-end for this session, against a fresh Supabase project. Do not point
`TEST_SUPABASE_URL` at a project with real school data — the seed script's dev credentials
would exist there. `supabase config push` is not optional here: without it the Custom Access
Token hook never fires, every policy fails closed, and this suite's "denies cross-school" cases
would pass for the wrong reason (everything is blocked, not just the other school).

On Node < 22, `tests/setup.ts` polyfills a global `WebSocket` (via the `ws` package) because
supabase-js's Realtime client requires one to exist at construction time even though this suite
never subscribes to anything.
