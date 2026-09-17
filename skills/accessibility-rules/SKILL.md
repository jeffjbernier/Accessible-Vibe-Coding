---
name: accessibility-rules
description: Use when creating or modifying anything a person will see, hear, or operate - a UI, web page, component, prototype, email, or dashboard - or when producing any HTML, CSS, JS, React, or template output, even a small snippet and even when the request never mentions accessibility. Also use when a task mentions WCAG, ARIA, contrast, keyboard navigation, focus, screen readers, or touch targets.
license: MIT
metadata:
  version: 1.1.0
  source: https://github.com/jeffjbernier/Accessible-Vibe-Coding
---

# Accessibility Rules

Every rule in this file is a hard constraint, not a suggestion. Apply all of
them whenever this skill is loaded, whether or not the request mentions
accessibility. These rules override ad-hoc patterns in existing code. Goal:
interfaces usable by everyone from the first commit — not just compliant, but
genuinely inclusive.

**Relationship to the form-rules skill.** For form layout, grid, tokens, and the
error pattern, the `form-rules` skill is the source of truth. Where the two
overlap, form-rules wins — e.g. its 24×24px minimum pointer-target gate governs
form controls, while this file's 44×44px default applies everywhere form-rules
is silent.

## Accessibility Guidelines

- **Target: WCAG 2.2 Level AA** for all user-facing features.
- Touch targets: exceed the AA minimum (24×24px, SC 2.5.8) by building to the
  AAA size (44×44px, SC 2.5.5) as the default, unless a project standard sets
  its own gate.

## Working model

Before generating any UI, confirm:

- structure plan: which landmarks, heading levels, and focus flow the page needs
- contrast plan: which palette passes 4.5:1 body / 3:1 large text / 3:1 non-text
  at minimum
- interaction plan: how every control works by keyboard, pointer, and assistive
  technology
- adaptation plan: what progressive disclosure or simplified views are
  appropriate for the content

## Perceivable defaults

- All body text meets a minimum contrast ratio of 4.5:1 against its background.
- Large text (18pt/24px+ regular, or 14pt/~18.66px+ bold) meets 3:1 minimum.
- Non-text contrast (SC 1.4.11): UI component boundaries, input borders, icons,
  and focus indicators meet 3:1 against adjacent colors.
- Never use color alone to convey meaning — pair with text, shape, icon, or
  pattern.
- Base font size is at least 16px. Line height is at least 1.5× the font size.
- Text remains readable and functional when zoomed to 200%.
- Reflow (SC 1.4.10): content reflows at 320px width (400% zoom) with no
  two-dimensional scrolling, except where the content genuinely requires it
  (data tables, maps, diagrams).
- Orientation (SC 1.3.4): never lock content to portrait or landscape unless the
  orientation is essential.
- Every meaningful image has a concise, descriptive alt attribute that conveys
  the image's role on the page, not just its visual contents. Ask: "What would
  the user miss without it?"
- For team/people photos: include the person's name and role.
- For product screenshots: describe what the screenshot demonstrates.
- For charts and data visualizations: summarize the key insight in the alt text
  and provide a data table alternative.
- Decorative images use alt="" so screen readers skip them.
- Avoid text embedded in images. If unavoidable, duplicate the text content in
  alt or a visually hidden element.

## Semantic structure

- Every page has a unique, descriptive `<title>` (SC 2.4.2), most-specific
  information first ("Invoices – Acme Dashboard").

- Use semantic HTML5 elements for structure and meaning: `<header>`, `<nav>`,
  `<main>`, `<footer>`, `<section>`, `<article>`, `<aside>`. `<div>` is
  acceptable only as a styling/layout wrapper with no semantic role.

- Exactly one H1 per page. Heading hierarchy follows a logical sequence (H1 → H2
  → H3). Never skip levels.

- Set lang attribute on `<html>` matching the page's primary language.

- Wrap foreign-language phrases in elements with the correct inline lang
  attribute.

