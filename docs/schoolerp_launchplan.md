# School ERP — Build & Launch Plan

**Pilot:** Shri Hansraj Career Inter College, Rampur, Jaunpur
**Team:** solo developer with Claude Code
**Last updated:** September 2026

---

## 1. Strategy

The pilot school is both a paying customer and the forcing function for the product. Everything built for them must be built as product, not as a custom job. But the pilot's go-live date is what sets priority — a feature the pilot doesn't need in the first term does not get built in `P1`, regardless of how good it would look in a demo.

**Sequencing principle:** get the pilot to a paid, live, daily-use state as fast as possible. Everything else follows revenue.

---

## 2. Phase plan

| Phase | Scope | Duration | Outcome |
|---|---|---|---|
| P0 | Foundation: school isolation, auth, roles, school setup, import pipeline | 3 weeks | A new school can be created and configured |
| P1 | Core ERP: students, staff, attendance, fees, exams, dashboard, reports | 9 weeks | **Pilot goes live** |
| P2 | Academic + parent: portal, mobile app, timetable, homework, communication, HPC, Hindi UI | 7 weeks | Parents onboarded |
| P3 | Operations: payroll, accounts, transport, library, hostel, inventory | 7 weeks | Full module coverage |
| P4 | Integrations: payment reconciliation, WhatsApp automation, biometric, GPS, UDISE+/APAAR export, analytics | 6 weeks | Integration-complete |
| P5 | Productization: self-serve onboarding, billing, feature flags, support console | 5 weeks | Sellable without manual setup |

**Total to full product: roughly 37 weeks (~8.5 months).**
**Time to pilot live: roughly 12 weeks (~3 months).**

These are working estimates for focused solo development. Add buffer for client meetings, support, and the other TechAppDev commitments.

---

## 3. Phase detail

### P0 — Foundation (3 weeks)

**Week 1**
- Repo scaffold, monorepo setup, CI
- Supabase project, migration workflow, generated types
- `CLAUDE.md` with working rules
- Next.js App Router patterns established: auth, layouts, server actions

**Week 2**
- School isolation model: `school`, `campus`, RLS policy pattern applied and tested
- Auth: login, JWT claims with `school_id` and role
- Role and permission model, permission-aware navigation shell

**Week 3**
- School setup module: academic year, classes, sections, subjects, grading scales, fee heads
- Import pipeline skeleton: staging tables, validation framework, preview, commit, audit
- School provisioning flow (admin-driven, not self-serve yet)

**Exit criteria:** a new school can be created and fully configured through the UI, with RLS verified by an explicit cross-school access test.

---

### P1 — Core ERP (9 weeks) → **Pilot go-live**

**Weeks 4–5 — Students & Staff**
- Student CRUD, profile, guardians, documents, photo
- Student directory with search, filters, saved views
- Staff CRUD, departments, designations, subject assignment
- Excel import for students, guardians, staff with validation reporting
- `/settings/members` role management UI — the school must be able to assign roles to its own staff (pilot: ~60 people) without SQL access. Depends on `apps/worker` gaining an HTTP entry point (see `CLAUDE.md` § Architecture rules); currently a placeholder page. Blocks pilot onboarding — do not let this slip to a later phase.
- Import fix-and-reupload loop — **one ticket, not three**: column mapping, value-specific rejection errors, and an uncapped rejected-rows CSV export. The pilot's real Students/Staff files come off paper registers and Excel and will not match our template headers (no mapping step exists yet: uploaded column names are used verbatim as field keys, so every row in a real file fails). Rejection reasons today are generic categories ("Unknown class/section for this school"), not value-specific, and there is no way to export rejected rows for the school to fix in Excel and re-upload. All three are required together — mapping without an actionable, exportable rejection report doesn't close the loop Stage 2 (below) depends on. Same tier as `/settings/members` above — blocks pilot onboarding, do not let this slip to a later phase.

