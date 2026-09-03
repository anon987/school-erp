# School ERP — Tech Stack & Architecture

**Project:** TechAppDev School ERP (multi-school SaaS)
**Last updated:** September 2026

---

## 1. Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Web app | Next.js (App Router) + TypeScript | Server components reduce client JS on low-end Android; one codebase for marketing site, admin, and portal |
| UI | Tailwind CSS + shadcn/ui | Fast, consistent, no design system to maintain from scratch |
| Database | Supabase Postgres | Relational is correct for this domain; RLS gives school isolation at the database layer |
| Auth | Supabase Auth | Email/phone + OTP, JWT carries `school_id` and role |
| File storage | Supabase Storage | Private buckets, signed URLs for documents and photos |
| Background jobs | Node.js worker service | Report generation, bulk imports, scheduled messaging, payment reconciliation |
| Mobile | React Native (Expo) | Parent/student app and teacher app; existing team strength |
| Push | Expo Notifications / FCM | |
| Payments | Razorpay | UPI, cards, netbanking; webhook-based reconciliation |
| SMS | MSG91 | Account already KYC-verified |
| WhatsApp | Gupshup (BSP) | ISV partner application already submitted |
| Hosting | Vercel (web) + Supabase (data) + Railway or Fly.io (worker) | |
| Monitoring | Sentry + Supabase logs | |

### Stack risk note

Next.js + Supabase is a deliberate change from the usual React Native + Firebase workflow. Supabase experience already exists, which removes most of the risk. The remaining unknown is Next.js App Router patterns — server components, server actions, and route handlers. Budget the first two weeks of `P0` for getting these patterns right, because mistakes made in the auth and data-access layer are expensive to unwind later.

---

## 2. Multi-school architecture (multi-tenant pattern)

### 2.1 The core rule

**Every business table has `school_id`. Every query is filtered by RLS. There are no exceptions.**

A missing `school_id` filter is a data breach across schools. This is the single highest-severity class of bug in this product.

### 2.2 How isolation is enforced

- `school_id` is written into the user's JWT claims at login.
- Every table has an RLS policy comparing `school_id` to the JWT claim.
- The service-role key is used **only** in the worker service and never exposed to the client.
- Platform admin access is a separate role with explicit, audited impersonation — not a bypass flag.

```sql
-- Pattern applied to every school-scoped table
alter table students enable row level security;

create policy school_isolation on students
  for all
  using (school_id = (auth.jwt() ->> 'school_id')::uuid);
```

### 2.3 Branch/campus

`campus_id` exists from day one under `school_id`, even though the pilot has one branch. Single-branch schools get a default campus that the UI hides. Adding this later would mean a migration across every table.

### 2.4 Staff/admin surface vs. parent/student portal are separate route boundaries

Both live in the same Next.js app (`apps/web`, per §4 — one deployable, not two), but they are **not** the same route group and the portal is never nested inside the staff/admin shell.

**Why:** the permission shape is fundamentally different, not just the nav. Every staff-facing role (owner, admin, accountant, teacher, ...) is scoped by `school_id` via the isolation layer (§2.1–§2.2) — a teacher can see many students, gated by role/permission. A parent or student is scoped by an *individual relationship* on top of that — `student_guardian` for a parent, self for a student — verified server-side on every request (CLAUDE.md: "Parent access must verify the `student_guardian` link server-side on every request, not filter client-side"). Folding the portal into the same `(app)` route group and layout would make it easy to accidentally reuse a permission check built for "any staff member with `school.manage_students`" in a context that actually requires "only this specific parent's own children" — a real cross-account data exposure risk, not a cosmetic one.

**Concretely:** the staff/admin shell is the `(app)` route group (role-aware nav, built in P0). The parent/student portal (`docs/schoolerp_features.md` §L, `P2`) gets its own top-level route group — `(portal)` — as a sibling to `(app)`, with its own layout, its own nav, and its own server-side authorization helpers that check the guardian/self relationship, not school-level role permissions. Nothing to build yet; this just fixes where it goes when P2 starts, so it isn't nested under `(app)` by default.

---

## 3. Data model — core entities

Grouped by domain. This is the entity list, not the full schema; column-level design happens per module.

**Platform & schools**
`school` · `campus` · `subscription_plan` · `school_module_flag`

