# School ERP

Multi-school SaaS School ERP for Indian schools and inter colleges. See `CLAUDE.md` for the
working rules and `docs/` for the product spec. This session built P0: repo scaffold, Supabase
wiring, the school isolation layer, auth, and the design system.

## Setup

```bash
corepack enable   # or: npm install -g pnpm
pnpm install
```

- `packages/db/README.md` — Supabase local dev, migrations, linking a real project.
- `packages/db/tests/README.md` — running the cross-school RLS isolation test.
- `apps/web/.env.example`, `apps/worker/.env.example` — copy to `.env.local` / `.env` and fill in.
- `docs/design-system.md` — palette, type scale, theming architecture.

## Workspace layout

```
apps/
  web/            Next.js App Router — admin, teacher, management, parent web (P0: auth + shell)
  worker/         Node.js — jobs, webhooks, reconciliation, imports (P0: admin client + role-change primitive)
  mobile-stub/    placeholder — React Native (Expo) app starts P2
packages/
  db/             Supabase migrations, RLS policies, seed data
  types/          DB types (generated — see packages/db's gen-types script)
  ui/             Shared components
  integrations/   Provider adapters (auth is the only one built in P0 — payments/messaging/
                   gps/biometric are added when their feature phase starts)
```

## What's deliberately not here yet

No feature modules (students, attendance, fees, exams, ...) — those are `P1`+. This session is
the foundation they'll be built on: tenant isolation, auth, roles/permissions, and the design
system. See `CLAUDE.md` for phase discipline.
