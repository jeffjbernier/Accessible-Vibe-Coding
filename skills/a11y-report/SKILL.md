---
name: a11y-report
description: Turn accessibility findings into a written report grouped by WCAG principle, with severity, who is affected, and remediation code for every finding. Uses the findings already in the conversation, or runs a scan first if there are none. Saves Markdown.
argument-hint: [output path; default a11y-results/<date>-accessibility-report.md]
disable-model-invocation: true
allowed-tools: Read Glob Write
license: MIT
metadata:
  version: 1.0.0
  source: https://github.com/jeffjbernier/Accessible-Vibe-Coding
---

# Accessibility report

Write an accessibility report from the findings in this conversation. If there
are none, run `/a11y-scan` first, then come back here. Save to `$ARGUMENTS`, or
to `a11y-results/<YYYY-MM-DD>-accessibility-report.md` when no path is given.

## Steps

1. **Compile every finding** from the scan, any keyboard or screen reader
   pass, and any notes the user added. Mark each as automated or manual.
2. **Group by WCAG principle:** Perceivable, Operable, Understandable, Robust.
   Merge duplicates: one entry for "12 images missing alt text," with the
   locations listed, not twelve entries.
3. **Assign severity** to each: critical (blocks a task for some users),
   serious (makes a task hard), moderate (friction), minor (polish).
4. **Write each finding** with:
   - the success criterion number and name, linked to its WCAG Understanding
     page
   - where it is (`file:line`, or the URL and element)
   - what is wrong, in one or two sentences
   - who it affects and how (a screen reader user cannot tell which field
     failed; a keyboard user cannot close the dialog)
   - the current markup
   - the corrected markup
   - effort: quick fix, moderate, or significant
5. **Lead with a summary:** total findings by severity, the three highest-impact
   fixes, and what the scan did not cover.
6. **Add a remediation order.** Sort by impact over effort: high-impact quick
   fixes first, low-impact significant work last.
7. **Save the file.** Markdown by default. Produce an HTML version only when
   asked, and give it a `lang` attribute, a real heading hierarchy, and tables
   with header cells, since a report about accessibility that fails its own
   rules is not credible.

## Report shape

```markdown
# Accessibility report — <scope>

<date>. WCAG 2.2 Level AA. <N> findings: <n> critical, <n> serious,
<n> moderate, <n> minor.

## Summary

<Three to five sentences. The biggest risks, the quickest wins, and what this
report does not cover.>

## Fix these first

1. <finding> — <why it matters>
2. ...

## Findings

### Perceivable

#### 1.1.1 Non-text Content — <N> images without alt text

Severity: critical. Found by: automated.
Where: `src/components/Gallery.jsx:42`, ...
Who this affects: ...
Current: <snippet>
Fix: <snippet>
Effort: quick fix.

### Operable
...

## Not covered

<What was not tested: focus order by hand, screen reader announcements,
alt text quality, ...>
```

## Rules

- No compliance score and no percentage. A number invites someone to call 87%
  "basically accessible." Report counts by severity and say plainly what was
  and was not tested.
- Every finding names its criterion and shows corrected code, not a
  description of the change.
- Say which findings came from a tool and which from a person. Automated
  checks catch somewhere between a third and a half of real issues.
- A clean automated run is not compliance evidence, and the report must say
  so in the "Not covered" section.
- Do not commit the report. `a11y-results/` belongs in `.gitignore`; the
  scripts are the deliverable, the reports are output. Do not ignore
  `a11y-report/` by name: that pattern also hides this skill's folder when it
  is installed project-scoped.
