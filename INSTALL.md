# Installing these skills

These are plain [Agent Skills](https://code.claude.com/docs/en/skills) — a folder with a `SKILL.md` inside it. There is no plugin, no marketplace, and nothing to build. You copy a folder into place and Claude picks it up.

Three skills ship here:

| Skill | What it does |
| --- | --- |
| `accessibility-rules` | Constrains any UI, page, component, or markup the assistant generates |
| `form-rules` | Constrains forms, form fields, and single-record display pages |
| `nvda-scan` | Drives a live NVDA screen-reader session over a page in Chrome. Windows only, and it needs the nvda-mcp server from [guides/automate-nvda-testing.md](guides/automate-nvda-testing.md) before it can connect |

They work independently. Install any or all.

Three slash commands ship in `skills/` as well. They are skills too, in the same folder shape, but they carry `disable-model-invocation: true` so they only run when you type them:

| Command | What it does |
| --- | --- |
| `/a11y-scan` | Scans a target for WCAG 2.2 AA violations and reports each with a fix |
| `/aria-fix` | Fixes semantic HTML, ARIA, and keyboard handling in one file |
| `/a11y-report` | Writes the findings up as a report with remediation code |

Copy them exactly like the other skills. Two agent definitions ship alongside everything; see [Agents](#agents) below.

Cursor, Windsurf, and Copilot don't load Agent Skills. For those, the repo ships the two rulesets as standalone files in `rules/` — see [Cursor, Windsurf, and Copilot](#cursor-windsurf-and-copilot) below. `nvda-scan` has no rules-file form; it only runs inside Claude Code.

---

## Claude Code

### Where skills live

| Scope | Location | Applies to |
| --- | --- | --- |
| Personal | `~/.claude/skills/<skill-name>/` | Every project on your machine |
| Personal (Windows) | `%USERPROFILE%\.claude\skills\<skill-name>\` | Every project on your machine |
| Project | `<repo>/.claude/skills/<skill-name>/` | That repo only, and it's committable |

Each skill needs its **own directory**, and the directory name should match the `name` in the skill's frontmatter. So `accessibility-rules/SKILL.md`, not a loose `SKILL.md` or a renamed folder.

Use personal scope if you want accessible output everywhere. Use project scope if you want the rules checked into the repo so your whole team — and CI agents — get them too.

### Install — macOS and Linux

```bash
git clone https://github.com/jeffjbernier/Accessible-Vibe-Coding.git
mkdir -p ~/.claude/skills
cp -r Accessible-Vibe-Coding/skills/accessibility-rules ~/.claude/skills/
cp -r Accessible-Vibe-Coding/skills/form-rules ~/.claude/skills/
```

For a single project instead, swap the destination:

```bash
mkdir -p .claude/skills
cp -r Accessible-Vibe-Coding/skills/accessibility-rules .claude/skills/
cp -r Accessible-Vibe-Coding/skills/form-rules .claude/skills/
```

`nvda-scan` is Windows-only, so it is left out of these two blocks. The PowerShell block below includes it. The slash commands copy the same way; add a line per command you want:

```bash
cp -r Accessible-Vibe-Coding/skills/a11y-scan ~/.claude/skills/
cp -r Accessible-Vibe-Coding/skills/aria-fix ~/.claude/skills/
cp -r Accessible-Vibe-Coding/skills/a11y-report ~/.claude/skills/
```

### Install — Windows PowerShell

```powershell
git clone https://github.com/jeffjbernier/Accessible-Vibe-Coding.git
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse Accessible-Vibe-Coding\skills\accessibility-rules "$env:USERPROFILE\.claude\skills\"
Copy-Item -Recurse Accessible-Vibe-Coding\skills\form-rules "$env:USERPROFILE\.claude\skills\"
Copy-Item -Recurse Accessible-Vibe-Coding\skills\nvda-scan "$env:USERPROFILE\.claude\skills\"
```

Skip the last line if you don't run NVDA. The skill loads either way, but it can't do anything until the MCP server in [guides/automate-nvda-testing.md](guides/automate-nvda-testing.md) is registered.

### No clone, just the files

Download the repo as a ZIP from GitHub, expand it, and drag the skill folders you want out of `skills/` and into `~/.claude/skills/` (or `%USERPROFILE%\.claude\skills\`). Same result.

### Verify

Run `/skills` in Claude Code. Every skill you copied should appear with its description and the path it loaded from. The slash commands also show up in the `/` menu as you type. No restart needed — Claude Code reads the skills directory on demand, so a freshly copied folder shows up in the session you're already in.

If a skill is missing, check that the path is `<skill-name>/SKILL.md` with the file named in caps, and that the frontmatter opens on line 1 with `---`.

### When names collide

If the same skill name exists in more than one place, Claude Code resolves in this order:

1. Enterprise-managed skills
2. Personal (`~/.claude/skills/`)
3. Project (`.claude/skills/`)

Local skills also win over plugin-provided and account-synced skills of the same name. So a project copy will not silently override your personal copy — if you edit one, edit the one that's actually winning.

### Making the rules a gate

Installed as a skill, `accessibility-rules` is advisory: Claude loads it when it judges the task to be UI work, which is most of the time but not all of it. Two lines in `CLAUDE.md` turn it into a gate.

**1. Load the rules on every turn.** Copy the generated rules file next to your `CLAUDE.md` and import it:

```bash
mkdir -p ~/.claude/rules
cp Accessible-Vibe-Coding/rules/accessibility-rules.md ~/.claude/rules/
```

Then add one line to `~/.claude/CLAUDE.md`:

```markdown
@rules/accessibility-rules.md
```

The `@` import resolves relative to the `CLAUDE.md` that contains it, so the same line works in a project `CLAUDE.md` with the file at `<repo>/rules/accessibility-rules.md`. The cost is real: the file is about 17 KB, roughly 4,000 tokens on every turn. If that matters, skip this step and rely on the skill firing.

**2. Put it in the definition of done.** Wherever your `CLAUDE.md` says what "done" means, add:

```markdown
- For any user-facing UI change: `axe-check.js` reports zero WCAG 2.2 AA
  violations, and a keyboard-only pass of the affected flow succeeds (every
  control reachable by Tab, operable by Enter, Space, or arrows, focus visible
  throughout).
```

`axe-check.js` ships inside the skill at `skills/accessibility-rules/scripts/`. It takes a URL or a local HTML file, defaults to the WCAG 2.2 AA rule set, and exits non-zero on violations. It needs `playwright` and `axe-core` installed in the project being scanned.

With both lines in place, Claude reads the rules whether or not it decides the task is UI work, and cannot report a UI change as finished without running the check.

---

## Agents

Two agent definitions ship in `agents/`. They are plain markdown files with frontmatter, one per agent, and Claude Code loads them from either scope:

| Scope | Location |
| --- | --- |
| Personal | `~/.claude/agents/<name>.md` |
| Project | `<repo>/.claude/agents/<name>.md` |

```bash
mkdir -p ~/.claude/agents
cp Accessible-Vibe-Coding/agents/accessibility-specialist.md ~/.claude/agents/
cp Accessible-Vibe-Coding/agents/ux-design-agent.md ~/.claude/agents/
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\agents"
Copy-Item Accessible-Vibe-Coding\agents\*.md "$env:USERPROFILE\.claude\agents\"
```

Run `/agents` to confirm they loaded. Claude picks one on its own when a task matches its description, or you can name it: "use the ux-design-agent to review the checkout page."

Neither file sets `model`, so each agent inherits the model your session is running. Add a `model:` line to the frontmatter if you want one pinned; the accepted values are in the [Claude Code subagent docs](https://code.claude.com/docs/en/sub-agents).

`ux-design-agent` has no `Write` or `Edit` in its tool list on purpose. It reports; it never changes code. Keep it that way if you fork it.

---

## Claude Desktop and claude.ai

These surfaces take an uploaded skill rather than a filesystem path. Package the skill folder as a ZIP with the **folder itself at the root of the archive** — the archive should contain `accessibility-rules/SKILL.md`, not a bare `SKILL.md`.

macOS and Linux:

```bash
cd Accessible-Vibe-Coding/skills
zip -r accessibility-rules.zip accessibility-rules
zip -r form-rules.zip form-rules
```

Windows PowerShell:

```powershell
cd Accessible-Vibe-Coding\skills
Compress-Archive -Path accessibility-rules -DestinationPath accessibility-rules.zip
Compress-Archive -Path form-rules -DestinationPath form-rules.zip
```

Then upload each ZIP from the Skills section of your settings (under Capabilities). Anthropic moves this UI around between releases, so if the labels don't match what you see, look for "Skills" in settings and follow the upload prompt there.

A skill uploaded this way syncs to your account, which means it also reaches Cowork and cloud sessions — not just the desktop app.

---

## Cursor, Windsurf, and Copilot

These tools read a rules file, not a skill. `rules/accessibility-rules.md` and `rules/form-rules.md` hold the same content as the skills with the frontmatter stripped and every repo-relative path rewritten to an absolute URL, so they keep working once copied out of this repo.

The body is the same everywhere. What changes is the destination and the frontmatter you put on top. This section is the short version. For what each tool actually does with the file, the size caps that silently truncate it, and how to confirm it fired, read [guides/using-rules-in-other-tools.md](guides/using-rules-in-other-tools.md).

### Cursor

Copy into `.cursor/rules/` in your project and rename to `.mdc`:

```bash
mkdir -p .cursor/rules
cp Accessible-Vibe-Coding/rules/accessibility-rules.md .cursor/rules/accessibility-rules.mdc
cp Accessible-Vibe-Coding/rules/form-rules.md .cursor/rules/form-rules.mdc
```

Then add Cursor's frontmatter at the top of each file. For an always-on ruleset:

```markdown
---
description: Accessibility rules — WCAG 2.2 AA
alwaysApply: true
---
```

Set `alwaysApply: true` for `accessibility-rules`, since the whole point is that it fires on any markup generation without being asked. For `form-rules`, either set it too, or scope it with `globs` to your template and component paths and let Cursor attach it when those files are in play.

### Windsurf

Windsurf reads `.devin/rules/*.md`, with `.windsurf/rules/*.md` still honored as a fallback:

```bash
mkdir -p .devin/rules
cp Accessible-Vibe-Coding/rules/accessibility-rules.md .devin/rules/
cp Accessible-Vibe-Coding/rules/form-rules.md .devin/rules/
```

Windsurf's frontmatter uses `trigger:` rather than Cursor's boolean:

```markdown
---
trigger: always_on
---
```

The other modes are `model_decision`, `glob` (which also needs a `globs:` pattern), and `manual`. Use `always_on` for accessibility.

### GitHub Copilot

Copilot reads `.github/copilot-instructions.md` for the whole repo, and `.github/instructions/*.instructions.md` for path-scoped rules. For repo-wide coverage, append the rules file to the instructions file — Copilot takes plain markdown with no frontmatter there:

```bash
mkdir -p .github
cat Accessible-Vibe-Coding/rules/accessibility-rules.md >> .github/copilot-instructions.md
```

For path-scoped coverage, copy it in as its own file and add the `applyTo` glob:

```markdown
---
applyTo: "app/views/**/*.erb"
---
```

### Anything else

Any assistant that accepts a plain markdown instruction file takes these unmodified — `AGENTS.md`, `CLAUDE.md`, an appended house style guide. The content carries no tool-specific syntax.

### Keeping them current

The rules files are generated from the skills. Don't edit your copy expecting an update to preserve it, and don't send a pull request against `rules/` — the fix belongs in `skills/<name>/SKILL.md`, which the generator reads. To refresh your copy, `git pull` and re-copy, the same as the skills.

If you've forked and changed a skill, rebuild before copying out:

```bash
node tools/build-rules.mjs
```

Node 18+, no dependencies, nothing to install. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full procedure.

---

## Claude Agent SDK

The SDK loads skills from the same directories, but only when you tell it to read those setting sources:

```python
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],
    skills=["accessibility-rules", "form-rules"],
)
```

Pass `skills="all"` to expose everything found on disk. Confirm what loaded by reading the `skills` array in the `system` / `init` message. There is no API for registering a skill in memory — it has to exist as files on disk.

---

## Updating

Skills are just files, so updating is a re-copy:

```bash
cd Accessible-Vibe-Coding && git pull
cp -r skills/accessibility-rules ~/.claude/skills/
cp -r skills/form-rules ~/.claude/skills/
cp agents/*.md ~/.claude/agents/
```

For a rules-file install, re-copy from `rules/` into whichever destination you used above.

If you've edited a skill locally, `git pull` won't touch your copy under `~/.claude/skills/` — diff the two before overwriting so you don't lose your changes.

## Uninstalling

Delete the skill's directory:

```bash
rm -rf ~/.claude/skills/accessibility-rules
```

For an uploaded skill, remove it from the Skills section of settings.

---

## Troubleshooting

**The skill doesn't show up in `/skills`.** The file must be `SKILL.md` — caps matter on Linux and macOS. It must sit directly inside the skill folder, not in a subdirectory. And the folder must be inside a `skills/` directory that is itself inside `.claude/`.

**The skill shows up but never fires.** These skills trigger on descriptions, not keywords you type. `accessibility-rules` is written to fire on any UI or markup generation even when nobody says "accessibility." If it's staying quiet, you can force it by name: "use the accessibility-rules skill." Persistent under-triggering usually means the description needs to be pushier, which is a legitimate issue to open.

**Both skills fired and gave conflicting guidance.** They're designed to overlap. `form-rules` is the source of truth for anything form-related — layout, tokens, and the error pattern — and `accessibility-rules` covers everything else. Where they disagree on a form, `form-rules` wins.

**I installed it at project scope and my teammate doesn't have it.** Commit `.claude/skills/` to the repo. It's checked-in configuration, same as `.editorconfig`.
