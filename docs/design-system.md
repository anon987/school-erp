# Design system

Palette, type scale, elevation, iconography, and component behaviour for the School ERP web
app. Read this before building or restyling any screen — CLAUDE.md requires every color to go
through these tokens, with no hardcoded hex values and no parallel styling system.

Source of truth: `apps/web/src/app/globals.css` (token values), `apps/web/tailwind.config.ts`
(Tailwind mapping), `packages/ui/src/theme/` (brand-color derivation math), `lucide-react`
(icon set, see Foundations §Icons).

**How to read this document.** Earlier versions of this spec were mostly prohibitions —
density over decoration, color is functional not decorative, not a grid of rounded cards, high
contrast. Each of those is still true (see Constraints at the end) and none of them are
reversed here. But a list of "don't"s doesn't tell anyone what to actually build, and applied
literally it produced bare, unstyled-looking screens — restraint and emptiness got confused for
the same thing. This revision specifies what *to* do: a real icon system, a real elevation
model, concrete type and spacing rules, and full behavior specs for tables, detail pages, and
navigation. Restraint still means no gradients, no decorative shadows, no animation for its own
sake — it does not mean no icons, no hierarchy, no visual structure.

---

## Foundations

### Icons

**Icon set: [lucide-react](https://lucide.dev).** One set, everywhere, no exceptions. It pairs
with shadcn/ui (the component approach this stack already uses), is tree-shakeable (only the
icons a screen actually imports ship to that screen — matters on low-end Android/4G), and its
line-icon style matches a dense data product better than filled/glyph icons would.

This replaces the ad hoc Unicode glyphs (`✓ ✕ ! ●`) `StatusBadge` used as a stopgap — those
become `lucide` icons too, at the sizes below, so there is exactly one icon language in the
product, not two.

| Context | Size | Notes |
|---|---|---|
| Sidebar nav item | 20px (`h-5 w-5`) | Leading icon, before the label |
| Button (leading/trailing icon) | 16px (`h-4 w-4`) | Never the only content of a button unless it's an icon-only button (row actions, sidebar collapse) |
| Icon-only button (row actions `⋮`, panel collapse) | 16px (`h-4 w-4`), 32px tap target | The icon is small; the clickable area is not — 32px minimum for touch |
| Status badge glyph | 14px (`h-3.5 w-3.5`) | Inside the badge, before the label — see Status colors below |
| Empty state | 32px (`h-8 w-8`) | `text-muted-foreground`, centered above the message |
| Breadcrumb separator | 14px (`h-3.5 w-3.5`) | `ChevronRight` |
| Sort indicator | 14px (`h-3.5 w-3.5`) | `ChevronUp` / `ChevronDown` / `ChevronsUpDown` (unsorted) |

Stroke width: lucide's default (`1.75`–`2`) at every size above. Don't mix stroke weights.

Icons never carry meaning alone — every icon that isn't purely decorative (nav items,
status badges, empty states) ships with adjacent or `aria-label` text. This was already the rule
for `StatusBadge` (Accessibility floor, below); it now applies product-wide.