**Weeks 6–7 — Attendance**
- Class-wise daily attendance, mobile-optimised
- Staff attendance
- Attendance reports: daily, monthly, student-wise
- Low-attendance rules and flagged list

**Weeks 8–10 — Fees**
- Fee heads, structures, class/category assignment
- Concessions, fines, installments
- Collection screen, receipt generation, configurable receipt format
- Dues, defaulters, adjustments, refunds
- Fee reports and collection dashboard
- Razorpay order creation and payment recording (full reconciliation lands in `P4`)

**Weeks 11–12 — Exams & Dashboard**
- Exam setup, marks entry, validation
- Grade rules, report card generation matching the school's existing format
- Result approval workflow
- Management dashboard: strength, attendance, collection, dues, alerts, trends
- Baseline report pack with PDF/Excel export
- Audit log surfaced in UI
- Login history and password policy/session expiry (`docs/schoolerp_features.md` §U, tagged P0/P1 but not yet built — sign-in does not currently write a login-history record, and there is no configurable password policy or session expiry anywhere in the codebase). Small scope, not a pilot-onboarding blocker like the three above — folded in here rather than tracked separately so it doesn't slip unnoticed.

**Exit criteria:** every item in the MVP acceptance checklist in `schoolerp_features.md` §7 passes.

---

### P2 — Academic & Parent (7 weeks)

- Parent/student web portal
- React Native app (parent/student), push notifications
- Teacher mobile attendance and marks entry
- Timetable builder, teacher view, substitutions
- Homework and submission tracking
- Communication: notices, targeting, SMS and WhatsApp sends, delivery status
- Holistic Progress Card template
- Admissions and enquiry pipeline
- **Hindi UI** — not optional; pilot staff are not English-first

---

### P3 — Operations (7 weeks)

Payroll · accounts and expenses · library · transport · hostel · inventory · extended report pack · re-evaluation workflow · teacher CPD log

---

### P4 — Integrations & Compliance (6 weeks)

- Full payment webhook reconciliation with daily mismatch job
- Automated fee reminder campaigns over WhatsApp
- Biometric device import and reconciliation
- GPS provider adapter and live vehicle view
- UDISE+ and APAAR data fields and export templates
- Cross-module analytics and custom report builder
- Optional MFA for management roles

---

### P5 — Productization (5 weeks)

- Self-serve school provisioning
- Subscription and billing controls, plan enforcement
- Per-school feature flags driven by plan
- Support console with audited impersonation
- Usage analytics, onboarding automation
- Knowledge base and in-app help
- Per-school logical export/restore. Standard Postgres/PITR restore is whole-project — every school on the instance rolls back together (see `docs/schoolerp_techstack.md` §6a). At single-pilot scale that's an accepted operational limitation, but it does not survive multiple schools sharing an instance: one school's data incident cannot require rolling back every other school's data. Requirement, not a nicety, once there's more than one paying school.

---

## 4. Pilot onboarding plan

This runs in parallel with `P1` development and is the highest-risk workstream. The school has no existing software — every record is on paper or in Excel.

### Stage 1 — Discovery (during P0, week 2–3)

Collect from the school:
- Current data: student registers, Excel sheets, staff records, fee registers
- Fee structure: heads, class-wise amounts, concessions, fine rules, installment schedule
- Existing receipt format and serial numbering convention
- Report card samples and grading rules
- Class and section structure, subject allocation
- **Do classes 11 and 12 split cleanly into separate streams (Science/Commerce/Arts), or does a single class contain mixed-stream students?** This decides whether "stream" can stay a naming convention on `class` (e.g. "XI Science") — see `docs/schoolerp_features.md` §A — or needs to become a first-class concept before Exams. Ask explicitly; don't assume clean splitting.
- Staff list with roles and which classes they teach
- Parent contact data quality — **check this early**, it determines whether `P2` messaging is viable
- Biometric device model, if already purchased
- GPS vendor, if already contracted

### Stage 2 — Data preparation (P1 weeks 4–8)