- Spell out acronyms in text on first use — "Web Content Accessibility
  Guidelines (WCAG)". Do not rely on `<abbr title="…">`; the title attribute is
  unreachable by touch and keyboard.

- Write body copy at or below a Flesch-Kincaid grade level of 8 for general
  audiences. Define technical terms on first use.

- Where content must be complex (legal, medical, technical), provide a
  plain-language summary at the top.

- Data tables: use `<th>` with scope="col"/"row", a `<caption>` describing the
  table, and never merge cells purely for layout.

## Keyboard and focus

- Every interactive element is reachable via Tab in a logical reading order.
- All interactive elements are operable with Enter, Space, and/or arrow keys as
  appropriate.
- Visible focus indicators on all focusable elements — minimum 2px solid outline
  with 3:1 contrast. Never suppress the default focus ring without providing a
  custom one.
- Focus not obscured (SC 2.4.11): sticky headers, footers, and overlays must not
  cover the focused element. Use scroll-padding to keep focused elements clear
  of fixed bars.
- Never put `aria-hidden="true"` on a focusable element.
- Modals and dialogs trap focus: Tab cycles within the dialog. Escape closes it.
  Focus returns to the trigger on close.
- Custom composite widgets (tab lists, toolbars, menus) use roving tabindex: one
  tab stop for the group, arrow keys to move within.
- No keyboard traps.

## ARIA and landmarks

- Use native HTML elements before ARIA. `<button>` over `<div role="button">`.
  `<a href="...">` over `<span role="link">`.
- Add aria-label or aria-labelledby to any interactive element that lacks
  visible text.
- Use landmark roles: `<nav>`, `<main>`, `<aside>`. Ensure the page has exactly
  one `<main>`.
- Add aria-current="page" to the active link in navigation.
- For complex widgets, follow WAI-ARIA Authoring Practices patterns exactly —
  don't improvise ARIA role combinations.
- Worked examples of the patterns above — landmark markup, a dialog, a tab list
  with roving tabindex, an arrow-key handler, a form field with hint and error,
  and focus-ring CSS — live in `references/patterns.md`. Read it before building
  a custom widget. Where an example and a rule in this file disagree, the rule
  wins.

## Navigation aids

- Include a "Skip to main content" link as the first focusable element on every
  page. Visually hidden by default, visible on keyboard focus, linking to
  `<main>` via its id.
- On pages with multiple content regions, add secondary skip links.
- Consistent navigation (SC 3.2.3, 3.2.4): repeated navigation keeps the same
  relative order on every page, and the same function keeps the same name and
  icon everywhere.

## Forms

- Every form input has a visible `<label>` associated via the for attribute.
  Never use placeholder as the only label.
- Group related fields with `<fieldset>` and `<legend>`.
- Accept flexible input formats (phone, date, postal code): normalize on blur or
  submit rather than reformatting as the user types, and never reject input the
  app can fix itself. Live rewriting fights the caret and confuses screen reader
  users.
- Inline validation: clear error messages describing the problem, showing the
  expected format, and suggesting a correction where possible.
- Connect error messages to their input via aria-describedby.
- On submit with errors, move focus to an error summary at the top of the form;
  each error links to its field.
- Where the correct input can be inferred, offer a "Did you mean…?" suggestion
  instead of an error.
- Redundant entry (SC 3.3.7): never ask for the same information twice in one
  flow — auto-populate or offer to reuse it.
- Accessible authentication (SC 3.3.8): no cognitive function tests (memorized
  codes, puzzles, transcription) in login flows. Always allow paste in password
  and code fields.
- Prefill smart defaults based on locale and context.
- Use autocomplete attributes on common fields.
- Submit buttons use `<button type="submit">`, not styled divs.

## Links and copy

- Link text describes the destination or action — never "click here", "read
  more", or "learn more" alone.
- If a link opens in a new tab, indicate this in the link text or via a visually
  hidden suffix.
- Use plain language. Define technical terms on first use.
- Content on hover/focus (SC 1.4.13): tooltips and popovers are dismissible with
  Escape, hoverable (pointer can move onto them), and persistent until dismissed
  or invalid.