**Mobile portability.** `lucide-react` is a React DOM package — it cannot be imported into
`apps/mobile` (React Native), for the same reason no other `apps/web` component can (see
`packages/ui`'s web-only boundary, `docs/schoolerp_techstack.md` §4). This does not block the
mobile app: lucide publishes `lucide-react-native`, a separate package with the **same icon
names** rendered via `react-native-svg` instead of DOM SVG. What's portable between web and
mobile is the *choice of icon set and vocabulary* (a nav item is always `LayoutDashboard`, a
delete action is always `Trash2`, on both platforms), not the component code — exactly the same
web/mobile split this codebase already draws for design tokens ("token values and pure
derivation logic are portable, never the components themselves"). When `apps/mobile` needs
icons, it takes a dependency on `lucide-react-native` directly; it does not and should not try to
reuse anything from `apps/web` or `packages/ui` for this.

### Elevation and separation

Four levels, using tokens that already exist (`background`, `card`, `secondary`, `popover`) —
this is a rule about using them *consistently*, not new tokens:

| Level | Token | Border | Shadow | Used for |
|---|---|---|---|---|
| 0 — page | `bg-background` | none | none | The page itself, behind everything |
| 1 — panel | `bg-card` | `border border-border` | `shadow-sm` | Filter bars, table containers, form sections, the left rail on detail pages |
| 2 — table header | `bg-secondary` | bottom `border-border` | none | The header row inside a Level 1 table container — one step darker than the body so it reads as a cap, not another row |
| 3 — floating | `bg-popover` | `border border-border` | `shadow-md` | Dropdown/overflow menus, the row-actions menu, any element that overlaps other content |

Rules:
- Every distinct region of a page (a filter bar, a table, a card of fields) is Level 1 at
  minimum. A page with only Level 0 content is the flat, undifferentiated look this revision is
  fixing — if you can't tell where one region ends and another begins, it's missing its `bg-card`
  + `border` + `shadow-sm`.
- `shadow-sm` and `shadow-md` are the *only* two shadow values used anywhere in the product.
  Never `shadow-lg`/`shadow-xl`, never a shadow on something that isn't floating or a Level 1
  container, never a shadow for decoration. This is what "no drop shadows everywhere" means in
  practice — not zero shadows, exactly two, used for a specific structural reason each time.
- No gradients, anywhere, on any surface.

### Spacing and density

Tailwind's default 4px-based scale, unmodified (already the case — restated here because density
now has concrete numbers, not just a scale reference):

| Purpose | Value | Class |
|---|---|---|
| Gap between major page sections (filter bar → table, left rail → tabs) | 24px | `gap-6` |
| Gap within a section (form fields, a card's internal stack) | 12–16px | `gap-3` / `gap-4` |
| Table cell horizontal padding | 12px | `px-3` |
| Table row height, comfortable | 44px | `py-2.5` on a `text-sm` cell |
| Table row height, **compact (default)** | 36px | `py-1.5` on a `text-sm` cell |
| Icon-to-label gap | 8px | `gap-2` |

Density is a **per-page user choice** (see Tables → per-page selector), not a fixed global
setting, but the default is deliberately **compact, not comfortable**:

- The directories this applies to first (Students, Staff) exist to scan and search a large
  roster — 2,000 students at 44px/row shows roughly 15 rows on a 1080p screen; at 36px it's
  closer to 19. Neither number makes pagination disappear (that's what the per-page selector is
  for), but the default should not make the common case — scanning, not tapping — worse than it
  has to be.
- The touch-target concern comfortable was solving for is real, but it applies to *repeated
  rapid taps in sequence* (attendance marking, §E) — a different screen with its own density
  needs, not this one. A directory row's tap target is the full-width row (padding included, not
  just the text line height), so a 36px row is still a comfortable, deliberate single tap; it is
  not the same interaction pattern attendance marking has to support.
- Consistency matters more than optimizing each screen separately: one default, everywhere data
  tables appear (Students, Staff, import batch previews, master-data lists), not a per-screen
  judgment call that drifts over time. If a future screen's primary interaction really is
  rapid sequential taps (attendance is the obvious candidate), that screen can make its own
  case for comfortable as *its* default — it shouldn't set the default for directories that don't
  have that problem.

A clerk who wants more breathing room switches to comfortable per-session; the default just
shouldn't cost everyone else pagination through 2,000 rows for a problem most of them don't have.

### Type hierarchy, in practice

The type scale itself (`text-xs` through `text-3xl`) is unchanged from the original spec — the
gap was that most UI used `text-sm` for nearly everything, so nothing stood apart. Concrete
assignments, now:

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title | `text-2xl` (24px) | `font-semibold` | `foreground` |
| Section header (in-page, e.g. "Guardians", "Qualifications") | `text-lg` (18px) | `font-semibold` | `foreground` |
| Table header | `text-xs` (12px) | `font-medium` | `muted-foreground` |
| Table row — primary column (name, admission #) | `text-sm` (14px) | `font-medium` | `foreground` |
| Table row — secondary column (class, department, dates) | `text-sm` (14px) | `font-normal` | `muted-foreground` |
| Secondary line in a two-line cell | `text-xs` (12px) | `font-normal` | `muted-foreground` |
| Numeric values (any figure a user compares down a column) | inherits row size | `font-normal`/`font-medium` per column rule above | `.font-figures` always, regardless of size/weight |
| Field label (detail page) | `text-xs` (12px) | `font-medium` | `muted-foreground` |
| Field value (detail page) | `text-sm` (14px) | `font-normal` | `foreground` |

**Sentence case everywhere. No `uppercase` transform, anywhere in the product** — nav labels,
section headers, table column headers, button labels. (An earlier version of a Students-only
fix removed this from the sidebar only; this makes it the product-wide rule so it can't be
"rediscovered" as missing on the next screen.) Table headers get their visual distinction from
size + color (`text-xs` + `muted-foreground`), not from case transformation.

Hierarchy comes from combining size, weight, *and* color deliberately — never rely on size
alone (a `text-sm` row next to a `text-sm` row with nothing else different is why the previous
pass read as flat), and never rely on low contrast for "de-emphasis" (`muted-foreground` is
already tuned to stay legible — see Color, below — so secondary never means hard-to-read).

### Where the school's brand color appears — and where it must not

Per-school branding is real product differentiation and currently reaches almost nothing.
`--primary`/`--accent` (+ foregrounds) are the only school-overridable tokens; this section is
about where those two tokens are actually *used* in markup, which is a separate problem from the
tokens existing.

**Appears:**
- Primary action buttons — the one clear "main thing to do" per page/section (New student, Save,
  Commit, Send). `bg-primary text-primary-foreground`.
- The active nav item's accent — a left border or icon tint using `accent`/`primary`, so a
  school's color shows up every time someone glances at the sidebar, not just when they click a
  button.
- Selected/checked states on interactive controls (a checked checkbox, a selected table row) —
  `accent` background tint.
- The active sort column indicator and the active tab underline.
- Focus rings on brand-colored elements still use the fixed `--ring`, not brand color (unchanged
  rule, restated because it's easy to miss once brand color shows up in more places).

**Must not appear:**
- Any status meaning — present/absent/paid/due/etc. stay on the fixed Success/Danger/
  Warning/Info tokens, unconditionally. (Unchanged from the original spec; restated because it's
  the rule most likely to get bent "just this once" for a school that specifically requests it.)
- Destructive actions. A delete/withdraw/revert button is always the fixed `danger`/
  `destructive` token, never brand color — if a school's brand hue happens to be red, a
  brand-colored delete button becomes indistinguishable from an intentional danger signal, and if
  their brand hue is anything else, a non-red delete button under-signals the action's weight.
  Destructive actions do not get to be "on brand."
- Neutral surfaces — card/table/page backgrounds, borders, body text. These stay on the neutral
  ramp regardless of school.
- Data visualization series (charts, dashboards — `T. Reporting & Analytics`, P1 baseline
  onward). Chart colors need to stay visually distinct from both status colors and from each
  other in a way one arbitrary brand hue can't guarantee; use a small fixed qualitative palette
  when that work starts, not `--primary`.

---

## Tables — the primary surface of this product

Nearly every module boils down to a list of records. Getting this right once, as a shared
pattern, matters more than any other single piece of this document.

**Header.** `bg-secondary` (Level 2, per Elevation above), `text-xs font-medium
text-muted-foreground`, sentence case, `border-b border-border`. Sortable columns are described
below.

**Row separation.** `border-b border-border` between rows, no border on the last row
(`last:border-0`) so the table doesn't double up against its own container border. **No zebra
striping** — with real hierarchy (primary/secondary column weight, tabular figures, badges only
where they mean something) zebra stripes are redundant noise, and they fight `hover`/`selected`
states for the same visual channel (background tint).

**Hover state.** `hover:bg-secondary/50` on the row (already the pattern in Students; keep it
everywhere).

**Selected state.** `bg-accent` (not `secondary` — selection needs to read as distinct from
hover, and this is exactly the deliberate, meaningful use of the brand-derived accent token: it
signals "you did this," not "the system is showing you something"). Only relevant once rows
support selection (bulk actions) — not required before that exists.

**Alignment.**
- Text columns: left-align.
- Numeric *quantity/amount* columns (fee amounts, counts, marks): right-align, `.font-figures`,
  so a column of numbers stacks like a ledger.
- Numeric *identifier* columns (admission number, employee code, phone number): left-align —
  they're names, not quantities, and reading them right-aligned is unnatural — but still
  `.font-figures`, so the digits themselves stay stacked even though the column isn't summed.

**Two-line cells.** When a column would otherwise need two fields (e.g., class *and* section;
department *and* designation), stack them in one cell instead of adding a column: primary value
`text-sm text-foreground`, secondary value directly beneath, `text-xs text-muted-foreground`,
`leading-tight`, `flex flex-col gap-0.5`. This is how two fields fit in one column without
increasing row height — the row height numbers in Spacing above already assume this pattern, not
a taller row.

**Sortable headers.** Any column with an obvious sort order (name, admission number, class,
joining date) is clickable: `<th>` becomes a `<button>`-like control spanning the header cell,
with a `ChevronsUpDown` (unsorted) / `ChevronUp` (ascending) / `ChevronDown` (descending)
indicator at 14px next to the label. Clicking cycles unsorted → ascending → descending →
unsorted. State lives in the URL (`?sort=lastName&dir=asc`), the same place filters already live
— sorting is a filter-shaped problem and should use the exact same
apply-on-change-via-useTransition mechanism the Students filter bar already implements, not a
separate client-state system. Sets `aria-sort` on the `<th>` for screen readers.

**Per-page selector.** A `<select>` (10 / 25 / 50 / 100) next to the pagination control, applying
immediately via the same URL+transition mechanism as filters and sort — not a separate button.
Persists across navigation within the session (URL param), not stored as a user preference yet.

**Row actions.** A single trailing icon-only button (`MoreVertical`, `⋮`, 16px icon / 32px tap
target) opening a Level 3 popover menu with the row's actions (View, Edit, and — visually
separated by a divider, in `text-danger-solid` — destructive ones like Withdraw/Delete). Never
render multiple action buttons inline in a row; at real row heights and table widths on a
360px-wide screen, more than one visible action button per row is what "crowding" looks like.

**Filtering applies on change.** No "Filter" submit button, anywhere a table has filters.
Selects/toggles apply immediately; free-text search debounces (~300ms). Both run inside
`useTransition`, dimming the table (`opacity-50`, no layout shift) during the pending state
rather than blocking navigation or flashing blank. This is already built
(`lib/students/components/StudentFilterBar.tsx`) — it's the reference implementation every other
filterable table should copy, not reinvent.

---

## Detail and record pages

**Layout: left rail + collapsible sections, not a flat page.** The left rail (Level 1 panel,
fixed width, e.g. `w-64`) holds the record's identity: photo/avatar (circular; initials-on-color
fallback when there's no photo — never a broken image icon), name (`text-lg font-semibold`), and
the 2-3 key identifiers (admission number / employee code as `.font-figures`, class-section or
department-designation), plus a status badge *only* when the status isn't the default good state
(see Specific fixes, below — this is the same rule as the table row, not a separate one).

Below/beside the rail, the record's attached modules render as collapsible sections (accordion:
header with a chevron, click to expand/collapse, one or more open by default — e.g. "Profile"
open, "Attendance"/"Fees"/"Exams"/"Documents" collapsed until a student has data in them). This
is deliberately over-built for what Students/Staff need *today* (profile + guardians +
documents) because those sections will accumulate attendance, fee, and exam data as later phases
ship — designing the flat version now means rebuilding this page's structure later instead of
just adding a section.

**Breadcrumbs.** Above the page title: `Students / Ravi Kumar` — `text-sm text-muted-foreground`,
`ChevronRight` (14px) between segments, each segment before the last is a link. Every
record/detail page gets one; list pages don't need them (they're one level deep already).

