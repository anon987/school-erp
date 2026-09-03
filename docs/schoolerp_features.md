# School ERP — Feature Specification

**Product:** TechAppDev School ERP
**Model:** Multi-school cloud SaaS for Indian schools and inter colleges
**Pilot school:** Shri Hansraj Career Inter College, Rampur, Jaunpur (2,200 students, 1 branch)
**Status:** Pre-build specification
**Last updated:** September 2026

---

## 0. How to read this document

This is the authoritative feature list for the product. It is derived from the pilot client's completed requirements form (they selected every module) plus the reusable product blueprint.

Two rules govern everything below:

1. **Build once, configure per school.** No school name, board, fee calendar, grading rule, or workflow is hard-coded. If a school needs something different, it must be a configuration row, not a code branch.
2. **Phase tags are binding.** A feature tagged `P3` does not get built during `P1`, even if it is easy. Scope discipline is what makes this shippable.

Phase tags: `P0` foundation · `P1` core MVP · `P2` academic + parent · `P3` operations · `P4` integrations + compliance · `P5` productization

---

## 1. School isolation and access model

### 1.1 School isolation

- Every school is a separate **school record**, identified by `school_id`. This is the isolation boundary.
- All business tables carry `school_id` and are protected by Postgres Row Level Security.
- A school owns: branding (logo, colours, display name), academic years, classes, sections, subjects, grading scales, fee heads, enabled modules, notification settings.
- Platform admins can provision and suspend schools without reading operational data by default. Any support impersonation is explicit, time-boxed, and written to the audit log.
- Multi-branch is modelled from day one (`campus_id` under `school_id`) even though the pilot has one branch. Retrofitting this later is expensive.

### 1.2 Roles

| Role | Scope | Phase |
|---|---|---|
| Super Admin | Platform-wide: school provisioning, plans, support | P0 |
| School Owner / Management | Whole school: KPIs, finance, approvals, reports | P1 |
| Principal / Head | Academic and operational oversight, approvals | P1 |
| School Admin | Students, staff, admissions, configuration, daily ops | P1 |
| Accountant | Fees, receipts, dues, expenses, financial reports | P1 |
| Teacher | Assigned classes/subjects: attendance, marks, homework | P1 |
| Class Teacher | Their class: profiles, attendance, parent communication | P1 |
| Parent / Guardian | Own children only | P2 |
| Student | Own academic information | P2 |
| Librarian | Books, issues, returns, fines | P3 |
| Transport Manager | Routes, vehicles, drivers, transport fees | P3 |
| HR / Payroll Admin | Staff records, salary, payroll | P3 |
| Inventory Manager | Stock, assets, purchases | P3 |
| Read-only Auditor | Reports and logs, no mutations | P3 |

**Permission rule:** navigation is permission-aware. A teacher never sees finance. A parent sees only linked children. Management sees a consolidated dashboard first, not a module list.

---

## 2. Module specification

### A. School Setup & Master Data — `P0`

- School profile: name, address, board/affiliation, contact persons
- Branding and appearance:
  - Logo upload, display name
  - Brand colour selection, from which the accent ramp is derived
  - Live preview before saving
  - Contrast is validated on save — a school cannot ship itself an unreadable interface
  - **Status colours are not themeable.** Present/absent/late, paid/due/overdue, approved/pending carry meaning and stay consistent across every school.
- Academics: academic years with open/closed state
- Classes, sections, subjects, streams, houses, student categories
- Grading scales and grade boundary rules (configurable per school)
- Fee heads and fee structures
- Holiday calendar
- Departments and designations
- Configurable custom fields on student and staff records

**Acceptance:** a new school can be created and fully configured through the UI with zero code changes, including its branding, and the result stays legible in both light and dark mode.

---

### A2. Appearance & user preferences — `P0`

Cross-cutting, applies to every screen in the product.

- **Dark mode toggle** per user: light / dark / follow system
- Preference persists across sessions and devices (stored against the user, not the browser)
- No flash of the wrong theme on load — the school's brand tokens and the user's mode preference both resolve before first paint
- Every school's brand colour must work in both modes; the dark variant is derived, not separately chosen
- Applies to the mobile apps as well (`P2`)

