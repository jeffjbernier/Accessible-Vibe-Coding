# Accessible Vibe Coding

Drop-in skills for building accessible software with AI coding assistants.

AI assistants will happily generate a `<div onClick>` and call it a button. They will invent ARIA that makes things worse. They will strip your focus outlines because it "looks cleaner." This repo is the correction layer: drop-in skills that constrain what your assistant produces.

**Target standard:** [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/).

---

## Who this is for

- **Developers using AI assistants** (Claude Code, Cursor, Copilot, Windsurf) who want accessible output by default instead of by review.
- **Vibe coders** shipping real products who know "it works on my machine with a mouse" isn't the finish line.
- **Agencies and freelancers** who need a defensible accessibility baseline for client work without a dedicated a11y specialist on payroll.

You do not need to be an accessibility expert to use this. That's the point.

---

## What's in here

Two skills, in `skills/`:

| Skill | What it constrains |
| --- | --- |
| `accessibility-rules` | Any UI, page, component, or markup the assistant generates — contrast, semantics, keyboard and focus, ARIA, motion, media, cognitive load |
| `form-rules` | Forms, form fields, and single-record display pages — grid, tokens, field anatomy, validation, and the error pattern |

They overlap on purpose. Where the two disagree about a form, `form-rules` wins.

Plus the same two rulesets as standalone files, in `rules/`:

| File | For |
| --- | --- |
| `rules/accessibility-rules.md` | Cursor, Windsurf, Copilot, and anything else that reads a rules file rather than an Agent Skill |
| `rules/form-rules.md` | The same, for forms |

These are generated from the skills by `tools/build-rules.mjs` — same rules, no frontmatter, every repo-relative path rewritten to an absolute URL so the file still works once you copy it into your own project. The skills are the source of truth; the rules files are a build output.

More is coming — agent definitions and automation guides — but this README only lists what's actually in the repo today.

---

## Quick start

### 1. Install the skills

```bash
git clone https://github.com/jeffjbernier/Accessible-Vibe-Coding.git
mkdir -p ~/.claude/skills
cp -r Accessible-Vibe-Coding/skills/accessibility-rules ~/.claude/skills/
cp -r Accessible-Vibe-Coding/skills/form-rules ~/.claude/skills/
```

Run `/skills` in Claude Code to confirm both loaded. For project-scoped installs, Windows paths, Claude Desktop and claude.ai uploads, and the Agent SDK, see [INSTALL.md](INSTALL.md).

Not using Claude? Cursor, Windsurf, and Copilot don't load Agent Skills — copy the matching file out of `rules/` instead. [INSTALL.md](INSTALL.md) has the destination path and frontmatter each one expects.

### 2. Build something

The skills trigger on their own. `accessibility-rules` fires on any UI or markup generation even when nobody says the word "accessibility" — that's the point. If it stays quiet when it shouldn't, name it directly: "use the accessibility-rules skill."

### 3. Verify by hand

Nothing here replaces testing. Skills prevent the common failures at generation time; the layered workflow below is what actually tells you whether the thing works.

---

## An honest note on automated testing

Automated tools are necessary and nowhere near sufficient. Depending on whose research you read, automated scanning catches somewhere in the range of **a third to a half** of WCAG issues — and the ones it catches are the mechanical ones: missing `alt`, missing labels, contrast failures, duplicate IDs.

It cannot tell you whether your alt text is *meaningful*. It cannot tell you whether your focus order makes *sense*. It cannot tell you whether your error message actually explains how to fix the error. It will pass a perfectly keyboard-navigable form that no screen reader user can complete.

So the workflow has to be layered:

1. **Skills** — prevent the common failures at generation time
2. **Automated scanning** — catch the mechanical failures in CI, every commit
3. **Keyboard-only testing** — every interactive flow, no mouse, no exceptions
4. **Screen reader testing** — at minimum two (NVDA + VoiceOver, or NVDA + JAWS)
5. **Testing with disabled users** — the only step that actually tells you if it works

Anyone selling you step 2 as the whole solution is selling you a compliance theater subscription.

---

## Accessibility of this repo

This repository practices what it documents. Markdown here uses real heading hierarchy with no skipped levels, descriptive link text (never "click here"), alt text on every image, and tables with genuine header rows rather than ASCII art. If you find something in these files that fails its own guidance, [open an issue](https://github.com/jeffjbernier/Accessible-Vibe-Coding/issues) — that's a legitimate bug.

---

## Contributing

Contributions are welcome, especially:

- Corrections — if something here is wrong, say so. Accessibility guidance ages, and wrong guidance is worse than none.
- New ARIA or keyboard patterns with working examples
- Automation recipes for frameworks and CI systems not yet covered
- Real-world reports of AI assistants producing inaccessible output, and the rule that fixed it

Open an issue before a large pull request so we can agree on scope.

One rule for pull requests: **everything under `rules/` is generated — never edit those files directly.** Change the skill in `skills/<name>/SKILL.md`, rebuild with `node tools/build-rules.mjs`, and commit both. CI fails the build if the two disagree.

[CONTRIBUTING.md](CONTRIBUTING.md) covers the rebuild in full — prerequisites, the verify-only `--check` mode, what the generator does to each file, what the two build failures mean, and how to add a new skill.

---

## License

This repository is dual-licensed.

- **Skills, code, and examples** — [MIT](LICENSE). Copy them into your projects, commercial or otherwise, no attribution required in your shipped product.
- **Prose documentation and guides** — [CC BY 4.0](LICENSE-DOCS.md). Reuse and adapt freely; credit the source.

In short: take the code and run. Credit the writing.

---

## Author

Built and maintained by Jeff Bernier — [Computer Consulting Wizards](https://ccwizards.com).

## Further reading

- [WCAG 2.2 specification](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [Deque axe-core](https://github.com/dequelabs/axe-core)