**Field grid.** Multi-column (2 columns at desktop width, collapsing to 1 at ≤640px, per the
360px constraint below), label above value: label `text-xs font-medium text-muted-foreground`
sentence case, value `text-sm text-foreground` (or `.font-figures` for numeric/date fields)
directly beneath with minimal gap (`gap-y-4 gap-x-6` grid). Compact enough that a profile's core
fields fit without scrolling on a normal desktop viewport.

**Empty fields render as `—`** (en dash, `text-muted-foreground`), never omitted and never blank
space. A field that disappears when unfilled looks like a bug (is the data missing, or does this
field not apply?); a dash says "this exists, nobody's filled it in yet."

**Actions, top right.** Primary action(s) (Edit, etc.) as normal buttons near the page
title/breadcrumb, right-aligned. Destructive actions are visually separated — not adjacent in the
same button cluster with equal weight. Either a clear gap plus a vertical rule before them, or
(if there's only one and it's rare, like "Revert import") tucked into a `⋮` menu the same shape
as the table row-actions menu. Never a `bg-danger`-styled button sitting flush next to a
`bg-primary` one.

---

## Forms

Tables, detail pages, and nav get scanned; forms get *used* — a clerk entering a new student or
correcting a staff record spends more continuous time in a form than anywhere else in the
product, especially during onboarding data cleanup. This section covers the student/staff
create-edit forms and the master-data inline-editable lists as one pattern, not two.

