# Contributing

Contributions are welcome, especially:

- Corrections — if something here is wrong, say so. Accessibility guidance ages,
  and wrong guidance is worse than none.
- New ARIA or keyboard patterns with working examples
- Automation recipes for frameworks and CI systems not yet covered
- Real-world reports of AI assistants producing inaccessible output, and the
  rule that fixed it

Open an issue before a large pull request so we can agree on scope.

---

## The one rule: `rules/` is generated

| Path | Status |
| --- | --- |
| `skills/<name>/SKILL.md` | Source of truth. Edit this. |
| `skills/<name>/references/`, `skills/<name>/scripts/` | Source. Edit these. |
| `rules/<name>.md` | **Generated output. Never edit.** |

Every file in `rules/` is built from the matching skill by
`tools/build-rules.mjs`. A hand edit there survives exactly until the next
build, and CI will reject it before that. If a rules file is wrong, the skill is
wrong — fix the skill.

---

## Rebuilding the rules files

### Prerequisites

Node 18 or newer. That's all. The generator has no dependencies, there is no
`package.json`, and there is nothing to install — this repo still has no build
step for people *using* it, only for people maintaining it.

### Rebuild

From the repo root:

```bash
node tools/build-rules.mjs
```

It prints one line per file:

```text
wrote rules/accessibility.md (<N> bytes)
wrote rules/accessible-forms.md (<N> bytes)
wrote rules/accessible-tables.md (<N> bytes)
```

### Verify without writing

```bash
node tools/build-rules.mjs --check
```

This regenerates in memory and compares against what's on disk, writing nothing.
It exits `0` when everything matches and `1` when a file is stale, naming each
one. It also exits `1` for a file in `rules/` that no skill produces any more,
which is what a renamed or removed skill leaves behind. This is what CI runs.

### The normal loop

1. Edit `skills/<name>/SKILL.md`.
2. Run `node tools/build-rules.mjs`.
3. Commit the skill **and** the regenerated rules file in the same commit.

Skipping step 2 is the common mistake. The `rules in sync` workflow catches it
on every pull request that touches `skills/`, `rules/`, or the generator itself.

---

## Running the tests

`tests/` holds regression tests for `skills/accessible-forms/scripts/form-check.js`
and for the table auditor in `skills/accessible-tables/scripts/`: fixture pages
each must fail or pass. Both checkers drive Chromium through Playwright, the
one thing here that needs installing. Install it without
creating a `package.json`:

```bash
npm install --no-save --no-package-lock playwright@1.63.0
npx playwright install chromium
node --test "tests/*.test.mjs"
```

The `checker tests` workflow runs the same commands on every pull request that
touches `skills/accessible-forms/`, `skills/accessible-tables/`,
`tools/build-rules.mjs`, or `tests/`. When you change what a checker flags,
add a fixture that fails before your change and passes after it.

---

## What the generator does

For each skill it:

1. **Strips the YAML frontmatter.** Rules files carry no frontmatter — each
   target tool wants its own, and `INSTALL.md` documents what to add for Cursor,
   Windsurf, and Copilot.
2. **Promotes `description` into the body.** That field is what makes a skill
   fire, so it becomes a visible "When this applies" blockquote under the H1.
   Without it a rules file would ship with nothing telling the assistant when to
   apply.
3. **Rewrites repo-relative paths to absolute URLs.** `references/markup.md` and
   `scripts/*.js` resolve fine inside this repo and point at nothing once
   someone copies a rules file into their own project, so they become
   `blob/HEAD` links — GitHub resolves `HEAD` to whatever the default branch is
   called, so the links survive a branch rename. This is automatic for any
   path in backticks that starts `scripts/` or `references/` and names a real
   file in the skill's folder. Fenced code blocks are left alone.
4. **Applies the skill's wording rewrites, if it has any.** A rules file should
   not call itself "this skill", and that wording differs per skill, so it
   lives in the `rewrites` table in `tools/build-rules.mjs`. A skill with no
   entry there builds as written.
5. **Adds a do-not-edit banner** naming the source file and the rebuild command.

---

## When the build fails

The generator fails loudly rather than shipping a broken rules file. Two errors
are worth recognizing.

**`rewrite target not found`** — you edited a passage in a skill that the
generator rewrites, so it no longer matches. The error quotes what it looked
for. Open `tools/build-rules.mjs`, find that entry in the `rewrites` table, and
update the `from` string to your new wording:

```text
Error: skills/accessible-forms/SKILL.md: rewrite target not found.
  Looked for: "live in `references/markup.md`. Read that file"...
```

This is the guard working. It means wording the rules file was meant to change
got caught before the old wording shipped.

**`points at files the skill does not have`** — the skill names a `scripts/…`
or `references/…` path in backticks, and no such file is in its folder. The
generator links those paths, so each has to be real. Fix the typo, add the
file, or reword the sentence if it means a file in the reader's own project.

Neither is a reason to edit the generated file directly.

---

## Adding a new skill

Create `skills/<name>/SKILL.md` with the same frontmatter shape the existing
rules skills use — `name`, `description`, `license`, and `metadata` carrying
`version` and `source`. The generator discovers skills by directory, so it
picks the new one up with no configuration and writes `rules/<name>.md` on the
next build.

Nothing in `tools/build-rules.mjs` has to name the new skill. Paths to its own
`scripts/` and `references/` files are linked automatically. Add a `rewrites`
entry only if a sentence should read differently in the rules file, such as one
that says "this skill".

If the skill is a procedure rather than a ruleset, it should not get a rules
file, and its own frontmatter says so:

- A slash command someone types, like `a11y-scan`, sets
  `disable-model-invocation: true`. That also stops it firing on its own and
  competing with `accessibility` for a trigger.
- A skill that drives a live tool, like `nvda-scan`, sets `rules-file: false`
  under `metadata`.

The generator skips both, and CI does not expect a rules file for either.

## Adding an agent

Agent definitions live in `agents/<name>.md`, one file each, with `name`,
`description`, and `tools` in the frontmatter. Leave `model` out so the agent
inherits whatever the user's session runs; a pinned model name goes stale. A
reviewer agent should not have `Write` or `Edit` in its tool list. An agent that
needs the rules lists the skills under `skills:` in its frontmatter and does not
restate them; a restated rule is a second copy that drifts. The generator
ignores `agents/`.

---

## Repo conventions

This repository practices what it documents. Markdown here uses real heading
hierarchy with no skipped levels, descriptive link text (never "click here"),
alt text on every image, and tables with genuine header rows rather than ASCII
art. If you find something that fails its own guidance, that's a legitimate bug
— open an issue.

Every Markdown file also passes
[markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) with its
default rules, which include an 80-column line limit. The `markdownlint`
workflow runs it on every pull request. Run the same check before you push:

```bash
npx markdownlint-cli2@0.23.2 "**/*.md" "#node_modules"
```

A table whose rows can't wrap goes between `<!-- markdownlint-disable MD013 -->`
and `<!-- markdownlint-enable MD013 -->` comments.

---

## License

By contributing you agree your contribution ships under this repo's existing
terms: [MIT](LICENSE) for skills, code, and examples, [CC BY
4.0](LICENSE-DOCS.md) for prose documentation and guides.