**Identity & access**
`user` · `role` · `permission` · `role_permission` · `user_role` · `audit_log` · `login_history`

**Academic structure**
`academic_year` · `class` · `section` · `subject` · `class_subject` · `grading_scale` · `grade_band` · `holiday`

**People**
`student` · `guardian` · `student_guardian` · `enrollment` · `staff` · `department` · `designation` · `staff_subject`

**Admissions**
`enquiry` · `application` · `application_document` · `application_stage_event`

**Attendance**
`attendance_session` · `attendance_record` · `staff_attendance` · `biometric_event` (raw device events, kept separate from finalised attendance)

**Fees & finance**
`fee_head` · `fee_structure` · `fee_structure_item` · `student_fee_assignment` · `invoice` · `invoice_line` · `payment` · `payment_adjustment` · `concession` · `fine` · `expense` · `expense_category` · `vendor`

**Examinations**
`exam` · `exam_subject` · `assessment_component` · `mark` · `report_card` · `report_card_template`

**Academics & communication**
`timetable_slot` · `substitution` · `homework` · `homework_submission` · `notice` · `notice_audience` · `notification` · `notification_delivery`

**Operations**
`payroll_structure` · `payroll_run` · `payslip` · `book` · `book_copy` · `issue_transaction` · `vehicle` · `route` · `stop` · `student_route` · `hostel_room` · `hostel_allocation` · `inventory_item` · `stock_transaction`

**Import**
`import_batch` · `import_row` (staging, with status and rejection reason)

---

## 4. Repository structure

Monorepo, so shared types stay in sync between web, worker, and mobile.

```
schoolerp/
├── apps/
│   ├── web/                    # Next.js — admin, teacher, management, parent web
│   ├── worker/                 # Node.js — jobs, webhooks, reconciliation, imports
│   └── mobile/                 # React Native (Expo) — parent/student + teacher
├── packages/
│   ├── db/                     # Supabase migrations, RLS policies, seed data
│   ├── types/                  # Shared TypeScript types generated from DB schema
│   ├── ui/                     # Web-only components + design tokens (apps/web). Not consumable
│   │                            # by apps/mobile (React Native) -- only token values and pure
│   │                            # derivation logic are portable there, not the components.
│   └── integrations/           # Provider adapters (payments, sms, whatsapp, gps, biometric)
├── docs/
│   ├── schoolerp_features.md
│   ├── schoolerp_techstack.md
│   ├── schoolerp_launchplan.md
│   └── schoolerp_commerce_roadmap.md
├── CLAUDE.md                   # Working rules for Claude Code — read first every session
└── README.md
```

---

## 5. Integration layer

Every external service goes behind an adapter interface in `packages/integrations`. Business logic never imports a vendor SDK directly.

```
integrations/
├── payments/     PaymentProvider    → RazorpayProvider
├── messaging/    MessageProvider    → Msg91Provider, GupshupProvider
├── gps/          GpsProvider        → (vendor TBD per school)
└── biometric/    BiometricProvider  → (device-specific importers)
```

**Why this matters commercially:** schools arrive with vendors already chosen. A school that already has a GPS contract or a biometric device must be servable without a code fork.

### Payment flow

1. Create Razorpay order server-side, store `order_id` against the invoice
2. Client completes payment
3. Razorpay webhook hits the worker service
4. **Verify webhook signature** before trusting anything
5. Record payment, generate receipt, update dues
6. Reconciliation job flags mismatches daily

Never mark an invoice paid from a client-side success callback alone.

### Messaging

- All sends go through a queue in the worker service, never inline in a request
- Every send writes a `notification_delivery` row with provider, status, and cost
- Message credits are metered per school for billing pass-through

### Biometric

Raw device events land in `biometric_event`. A separate job reconciles them into `attendance_record`. Keeping raw events separate means a device misconfiguration never corrupts finalised attendance.

---

## 6. Security requirements

| Control | Implementation |
|---|---|
| Authentication | Supabase Auth, email/phone, OTP for management roles |
| Authorization | RLS + explicit server-side role checks + object-level ownership checks |
| Parent access | Verify `student_guardian` link server-side on every request |
| Financial integrity | Payments immutable; corrections via adjustment records only |
| File security | Private buckets, signed URLs with short expiry, MIME and size validation |
| API security | Rate limiting, webhook signature verification, input validation with Zod |
| Audit | Create/update/delete/approve/publish logged for students, fees, marks, payroll |
| Secrets | Service-role key never leaves the worker; no secrets in the mobile bundle |