**Why this is `P0`:** theming touches every component. Adding a second token set after 18 modules exist means auditing every screen. It costs a few days now and weeks later.

---

### B. Student Information System — `P1`

- Admission number and roll number (format configurable per school)
- Student profile: name, DOB, gender, photo, category, blood group, address
- Guardian/parent details with multiple contacts and relationship type
- Documents: upload, categorise, preview (ID proofs, certificates, photos)
- Previous school details, transfer certificate data
- House, transport assignment, hostel assignment
- Status history: active, transferred, withdrawn, alumni
- Promotion history across academic years
- Searchable, filterable student directory with saved views
- Bulk import from Excel/CSV — see §5

---

### C. Admissions & Enquiries — `P2`

- Enquiry capture with source tracking
- Application workflow with configurable stages
- Document checklist per application
- Admission test / interview record
- Status pipeline view
- Admission confirmation → auto-creates student record + fee mapping + parent account
- Printable application and admission forms

---

### D. Staff & HR — `P1`

- Staff profile, photo, documents, qualifications
- Department, designation, joining date, service history
- Subject and class assignment
- Role assignment (drives permissions)
- Staff attendance
- Leave records
- Payroll linkage (payroll itself is `P3`)

---

### E. Attendance — `P1`

- Daily class-wise student attendance — **optimised for speed: one screen, one tap per student, submit**
- Present / absent / late / half-day / leave states (configurable)
- Staff attendance
- Period-wise attendance (optional per school, off by default)
- Monthly and student-wise summaries
- Low-attendance threshold rules with flagged list
- Parent alerts on absence — `P2` (needs messaging)
- Biometric device import — `P4`

**Design note:** a class teacher marking 60 students must be able to finish in under 30 seconds on a phone. Default all students present; teacher only taps exceptions.

---

### F. Fees — `P1`

- Fee structures by class and category
- One-time and recurring fee heads
- Installment plans
- Concessions, scholarships, sibling discounts
- Fines and late fees with configurable rules
- Fee collection: cash, cheque, UPI, online
- Receipt generation with configurable receipt format and serial numbering
- Dues and defaulters list
- Refunds and adjustments (never silent deletion — always an adjustment record)
- Fee collection dashboards: daily, monthly, class-wise
- UPI / payment gateway integration with auto-reconciliation — `P1` for collection recording, `P4` for full gateway callback reconciliation
- GST-ready receipt fields

**Financial integrity rule:** payment records are immutable. Corrections happen through adjustment or refund entries that reference the original transaction.

---

### G. Examinations & Results — `P1`

- Exam and term setup
- Subject-wise maximum marks, internal/external components
- Marks entry by subject teacher, with validation
- Grade and GPA calculation from configurable rules
- Ranks and positions (optional per school)
- Report card generation with configurable template
- Result approval workflow before publishing
- Result publishing to parent portal — `P2`
- Re-evaluation workflow — `P3`

---

### H. NEP 2020 & Compliance — `P2` / `P4`

| Feature | Phase | Note |
|---|---|---|
| Holistic Progress Card (academic + co-curricular + behavioural) | P2 | Report card template variant — build in-house, no external dependency |
| UDISE+ data fields and export | P4 | Export template only. Official API access must be validated per deployment. |
| APAAR ID field capture and mapping | P4 | Store and export. Do not promise live API sync until verified. |
| Teacher CPD hour tracking | P3 | Simple log against staff record |

**Commercial caution:** UDISE+ and APAAR are the two features most likely to be over-promised in a sales conversation. Both depend on official API availability, eligibility, and credentials that vary by institution. Sell them as **data preparation and export**, not as live government integration, until an actual integration has been tested end to end.

---

### I. Timetable — `P2`

- Class timetable builder
- Teacher timetable view
- Room and teacher conflict detection
- Substitution handling for absent teachers
- Holiday period handling
- Print and mobile views

---

