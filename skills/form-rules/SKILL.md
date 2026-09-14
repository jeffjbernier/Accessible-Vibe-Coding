---
name: form-rules
description: Use when creating or modifying any HTML form, form field, form partial, or form template, on the admin or public side of any app or site, or any page or partial that displays a single database record. Applies to hand-written and AI-generated code alike, even when the request never mentions layout, grid, tokens, validation, or accessibility.
license: MIT
metadata:
  version: 1.0.0
  source: https://github.com/jeffbernier/accessible-vibe-coding
---

# Forms Standard

> **What this is.** The single source of truth for how every form and
> record-display page is built, on both the **admin** and **public** sides of a
> project, with **WCAG 2.2 AA as a hard release gate**.
>
> **Scope.** Written for server-rendered pages with progressive enhancement. On
> a client-rendered stack, the server-rendered-first principle below is the only
> rule that needs adapting — grid, tokens, field anatomy, validation, error
> handling, and accessible naming all apply unchanged, and §11 covers the
> traps specific to client-rendered forms.
>
> Every rule here is a hard constraint for a coding assistant to follow, not a
> suggestion to weigh against convenience or speed. It applies equally to
> hand-written code and AI-generated ("vibe coded") code.
>
> Where this file and ad-hoc styling in existing code disagree, **this file
> wins** — match this file and flag the conflict rather than quietly reconciling
> toward the old code.

---

## 1. Core principles

1. **Server-rendered first.** Every form works with JavaScript disabled: native
   `<form>` POST, server-side validation, full-page re-render with errors. JS
   may enhance (inline validation, autosave drafts) but never replaces the
   server path. Where the stack genuinely can't render on the server, principle
   2 still binds and the focus, live-region, and step-change guardrails in §11
   become mandatory rather than advisory.
2. **Server-side validation is authoritative.** Client-side checks are a
   courtesy; the server re-validates everything. Never trust `required`,
   `pattern`, or JS validation alone.
3. **One form system everywhere.** Admin and public forms share the same grid,
   tokens, field anatomy, and error pattern. Only theming differs.
4. **Accessible by default.** WCAG 2.2 AA minimum (AAA where practical). Full
   keyboard operability, screen-reader verified (NVDA/Firefox, JAWS/Chrome,
   VoiceOver/Safari), reduced-motion, 400% zoom/reflow, and both light and dark
   mode.
5. **No layout tables, no float hacks.** All form layout is CSS Grid per §2.
6. **Every form has an accessible name.** A `<form>` is an assistive-tech
   landmark once it's named — never ship a bare `<form>` with no
   `aria-label`/`aria-labelledby`, even when it's the only form on the page. See
   §10.

---

## 2. Layout system (the grid)

These rules are **non-negotiable**.

### 2.1 Desktop (≥ 48rem / 768px)

- Every form is a **two-column CSS grid**: label column left, input column
  right.
- **Column gap and row gap are equal** — one token, `--form-gap`, used for both.
- **General inputs** (text, email, select, textarea, date, file, etc.): label in
  column 1, **right-aligned**; input in column 2, left-aligned.
- **Exception — checkboxes and radio buttons:** the control and its label share
  one **merged grid row**. The checkbox/radio sits on the **left**,
  right-aligned so it lines up with the right edge of the label column; its
  label text sits immediately to its right in the input column.
- Buttons/actions row: aligned to the input column (column 2), not centered
  under the whole form.

### 2.2 Mobile (< 48rem)

- The grid collapses to **one column** with **labels above inputs**.
- A **taller gap between field sets** than between a label and its own input —
  the label/input pair reads as one unit, with clear air between units. Use
  `--form-gap-stack` (between pairs) and `--form-gap-pair` (label→input).
- **Exception — checkboxes and radio buttons:** control and label sit **on one
  line**. If the label wraps to multiple lines, the wrapped lines **left-align
  with the first line of the label** (hanging indent — text never wraps under
  the control).

### 2.3 Record display pages (read-only single record)

Pages that display one database record use the same grid, with values instead of
inputs:

- **Desktop:** two-column grid, labels left (right-aligned), values right.
- **Mobile:** one column, labels above values.
- Use `<dl>` / `<dt>` / `<dd>` markup, styled by the same tokens, so gaps match
  the forms exactly.

### 2.4 Grid gap consistency

Public pages and other card/grid layouts use gaps **similar to the form grid
gaps**. Reuse `--form-gap` rather than inventing new spacing values.

---

## 3. Design tokens

Define once at `:root`, consume everywhere. Values are the starting defaults —
tune them in one place only.

