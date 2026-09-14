# Installing these skills

These are plain [Agent Skills](https://code.claude.com/docs/en/skills) — a folder with a `SKILL.md` inside it. There is no plugin, no marketplace, and nothing to build. You copy a folder into place and Claude picks it up.

Two skills ship here:

| Skill | What it constrains |
| --- | --- |
| `accessibility-rules` | Any UI, page, component, or markup the assistant generates |
| `form-rules` | Forms, form fields, and single-record display pages |

They work independently. Install one or both.

Cursor, Windsurf, and Copilot don't load Agent Skills. For those, the repo ships the same two rulesets as standalone files in `rules/` — see [Cursor, Windsurf, and Copilot](#cursor-windsurf-and-copilot) below.

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
git clone https://github.com/jeffbernier/accessible-vibe-coding.git
mkdir -p ~/.claude/skills
cp -r accessible-vibe-coding/skills/accessibility-rules ~/.claude/skills/
cp -r accessible-vibe-coding/skills/form-rules ~/.claude/skills/
```

For a single project instead, swap the destination:

```bash
mkdir -p .claude/skills
cp -r accessible-vibe-coding/skills/accessibility-rules .claude/skills/
cp -r accessible-vibe-coding/skills/form-rules .claude/skills/
```

### Install — Windows PowerShell

```powershell
git clone https://github.com/jeffbernier/accessible-vibe-coding.git
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse accessible-vibe-coding\skills\accessibility-rules "$env:USERPROFILE\.claude\skills\"
Copy-Item -Recurse accessible-vibe-coding\skills\form-rules "$env:USERPROFILE\.claude\skills\"
```

### No clone, just the files

Download the repo as a ZIP from GitHub, expand it, and drag the `accessibility-rules` and `form-rules` folders out of `skills/` and into `~/.claude/skills/` (or `%USERPROFILE%\.claude\skills\`). Same result.

### Verify

Run `/skills` in Claude Code. Both skills should appear with their descriptions and the path they loaded from. No restart needed — Claude Code reads the skills directory on demand, so a freshly copied folder shows up in the session you're already in.

If a skill is missing, check that the path is `<skill-name>/SKILL.md` with the file named in caps, and that the frontmatter opens on line 1 with `---`.

### When names collide

If the same skill name exists in more than one place, Claude Code resolves in this order:

1. Enterprise-managed skills
2. Personal (`~/.claude/skills/`)
3. Project (`.claude/skills/`)

Local skills also win over plugin-provided and account-synced skills of the same name. So a project copy will not silently override your personal copy — if you edit one, edit the one that's actually winning.

---

## Claude Desktop and claude.ai

These surfaces take an uploaded skill rather than a filesystem path. Package the skill folder as a ZIP with the **folder itself at the root of the archive** — the archive should contain `accessibility-rules/SKILL.md`, not a bare `SKILL.md`.

macOS and Linux:

```bash
cd accessible-vibe-coding/skills
zip -r accessibility-rules.zip accessibility-rules
zip -r form-rules.zip form-rules
```

Windows PowerShell:

```powershell
cd accessible-vibe-coding\skills
Compress-Archive -Path accessibility-rules -DestinationPath accessibility-rules.zip
Compress-Archive -Path form-rules -DestinationPath form-rules.zip
```

Then upload each ZIP from the Skills section of your settings (under Capabilities). Anthropic moves this UI around between releases, so if the labels don't match what you see, look for "Skills" in settings and follow the upload prompt there.

A skill uploaded this way syncs to your account, which means it also reaches Cowork and cloud sessions — not just the desktop app.

---

## Cursor, Windsurf, and Copilot

These tools read a rules file, not a skill. `rules/accessibility-rules.md` and `rules/form-rules.md` hold the same content as the skills with the frontmatter stripped and every repo-relative path rewritten to an absolute URL, so they keep working once copied out of this repo.

The body is the same everywhere. What changes is the destination and the frontmatter you put on top.

### Cursor

Copy into `.cursor/rules/` in your project and rename to `.mdc`:

```bash
mkdir -p .cursor/rules
cp accessible-vibe-coding/rules/accessibility-rules.md .cursor/rules/accessibility-rules.mdc
cp accessible-vibe-coding/rules/form-rules.md .cursor/rules/form-rules.mdc
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
cp accessible-vibe-coding/rules/accessibility-rules.md .devin/rules/
cp accessible-vibe-coding/rules/form-rules.md .devin/rules/
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
cat accessible-vibe-coding/rules/accessibility-rules.md >> .github/copilot-instructions.md
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
cd accessible-vibe-coding && git pull
cp -r skills/accessibility-rules ~/.claude/skills/
cp -r skills/form-rules ~/.claude/skills/
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
