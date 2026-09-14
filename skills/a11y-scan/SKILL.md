---
name: a11y-scan
description: Scan a component, page, directory, or the whole project for WCAG 2.2 AA violations and report each one with its success criterion, location, and a fix. Reads the markup directly, and runs axe-core as well when given a URL or an HTML file.
argument-hint: [file, directory, or URL; empty scans the whole project]
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(node *)
license: MIT
metadata:
  version: 1.0.0
  source: https://github.com/jeffjbernier/Accessible-Vibe-Coding
---

# Accessibility scan

Scan `$ARGUMENTS` for violations of WCAG 2.2 Level AA. With no argument, scan
every template, component, and HTML file in the project.

## Steps

1. **Identify the target.** A file, a directory, a URL, or the whole project.
   For a directory or the project, Glob for `*.html`, `*.jsx`, `*.tsx`, `*.vue`,
   `*.svelte`, `*.php`, `*.erb`, `*.twig`, `*.blade.php`, and `*.astro`.
2. **Run axe-core if you can.** When the target is a URL or an HTML file and the
   `accessibility-rules` skill is installed, run its bundled checker and fold
   the results into the report:

   ```bash
   node ~/.claude/skills/accessibility-rules/scripts/axe-check.js <target>
   ```

   Use `.claude/skills/...` instead if the skill is project-scoped. It needs
   `playwright` and `axe-core` installed in the project; if they are missing,
   say so and continue with the static pass. Never install them yourself.
3. **Read the markup** and check each principle:
   - **Perceivable.** Images without `alt`; meaningful images with `alt=""`;
     video without captions; audio without a transcript; text that fails
     4.5:1, or 3:1 for large text (18pt/24px+ regular, or 14pt/~18.66px+ bold);
     meaning carried by color alone.
   - **Operable.** Click handlers on `<div>` or `<span>`; missing or removed
     focus indicators; no skip link; positive `tabindex`; modals that do not
     trap focus or close on Escape; touch targets under 44×44 CSS pixels.
   - **Understandable.** Inputs without a visible associated `<label>`;
     placeholder used as the only label; error messages not tied to their
     field with `aria-describedby`; no `lang` on `<html>`; navigation that
     changes order between pages.
   - **Robust.** Skipped heading levels or more than one `<h1>`; duplicate
     `id` values; ARIA roles missing their required states; `aria-labelledby`
     or `aria-describedby` pointing at an `id` that does not exist;
     `aria-hidden="true"` on anything focusable.
4. **Check components.** Interactive elements without an accessible name;
   custom widgets missing roles and states; dynamic updates with no live
   region.
5. **Classify each finding** by WCAG level (A, AA, AAA) and by severity:
   critical blocks a task, serious makes it hard, moderate is friction, minor
   is polish.
6. **Give a fix for every finding.** A code snippet, not a description.

## Format

```text
Accessibility scan: <scope>

Violations: <N> (A: <n>, AA: <n>, AAA: <n>)

WCAG A (must fix):
  - <file>:<line> — <element> has no alt text (1.1.1)
      fix: <snippet>
  - <file>:<line> — <element> is not keyboard reachable (2.1.1)
      fix: <snippet>

WCAG AA (should fix):
  - <file>:<line> — contrast 3.2:1, needs 4.5:1 (1.4.3)
      fix: <snippet>

Passing:
  - Heading hierarchy is correct
  - Language attribute is set

Not covered by this scan: focus order, alt text quality, error message
clarity, screen reader announcements. Do a keyboard-only pass of every flow,
and run /nvda-scan or an equivalent screen reader check before calling this
accessible.
```

## Rules

- Every finding names its WCAG success criterion number.
- Every finding gets a fix snippet. "Add a label" is not a fix; the `<label>`
  element is.
- Level A findings come first. They are the legal baseline.
- Check what the markup renders to, not only what is written. A label injected
  by JavaScript counts; a label in a comment does not.
- Do not flag decorative images that correctly carry `alt=""`.
- Automated and static checks catch somewhere between a third and a half of
  real issues, and only the mechanical ones. The closing note in the report is
  not optional.
- This command reads and reports. It does not edit. Use `/aria-fix` to apply
  changes.