```css
:root {
  /* desktop column gap AND row gap — must stay equal */
  --form-gap: 1rem;
  --form-gap-stack: 1.5rem;  /* mobile: gap between label/input sets */
  --form-gap-pair: 0.375rem; /* mobile: gap between a label and its own input */
  --form-label-col: minmax(10rem, max-content); /* desktop label column */
  /* checkbox/radio rendered size (≥ 24px target incl. padding) */
  --control-size: 1.25rem;
  --focus-ring: 2px solid var(--color-focus);
  --focus-offset: 2px;
}
```

Color tokens (`--color-text`, `--color-bg`, `--color-border`, `--color-error`,
`--color-focus`, …) are defined by the site theme and **must have light and dark
values** — the theme toggle switches `data-theme` on `<html>`. Never hard-code a
color in form CSS.

One visually-hidden utility class is part of the system too — use it any time a
control needs a programmatic label with no visible text (e.g. the search form in
§10.1), never `display: none` or `visibility: hidden`, which screen readers skip
entirely:

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 4. Reference markup + CSS

The canonical markup and CSS — the form grid, its mobile-first stylesheet, and
the read-only record display — live in `references/markup.md`. Read that file
before writing or reviewing any form markup, and copy from it rather than
reconstructing the grid from the rules above. It is the implementation of §2
and §3; if the two ever disagree, §2 and §3 win and the reference file is the
bug.

---

## 5. Field anatomy

Every field, in DOM order:

1. **Label** — always a real `<label for>` pointing at the control's `id`. Never
   placeholder-as-label. Groups of checkboxes/radios get `<fieldset>` +
   `<legend>`.
2. **Required marker** — visible `*` with `aria-hidden="true"`, plus the
   `required` attribute on the control. State "`*` = required" once above the
   form. Do **not** mark optional-only forms; if most fields are optional, mark
   required ones; never mark both.
3. **Hint** (optional) — `<p class="field-hint" id="{id}-hint">`, linked via
   `aria-describedby`. Hints hold format guidance ("MM/DD/YYYY"), not error
   text.
4. **Control** — native HTML elements first (`<select>`, `<input type=date>`,
   etc.). A custom control is allowed only when a native one can't do the job,
   and must meet the full WCAG bar (role, name, state, keyboard).
5. **Error** (conditional) — see §7.
6. **Autocomplete** — set `autocomplete` on every field collecting personal data
   (`given-name`, `family-name`, `email`, `tel`, `street-address`,
   `postal-code`, …). This satisfies WCAG 1.3.5 and reduces re-typing (3.3.7
   Redundant Entry).

Character/word limits: show a live counter only as an enhancement; always
enforce server-side and state the limit in the hint.

---

## 6. Control-specific rules

- **Selects for lookups.** Options for timezones, states/provinces, categories,
  and similar reference data come from **database lookup tables** (manageable in
  the admin area) — never hard-coded arrays in templates.
- **Date/time.** Native `<input type="date">` / `<input type="time">` with a
  text-format hint. Store UTC; render in the relevant local timezone.
- **Textareas.** `rows` sized to expected content; vertical resize allowed;
  never horizontal.
- **File uploads.** State accepted types and max size in the hint; validate both
  server-side.
- **Payment fields.** If using a provider's hosted fields (e.g. Stripe
  Elements), embed them inside the same grid; label and error pattern identical
  to native fields. Card data never touches your server.
- **Sensitive/encrypted fields (admin edit).** Fields decrypted for an
  authorized edit render as normal plaintext inputs in this same grid — no
  special styling that would signal which fields are encrypted at rest.
- **Disabled vs read-only.** Prefer `readonly` (focusable, discoverable) over
  `disabled` for values a user can see but not change; explain why in a hint.

---

## 7. Validation & error handling

The accessible-error pattern is a WCAG release gate. Both halves are mandatory:

### 7.1 Error summary (top of form)

On a failed POST, re-render the page with an error summary **before** the form,
and move focus to it:

```html
<div class="error-summary" role="alert" tabindex="-1" id="error-summary">
  <h2>There's a problem with 2 answers</h2>
  <ul>
    <li>
      <a href="#email">Enter an email address in the format name@example.org</a>
    </li>
    <li><a href="#participant-type-legend">Select a participant type</a></li>
  </ul>
</div>
```

- Heading counts the errors; each item links to the offending field
  (`href="#{id}"`).
- Server sets focus by rendering `tabindex="-1"` and a tiny inline script (or
  `autofocus`-equivalent) targeting `#error-summary`; with JS off, the summary
  is still first in reading order.
- The `<title>` is prefixed with `Error:` on an error render so the failure is
  announced on page load.

### 7.2 Inline errors (per field)

- Error text in `<p class="field-error" id="{id}-error">`, placed between hint
  and control's visual slot (directly under the input in this system).
- The control gets `aria-invalid="true"` and its `aria-describedby` includes the
  error id (and hint id if present): `aria-describedby="email-hint
  email-error"`.