---

## 7. Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # worker only

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Messaging
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
GUPSHUP_API_KEY=
GUPSHUP_APP_NAME=

# App
NEXT_PUBLIC_APP_URL=
SENTRY_DSN=
```

---

## 7a. Theming architecture

Two independent layers that must compose cleanly.

### Layer 1 — Per-school branding

Each school customises logo, display name, and a brand colour. Stored on the `school` record (or a `school_branding` table) and applied **at runtime**.

**Why it can't live in `tailwind.config`:** that resolves at build time, and one build serves every school. The config defines defaults; the school overrides a documented subset of CSS custom properties injected on the root element server-side.

```
tailwind.config          → default token values
globals.css              → full light + dark token sets (shadcn CSS variables)
school record            → overrides for a documented subset only
root element (SSR)       → injected custom properties, per request
```

### Layer 2 — User dark mode

Light / dark / system, stored against the **user**, not the browser, so it follows them across devices. Uses shadcn's `.dark` class convention.

### Rules

- Every school has both a light and a dark token set. The dark variant is **derived** from the brand colour, not separately chosen — schools will not maintain two palettes correctly.
- **Themeable:** logo, display name, brand/primary colour and its derived accent ramp.
- **Not themeable:** status colours (present/absent/late, paid/due/overdue, approved/pending), type scale, spacing scale, component structure. Status colours carry meaning; a school theming them into illegibility is a data-comprehension risk, not a cosmetic one.
- No free-form palette picker. One brand hue in, a validated ramp out, clamped so text on brand surfaces clears **WCAG AA** in both modes. If a chosen colour can't meet contrast, adjust it and tell the school what changed.
- Contrast is validated **on save**, not on render.
- **No flash of unstyled or wrongly-themed content.** School tokens and user mode preference both resolve before first paint.
- Mobile apps consume the same token set (`P2`).

---

## 8. Conventions

- **TypeScript strict mode on.** No `any` in committed code.
- **Zod schemas** for every API input and every import row.
- **Database types generated** from the schema; never hand-written.
- **Migrations only** — no manual schema edits in the Supabase dashboard.
- **Money in paise as integers.** Never floats for currency.
- **All timestamps UTC** in the database, rendered in IST.
- **Server-side authorization on every mutation.** UI-level hiding is presentation, not security.
- **Feature flags** per school control module visibility (`school_module_flag`).

---

## 9. Working rules for Claude Code

These go in `CLAUDE.md` at the repo root.

1. Read `docs/schoolerp_features.md` before implementing any module. Respect the phase tags — do not build `P3` features during `P1`.
2. Every new table needs `school_id`, an RLS policy, and a migration file. A table without RLS is a bug.
3. Never write a query that could return rows from another school. When in doubt, check the policy.
4. External services go behind an adapter in `packages/integrations`. No vendor SDK imports in feature code.
5. Currency is integer paise. Dates are UTC in the database.
6. Payment records are immutable. Corrections are adjustment rows.
7. Imports go through the staging tables. Never write directly to production tables from an import.
8. Before adding a school-specific behaviour, ask whether it should be configuration instead. Almost always it should be.
9. Attendance and fee collection screens are the highest-traffic surfaces. Optimise them for a low-end Android phone.
10. When a feature depends on an unverified external API (UDISE+, APAAR, a GPS vendor), build the data model and export path, and stub the integration behind the adapter.

---

## 10. Open technical decisions

| Question | Status |
|---|---|
| Hindi localisation approach (i18n library vs DB-stored strings) | Decide before `P2` |
| Report card PDF generation (server-side React → PDF vs template engine) | Decide during `P1` |
| Worker hosting (Railway vs Fly.io vs Supabase Edge Functions) | Decide during `P0` |
| Mobile: single app with role switching vs separate parent and teacher apps | Decide before `P2` |
| Biometric device model at pilot school | Ask client — determines importer |
| GPS vendor at pilot school | Ask client — determines adapter |
