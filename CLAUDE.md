# CLAUDE.md

Working rules for this repository. Read this file at the start of every session before writing code.

---

## What this project is

A multi-school (multi-tenant) SaaS School ERP for Indian schools and inter colleges, built by TechAppDev LLP.

One codebase serves many schools. The first customer is Shri Hansraj Career Inter College, Jaunpur (2,200 students, one branch), currently running on manual registers and Excel.

**The governing principle: build once as a product, configure per school.** Every time a school needs something different, the answer is a configuration row, not a code branch. If you find yourself writing `if (schoolName === ...)`, stop — that is the failure mode this product cannot survive.

---

## Read these first

| Document | When |
|---|---|
| `docs/schoolerp_features.md` | Before implementing any module. Contains the full feature spec with binding phase tags. |
| `docs/schoolerp_techstack.md` | Before touching architecture, the data model, or an integration. |
| `docs/schoolerp_launchplan.md` | For phase scope, timeline, and the pilot onboarding plan. |
| `docs/schoolerp_commerce_roadmap.md` | For pricing, plan bands, and what each plan includes. |

---

## The three rules that matter most

### 1. Every table has `school_id` and an RLS policy

A missing `school_id` filter leaks one school's student data to another. This is the highest-severity bug class in the product — worse than any outage.

```sql
alter table <table> enable row level security;

create policy school_isolation on <table>
  for all
  using (school_id = (auth.jwt() ->> 'school_id')::uuid);
```

- Every new table needs `school_id`, an RLS policy, and a migration file.
- A table without RLS is not "to be done later". It is a bug.
- Never write a query that could return rows from another school. When unsure, check the policy.
- The service-role key is used **only** in `apps/worker` and never reaches the client.

### 2. Respect the phase tags

Features in `docs/schoolerp_features.md` are tagged `P0` through `P5`. **Do not build a `P3` feature during `P1`, even if it takes ten minutes.**

The client selected every module on their requirements form. That was a wishlist, not a delivery commitment. Phase discipline is what makes an 8-month build shippable and what keeps the pilot going live on time.

If something seems missing from the current phase, check the spec before adding it. If it genuinely is missing, say so — don't silently expand scope.

### 3. Configure, don't hard-code

| Category | Rule |
|---|---|
| Configure | Branding, academic year, classes, fee heads, grading rules, roles, report filters, notification templates, receipt formats |
| Feature flag | New module behaviour useful to more than one school (`school_module_flag`) |
| Custom quote | A workflow or integration unique to one school — flag it, don't build it into core |
| Never | Hard-code a school name, branch structure, board, fee calendar, or workflow |

---

## Code conventions

- **TypeScript strict mode.** No `any` in committed code.
- **Zod** validates every API input and every import row.
- **Database types are generated** from the schema. Never hand-write them.
- **Migrations only.** No manual schema edits in the Supabase dashboard.
- **Money is integer paise.** Never floats for currency, anywhere.
- **Timestamps are UTC** in the database, rendered in IST.
- **Server-side authorization on every mutation.** Hiding a button in the UI is presentation, not security.
- **Parent access must verify the `student_guardian` link server-side** on every request, not filter client-side.

---

## Architecture rules

### Integrations go behind adapters

External services live in `packages/integrations` behind an interface. Business logic never imports a vendor SDK directly.

```
integrations/
├── payments/     PaymentProvider    → RazorpayProvider
├── messaging/    MessageProvider    → Msg91Provider, GupshupProvider
├── gps/          GpsProvider        → vendor TBD
└── biometric/    BiometricProvider  → device-specific importers
```

Schools arrive with vendors already chosen. A school with an existing GPS contract or biometric device must be servable without forking the code.

### Theming

Two layers: per-school branding (runtime, from the school record) and per-user dark mode (light/dark/system, stored against the user). See `docs/schoolerp_techstack.md` §7a.