## Motion and sensory preferences

- Wrap all non-essential animations in @media (prefers-reduced-motion:
  no-preference).
- All scroll-triggered animations must use IntersectionObserver to play only
  when the element enters the viewport. Combine with the reduced-motion query.
- When reduced motion is preferred, replace animations with instant state
  changes — no fade, no slide, just appear.
- Never use animation-delay on elements below the fold; use IntersectionObserver
  thresholds instead.
- No auto-playing media. If unavoidable, provide a visible, keyboard-accessible
  pause/stop control.
- Pause, stop, hide (SC 2.2.2): carousels, tickers, and anything else that
  moves, blinks, or scrolls for more than five seconds gets a visible,
  keyboard-accessible control to pause, stop, or hide it. Content that
  auto-updates (live scores, polling feeds) gets one however briefly it runs,
  or a control for how often it updates.
- Support prefers-color-scheme: dark with maintained WCAG AA contrast.
- Support prefers-contrast: more with increased border widths, solid
  backgrounds, and boosted text weight.
- Support forced-colors: active (Windows contrast themes, formerly High
  Contrast). Backgrounds are overridden and box-shadow is removed, so never
  carry state or a focus ring on either alone. Use borders and outline, which
  survive.

## Media and captions

- No `<video>` without captions: include a `<track>` element with WebVTT
  covering all spoken dialogue, meaningful sound effects, and speaker
  identification.
- No `<audio>` without a text transcript linked or displayed adjacent to the
  player.
- For user-uploaded media, prompt for captions/transcripts and allow user
  editing.
- Provide a visible, keyboard-accessible toggle for captions.

## Data visualization

- Every chart or data visualization includes an accessible alternative: a
  visually hidden data table, ARIA labels on interactive SVG elements, or a text
  summary of the key insight.
- Use aria-label or aria-labelledby on chart containers.
- Never use color as the sole differentiator. Pair with patterns, labels, or
  direct annotation.
- For interactive charts, make all data points keyboard-navigable with
  descriptive accessible names. Focus movement announces the point natively — do
  not add aria-live on top of focus, as it causes double announcements.

## Live regions and dynamic content

- Use aria-live="polite" / role="status" for non-urgent dynamic updates.
- Use aria-live="assertive" / role="alert" only for urgent messages.
- Announce dynamic content changes to screen readers via live regions — only for
  updates that do not receive focus.
- Autosuggest and search-as-you-type: announce the number of results through a
  polite live region as the list updates.

## Error prevention and timeouts

- Destructive actions require a confirmation dialog describing the consequences,
  with confirm and cancel options.
- Confirmation modals trap focus, dismiss with Escape, and return focus to the
  trigger on close.
- Timing adjustable (SC 2.2.1): no time limits unless essential. Where one
  exists, let the user turn it off, adjust it, or extend it.
- Session timeouts warn at least 2 minutes before expiry via role="alert", with
  a control to extend.

## Touch and pointer

- Minimum touch target: 44×44 CSS pixels with 8px spacing between adjacent
  targets.
- No functionality depends solely on swipe, pinch, or drag. Provide visible
  button alternatives.
- No hover-only interactions for essential content.
- Do not assume a specific input modality.

## Cognitive load

- Default to progressive disclosure for complex interfaces: show essential
  content first, provide clear expand/collapse controls for additional detail.
- All expand/collapse controls must have descriptive ARIA labels (e.g.
  aria-expanded="false", aria-label="Show advanced options") and be
  keyboard-operable.
- Never auto-expand collapsed content without user action.

## Recommend when appropriate — do not build unprompted

These are valuable features, not baseline defaults. Suggest them when the
project fits and ask before building:

- **Simplified language toggle** (rewrites copy at grade 5–6): suggest for
  content-heavy public-facing pages.
- **Accessibility preferences panel** (font size, line spacing, animation
  toggle, color scheme, persisted via localStorage and CSS custom properties):
  suggest for apps and dashboards with returning users.
