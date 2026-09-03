# Design system

Palette, type scale, and theming architecture for the School ERP web app. Read this before
adding any new color or component — CLAUDE.md requires every color to go through these tokens,
with no hardcoded hex values and no parallel styling system.

Source of truth: `apps/web/src/app/globals.css` (token values), `apps/web/tailwind.config.ts`
(Tailwind mapping), `packages/ui/src/theme/` (brand-color derivation math).

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
| `text-xs` | 12px / 16px | Table footnotes, timestamps, metadata |
| `text-sm` | 14px / 20px | Dense table body, secondary labels, form hints |
| `text-base` | 16px / 24px | Default body, form inputs (16px avoids iOS auto-zoom on focus) |
| `text-lg` | 18px / 28px | In-page section headers |
| `text-xl` | 20px / 28px | Page titles (mobile) |
| `text-2xl` | 24px / 32px | Page titles (desktop), dashboard KPI labels |
| `text-3xl` | 30px / 36px | Large KPI figures (owner dashboard) |

Deliberately modest range — this is a data product used all day, not a marketing site. No
display sizes above `text-3xl`.

**Numeric hierarchy:** any element showing a figure a user needs to compare down a column
(amounts, counts, marks) gets the `.font-figures` utility (`font-variant-numeric: tabular-nums`),
so digits align. See the KPI tile on `/dashboard` for the pattern.

Spacing scale: Tailwind's default 4px-based scale, unmodified.

---

## Color

### Status colors — fixed, never themeable

Seven states from `docs/schoolerp_features.md` collapse to **four semantic hues**, not seven
unique ones: present/paid/approved all mean "good" and share one token; absent/overdue both mean
"bad" and share another. Fewer, more separated hues are more colorblind-robust than seven
similar ones. Every use pairs the color with an icon or label — see `packages/ui/src/StatusBadge.tsx`
— never color alone.

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
| `card` / `popover` | `#FFFFFF` | `#111827` | One step lighter than background, for layering |
| `foreground` | `#0F172A` | `#F1F5F9` | ~16:1 contrast |
| `muted-foreground` | `#475569` | `#94A3B8` | Darker than a typical shadcn default on purpose — secondary text stays legible; hierarchy comes from size/weight, not low contrast |
| `border` | `#CBD5E1` | `#334155` | Visible table rules, not invisible hairlines |
| `input` (border) | `#94A3B8` | `#475569` | |
| `secondary` / `muted` | `#F1F5F9` | `#1E293B` | Secondary surface fill |
| `ring` (focus) | `#0F172A` | `#F1F5F9` | Fixed, **not** brand-derived — focus visibility can't depend on a school's color choice |
| `destructive` | `#DC2626` | `#7F1D1D` bg equivalent | Reuses the Danger solid/tones |

Component structure and the type/spacing scales are likewise fixed — a school cannot request a
different button shape or a denser type scale; that would fragment the product into
per-school forks, the exact failure mode `CLAUDE.md` rules out.

### Themeable tokens — school may override

Only **`primary`**, **`primary-foreground`**, **`accent`**, **`accent-foreground`**. Nothing
else. Platform default (before a school sets one, and for platform-admin screens):
`primary = #4F46E5` (indigo) — deliberately not blue, so the default is never confused with the
fixed Info status color.

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
Swap it to "prefer `brand_ramp` if present, else compute and store it" when that save path is built.

---

## Theming architecture

Two independent layers, per `docs/schoolerp_techstack.md` §7a:

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
- `StatusBadge` always renders an icon glyph plus a caller-supplied label text, never a bare
  color swatch.
- Status and neutral tokens were chosen for contrast, not just hue separation — see the hex
  tables above; none of the "-foreground" pairings above rely on light-gray-on-white.
