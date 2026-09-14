# Automating NVDA Screen Reader Scans

Claude Code can connect to a live NVDA session through NVDA's built-in Remote Access feature, drive keyboard navigation, and report exactly what NVDA announces. That makes it possible to check a page's heading structure, form labeling, and error handling the way a screen reader user encounters them — without leaving the editor.

This guide covers the setup end to end, including the failure modes that are easy to hit and hard to diagnose. Follow the sections in order.

The bridge between the two is [nvda-mcp](https://github.com/bramd/nvda-mcp), an open-source MCP server that speaks NVDA's Remote Access protocol.

---

## What this scan does and doesn't tell you

Read this before treating a clean scan as "accessible." The tool is useful for fast triage during development. It is not an accessibility audit, and a pass here is not evidence of [WCAG 2.2](https://www.w3.org/TR/WCAG22/) conformance.

- **One screen reader, one browser, one OS.** This tests NVDA on Windows only. JAWS, VoiceOver (macOS and iOS), and TalkBack (Android) each have their own quirks and can behave differently on the same markup. A page that announces cleanly in NVDA can still fail in another combination, and the reverse.
- **It only checks what you ask it to check.** The example prompt below covers heading structure, tab order, and field labeling. It says nothing about color contrast, motion, reflow at 400% zoom, timing limits, captions, or the many other success criteria unrelated to speech output. A clean result says nothing about the axes the scan never looked at.
- **A language model is interpreting speech output, not a trained auditor.** It can miscategorize an ambiguous announcement, miss a subtle problem, or pass something that would confuse a real screen reader user. Treat findings as a starting point for investigation rather than a verdict.
- **It does not replace testing with assistive technology users.** Real users navigate in an order, at a speed, and with strategies — skip links, find-in-page, custom shortcuts — that a scripted headings-then-tab walkthrough will not surface.
- **A clean announcement is not the same as a good experience.** A control can be correctly labeled and still be slow, redundant, or disorienting to operate. The scan confirms the label exists, not that the experience works.
- **nvda-mcp is a small single-maintainer project**, not an official or audited testing tool.

Use this to catch obvious regressions quickly: missing labels, broken heading order, silent form errors. Do not treat it as an accessibility testing methodology, do not cite it as compliance evidence in a client deliverable, and do not let a clean scan displace manual testing, a WCAG 2.2 AA checklist, and — wherever possible — testing with real assistive technology users before release.

For where this fits in a full testing workflow, see the layered approach in the [repository README](../README.md).

---

## 1. Prerequisites

- [NVDA](https://www.nvaccess.org/download/) **2025.1 or later** on the Windows machine that will run the browser under test. Remote Access became a built-in feature in 2025.1; earlier versions need the third-party NVDA Remote Access add-on, installed through Tools → Add-on Store.
- Python 3.11 or later and [uv](https://docs.astral.sh/uv/) on the machine running Claude Code. This guide assumes both roles are the same machine.
- Git.
- [Claude Code](https://code.claude.com/docs) installed and working. Confirm with `claude --version`.

---

## 2. Enable NVDA Remote Access

Remote Access ships **disabled by default**, even on versions where it is built in.

1. Open the NVDA menu (NVDA+N), then **Preferences → Settings**.
2. Select the **Remote Access** category.
3. Check the box to enable it.
4. Select **OK**.

**Tools → Remote → Connect** now appears in the NVDA menu, with the shortcut NVDA+Alt+Page Up.

---

## 3. Set up the connection

Open **Tools → Remote → Connect**. On the built-in version, the dialog uses dropdowns rather than radio buttons.

| Field | Value | Why |
| --- | --- | --- |
| Mode | Allow this computer to be controlled | This machine is the one under test |
| Server | Host locally | Direct connection, no public relay |
| External IP | Leave blank | Only needed for connections from outside the local network |
| Port | 6837 (default) | Leave as-is and note it for Section 8 |
| Key | Select **Generate Key** | Note the value; it goes in the MCP config |

Select **OK**. NVDA starts listening.

---

## 4. Install nvda-mcp

```powershell
git clone https://github.com/bramd/nvda-mcp
cd nvda-mcp
uv sync
```

Note the full install path — `C:\tools\nvda-mcp` in the examples below. The next step needs it.

---

## 5. Register nvda-mcp with Claude Code

Create or edit `.mcp.json` in the root of the project you are testing:

```json
{
  "mcpServers": {
    "nvda": {
      "type": "stdio",
      "command": "uv",
      "args": ["run", "--directory", "C:/tools/nvda-mcp", "nvda-mcp"],
      "env": {
        "NVDA_MCP_CHANNEL": "your-generated-key"
      }
    }
  }
}
```

Use the key generated in Section 3 for `NVDA_MCP_CHANNEL`. To avoid storing it, leave the value as an empty string and pass the channel explicitly each time you ask Claude to connect.

### Use `--directory`, not `cwd`

Pass the install path as an explicit `--directory` argument rather than setting a `cwd` field on the server entry.

`uv run nvda-mcp` resolves the project — and therefore the installed `nvda-mcp` script — relative to the directory it is running in. A `cwd` field does not reliably place `uv` there before it resolves the command, which surfaces as a spawn failure:

```text
error: Failed to spawn: nvda-mcp
  Caused by: program not found
```

The same command succeeds when run by hand after changing into the folder, which makes this confusing to diagnose. Passing `--directory` removes the dependency on where the process was spawned from.

---

## 6. Approve and verify the server

Project-scoped MCP servers require explicit approval the first time.

1. From a terminal in the project directory, confirm Claude Code sees the config with `claude mcp list`. The `nvda` entry should appear.
2. Start a session with `claude`.
3. Run `/mcp`. On first use this triggers a trust prompt for the new project-scoped server. Approve it.
4. Confirm with `claude mcp get nvda`. The status should read `✓ Connected`.

If the status reads `× Rejected (see disabledMcpjsonServers in settings)`, an approval prompt was dismissed at some point. Clear the stored choice with either command:

```powershell
Remove-Item .claude\settings.local.json
```

```powershell
claude mcp reset-project-choices
```

Then start a fresh session and approve the prompt when it reappears.

---

## 7. Diagnosing a connection failure

The standard session error — `Failed to reconnect to nvda` — carries no detail. To see the underlying cause, start Claude Code in MCP debug mode:

```powershell
claude --debug=mcp
```

Run `/mcp` inside that session to trigger the connection attempt, then read the newest debug log:

```powershell
Get-ChildItem $env:USERPROFILE\.claude\debug\ | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content
```

Look for the `[ERROR]` line mentioning `nvda`. It carries the actual stderr from the failed spawn, such as the `program not found` error described in Section 5.

One behavior looks like a failure but is not: running `uv run nvda-mcp` directly in a terminal appears to hang with no output. That is correct. It is an MCP stdio server waiting for a client on stdin, not a client itself. Press Ctrl+C to exit. It reveals nothing about whether Claude Code can connect.

---

## 8. Running a scan

Before asking Claude to do anything:

1. Open the page under test in a **real, visible browser window** on the NVDA machine and click into it so it has focus. nvda-mcp sends keystrokes to whatever currently has focus; it does not open URLs or control the browser.
2. Confirm NVDA Remote is still listening. Repeat Section 3 if NVDA has restarted since.

Then describe the scan in plain language. Claude drives the underlying `connect`, `send_key_and_wait`, and `get_speech` calls itself:

> Connect to NVDA at 127.0.0.1 port 6837. Navigate the currently-focused page starting with browse-mode headings (H key) to check the structure, then tab through the form field by field and tell me exactly what NVDA announces for each — label, whether it is marked required, and field type. Flag anything unclear or unlabeled.

Worth checking deliberately on a form-heavy page:

- **Heading structure** (`H`) — a logical outline, or flat and skipped levels?
- **Required-field indication** — does NVDA announce "required," or is the asterisk visual only?
- **Error handling** — submit an incomplete form and check whether the error is announced and tied to its specific field.
- **Landmarks** (`D`) — can you jump straight to the main content or form, or is the page one undifferentiated region?

---

## 9. Saving the scan as a skill

To avoid retyping the prompt, save it as an Agent Skill. Create this file in the project you are testing:

```text
.claude/skills/nvda-scan/SKILL.md
```

With these contents:

```markdown
---
name: nvda-scan
description: Runs an NVDA screen-reader scan of the currently-focused web page — checks heading structure via browse mode, then tabs through form fields reporting exactly what NVDA announces for each (label, required status, field type). Flags anything unclear or unlabeled. Invoke with /nvda-scan once NVDA and the page under test are ready.
---

Connect to NVDA at 127.0.0.1 port 6837. Navigate the currently-focused page
starting with browse-mode headings (H key) to check the structure, then tab
through the form under test field by field and report exactly what NVDA
announces for each — label, whether it is marked required, and field type.
Flag anything unclear or unlabeled.
```

Run `/nvda-scan` in a Claude Code session in that project, with the page focused and NVDA listening, to trigger the full scan.

Placing the file under the project's `.claude/skills/` makes it project-scoped, so it can be committed alongside the rest of the code and shared with the team. For a copy available in every project, save the same file to `~/.claude/skills/nvda-scan/SKILL.md` instead. See [INSTALL.md](../INSTALL.md) for how the two scopes differ.

---

## 10. Known gotchas

- Remote Access is off by default even where it is built in. Enable it in Settings first.
- The Connect dialog uses dropdowns, not radio buttons, on the built-in version.
- The `cwd` field in `.mcp.json` is unreliable for `uv run`. Use `--directory` in `args`.
- New or edited project-scoped servers need an approval prompt — run `/mcp` in a fresh session — before they will connect. A dismissed prompt appears as "Rejected" and is cleared through `settings.local.json` or `claude mcp reset-project-choices`.
- `claude --debug=mcp` plus the log in `%USERPROFILE%\.claude\debug\` is the only reliable way to see the real spawn error. The normal session reports only "Failed to reconnect."
- A hung terminal after running `uv run nvda-mcp` by hand is expected, not a failure.
- nvda-mcp sends keystrokes to whatever has focus. Open and focus the page under test yourself before starting a scan.
- This is a triage tool, not an accessibility audit. Re-read the limitations at the top of this guide before treating a clean result as "accessible" or citing it as compliance evidence.

---

## Further reading

- [nvda-mcp](https://github.com/bramd/nvda-mcp) — the MCP server this guide installs
- [NVDA user guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html) — browse mode and navigation keys
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — the standard this repository targets
- [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp) — server scopes and configuration
