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
- **Dates display as dd/mm/yyyy, never mm/dd/yyyy.** This is an Indian product; every user reads dates day-first. Use `formatDateDisplay` (plain dates: dob, joining_date, attendance_date, academic year start/end) and `formatDateTimeDisplayIst` (timestamptz values: created_at, marked_at, committed_at — converts to Asia/Kolkata, never the server process's local time) from `apps/web/src/lib/core/dateIst.ts` for every date/timestamp shown as text. Never `new Date(x).toLocaleDateString()` or `.toLocaleString()` with no explicit format — the output format then follows the Node process's default locale (commonly `en-US`, i.e. mm/dd/yyyy), not this product's convention; this exact bug shipped once already (`BatchDetailView.tsx`, fixed 2026-09-04). Native `<input type="date">`/`<input type="month">` cannot be forced into dd/mm/yyyy this way — their displayed format follows the browser's OS locale and no CSS/JS override exists for it; changing that requires replacing the native input with a custom date-picker component, which has not been done anywhere in this codebase yet. Treat that as a separate, larger decision, not an extension of the display-formatting fix.
- **Server-side authorization on every mutation.** Hiding a button in the UI is presentation, not security.
- **Parent access must verify the `student_guardian` link server-side** on every request, not filter client-side.
- **Never add a sensitive/protected personal-data field (religion, caste, Aadhaar or other government ID, etc.) to the schema or a printed document without explicit sign-off.** These carry DPDPA implications, and Aadhaar specifically carries Aadhaar Act restrictions on private-entity collection/storage/display. This applies even when a reference design or a client request includes the field — flag it as a compliance decision for the product owner rather than adding it because the request implied it.
- **Polymorphic per-record ownership uses `owner_type`/`owner_id` (or `entity_type`/`entity_id`), never a conditional FK.** Postgres has no FK that points at one of several tables depending on a sibling column, so every table that attaches to "a student or a staff member" (or any other either/or owner) validates the reference with a `before insert or update` trigger instead — see `fn_validate_document_owner` (`document` table) and `fn_validate_custom_field_value` (`custom_field_value` table) for the two existing copies of this pattern. Reuse this shape for the next one rather than inventing a third naming convention for the same problem.

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

### apps/worker needs an HTTP entry point before real role management can ship

`apps/worker` today is jobs/webhooks/reconciliation code invoked as scripts/cron — it has no HTTP server. That's fine for its current jobs, but it blocks `/settings/members` (role assignment for a school's staff): the mutation that grants/revokes roles (`setMemberRoles`) requires the service-role key, and the service-role key must never reach the client (rule 1 above). The web app cannot call it directly.

`/settings/members` currently ships as a placeholder for exactly this reason. Building it out requires `apps/worker` to expose an HTTP endpoint that the web app's Server Actions can call (forwarding the caller's own session so the endpoint can authorize the request), not a shortcut where the web app talks to `setMemberRoles` with the service-role key itself. Treat "give `apps/worker` an HTTP entry point" as a prerequisite task for this ticket, not an optional refactor — it's a P1 blocker for pilot onboarding (the pilot school needs to assign roles to ~60 staff, which cannot happen by hand in SQL for a real customer).

### `middleware.ts` must live inside `src/`, not beside it

`apps/web` uses a `src/` layout (`src/app`, `src/components`, `src/lib`). Next.js only looks for
middleware inside `src/` when a `src/` directory exists — a `middleware.ts` at the app root
(`apps/web/middleware.ts`) is silently never invoked, no error or warning either way. This
happened for real: the file sat in the wrong place for an unknown stretch of the build, so the
per-request session-cookie refresh and (once added) session-expiry enforcement never ran, and
nothing broke loudly enough to surface it — Server Components call `getUser()`/`getSession()`
themselves, which masked it. Found by adding a `console.log` to the middleware function and
noticing zero hits in the dev server output despite every page load. The file now lives at
`apps/web/src/middleware.ts`. If a future middleware-based feature (rate limiting, a new redirect
rule, another security check) appears to have no effect at all, check this before assuming the
logic is wrong.

### apps/web code organization

Feature-based, not layer-based — a layer folder (`lib/queries`, `lib/actions`) becomes an unsorted dumping ground the moment more than two or three modules exist, and this product has 18.

```
apps/web/src/
├── lib/
│   ├── core/              # shared infra — never feature-specific
│   │   ├── supabase/      # server.ts, browser.ts, middleware.ts, env.ts
│   │   ├── auth/          # session.ts, permissions.ts, requireSession.ts, actions.ts
│   │   ├── theme/         # per-school branding + per-user dark mode
│   │   ├── import/        # the import framework — shared by Students AND Staff
│   │   ├── i18n.ts
│   │   ├── nav.ts         # grouped nav model — see below
│   │   └── validation.ts  # shared zod primitives: E.164 phone, Indian date, money-as-paise
│   ├── students/
│   │   ├── types.ts       # domain types — see "Domain types vs generated types" below
│   │   ├── schemas.ts     # zod: this feature's inputs
│   │   ├── queries.ts     # server-side reads
│   │   ├── actions.ts     # "use server" mutations
│   │   └── components/    # feature-only components, no reuse case yet
│   └── staff/ fees/ attendance/ ...   # same shape, one folder per module
├── components/             # cross-feature app components (DataTable, FilterBar) —
│                           # more than one module needs them, not generic enough for packages/ui
└── app/                    # pages/layouts ONLY — no logic lives here
```

**`src/app/**` stays thin.** Every action, query, and schema lives in `src/lib/`, never colocated in a route folder — even a route-exclusive one. One rule to hold across 18 modules beats "lib, except this file."