### J. Homework & Assignments — `P2`

- Create and publish homework by class and subject
- Attachments
- Submission tracking
- Teacher review and remarks
- Parent and student visibility

---

### K. Communication — `P2`

- Notices, circulars, announcements
- Audience targeting: whole school, class, section, role, individual
- Channels: in-app, SMS, WhatsApp, email, push
- Scheduled messages
- Delivery status tracking
- Automated fee reminder campaigns — `P4`

**Provider abstraction is mandatory.** SMS and WhatsApp go through a provider interface. MSG91 and Gupshup are the initial implementations; swapping providers must not touch business logic.

---

### L. Parent & Student Portal — `P2`

Web portal and React Native mobile app share the same API.

- Attendance view
- Fee dues, payment history, online payment, receipt download
- Results and report card download
- Homework
- Timetable
- Notices and announcements
- Leave application
- Profile view, limited self-service updates with admin approval

**Access rule:** a parent account is linked to specific students. Server-side authorization must verify the link on every request, not just filter in the UI.

---

### M. Owner / Management Dashboard — `P1`

This is the module that sells the product. It gets first-class attention.

- Live student strength, class-wise breakdown
- Today's attendance percentage, staff attendance
- Fee collected today / this month, pending dues, defaulter count
- Admission pipeline (once `P2` lands)
- Expense and income overview (once `P3` lands)
- Trend charts: attendance, collection, admissions
- Alerts: low attendance, large pending dues, unapproved results
- Secure access from anywhere, mobile-friendly
- Downloadable management reports
- Branch comparison view — `P3`

---

### N. Accounts & Expenses — `P3`

- Expense entry and categorisation
- Vendors and bills
- Payment records
- Cash and bank overview
- Approval workflow
- Income vs expense reports

Full double-entry accounting is explicitly **out of scope**. If a school needs it, they keep Tally and we provide export.

---

### O. Payroll — `P3`

- Salary structures with allowances and deductions
- Attendance linkage
- Monthly payroll run
- Payslip generation
- Payroll summary reports

Statutory compliance (PF, ESI, TDS) is **not** included by default. It varies by institution and requires their accountant's input. Quote separately if asked.

---

### P. Transport — `P3`

- Vehicles, drivers, attendants
- Routes and stops
- Student-to-route assignment
- Transport fee linkage to the fee module
- Vehicle document expiry reminders
- GPS live tracking — `P4`, via provider adapter, never hard-coded to one vendor

---

### Q. Library — `P3`

- Catalogue: books, authors, publishers, copies
- Issue and return
- Reservations
- Overdue tracking and fines
- Member borrowing history
- Barcode / QR support (optional)

---

### R. Hostel — `P3`

- Buildings, rooms, beds
- Student allocation and occupancy
- Hostel fee linkage
- Roll call / attendance
- Warden assignment and incident notes

---

### S. Inventory & Assets — `P3`

- Items, categories, vendors
- Purchases and stock
- Issue and return
- Locations and asset tags
- Low-stock alerts
- Consumption reports

---

### T. Reporting & Analytics — `P1` baseline, `P4` advanced

**P1 baseline reports:**
Student master · class strength · daily attendance · monthly attendance · low attendance · staff attendance · fee collection (daily/monthly) · pending and defaulters · concessions · exam marks · result summary · report cards

**P3 additions:**
Payroll summary · expense summary · income vs expense · library overdues · inventory stock · transport roster · hostel occupancy

**P4 advanced:**
Cross-module analytics (attendance vs performance, fee trends) · custom report builder · scheduled exports

All reports export to PDF, Excel, and CSV. All reports are role-restricted.

---

### U. Audit, Security & Administration — `P0` / `P1`

- Login history
- Audit log of create/update/delete/approve/publish on sensitive modules
- Role management
- Password policy, session expiry
- Optional OTP/MFA for management roles — `P4`
- Backup configuration and documented restore procedure
- School settings
- API and webhook settings — `P5`

---

## 3. Must-have workflows

These are the flows that must work end to end before the pilot goes live.