- Error styling uses color **plus** an icon or bold prefix — never color alone
  (1.4.1).
- Error text says **how to fix it**, not just "Invalid": *"Enter an email
  address in the format [name@example.org](mailto:name@example.org)."*

### 7.3 Behavior rules

- **Preserve input.** Re-render every submitted value (except passwords/card
  data) so nothing is retyped (3.3.7).
- **Client-side enhancement** may validate on blur/submit, but must reuse the
  exact same messages and ARIA wiring as the server render; `novalidate` on the
  form suppresses inconsistent browser bubbles.
- **Multi-step flows** save drafts server-side so back/forward never loses data.
- **Destructive or financial submissions** (payments, deletions) get a
  review/confirm step (3.3.4).

---

## 8. Accessibility checklist (per form, gates merge)

- [ ] Every control has a programmatic label; groups use `fieldset`/`legend`.
- [ ] Every `<form>` has an accessible name — `aria-labelledby` pointing to a
  visible heading, or `aria-label` when there's none. Names are unique if the
  page has more than one form (§10).
- [ ] Logical DOM order = visual order; tab order needs no `tabindex` > 0 (none
  allowed).
- [ ] Focus visible on every interactive element (`:focus-visible`,
  `--focus-ring`), never obscured by sticky UI (2.4.11).
- [ ] Pointer targets ≥ 24×24 CSS px, including checkboxes/radios with their
  padding (2.5.8).
- [ ] Works at 400% zoom / 320px reflow with no horizontal scroll (1.4.10) — the
  mobile grid is the reflow layout.
- [ ] Text and control contrast ≥ 4.5:1 (text) / 3:1 (UI, focus indicators),
  verified in **both** light and dark themes.
- [ ] No cognitive tests in auth flows; magic-link sign-in stays copy-pasteable,
  no paste-blocking anywhere (3.3.8).
- [ ] `autocomplete` attributes on all personal-data fields (1.3.5).
- [ ] Error pattern per §7 in place; summary focus verified with a screen
  reader.
- [ ] No motion/animation on validation; respects `prefers-reduced-motion`.
- [ ] No AI/vibe-coding pitfalls from §11: icon-only controls named, no
  `<div>`/`<span>` fake buttons, no unwarranted `autofocus`, submit never
  silently disabled, async state changes announced, focus managed on step
  change.
- [ ] axe/Lighthouse clean in CI; keyboard-only walkthrough done; screen-reader
  pass (NVDA + one other) before release.

**Checking the mechanical half.** This skill bundles `scripts/form-check.js`,
which walks a rendered form and reports the boxes above that can be verified by
machine:

    node scripts/form-check.js path/to/form.html
    node scripts/form-check.js https://staging.example.com/signup

It catches what axe passes — placeholder-as-label, fake `<div>` buttons,
disabled submits, unnamed forms, missing `autocomplete`, ungrouped radios,
dangling `aria-describedby`, positive `tabindex`, sub-24px targets, blocked
paste — cites the section each finding violates, and exits non-zero when a gate
fails, so it drops into CI unchanged. Run it alongside axe, never instead of it:
the accessibility-rules skill's `axe-check.js` covers the rules this one
deliberately skips.

It cannot judge whether focus order makes sense, whether an error message
explains the fix, how the error summary announces, contrast in dark mode, or
400% reflow. Those boxes stay human.

---

## 9. Do / Don't quick reference

<!-- markdownlint-disable MD013 -->
| Do | Don't |
| :--- | :--- |
| One `--form-gap` token for desktop row + column gaps | Different row and column gaps on desktop |
| Right-align desktop labels; left-align inputs | Center or left-align the label column |
| Merged row for each checkbox/radio, control aligned to label-column right edge | Checkbox floating in the label column with its label across the gap |
| Mobile: label above input, bigger gap between sets than within | Uniform mobile spacing that blurs field grouping |
| Hanging indent on wrapped choice labels | Label text wrapping underneath the checkbox |
| `<dl>` grid for record pages, same tokens | Ad-hoc tables or divs for record display |
| Lookup tables for states/provinces/timezones | Hard-coded option arrays |
| Error summary + inline error + `aria-describedby` | Browser-default bubbles or color-only errors |
| Native controls, progressive enhancement | JS-required custom widgets for standard inputs |
| Name every `<form>` via `aria-labelledby` (heading) or `aria-label` | Bare `<form>` with no accessible name |
| Icon-only control gets `aria-label` describing the action | Icon-only button/link with no accessible name |
| Native `<button>` / `<a href>` for every clickable control | `<div onclick>` / `<span onclick>` standing in for a button |
| Submit stays enabled; validate and show errors per §7 | Submit permanently `disabled` to "prevent" bad input |
<!-- markdownlint-enable MD013 -->

---

## 10. Accessible form names

