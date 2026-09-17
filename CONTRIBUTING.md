# Contributing

Contributions are welcome, especially:

- Corrections — if something here is wrong, say so. Accessibility guidance ages, and wrong guidance is worse than none.
- New ARIA or keyboard patterns with working examples
- Automation recipes for frameworks and CI systems not yet covered
- Real-world reports of AI assistants producing inaccessible output, and the rule that fixed it

Open an issue before a large pull request so we can agree on scope.

---

## The one rule: `rules/` is generated

| Path | Status |
| --- | --- |
| `skills/<name>/SKILL.md` | Source of truth. Edit this. |
| `skills/<name>/references/`, `skills/<name>/scripts/` | Source. Edit these. |
| `rules/<name>.md` | **Generated output. Never edit.** |

Every file in `rules/` is built from the matching skill by `tools/build-rules.mjs`. A hand edit there survives exactly until the next build, and CI will reject it before that. If a rules file is wrong, the skill is wrong — fix the skill.

---

## Rebuilding the rules files

### Prerequisites

Node 18 or newer. That's all. The generator has no dependencies, there is no `package.json`, and there is nothing to install — this repo still has no build step for people *using* it, only for people maintaining it.

### Rebuild

From the repo root:

```bash
node tools/build-rules.mjs
```

It prints one line per file:

```text
wrote rules/accessibility-rules.md (18166 bytes)
wrote rules/form-rules.md (21084 bytes)
```

### Verify without writing

```bash
node tools/build-rules.mjs --check
```

This regenerates in memory and compares against what's on disk, writing nothing. It exits `0` when everything matches and `1` when a file is stale, naming each one. This is what CI runs.

### The normal loop

1. Edit `skills/<name>/SKILL.md`.
2. Run `node tools/build-rules.mjs`.
3. Commit the skill **and** the regenerated rules file in the same commit.

Skipping step 2 is the common mistake. The `rules in sync` workflow catches it on every pull request that touches `skills/`, `rules/`, or the generator itself.

---

## What the generator does

For each skill it:

1. **Strips the YAML frontmatter.** Rules files carry no frontmatter — each target tool wants its own, and `INSTALL.md` documents what to add for Cursor, Windsurf, and Copilot.
2. **Promotes `description` into the body.** That field is what makes a skill fire, so it becomes a visible "When this applies" blockquote under the H1. Without it a rules file would ship with nothing telling the assistant when to apply.
3. **Rewrites repo-relative paths to absolute URLs.** `references/markup.md` and `scripts/*.js` resolve fine inside this repo and point at nothing once someone copies a rules file into their own project, so they become `blob/HEAD` links — GitHub resolves `HEAD` to whatever the default branch is called, so the links survive a branch rename.
4. **Adds a do-not-edit banner** naming the source file and the rebuild command.

---

## When the build fails

The generator fails loudly rather than shipping a broken rules file. Two errors are worth recognizing.

**`rewrite target not found`** — you edited a passage in a skill that the generator rewrites, so it no longer matches. The error quotes what it looked for. Open `tools/build-rules.mjs`, find that entry in the `rewrites` table, and update the `from` string to your new wording:

```text
Error: skills/form-rules/SKILL.md: rewrite target not found.
  Looked for: "live in `references/markup.md`. Read that file"...
```

This is the guard working. It means a path that would have pointed nowhere got caught before it shipped.

**`would ship repo-relative paths`** — you added a new reference to `scripts/…` or `references/…` in a skill and nothing rewrites it yet. Add an entry to the `rewrites` table turning it into an absolute URL.

Both are one-line fixes in the rewrites table. Neither is a reason to edit the generated file directly.

---

## Adding a new skill

Create `skills/<name>/SKILL.md` with the same frontmatter shape the existing two use — `name`, `description`, `license`, and `metadata` carrying `version` and `source`. The generator discovers skills by directory, so it picks the new one up with no configuration and writes `rules/<name>.md` on the next build.

If the new skill references its own `scripts/` or `references/` files, add a `rewrites` entry for each before the first build; the dangling-path check will fail until you do.

If the skill is a procedure rather than a ruleset — a slash command someone types, like `a11y-scan`, or a skill that drives a live tool, like `nvda-scan` — add its name to `NO_RULES_FILE` in `tools/build-rules.mjs` instead. No rules file is generated for it, and CI does not expect one. Slash commands also set `disable-model-invocation: true` in their frontmatter so they never fire on their own and never compete with `accessibility-rules` for a trigger.

## Adding an agent

Agent definitions live in `agents/<name>.md`, one file each, with `name`, `description`, and `tools` in the frontmatter. Leave `model` out so the agent inherits whatever the user's session runs; a pinned model name goes stale. A reviewer agent should not have `Write` or `Edit` in its tool list. An agent that needs the rules lists the skills under `skills:` in its frontmatter and does not restate them; a restated rule is a second copy that drifts. The generator ignores `agents/`.

---

## Repo conventions

This repository practices what it documents. Markdown here uses real heading hierarchy with no skipped levels, descriptive link text (never "click here"), alt text on every image, and tables with genuine header rows rather than ASCII art. If you find something that fails its own guidance, that's a legitimate bug — open an issue.

---

## License

By contributing you agree your contribution ships under this repo's existing terms: [MIT](LICENSE) for skills, code, and examples, [CC BY 4.0](LICENSE-DOCS.md) for prose documentation and guides.