- Map their columns to import templates
- Run dry-run imports, share the rejection report with the school
- School fixes their data; repeat until rejection rate is under 2%
- Historical dues: decide a cut-off date. Do not migrate years of fee history — migrate opening balances only.

**Expect 3–4 rounds of cleanup.** Data from manual registers is never clean on the first pass.

### Stage 3 — Configuration (P1 weeks 9–11)

- School setup, branding, academic year
- Fee structure configured and verified against their register for a sample of 20 students
- Report card template matched to their existing format
- User accounts and role assignment for all staff

### Stage 4 — Training (P1 week 12, on-site)

This is what justifies the price and what remote competitors cannot do.

| Session | Audience | Duration |
|---|---|---|
| 1 | Admin + accountant: students, fees, receipts, reports | Half day |
| 2 | Teachers: attendance and marks entry, on their own phones | 2 hours × 2 batches |
| 3 | Management: dashboard, reports, remote access | 1 hour |

Leave behind: one-page role-specific quick guides in Hindi, a WhatsApp support number, and a named contact.

### Stage 5 — Parallel run (2–4 weeks after go-live)

The school keeps their registers running alongside the system. Reconcile weekly. Only after two clean weeks does the paper stop.

**Do not skip this.** A school that loses fee data in week one will never trust the product again, and the reference is worth more than the contract.

---

## 5. Go-live checklist

- [ ] All MVP acceptance criteria pass
- [ ] Student and staff import complete, verified against school records
- [ ] Fee structure verified against their register for a sample of students
- [ ] Opening dues reconciled and signed off by the accountant
- [ ] Report card output matched to their existing format and approved
- [ ] All staff accounts created with correct roles
- [ ] Training delivered, quick guides handed over
- [ ] Backup and restore tested against real data volume
- [ ] Storage files (student/staff documents and photos) have their own backup path — a Postgres backup/PITR does not cover Supabase Storage (see `docs/schoolerp_techstack.md` §6a)
- [ ] Support channel live with a documented response commitment
- [ ] Parallel run schedule agreed in writing

---

## 6. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| **Client expects everything at once** | High | Phase plan agreed in writing before the contract is signed. Selecting every feature on the form is not a delivery commitment. |
| **Demo requested before payment** | High | Show a `P1` prototype only. Never build the full system unpaid. |
| **Dirty source data** | High | Budget 3–4 cleanup rounds. Rejection report is the school's responsibility to fix, not yours. |
| **Staff resistance to software** | High | On-site training, Hindi UI, parallel run. This kills more school ERP deployments than bugs do. |
| **Bad parent phone data** | Medium | Audit during discovery. If contact quality is poor, `P2` messaging value drops and expectations must be reset early. |
| **UDISE+/APAAR over-promised** | Medium | Sell as data export, not live API sync, until an integration is actually tested. |
| **Next.js App Router learning curve** | Medium | Front-load in `P0`. Auth and data-access mistakes are expensive later. |
| **Scope creep from pipeline clients** | Medium | Every request is measured against the product roadmap. School-specific work is quoted separately. |
| **Solo bandwidth vs other commitments** | High | This is an 8-month build. It cannot run alongside another full build. Sequence honestly. |

---

## 7. What must be agreed with the client before starting

1. **Phased delivery, in writing.** Which modules land in which phase, with target dates.
2. **Payment schedule tied to phases**, not to final delivery.
3. **Onboarding fee** and what it covers (data migration, configuration, on-site training).
4. **Third-party costs are pass-through** — SMS, WhatsApp, GPS subscription, payment gateway fees, biometric hardware.
5. **Data responsibility** — the school supplies data in the provided templates and fixes rejected rows.
6. **Support terms** — channel, hours, response expectations.
7. **What is out of scope** (see `schoolerp_features.md` §8), acknowledged explicitly.

Getting these in writing before a line of code is written is what separates a profitable pilot from a nine-month unpaid custom build.