- All theming goes through shadcn's CSS variables. **No hardcoded hex values in components.** No second styling system.
- School branding cannot live in `tailwind.config` — that's build time, one build serves every school. Config holds defaults; the school overrides a documented subset of custom properties at runtime.
- Every component must be checked in **both** light and dark mode before it's done.
- **Status colours are not themeable.** Present/absent/late, paid/due/overdue, approved/pending mean the same thing in every school. Never wire them to a school-overridable token.
- Brand colour ramps are derived and contrast-clamped to WCAG AA, validated on save.
- No flash of the wrong theme on load.

### Financial integrity

- Payment records are **immutable**. Corrections happen through adjustment or refund rows that reference the original transaction.
- Never mark an invoice paid from a client-side success callback. Wait for the verified webhook.
- **Always verify the Razorpay webhook signature** before trusting the payload.
- A daily reconciliation job flags mismatches between gateway records and invoices.

### Imports

- Imports go through staging tables (`import_batch`, `import_row`). **Never write directly to production tables from an import.**
- Flow: staging → validation → mapping → preview → approval → commit.
- Keep rejected rows with a reason column so the school can fix and re-upload.
- Support dry runs. Every import writes an audit record.

The pilot school is migrating 2,200 students off paper. Import quality determines whether the deployment succeeds.

### Messaging

- All sends go through a queue in `apps/worker`, never inline in a request.
- Every send writes a `notification_delivery` row with provider, status, and cost.
- Message credits are metered per school for pass-through billing.

### Biometric

Raw device events land in `biometric_event`, separate from `attendance_record`. A reconciliation job promotes them. A misconfigured device must never corrupt finalised attendance.

---

## Performance expectations

The users are teachers and clerks on low-end Android phones over patchy 4G in a Tier-2 town. Not developers on fibre.

- **A class teacher must be able to mark 60 students' attendance in under 30 seconds on a phone.** Default everyone present; the teacher taps only exceptions.
- Fee collection and attendance are the highest-traffic screens. Optimise them first and hardest.
- Dashboard first paint under 3 seconds on typical school connectivity.
- Prefer server components; keep client JavaScript small.

---

## Localisation

Hindi UI is a `P2` requirement, not a nice-to-have. The pilot school's staff are not English-first. Write strings so they can be translated — no concatenated sentence fragments, no text baked into images.

---

## Unverified external APIs

UDISE+, APAAR, and GPS vendor APIs depend on eligibility, credentials, and access that vary per school and have **not** been verified yet.

For these: build the data model and the export path, and stub the integration behind the adapter. Do not write code that assumes an API contract nobody has tested, and do not describe these as live integrations anywhere in the UI or docs.

---

## Repository layout

```
schoolerp/
├── apps/
│   ├── web/          # Next.js — admin, teacher, management, parent web
│   ├── worker/       # Node.js — jobs, webhooks, reconciliation, imports
│   └── mobile/       # React Native (Expo) — parent/student + teacher
├── packages/
│   ├── db/           # Supabase migrations, RLS policies, seed data
│   ├── types/        # Shared types generated from the DB schema
│   ├── ui/           # Shared components
│   └── integrations/ # Provider adapters
├── docs/
└── CLAUDE.md
```

---

## Definition of done

A feature is not done until:

- [ ] Tables have `school_id` and a tested RLS policy
- [ ] A cross-school access attempt is proven to fail
- [ ] Inputs are validated with Zod, server-side
- [ ] Authorization is enforced server-side, not just in the UI
- [ ] Sensitive mutations write to `audit_log`
- [ ] It works on a 360px-wide screen
- [ ] It has been checked in both light and dark mode
- [ ] No hardcoded colours; status colours are not wired to themeable tokens
- [ ] Money is integer paise, dates are UTC
- [ ] Nothing school-specific is hard-coded

---

## When in doubt

- **Scope question** → check the phase tags in `docs/schoolerp_features.md`. Don't guess, and don't quietly expand.
- **School-specific behaviour** → make it configuration. If it truly can't be, flag it as a custom-quote item rather than building it into core.
- **Data model change** → check `docs/schoolerp_techstack.md` §3 first; entity names there are the reference.
- **An external API you can't verify** → stub it behind the adapter and say so.

Raise these rather than picking a direction silently. A wrong assumption in the isolation layer or the fee ledger is expensive to unwind later.