Every `<form>` becomes an assistive-tech landmark/region once it's named.
Screen-reader users navigating by landmark, by region, or by a screen reader's
"forms list" (NVDA, JAWS) rely on that name to tell one form from another —
especially on pages that have more than one, such as a header search box, the
main content form, and a footer newsletter signup all on the same page.

### 10.1 Rules

- **Always name the `<form>` element itself.** Never ship a bare `<form>` with
  no `aria-label` or `aria-labelledby` — required even when it's the only form
  on the page, so the pattern doesn't silently break the next time a second form
  is added.

- **Prefer `aria-labelledby` pointing at a visible heading.** When the form
  already sits under a visible `<h1>`/`<h2>` that describes it ("Contact us",
  "Volunteer registration"), reference that heading's `id`. This avoids
  duplicating text a sighted user already sees, and keeps the name in sync
  automatically if the heading copy changes. See the canonical example under
  "Form grid" in `references/markup.md`.

- **Use `aria-label` only when there's no visible heading to point to** — a
  compact/inline form such as a header search box or an inline newsletter
  signup. Keep it short and specific (`aria-label="Site search"`), never generic
  (`aria-label="Form"`):

```html
<form role="search" method="get" action="/search"
      class="form-grid form-grid--inline" aria-label="Site search">
  <label for="q" class="sr-only">Search</label>
  <input type="search" id="q" name="q" required>
  <button type="submit">Search</button>
</form>
```

- **Multiple forms on one page get distinct names.** If a page has more than one
  `<form>` (e.g. a filter form and a "results per page" form), each accessible
  name must be specific enough to tell them apart — never leave two forms both
  named "Form," both sharing one name, or both unnamed.

- **The form's name isn't a substitute for field labels or fieldset legends.**
  Naming the `<form>` names the *region*; every control still needs its own
  `<label>` (or `<legend>` for a group) per §5. Both are required — they serve
  different purposes.

- **Don't use `aria-describedby` to name a form.** Screen readers announce a
  described-by string as a *description*, not a name — use
  `aria-label`/`aria-labelledby` for the name itself.

---

## 11. Guardrails for AI-generated ("vibe coded") forms

These are the specific mistakes a coding assistant tends to make even when it
"knows" the rules above — each one can slip into otherwise-correct markup, so
treat every line as its own gate. `scripts/form-check.js` (see §8) catches the
mechanically detectable ones; read them anyway, because it cannot catch the
reasoning failures.

- **Icon-only controls need a name.** A button, link, or control whose only
  content is an icon or emoji (a search magnifying glass, an "×" close button, a
  trash-can delete icon in a table row) MUST carry `aria-label` describing the
  action — `aria-label="Delete Ada Lovelace's registration"`, not
  `aria-label="Delete"` when the row context wouldn't otherwise be announced. An
  icon alone has no accessible name.
- **Never fake a button with a `<div>` or `<span>`.** Every control that
  submits, opens, toggles, or navigates is a real `<button>` or `<a href>`. A
  `<div onclick>` has no keyboard support, no role, and no accessible name by
  default — don't reach for `role="button"` + `tabindex="0"` + manual key
  handling when a native element does it for free.
- **Don't `autofocus` a field on page load**, except a single-purpose form that
  IS the page (e.g. a dedicated search page). Autofocusing a field inside a
  longer form, or on a page that isn't just that form, skips content before it
  and disorients screen-reader and keyboard users (3.2.1). Reserve programmatic
  focus-moving for the error-summary pattern in §7.1 and the step-change pattern
  below.
- **Never permanently `disable` the submit button to block invalid submission.**
  A disabled button is unfocusable and silent to assistive tech, so "why can't I
  submit?" goes unanswered. Leave it enabled, let the submit happen, and
  validate/show errors per §7. If a submit must be blocked for a real reason
  (e.g. mid-upload), disable it only for that duration and pair it with a reason
  that's both visible **and** programmatically associated (`aria-describedby`
  pointing at status text) — a grayed-out look alone isn't enough.
- **Announce async state changes.** Any JS-driven submit, autosave, or step
  transition that changes the page without a full reload needs a polite live
  region (`aria-live="polite"`) announcing "Saving…", "Saved", or the resulting
  error — a purely visual spinner or color change is invisible to a
  screen-reader user.
- **Move focus on step change in multi-step / SPA-style flows**, the same way
  §7.1 moves focus to the error summary: when a wizard advances to a new step,
  or a client-rendered route swaps the form, move focus to that step's heading
  and update the page `<title>` (or an equivalent announcement) so the user
  isn't left focused on a control that no longer exists.
- **Never rely on a single sensory characteristic to identify a field or
  instruction** — "the field on the right," "the green button" — pair any such
  reference with text (1.3.3).

---

*Update this file first, then the code.*
