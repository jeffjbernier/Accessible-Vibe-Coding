# Using These Skills and Rules in Cursor, Windsurf, and Copilot

Claude Code loads the three rulesets in this repo as [Agent
Skills](https://code.claude.com/docs/en/skills) — a folder with a `SKILL.md` in
it, discovered automatically, invoked by description. Cursor, Windsurf, and
GitHub Copilot can now load skills too; see [Skills or a rules
file?](#skills-or-a-rules-file) below. Each also reads a *rules file*: plain
markdown, a different path per tool, a different frontmatter dialect on top, and
different conditions under which it gets injected into the prompt at all.

That's what `rules/accessibility.md`, `rules/accessible-forms.md`, and
`rules/accessible-tables.md` are for. Same content as the skills, frontmatter
stripped, repo-relative paths rewritten to absolute URLs so they still resolve
once copied out.

[INSTALL.md](../INSTALL.md) has the short version — copy this file here, add
that frontmatter. This guide is the long version: what each tool actually does
with the file once it's in place, which size caps will silently truncate or
reject it, how to confirm it fired, and where each one will quietly do nothing.

---

## Skills or a rules file?

Cursor, Devin Desktop (Windsurf), and Copilot now load Agent Skills themselves.
Every skill folder in this repo can be installed in them as it is. That
includes the three slash commands (`a11y-scan`, `aria-fix`, `a11y-report`) and
`nvda-scan`, which are procedures and have no rules file.

**This section comes from each tool's documentation as of October 2026. None
of it has been tested in those tools.** Check the links in [Further
reading](#further-reading) before you rely on a path.

<!-- markdownlint-disable MD013 -->
| Tool | Reads skills from | Run one by name |
| --- | --- | --- |
| Cursor | `.cursor/skills/`, `.agents/skills/`, `~/.cursor/skills/`, `~/.agents/skills/`. Also `.claude/skills/` and `~/.claude/skills/` | `/a11y-scan`, or type `@` and pick the skill |
| Copilot (VS Code, Copilot CLI, cloud agent) | `.github/skills/`, `.claude/skills/`, `.agents/skills/`, `~/.copilot/skills/`, `~/.claude/skills/`, `~/.agents/skills/` | `/a11y-scan` |
| Devin Desktop (Windsurf) | `.devin/skills/`, `.windsurf/skills/`, `.agents/skills/`, `~/.codeium/windsurf/skills/`, `~/.config/devin/skills/`, `~/.agents/skills/`. Also `.claude/skills/` and `~/.claude/skills/` when Claude Code config reading is turned on | `@a11y-scan` |
<!-- markdownlint-enable MD013 -->

All three list `.claude/skills/`, Devin Desktop only with that setting on. If
the skills are already installed there for Claude Code, these tools may pick
them up with nothing more to copy.

A skill and a rules file do different jobs:

- **A rules file set to always-on is sent with every request.** Use it when
  the rules must apply whether or not the tool decides the task is UI work.
  That is what the rest of this guide covers.
- **A skill is loaded when the tool matches its description, or when you name
  it.** It costs nothing until then, and the tool can miss it. The procedures
  only make sense this way: nobody wants "scan this target" in every request.

### What does not carry over

- **`$ARGUMENTS` is Claude Code syntax.** The slash commands use it for the
  text typed after the command. Copilot's page says extra text after the
  command is passed along as context. Cursor's and Devin's pages do not say
  what happens to it, and none of the three describes replacing
  `$ARGUMENTS`. Name the target in your message.
- **Manual-only may not hold in Devin Desktop.** The slash commands set
  `disable-model-invocation: true`, so in Claude Code they run only when
  typed. Cursor and Copilot document that field with the same meaning.
  Devin's skills page lists only `name` and `description`, so there a command
  may run on its own when its description matches.
- **`allowed-tools` is Claude Code frontmatter.** The other tools' pages do
  not list it. Expect each tool's own permission prompts to apply.
- **Script paths assume `~/.claude/skills/`.** `a11y-scan` runs the checkers
  from that folder. Install the skills there, or adjust the paths as the
  skill says to for a project-scoped install.
- **Copilot opens a bundled file only when `SKILL.md` links to it.** The
  skills here name their `references/` files in backticks, not as links. If
  Copilot does not read one, tell it to.

### `nvda-scan` in another tool

`nvda-scan` needs three things besides the skill folder, in any tool:

1. Windows, with NVDA running. See
   [automate-nvda-testing.md](automate-nvda-testing.md).
2. The nvda-mcp server registered in that tool. The NVDA guide shows the
   Claude Code registration; Cursor, Copilot, and Devin Desktop each keep
   their own MCP server settings, so add the same server there.
3. A way to run the bundled PowerShell script that brings Chrome to the
   foreground. The skill gives the path for a `~/.claude/skills/` install.

The skill was written and measured in Claude Code. In the other tools it is
untested.

---

## What transfers, and what doesn't

Four things are true on every platform in this guide. Read them before you spend
an afternoon wondering why nothing changed.

**Rules never reach inline completions.** Cursor's docs are explicit that rules
apply to Agent chat only, not Tab, not Inline Edit, not Bugbot PR review. VS
Code's Copilot docs say the same: "Custom instructions are not taken into
account for inline suggestions as you type in the editor." Ghost text is
generated by a small, fast, context-starved model that never sees your ruleset.
Every accessible-by-default guarantee in this repo applies to what the *agent*
writes, and to nothing you autocomplete by hand.

**A rules file is a strong prior, not a compiler flag.** The model reads the
ruleset and mostly complies. It does not *validate* against it. A rule file
raises the floor; it does not guarantee the floor. That is the entire argument
for the layered workflow in the [repository README](../README.md) — automated
scanning, keyboard testing, screen reader testing, and testing with disabled
users all still apply, unchanged.

**Size caps are real and mostly silent.** Windsurf caps a workspace rule file at
12,000 characters. All three files in `rules/` exceed that today. Nothing warns
you — see [Windsurf](#3-windsurf-devin-desktop) below.

**Trigger conditions are where these actually fail.** Nearly every "the rules
aren't working" report across all three tools comes down to the file loading
fine but never being *selected* for the turn. Set the always-on trigger. Then
verify it, with the canary test in [Section 6](#6-verifying-it-actually-fired).

---

## 1. The three files, and their size

Sizes matter here in a way they don't in Claude Code, so start with the numbers.
These drift whenever the skills change; re-check after a `git pull` with `wc -c
rules/*.md`. That counts bytes rather than characters, which overcounts these
files slightly — it errs toward the safe side of a character cap.

| File | Characters | Lines |
| --- | --- | --- |
| `rules/accessibility.md` | ~23,100 | 467 |
| `rules/accessible-forms.md` | ~28,700 | 570 |
| `rules/accessible-tables.md` | ~18,950 | 365 |

Against each platform's published limit or guidance:

<!-- markdownlint-disable MD013 -->
| Platform | Published limit or guidance | Fits as-is? |
| --- | --- | --- |
| Cursor | "Keep rules under 500 lines" — guidance, not enforced | Yes. `accessible-forms.md` is over the guidance at 570 lines and still loads |
| Windsurf | 12,000 characters per workspace rule file — a hard cap | **No. Split all three.** |
| Copilot | Repo-wide instructions "no longer than 2 pages" — guidance, no published cap | Over guidance; works, see [Section 4](#4-github-copilot) |
| AGENTS.md | No limit in the convention | Yes, all three |
<!-- markdownlint-enable MD013 -->

---

## 2. Cursor

### Where the file goes in Cursor

Project rules live in `.cursor/rules/`, and **only `.mdc` files are read**. A
`.md` file in that folder is ignored with no error, no warning, and no entry in
the rules pane. Renaming on copy is not cosmetic:

```bash
mkdir -p .cursor/rules
cp Accessible-Vibe-Coding/rules/accessibility.md .cursor/rules/accessibility.mdc
cp Accessible-Vibe-Coding/rules/accessible-forms.md .cursor/rules/accessible-forms.mdc
cp Accessible-Vibe-Coding/rules/accessible-tables.md .cursor/rules/accessible-tables.mdc
```

For rules that follow you across every project instead, use **Customize →
Rules** in the sidebar (stored on your Cursor account, syncs between machines)
or `~/.cursor/rules` (machine-local, does not sync). Project scope is the better
home for these two — they're checked-in configuration, and your teammates and CI
agents get them for free.

### Frontmatter, and the four behaviors it produces

Cursor has exactly three frontmatter fields — `alwaysApply`, `description`,
`globs` — and the combination decides when the rule loads:

| `alwaysApply` | `description` | `globs` | Behavior |
| --- | --- | --- | --- |
| `true` | — | — | Always included. Description and globs are ignored. |
| `false` | — | set | Attached when a matching file is in context. |
| `false` | set | — | The agent reads the description and decides. |
| `false` | — | — | Only when you `@`-mention the rule by name. |

For `accessibility`, use the first row and nothing else:

```markdown
---
alwaysApply: true
---
```

That's the whole frontmatter. Don't add a `globs` line alongside it — Cursor
staff have pointed at exactly that combination as a cause of rules failing to
inject, and globs are ignored under `alwaysApply: true` anyway.

`accessible-forms` can go either way. Always-on is the safe default. If you'd rather
scope it, drop `alwaysApply` to `false` and attach it to the paths where forms
actually live:

```markdown
---
globs: app/views/**/*.erb, src/components/**/*.tsx
alwaysApply: false
---
```

**Glob syntax is the single most common way to break this.** Cursor's
frontmatter is not strictly YAML. Globs are a bare comma-separated list — no
brackets, no quotes. `globs: ["src/**/*.tsx"]` and `globs: "src/**/*.tsx"` both
parse to something that matches nothing, silently. You will find community posts
recommending the array form; they're wrong, and Cursor staff have said so
directly.

The third row of that table — description-only, "apply intelligently" — is a
coin flip for a ruleset like this, and not one worth taking. The premise of
`accessibility` is that it fires when nobody mentioned accessibility.
Handing the model a description and asking it to notice is the exact failure
mode the skill was written to prevent.

### Length

Cursor's documented guidance is 500 lines per rule. `accessibility.md`
and `accessible-tables.md` clear it. `accessible-forms.md` is over it at 570 lines;
the guidance is not enforced, and the file still loads whole. If you would
rather stay under it, split that file by section rather than letting one file
sprawl — `.cursor/rules/` supports subfolders, and rules are identified by full
path, so same-named files in different folders don't collide.

### `.cursorrules` is legacy

The old root-level `.cursorrules` file is still read but on the way out, and the
current docs have dropped it entirely. One trap worth knowing: if
`.cursor/rules/*.mdc` files exist, they win, and `.cursorrules` looks like it's
being ignored. If you're migrating, move the content into a `.mdc` and delete
the old file rather than keeping both.

---

## 3. Windsurf (Devin Desktop)

Windsurf is now Devin Desktop under Cognition, and `docs.windsurf.com` redirects
to `docs.devin.ai/desktop/`. The product still works the way you remember; the
paths and the docs URL moved.

### Where the file goes in Windsurf

<!-- markdownlint-disable MD013 -->
| Path | Status |
| --- | --- |
| `.devin/rules/*.md` | Current. Write here. |
| `.windsurf/rules/*.md` | Legacy fallback, still read |
| `.windsurfrules` (single root file) | Legacy, still read |
| `~/.codeium/windsurf/memories/global_rules.md` | Global rules, 6,000 character cap |
<!-- markdownlint-enable MD013 -->

`.devin/` takes precedence, and both directories load together.

### Frontmatter

Windsurf uses `trigger:` where Cursor uses a boolean:

```markdown
---
trigger: always_on
---
```

The four values are `always_on`, `glob` (which also needs a `globs:` line),
`model_decision` (which needs a `description:` for the model to decide on), and
`manual` (activated by typing `@rule-name`). Use `always_on` for accessibility,
for the same reason as Cursor.

### The 12,000-character cap — every file needs splitting

This is the one real obstacle in this guide. Windsurf caps each workspace rule
file at 12,000 characters. `accessibility.md` is ~23,100,
`accessible-forms.md` is ~28,700, and `accessible-tables.md` is ~18,950. Over the
cap, the tail is not honored, and nothing tells you which part the model got.

Split each at section boundaries, repeating the header block so every later
part still carries its own "when this applies" framing:

```bash
mkdir -p .devin/rules
R=Accessible-Vibe-Coding/rules

split_rules() {  # <rules file> <heading level> <heading starting part 2> ...
  name=$1; level=$2; src=$R/$name.md; shift 2
  head_end=$(( $(grep -n -m1 '^## ' "$src" | cut -d: -f1) - 1 ))
  start=1; part=1
  for heading in "$@" ''; do
    out=.devin/rules/$name-$part.md
    if [ "$part" -gt 1 ]; then sed -n "1,${head_end}p" "$src"; fi > "$out"
    if [ -z "$heading" ]; then sed -n "${start},\$p" "$src" >> "$out"; break; fi
    at=$(grep -n -m1 "^$level $heading" "$src" | cut -d: -f1)
    sed -n "${start},$((at - 1))p" "$src" >> "$out"
    start=$at; part=$((part + 1))
  done
}

split_rules accessibility '##' 'Step indicators' 'Touch and pointer'
split_rules accessible-forms '##' '6\. ' '8\. ' '10\. '
split_rules accessible-tables '###' '6\. '
```

Each call names the file, the heading level to split at, and the heading that
starts each later part:

- The accessibility rules split in three, before "Step indicators" and before
  "Touch and pointer".
- The forms rules split in four, before sections 6, 8, and 10.
- The tables rules split in two, before step 6 of the Workflow. That step is a
  `###` heading; a split at any `##` heading leaves part one over the cap.

That makes nine files between roughly 6,500 and 11,800 characters with
frontmatter on, each under the cap.

Add `trigger: always_on` frontmatter to every part, then confirm nothing crept
over:

```bash
wc -c .devin/rules/*.md
```

**The split finds each heading by name, so it survives lines moving. It does not
survive growth.** Part two of the tables rules sits about 230 bytes under the
cap by `wc -c`; every other part has at least 1,600 to spare. Re-run it after
every `git pull`. If a part is over 12,000, move that split to an earlier
heading, or add another heading to the call to cut one more part. If a heading
has been renamed, `sed` prints an error and the parts for that file come out
incomplete.

---

## 4. GitHub Copilot

Copilot has more instruction file types than the other two, and they are not
supported evenly across IDEs. The distinction matters more than the syntax.

### Repo-wide: `.github/copilot-instructions.md`

This is the only instruction type GitHub supports on every surface — github.com
chat, VS Code, Visual Studio, JetBrains, Xcode, Eclipse, the Copilot coding
agent, and Copilot code review. If you install one thing, install this one:

```bash
mkdir -p .github
cat Accessible-Vibe-Coding/rules/accessibility.md >> .github/copilot-instructions.md
```

No frontmatter; Copilot takes plain markdown here. The setting that governs it,
`github.copilot.chat.codeGeneration.useInstructionFiles`, defaults to on, so
there's nothing to enable unless someone turned it off.

GitHub's guidance is that this file should be "no longer than 2 pages." All
three rulesets blow past that, and there's no published hard cap to hit. In
practice a long repo-wide instruction file works; the cost is dilution, since every
instruction competes for the model's attention on every request. If you're
appending all three rulesets plus your own house style, put `accessibility`
here and scope `accessible-forms` and `accessible-tables` by path instead.

### Path-scoped: `.github/instructions/*.instructions.md`

Supported in VS Code, Visual Studio, JetBrains, Xcode, the coding agent, and
code review — but **not** in github.com chat. Good fit for `accessible-forms`
and `accessible-tables`:

```bash
mkdir -p .github/instructions
cp Accessible-Vibe-Coding/rules/accessible-forms.md \
   .github/instructions/accessible-forms.instructions.md
cp Accessible-Vibe-Coding/rules/accessible-tables.md \
   .github/instructions/accessible-tables.instructions.md
```

Then add the `applyTo` glob at the top. Multiple patterns go comma-separated
*inside one string*:

```markdown
---
applyTo: "app/views/**/*.erb,src/components/**/*.tsx"
---
```

`applyTo: "**"` makes it universal. Omit `applyTo` entirely and the file becomes
manual-attach only, which is almost never what you want here.

### JetBrains

The JetBrains plugin reads `.github/copilot-instructions.md`, plus a
machine-local `global-copilot-instructions.md` for rules you want in every
project. Both are on by default once the file exists.

GitHub's support matrix also lists JetBrains as supporting path-scoped
`.instructions.md` and `AGENTS.md`, but the IDE-specific how-to page documents
neither. The matrix is the newer source and probably right — test `applyTo` with
the canary below before you depend on it in JetBrains.

### What Copilot won't do

Inline completions, as covered up top. Also worth knowing: VS Code's
`chat.promptFilesLocations` and `chat.instructionsFilesLocations` settings both
carry deprecation notices pointing toward skills, so the VS Code customization
surface is in motion. `.github/copilot-instructions.md` is the stable choice
while that settles.

---

## 5. AGENTS.md — the widest reach for the least work

[AGENTS.md](https://agents.md/) is a plain markdown file at the project root
with no frontmatter and no schema — "a README for agents." It is read by Copilot
(every surface but Visual Studio), Windsurf/Devin, Cursor, Codex, Jules, Junie,
Aider, Zed, RooCode, and a long tail of others, across tens of thousands of
projects.

If you support a mixed team on mixed tools, this is the highest-leverage single
file in this guide:

```bash
cat Accessible-Vibe-Coding/rules/accessibility.md >> AGENTS.md
cat Accessible-Vibe-Coding/rules/accessible-forms.md >> AGENTS.md
cat Accessible-Vibe-Coding/rules/accessible-tables.md >> AGENTS.md
```

Agents read the nearest `AGENTS.md` up the directory tree, so a package-level
file overrides the root for that package. Cursor also treats `CLAUDE.md` this
way — and applies it unconditionally, regardless of any `alwaysApply` setting.

The tradeoff is that AGENTS.md is always-on and unscoped by design. There's no
way to attach `accessible-forms` only to your template directory. For a repo where
forms are most of the surface, that's fine. For a large repo where they aren't,
the path-scoped options above are the better tool.

---

## 6. Verifying it actually fired

Each platform gives you something, and none of it is great.

<!-- markdownlint-disable MD013 -->
| Platform | What it shows you |
| --- | --- |
| Cursor | The context indicator tooltip in the composer lists active rules for the conversation — though it truncates when you have many. **Customize → Rules** lists everything loaded and its type. |
| Windsurf | **Customizations → Rules** panel shows what's loaded. No per-response attribution. |
| Copilot | The **References** list on a chat response names `.github/copilot-instructions.md` when the instructions were included in the prompt. Same in VS Code and JetBrains. |
<!-- markdownlint-enable MD013 -->

None of those tell you the model *complied*. For that, and for anything
AGENTS.md, use a canary. Temporarily add one line to the top of the rules file:

```markdown
Begin your first reply in every conversation with the word: CONFIRMED
```

Open a fresh chat — not a continued one — ask for anything, and look for the
word. Delete the line once you've seen it. It's crude and it is the only signal
that survives every platform in this guide.

If the canary doesn't appear, work through these in order: wrong extension
(`.md` in `.cursor/rules/`), malformed frontmatter (a missing closing `---`
means the file silently doesn't load), bracketed or quoted globs, a size cap
you're over, or a trigger set to something other than always-on.

---

## 7. Which destination to use

<!-- markdownlint-disable MD013 -->
| Your setup | Install this |
| --- | --- |
| Cursor only | `.cursor/rules/*.mdc`, `alwaysApply: true` |
| Windsurf only | `.devin/rules/*.md`, `trigger: always_on`, split under 12,000 chars |
| Copilot, one IDE | `.github/copilot-instructions.md` + path-scoped `accessible-forms` |
| Copilot across IDEs | `.github/copilot-instructions.md` only — the one type supported everywhere |
| Mixed team, mixed tools | `AGENTS.md` at the root, plus tool-specific files for anyone who needs scoping |
| Claude Code | The skills, not these files. See [INSTALL.md](../INSTALL.md). |
| Any of the above, for the slash commands or `nvda-scan` | The skill folders. They have no rules file. See [Skills or a rules file?](#skills-or-a-rules-file) |
<!-- markdownlint-enable MD013 -->

The rows above are for the three rulesets as always-on rules. Each tool can
also load them as skills, which costs nothing until one is used and can be
missed when the tool does not match its description.

Installing more than one is fine and usually redundant rather than harmful — a
tool reads the file it knows about and ignores the rest. The cost is drift
between copies, which the next section is about.

---

## 8. Keeping copies current

Everything under `rules/` is generated from `skills/<name>/SKILL.md` by
`tools/build-rules.mjs`. Your copies inherit that: don't edit the copy expecting
an update to preserve your changes, and don't open a pull request against
`rules/` — the fix belongs in the skill.

To refresh:

```bash
cd Accessible-Vibe-Coding && git pull
node tools/build-rules.mjs   # only if you've forked and changed a skill
```

Then re-copy into whichever destination you used, re-run the Windsurf split if
that's your platform, and re-add the frontmatter — the generator strips it, so
every copy step drops it again. If you've customized your copy, diff before
overwriting.

A note on `.mdc` specifically: the frontmatter Cursor expects isn't valid YAML,
so formatters, linters, and editors that helpfully reformat frontmatter can
rewrite `globs: a, b` into something Cursor no longer matches. After any tooling
touches a `.mdc`, reopen it as plain text and confirm the three fields survived
intact.

---

## 9. Known gotchas

- `.md` files in `.cursor/rules/` are ignored silently. The extension must be
  `.mdc`.
- Cursor globs are bare comma-separated values — no brackets, no quotes. The
  array form matches nothing and reports nothing.
- Don't pair `globs:` with `alwaysApply: true` in Cursor. The globs are ignored,
  and the combination has been implicated in rules failing to inject.
- `.cursorrules` loses to `.cursor/rules/*.mdc` when both exist, which reads as
  the legacy file being broken.
- Windsurf's cap is 12,000 characters per workspace rule file and 6,000 for
  global rules. All three files in `rules/` are over the workspace cap and must
  be split.
- Windsurf's paths moved to `.devin/rules/`. `.windsurf/rules/` and
  `.windsurfrules` still work as fallbacks, and `docs.windsurf.com` now
  redirects to `docs.devin.ai`.
- Copilot path-scoped `.instructions.md` files are not supported in github.com
  chat. Repo-wide is the only type supported on every surface.
- Copilot's `applyTo` takes multiple globs comma-separated inside a single
  quoted string, not as a list.
- No tool in this guide applies rules to inline ghost-text completions. Chat and
  agents only.
- A missing closing `---` on frontmatter means the file doesn't load, on every
  platform, with no error.
- The Windsurf split in Section 3 finds headings by name, not line number, but
  the files still grow. Re-check with `wc -c` after every rebuild.

---

## Further reading

- [Cursor — Rules](https://cursor.com/docs/rules) — frontmatter fields and rule
  types
- [Cursor — Agent Skills](https://cursor.com/docs/skills) — where Cursor reads
  skills from, its frontmatter fields, and how to run one
- [Devin Desktop — Skills](https://docs.devin.ai/desktop/cascade/skills) — the
  Windsurf skills folders
- [VS Code — Agent
  Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
  — Copilot's skills folders and frontmatter fields
- [Devin Desktop — Rules and
  memories](https://docs.devin.ai/desktop/cascade/memories) — the current
  Windsurf docs
- [GitHub — Custom instructions support
  matrix](https://docs.github.com/en/copilot/reference/custom-instructions-support)
  — which instruction type works on which surface
- [VS Code — Custom
  instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [AGENTS.md](https://agents.md/) — the cross-tool convention
- [INSTALL.md](../INSTALL.md) — Claude Code, Claude Desktop, claude.ai, and the
  Agent SDK
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — the standard these rules target