- **Simplified view** for dashboards and data-heavy pages.
- **Back-to-top button** on long pages (keyboard-focusable, aria-label="Back to
  top").
- **Auto-generated captions** for large pre-recorded media libraries.

## Self-audit

- After generating any complete page or component, run an automated
  accessibility audit and fix every violation before presenting the output.
  This skill bundles one — `scripts/axe-check.js`, which drives axe-core over a
  URL or a local HTML file:

      node scripts/axe-check.js path/to/page.html
      node scripts/axe-check.js https://staging.example.com/signup

  It defaults to the WCAG 2.2 AA rule set, exits non-zero when violations are
  found (so it drops into CI unchanged), and takes `--json` for machine-readable
  output. It needs `playwright` and `axe-core` installed in the project being
  scanned; `--help` lists the rest of the flags.
- When no audit tooling is available and those dependencies can't be installed,
  do a manual pass against the Hard rules and Litmus checks below instead.
- If any violation cannot be fixed automatically, flag it with a comment
  explaining the issue and the recommended manual fix.
- A clean run is the floor, not the finish line. axe catches the mechanical
  failures — it will happily pass a placeholder-only label, a nonsensical focus
  order, or alt text that describes pixels instead of purpose. The Litmus checks
  and the handoff list below still apply.

## Hard rules

- No output without a lang attribute on `<html>`.
- No page without a unique, descriptive `<title>`.
- No interactive element without an accessible name.
- No image without an alt attribute.
- No form input without a visible, associated label.
- No heading level skipped; exactly one H1.
- No animation outside a prefers-reduced-motion guard.
- No modal without focus trapping and Escape dismissal.
- No touch target below 44×44px.
- No color used as the sole means of conveying information.
- No focus indicator below 3:1 contrast, and no focused element obscured by
  sticky UI.
- No video without captions; no audio without a transcript.
- No chart without an accessible alternative.
- No data table without `<th>` scope and a `<caption>`.
- No password or verification-code field that blocks paste.

## Reject these failures

- Generic or missing alt text ("image", filename, empty on meaningful images).
- Alt text that describes visual contents without explaining the image's role in
  context.
- Trendy muted palettes that fail contrast ratios.
- `<div>` soup with no semantic elements.
- Buttons as styled `<div>` or `<span>` without role, keyboard handlers, or
  tabindex.
- Focus indicators removed for aesthetics.
- Placeholder-only labels on form inputs.
- Inputs that reformat or reject text while the user is typing.
- "Invalid input" errors with no description or fix.
- Error states with no focus management or error summary.
- Modals without focus trapping or Escape dismissal.
- Animations ignoring prefers-reduced-motion.
- Animations firing on page load regardless of viewport position.
- "Click here" / "Read more" link text with no context.
- Video without captions; audio without a transcript.
- Charts with color-only differentiation.
- Tooltips that vanish when the pointer moves toward them.
- Login flows requiring puzzles, memorization, or retyping.

## Litmus checks

Before considering output complete, verify:

- Can a keyboard-only user reach and operate every control?
- Does every text-background pair pass 4.5:1 / 3:1, and every UI boundary, icon,
  and focus ring pass 3:1?
- Does a screen reader announce every interactive element by name and role?
- Would the page function with all animations disabled?
- Can a screen reader user navigate by headings and landmarks?
- Does the layout reflow at 320px width with no horizontal scrolling?
- Are all touch targets comfortably tappable on a phone?
- Do all forms display clear, associated error messages, and does
  submit-with-errors move focus to an error summary?
- Is there a skip link past repeated navigation?
- Does every chart have an accessible data alternative?
- Does every data table have headers and a caption?
- Is all media captioned or transcribed?
- Has the output passed an automated audit, or a manual pass against the Hard
  rules if no tooling is available?

## Handoff items — flag for human testing

Claude cannot perform these; list them as a testing checklist in the
deliverable:

- Manual screen reader testing with at least two readers (NVDA + VoiceOver, or
  NVDA + JAWS).
- Real-device touch testing.
- axe-core / Lighthouse in the project's CI pipeline, with all violations fixed
  before merging.