**Field grouping and section layout.** A form is one or more sections, each a Level 1 panel
(`bg-card`, `border`, `shadow-sm`) with a `text-lg font-semibold` header (Basic Details,
Guardian 1, Guardian 2, Academic, and so on for the student form) — never one flat list of every
field in the record. Within a section, fields lay out in the same 2-column grid (1 column at
≤640px) as the detail-page field grid, so edit mode and view mode share a layout, not two
unrelated ones.

**Label placement.** Label above input, always — consistent with the detail page's
label-above-value convention (`text-xs font-medium text-muted-foreground`, sentence case), so
switching a field between view and edit mode doesn't relocate anything.

**Helper text.** Placeholder text disappears the moment someone starts typing, so anything the
user actually needs while filling the field (a format example: "+919415012345") is *persistent*
helper text below the input, not (only) a placeholder — `text-xs text-muted-foreground`,
directly under the input, same slot an inline error takes over when one exists (see below).

**Required-field indication: mark the minority, not the majority.** Across these forms, most
fields are required (name, DOB, gender, class/section) and only a handful are genuinely optional
(blood group, previous school, guardian email). Asterisk-per-required-field in that ratio is
mostly noise. Instead: optional fields get `(optional)` appended to the label in
`text-xs text-muted-foreground`; required fields get no marker at all. If a future form has the
opposite ratio (mostly-optional), flip it there rather than asterisk-marking a form that's
almost entirely required.

