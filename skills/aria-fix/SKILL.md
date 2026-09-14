---
name: aria-fix
description: Fix missing or wrong ARIA, keyboard handling, and semantic HTML in a component or file. Prefers native elements over ARIA, edits the file in place, and lists every change with its line number.
argument-hint: [file or component]
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit
license: MIT
metadata:
  version: 1.0.0
  source: https://github.com/jeffjbernier/Accessible-Vibe-Coding
---

# ARIA fix

Fix the accessibility defects in `$ARGUMENTS`. Read the whole file first, and
its stylesheet if focus styling is involved, before changing anything.

## Steps

Work in this order. Each step can remove the need for the next one.

1. **Semantic HTML first.** Replace a `<div>` or `<span>` with a click handler
   by `<button type="button">` for actions and `<a href>` for navigation. Fix
   the heading hierarchy so levels never skip and there is one `<h1>`. Wrap
   regions in `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` instead of
   adding `role` to a `<div>`. A native element carries its role, state, focus
   behavior, and keyboard handling for free; an ARIA copy of it carries none of
   that.
2. **Roles.** Only on custom widgets that have no native equivalent: `tablist`,
   `tab`, `tabpanel`, `dialog`, `combobox`, `listbox`, `menu`. Follow the
   WAI-ARIA Authoring Practices pattern for that widget exactly. Every role
   gets the states and properties it requires.
3. **States and properties.** `aria-expanded` on disclosure triggers,
   `aria-selected` on tabs and options, `aria-checked` on custom checkboxes,
   `aria-current="page"` on the active nav link. Keep each in sync with the
   visual state.
4. **Accessible names.** `aria-label` or `aria-labelledby` on any interactive
   element with no visible text, icon buttons above all. Do not add
   `aria-label` where visible text already names the element.
5. **Keyboard handling.** Custom interactive elements get `tabindex="0"` and a
   keydown handler for Enter and Space. Composite widgets use roving
   tabindex: one tab stop, arrow keys inside. Dialogs trap focus, close on
   Escape, and return focus to the trigger.
6. **Forms.** Associate every input with a visible `<label for>`. Group related
   controls in `<fieldset>` with a `<legend>`. Tie hints and errors to the
   field with `aria-describedby`, and set `aria-invalid="true"` on a field in
   error.
7. **Live regions.** `role="status"` or `aria-live="polite"` for non-urgent
   updates, `role="alert"` only for errors and anything urgent.
8. **Clean up.** Every `id` referenced by `aria-labelledby`, `aria-describedby`,
   or `aria-controls` must exist and be unique. Remove ARIA that duplicates
   native semantics (`role="button"` on a `<button>`). Remove
   `aria-hidden="true"` from anything focusable or anything containing a
   focusable element.
9. **Verify.** Re-read the file. Confirm nothing visual or functional changed
   except what you intended, and that tab order still matches reading order.

## Format

```text
ARIA fixes applied: <file>

Changes:
  - L<N>: replaced clickable <div> with <button type="button">
  - L<N>: added aria-label="Close dialog" to icon button
  - L<N>: added role="status" to the save confirmation
  - L<N>: removed redundant role="navigation" from <nav>

Not changed:
  - L<N>: <what> — <why it was left, e.g. needs a design decision>

Verify: tab through the component, then run /a11y-scan on it.
```

## Rules

- Native HTML over ARIA. If a native element does the job, use it and delete
  the ARIA.
- Never put `aria-hidden="true"` on a focusable element.
- Never use a positive `tabindex`.
- Never add ARIA that contradicts the element's native semantics
  (`role="button"` on an `<a href>`).
- `aria-describedby` carries supplementary text. The primary name comes from
  the label.
- Do not touch markup outside the target file. If a fix needs a change
  elsewhere, list it under "Not changed" instead.
- Do not "improve" adjacent code. Every edit traces to an accessibility
  defect.