**Domain types vs. generated types.** `packages/types/database.ts` is generated from the schema (`pnpm --filter @schoolerp/db gen-types`) and never hand-edited, never consumed directly by a component. Each feature's `types.ts` defines the shapes its own queries actually return — derived from the generated `Row` type, or hand-shaped for a joined query (`StudentWithEnrollment`). This is the one layer allowed to change when a query's select-list changes.

**Component tiers** — pick the narrowest one that fits:
1. `packages/ui` — design-system primitives (`StatusBadge`, `cn`, theme derivation). Web-only: the mobile app is React Native and cannot consume React DOM components — only `packages/ui`'s token *values* and pure derivation logic are portable there, never the components themselves.
2. `src/components/` — cross-feature app components, no design-system generality required.
3. `src/lib/<feature>/components/` — one module's own components.

**Route groups under `(app)`** match the module list in `docs/schoolerp_features.md` §2, not an arbitrary split: `people/` (Students, Admissions, Staff & HR), `academics/` (Attendance, Exams, Timetable, Homework), `finance/` (Fees, Accounts, Payroll), `operations/` (Transport, Library, Hostel, Inventory), `communication/`, and `settings/` (School Setup, Appearance, Audit/Security — already built in P0). Dashboard stays ungrouped at `/dashboard`. Reports (§T) are **not** their own group — every P1 baseline report belongs to an existing domain (fee reports under `finance/`, attendance reports under `academics/`, ...); only P4's cross-module analytics would ever justify a standalone group. The parent/student portal is a separate top-level route group (`(portal)`), never nested under `(app)` — see `docs/schoolerp_techstack.md` §2.4 for why the permission shape makes that a correctness issue, not a style choice.

**Nav visibility is always derived, never a second permission implementation.** `lib/core/nav.ts` declares routes and the permission key each one needs — zero role/permission logic of its own. A nav group is visible if at least one of its items survives filtering against the caller's permission set from `fn_role_permissions`/`fn_has_permission` (the same functions RLS policies call). Never give a nav group its own separately-declared list of allowed roles — that is exactly how "what the nav shows" and "what the database allows" drift apart.

### Theming

Two layers: per-school branding (runtime, from the school record) and per-user dark mode (light/dark/system, stored against the user). See `docs/schoolerp_techstack.md` §7a.

- All theming goes through shadcn's CSS variables. **No hardcoded hex values in components.** No second styling system.
- School branding cannot live in `tailwind.config` — that's build time, one build serves every school. Config holds defaults; the school overrides a documented subset of custom properties at runtime.
- Every component must be checked in **both** light and dark mode before it's done.
- **Status colours are not themeable.** Present/absent/late, paid/due/overdue, approved/pending mean the same thing in every school. Never wire them to a school-overridable token.
- Brand colour ramps are derived and contrast-clamped to WCAG AA, validated on save.
- No flash of the wrong theme on load.

### Printable documents don't all share one design gallery

Fees receipts and Exam report cards are plain letterhead-style A4 documents — one shared palette
covers them: `apps/web/src/lib/core/pdf/documentTemplates.ts` (5 designs: 2 black & white, 3 with
a colored header band). Each school picks one default per document type, stored on that feature's
own settings row (`school_branding.receipt_template`, `report_card_settings.template`).

ID cards are deliberately **not** on that palette. A physical card is small and photo-centric, and
real school ID cards vary in actual layout — curved panels, diagonal ribbons, arched photo frames
— not just color; flattening that back down to "boxed/line/band" would lose the variety the
feature needs. ID cards have their own gallery instead: `apps/web/src/lib/idCards/idCardTemplates.ts`
(8 designs across 7 layout kinds), with `id_card_settings.student_template` / `staff_template`
picked independently — a school may want a playful design for students and a plainer one for
staff. Orientation (landscape/portrait) is a separate, orthogonal setting; every design supports
both.

Every printable-document feature has a paired HTML component (on-screen preview, and the settings
gallery's thumbnails) and a `@react-pdf/renderer` component (the actual download) that must render
identically — never let the two drift apart. `@react-pdf/renderer` clips overflowing content
silently (no scrolling, no auto-shrink) rather than erroring, so any layout with optional
show/hide fields must be verified with every field turned on, not just the happy path — a card
that looks fine with one or two fields can silently drop rows once all of them are enabled.

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

Hindi UI moved to `P4` (product decision, 2026-09-06 — see `docs/schoolerp_features.md` §6). The pilot school's staff are not English-first, so this still matters; it was deferred only because full coverage means touching every component built across P0-P2, not because it stopped mattering. Until then: write strings so they *can* be translated later — no concatenated sentence fragments, no text baked into images — even though the actual `t()`/`TranslationKey` wiring (`apps/web/src/lib/core/i18n.ts`) is deferred too and today only covers nav labels + auth strings.

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
- [ ] Money is integer paise, dates are stored UTC and displayed dd/mm/yyyy in IST via `dateIst.ts`
- [ ] Nothing school-specific is hard-coded

---

## When in doubt

- **Scope question** → check the phase tags in `docs/schoolerp_features.md`. Don't guess, and don't quietly expand.
- **School-specific behaviour** → make it configuration. If it truly can't be, flag it as a custom-quote item rather than building it into core.
- **Data model change** → check `docs/schoolerp_techstack.md` §3 first; entity names there are the reference.
- **An external API you can't verify** → stub it behind the adapter and say so.

Raise these rather than picking a direction silently. A wrong assumption in the isolation layer or the fee ledger is expensive to unwind later.