**Inline validation and error display.** Validate on submit, not on every keystroke — a field
turning red while someone is still mid-way through typing a phone number reads as broken, not
helpful. On a failed submit: the invalid field's border becomes `border-danger-solid`, and an
error message renders directly beneath it, `text-xs text-danger-solid`, in the same slot helper
text occupies (one or the other shows, never both stacked). Errors that aren't tied to one field
(a server/database error on save) render as a banner at the top of the form —
`bg-danger text-danger-foreground`, Level 1 panel — not attached to any single input.

**Save/cancel placement.** Bottom of the form (or of the last section, on a long multi-section
form), right-aligned, matching the detail page's top-right action rule: Cancel
(`border-border`, plain) immediately to the left of Save/Create (`bg-primary`,
`text-primary-foreground`) — Save is always the rightmost, most visually prominent action.

**Unsaved-changes handling.** A form with unfilled changes warns before a full page close/reload
(`beforeunload`). Guarding in-app navigation (clicking a nav link away from a dirty form) is not
required for `P1` — the Next.js App Router doesn't have a clean built-in "block this navigation"
API the way some client-side routers do, and a half-built custom version would be worse than
none. `beforeunload` alone catches the most damaging accidental-loss case (closing the tab); flag
in-app guarding as a `P2`+ nicety if it comes up again, not a gap to silently work around now.

**Inline-editable tables (master data).** Master-data lists (classes, subjects, departments,
designations, houses, categories) are edited in place, not through a separate create/edit page:
- **Add**: a persistent row at the bottom of the list with the input(s) and an Add button —
  always visible, not behind a "+ New" click.
- **Edit**: clicking a row's value turns that cell into an input in place (or an explicit small
  edit icon if click-to-edit on plain text turns out to be undiscoverable in testing); Enter or
  blur saves, Escape cancels. This is new behavior — the first pass of this UI only supported
  add/delete, so correcting a typo meant deleting and re-adding the row, which is exactly the
  kind of paper cut this spec exists to catch.
- **Delete**: one inline icon-only button (`Trash2`, 16px, `text-muted-foreground` default,
  `hover:text-danger-solid`) directly in the row — **not** the `⋮` overflow menu the Tables
  section specifies for record rows. That rule exists to stop multiple action buttons from
  crowding a row; a master-data row only ever has one possible action, so collapsing it into a
  menu would add a click for no reason. Overflow menus are for when there's something to
  economize; one action doesn't need economizing.

---

## Navigation

**Icons on every item** (lucide, 20px, see Foundations). Every top-level nav item and every item
inside a group gets a leading icon — a flat list of text links, which is what the sidebar was, is
the clearest symptom of this whole revision's gap, and it's the first thing to fix once this spec
is approved.