| Workflow | Sequence |
|---|---|
| New admission | Enquiry → application → documents → review → approval → student ID → class/section → fee assignment → parent account |
| Daily attendance | Teacher login → assigned class → mark exceptions → submit → dashboard updates → optional parent alert |
| Fee collection | Select student → show dues → collect (cash/UPI/online) → receipt → ledger update → dashboard |
| Online fee payment | Parent → due list → gateway → success/failure callback → receipt → reconciliation status |
| Exam result | Create exam → assign subjects → teacher marks entry → validation → approval → report card → publish |
| Staff onboarding | Create employee → documents → designation → role → attendance/payroll mapping → active |
| Remote management | Owner login → dashboard → drill into attendance/finance/admissions/staff → export |
| Year-end promotion | Freeze year → review results → promote by rule → new class/section mapping → carry forward fee and profile settings |
| Data import | Download template → validate → preview errors → import → audit summary |

---

## 4. Configure vs build vs custom

| Category | Rule |
|---|---|
| **Configure** | Branding, academic year, classes, fee heads, grading rules, roles, report filters, notification templates |
| **Feature flag** | New module features useful to more than one school |
| **Custom quote** | A workflow, report, or integration unique to one school |
| **Never** | Hard-coding a school name, branch structure, board, fee calendar, or workflow into core |

---

## 5. Data import requirements

The pilot school runs on manual registers and Excel. Import is not a side feature — it is the highest-risk part of onboarding.

**Rules:**
- Never import directly into production tables. Staging → validation → mapping → preview → approval → commit.
- Provide standard Excel/CSV templates per entity (students, guardians, staff, fee structures, opening dues).
- Validate: duplicates, invalid phone/email, missing mandatory fields, invalid class/section references, date format errors.
- Keep rejected rows with a reason column so the school can fix and re-upload.
- Support dry-run imports.
- Generate an import summary: created / updated / rejected counts.
- Every import writes an audit record and is reversible within a defined window.

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Attendance and fee screens must be usable on a low-end Android phone over 4G. Dashboard first paint under 3s on typical school connectivity. |
| Scale | Several thousand students per school, many schools, without architectural redesign |
| Security | TLS, RLS school isolation, server-side authorization on every request, audit logs |
| Backups | Automated daily backups, tested restore procedure, documented retention |
| Privacy | Minimise collected data, role-restrict student records, defined retention policy |
| Localisation | INR, Indian date formats, Indian phone formats. **Hindi UI is a P2 requirement, not optional** — the pilot school's staff are not English-first. |
| Accessibility | Readable contrast, labelled inputs, responsive down to 360px |
| Observability | Error monitoring, structured logs, integration failure alerts |

---

## 7. MVP acceptance criteria

The pilot is not live until all of these pass:

- [ ] A new school can be created and configured without code changes
- [ ] Admin can set up academic year, classes, sections, subjects, fee heads, and roles
- [ ] 2,200 students and all staff imported from Excel with a validation report and under 2% rejected rows
- [ ] A teacher can mark a full class's attendance on a phone in under 30 seconds
- [ ] Accountant can create dues, collect payment, generate a receipt, and see it reflected on the dashboard
- [ ] Exam marks can be entered, approved, and a report card generated matching the school's existing format
- [ ] Management dashboard shows accurate live KPIs derived from stored transactions
- [ ] A parent account can access only its linked students, verified server-side
- [ ] All sensitive mutations appear in the audit log
- [ ] Backup and restore has been tested at least once against real data volume
- [ ] Five school staff members can complete their daily tasks after one training session without assistance

The last criterion is the one that actually determines whether the pilot succeeds.

---

## 8. Explicitly out of scope

Recording these prevents them from creeping in:

- Double-entry accounting / Tally replacement
- Statutory payroll compliance (PF, ESI, TDS filing)
- Learning management, online classes, content delivery
- Live government API sync (UDISE+/APAAR) until verified per deployment
- Custom board-specific report card formats beyond template configuration
- Biometric hardware supply (integration only, school procures the device)
- GPS hardware supply (integration only)