**Visible active state** (already implemented — `components/SidebarNav.tsx` — keep it, extend it
with the icon and don't regress it).

**Collapsible nested groups.** Eighteen modules (`docs/schoolerp_features.md` §2) grouped as
`people/ academics/ finance/ operations/ communication/ settings/` (already the routing
convention — see `CLAUDE.md`'s app organization section) will not hold as a permanently-flat
list once every group has 3-4 items in it. Each group header is clickable (chevron,
rotates on expand/collapse), state persisted client-side (e.g. `localStorage`, keyed per user —
no backend needed for this). Default: the group containing the current route is expanded; others
follow whatever the user last left them, defaulting to expanded until a preference is recorded.

**Persistent header context.** The header (already showing school name + logo) also always shows
the **current academic year** (e.g. "Shri Hansraj Career Inter College · 2026-27") —
`text-sm text-muted-foreground`, next to the school name. This is context every screen in the
product implicitly depends on (attendance, fees, enrollment are all year-scoped) and it should
never require a click to confirm.

---

## States

These are most of what makes an interface feel finished, and the previous pass had none of them.

**Empty states.** Never a bare "No records" line, and never a table rendered with zero rows and
no explanation. An empty state is: an icon (32px, muted, see Foundations), one line saying what's
missing ("No students match these filters" vs. "No students yet" are different messages for
different causes — a filtered-to-empty result is not the same situation as a genuinely new
school with nothing imported yet), and, when there's an action that would fix it, that action
right there (a link/button — "Clear filters", "Import students").

**Loading states never block the whole page.** Two mechanisms, both already started on Students
and now the standing pattern everywhere:
1. Route-level: a `loading.tsx` skeleton per segment (Next.js wraps the page and everything
   nested under it in a Suspense boundary automatically) so navigating into a section shows
   structure immediately instead of a blank screen during the server round trip.
2. In-place: filter/sort/page-size changes dim the existing content (`opacity-50`, via
   `useTransition`) rather than unmounting it — the user keeps their place on screen while new
   data loads in.

**Focus states.** Unchanged from the Accessibility floor: `:focus-visible` gets the fixed 2px
`--ring` outline, everywhere, never suppressed.

**Hover states.** Every clickable row, button, and nav item has one (`hover:bg-secondary` or
`hover:bg-secondary/50` depending on context, `hover:opacity-90` for solid-fill buttons). A
clickable element with no hover feedback reads as broken on a device with a mouse, even though
most real usage here is touch.

**Disabled states.** One rule, everywhere: `disabled:opacity-60` plus `disabled:cursor-not-allowed`,
and no hover effect fires while disabled. Don't invent a second disabled treatment per component.

---

## Constraints — still hold, not up for negotiation

- Works at 360px width, in both light and dark mode.
- High contrast: these screens run on cheap LCD panels in bright rooms, not calibrated monitors.
  Every "-foreground" pairing in the Color section is chosen for contrast, not just hue
  separation.
- `.font-figures` (tabular numerals) on every number a user compares down a column — amounts,
  counts, marks, admission/employee/phone numbers. No exceptions for "it's just an ID."
- Fast on a low-end Android phone over patchy 4G: this is why the icon set is tree-shaken
  line icons rather than a heavier icon font or animated icon set, why shadows are capped at two
  values, and why there are no gradients or decorative animation anywhere.
- Modern does not mean heavy. No gradients. No drop shadows outside the two specified
  (`shadow-sm` Level 1, `shadow-md` Level 3). No animation without a functional reason (a
  collapse/expand transition, a pending-state dim) — never animation purely for polish.

---

## Color

### Status colors — fixed, never themeable

Seven states from `docs/schoolerp_features.md` collapse to **four semantic hues**, not seven
unique ones: present/paid/approved all mean "good" and share one token; absent/overdue both mean
"bad" and share another. Fewer, more separated hues are more colorblind-robust than seven
similar ones. Every use pairs the color with an icon (see Foundations → Icons; previously a
Unicode glyph, now the matching `lucide` icon at 14px) or label — see
`packages/ui/src/StatusBadge.tsx` — never color alone.

| Semantic | States | Light bg / text | Dark bg / text | Solid (icon/dot) |
|---|---|---|---|---|
| Success | present, paid, approved | `#DCFCE7` / `#166534` | `#14532D` / `#86EFAC` | `#16A34A` |
| Danger | absent, overdue | `#FEE2E2` / `#991B1B` | `#7F1D1D` / `#FCA5A5` | `#DC2626` |
| Warning | late | `#FEF3C7` / `#92400E` | `#78350F` / `#FCD34D` | `#D97706` |
| Info | due, pending | `#DBEAFE` / `#1E40AF` | `#1E3A8A` / `#93C5FD` | `#2563EB` |

CSS variables: `--success`/`--success-foreground`/`--success-solid` (and `--danger-*`,
`--warning-*`, `--info-*`). Tailwind classes: `bg-success text-success-foreground`, etc. These
are never wired to a school-overridable variable, in any component, ever — see
`CLAUDE.md`'s definition of done.

### Neutral / structural tokens — fixed, not themeable

| Token | Light | Dark | Note |
|---|---|---|---|
| `background` | `#F8FAFC` | `#0B1220` | Off-white, not pure `#FFF` — softer under fluorescent light |
| `card` / `popover` | `#FFFFFF` | `#111827` | One step lighter than background, for layering — see Elevation above for where this is actually applied |
| `foreground` | `#0F172A` | `#F1F5F9` | ~16:1 contrast |
| `muted-foreground` | `#475569` | `#94A3B8` | Darker than a typical shadcn default on purpose — secondary text stays legible; hierarchy comes from size/weight, not low contrast |
| `border` | `#CBD5E1` | `#334155` | Visible table rules, not invisible hairlines |
| `input` (border) | `#94A3B8` | `#475569` | |
| `secondary` / `muted` | `#F1F5F9` | `#1E293B` | Secondary surface fill (table header, hover) |
| `ring` (focus) | `#0F172A` | `#F1F5F9` | Fixed, **not** brand-derived — focus visibility can't depend on a school's color choice |
| `destructive` | `#DC2626` | `#7F1D1D` bg equivalent | Reuses the Danger solid/tones |

Component structure and the type/spacing scales are likewise fixed — a school cannot request a
different button shape or a denser type scale; that would fragment the product into
per-school forks, the exact failure mode `CLAUDE.md` rules out.

### Themeable tokens — school may override

Only **`primary`**, **`primary-foreground`**, **`accent`**, **`accent-foreground`**. Nothing
else. Platform default (before a school sets one, and for platform-admin screens):
`primary = #4F46E5` (indigo) — deliberately not blue, so the default is never confused with the
fixed Info status color. See Foundations → "Where the school's brand color appears" for where
these two tokens are actually used in markup.

#### Derivation algorithm (`packages/ui/src/theme/deriveBrandTokens.ts`)

A school picks **one hue** (`school_branding.brand_color_hex`). This function does not use that
color's exact lightness/saturation verbatim as the button fill — it:

1. Converts to HSL, keeps the hue, clamps lightness into a band that reads well as a button fill
   (35–50% light mode, 45–60% dark mode) and floors saturation at 40% so pale/washed-out picks
   still read as a color.
2. Tests both white and near-black (`#0F172A`, matching `--foreground`) as the button text
   color, and picks whichever clears **4.5:1** (WCAG AA) by the larger margin.
3. If neither clears AA at the initial lightness (rare — mostly yellows), walks lightness in 2%
   steps toward the middle of the band until one does, or exhausts the band and takes the best
   result found. `deriveBrandTokens` returns `adjustmentNote` when this happened, so a future
   save flow can tell the school what changed and why.
4. Derives `accent` as the same hue at a light tint (96% L light mode) or a dark shade (26% L
   dark mode), with its own contrast-picked foreground.

Status colors never pass through this function. There is no code path that lets a status color
become school-configurable — see the RLS/permission model for `school_branding`, which only
ever touches `brand_color_hex`, `display_name`, `logo_url`.

`school_branding.brand_ramp` (jsonb) is where the computed output is meant to be cached once a
branding *edit* flow exists (compute on save, not on every request). No such flow exists yet in
P0 — the branding settings page is a placeholder — so
`apps/web/src/app/(app)/layout.tsx` currently recomputes on every request as a working fallback.
Swap it to "prefer `brand_ramp` if present, else compute and store it" when that save path is
built.

---

## Typography

**IBM Plex Sans + IBM Plex Sans Devanagari**, loaded via `next/font/google` in
`apps/web/src/app/layout.tsx`. Chosen over Noto Sans for a tighter, more distinctive character
at UI sizes, and because it ships genuine tabular (lining) figures — load-bearing for a product
where numbers are the content. Both cuts share x-height and weight, so Hindi (P2) won't reflow
layouts built around the Latin metrics. `next/font` self-hosts at build time: no separate
font-CDN round trip on patchy 4G, and no layout shift.

The Devanagari subset loads now, in P0, even though Hindi UI is P2 — retrofitting the font
choice after the type scale is built around a Latin-only face would mean redoing it later.

| Token | Size / line-height | Use |
|---|---|---|
| `text-xs` | 12px / 16px | Table footnotes, timestamps, metadata, field labels, table headers |
| `text-sm` | 14px / 20px | Dense table body, secondary labels, form hints, field values |
| `text-base` | 16px / 24px | Default body, form inputs (16px avoids iOS auto-zoom on focus) |
| `text-lg` | 18px / 28px | In-page section headers |
| `text-xl` | 20px / 28px | Page titles (mobile) |
| `text-2xl` | 24px / 32px | Page titles (desktop), dashboard KPI labels |
| `text-3xl` | 30px / 36px | Large KPI figures (owner dashboard) |

Deliberately modest range — this is a data product used all day, not a marketing site. No
display sizes above `text-3xl`. See "Type hierarchy, in practice" above for concrete
size/weight/color assignments per element — this table is the raw scale, that section is how to
use it.

**Numeric hierarchy:** any element showing a figure a user needs to compare down a column
(amounts, counts, marks, IDs) gets the `.font-figures` utility (`font-variant-numeric:
tabular-nums`), so digits align. See Tables → Alignment for how this interacts with left/right
alignment.

Spacing scale: Tailwind's default 4px-based scale, unmodified. See Foundations → Spacing and
density for concrete values.

---

## Theming architecture

Two independent layers, per `docs/schoolerp_techstack.md` §7a.

### Layer 1 — per-school branding

Injected server-side, per request, as a scoped `<style>` block in
`apps/web/src/app/(app)/layout.tsx`:

```css
.school-theme { --primary: ...; --primary-foreground: ...; --accent: ...; --accent-foreground: ...; }
.dark .school-theme { /* dark variants */ }
```

This is **not** inline `style={{ '--primary': ... }}` on an element, because that can't express
"different value when `.dark` is also present" — the `.dark` class toggle (Layer 2) needs to
keep working without client JS re-computing brand colors. A tiny generated stylesheet, scoped to
one class, gets both: server-rendered (no flash, no extra request) and dark-mode-aware (plain
CSS cascade, no JS).

`tailwind.config.ts` defines the **defaults** (baked into `:root`/`.dark` in `globals.css`,
resolving at build time). The school's `<style>` block, rendered inside the authenticated shell,
overrides them at runtime for anyone signed into that school. Someone with no school (a platform
admin with no active membership) just gets the platform default — no override renders.

### Layer 2 — user dark mode (light / dark / system)

Stored on `user_profile.theme_preference` (migration `20260902214150_add_user_theme_preference.sql`),
not the browser, so it follows a person across devices — per `docs/schoolerp_features.md` §A2.

**No-flash resolution**, in order of precedence:

1. `apps/web/src/lib/theme/resolveTheme.ts` runs server-side in the root layout, before anything
   is sent to the browser. It reads two cookies: `theme-preference` (the stored choice) and
   `theme-resolved` (the last client-observed `matchMedia` result, for when preference is
   `"system"`). Whichever it returns is the class rendered in the initial HTML — no flash,
   because there is no client-side correction step for any request that already has these
   cookies.
2. A blocking inline `<script>` in `<head>` (see `NO_FLASH_SCRIPT` in `layout.tsx`) only does
   work on a visitor's first-ever page load, when `theme-resolved` doesn't exist yet: it reads
   `prefers-color-scheme`, sets the class, and writes the cookie for next time. It runs
   synchronously before paint, so even this first-visit case has no visible flash.
3. On sign-in (`apps/web/src/app/login/actions.ts`), the user's `theme_preference` row is read
   and written into the `theme-preference` cookie immediately — so a dark-mode choice made on a
   phone shows up the moment they sign in on a different device, not on some later render.
4. `apps/web/src/lib/theme/ThemeToggle.tsx` is three plain forms bound to a Server Action
   (`setThemePreference`), each setting one preference value — works with JavaScript disabled,
   consistent with the low-end-Android priority in `CLAUDE.md`.

---

## Accessibility floor

- `:focus-visible` gets an explicit 2px outline using the fixed `--ring` token — not a
  brand-derived color, not reliant on the browser default.
- `prefers-reduced-motion: reduce` collapses all animation/transition durations, globally, in
  `globals.css` — not opt-in per component.
- Every form input in this session has an associated `<label>` with a matching `htmlFor`/`id`.
- `StatusBadge` always renders an icon (lucide, 14px) plus a caller-supplied label text, never a
  bare color swatch.
- Status and neutral tokens were chosen for contrast, not just hue separation — see the hex
  tables above; none of the "-foreground" pairings above rely on light-gray-on-white.
- Sortable table headers set `aria-sort` (`ascending`/`descending`/`none`) — sort state is
  conveyed to screen readers, not just via the visual chevron.
