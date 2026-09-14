---
name: nvda-scan
description: Use when asked to check a web page or form with NVDA, run a screen-reader pass, or report what NVDA announces for headings and form fields. Also use when a page audit needs the exact spoken output rather than an axe or markup check. Windows only; needs NVDA with Remote Access on and the nvda-mcp server registered.
license: MIT
metadata:
  version: 1.0.0
  source: https://github.com/jeffjbernier/Accessible-Vibe-Coding
---

# NVDA scan

## Overview

Drive the NVDA screen reader over the page that is open in Chrome, read
its heading structure, then tab through the form and report what a
screen-reader user actually hears for every control. The NVDA MCP server
is the only observation channel: you cannot see the screen, and every key
you send lands in whatever window is in the foreground.

**Core rule: a keystroke is a physical action on the user's desktop, not
a call into Chrome.** Treat every key as if it might land in their editor
or mail client, because it can.

This is a triage pass, not an audit. It reports what NVDA says about
headings, landmarks, and form controls. It does not judge whether the
page is accessible.

## Prerequisites

- Windows. NVDA and the activation script are Windows-only.
- NVDA running with "Allow this computer to be controlled" on, port 6837.
  The channel key lives in the project's `.mcp.json` under
  `NVDA_MCP_CHANNEL`; `connect` picks it up from the environment. Never
  read the key into the conversation unless `connect` without a channel
  fails and the user asks you to. Setup is in
  [guides/automate-nvda-testing.md](https://github.com/jeffjbernier/Accessible-Vibe-Coding/blob/HEAD/guides/automate-nvda-testing.md).
- Chrome open on the page to scan. The page must already be loaded with
  the markup you want to test. You never reload it yourself.
- A word from the Chrome window title of the page under test. The user
  names it when invoking the skill ("scan the Donate page"). If they did
  not, ask for it before sending any key. The activation script needs it
  to pick the right window.

## Procedure

1. `ping`. If not connected, `connect` to `127.0.0.1` port `6837` with no
   channel argument.
2. **Activate Chrome, then title check.** The user invokes the skill
   from their editor, so focus is in the editor at the start of every
   run. Run `scripts/activate-chrome.ps1` (the PowerShell command below)
   first, before any key, and read its exit code. It hands focus to
   Chrome through `AttachThreadInput`, polls the real foreground window,
   and exits 0 only when Chrome holds it; 1 means focus would not move,
   2 means no Chrome window has the title word you passed. On a non-zero
   exit stop and ask the user to open or click into Chrome; do not send
   any key. Do not report where focus was before the script ran; that is
   expected, not a finding. On exit 0 send `NVDA+T` as the only key in
   the response and read the result. If it does not name the Chrome
   page, run the script again and send `NVDA+T` alone again. Two
   failures in a row: stop and ask the user to click into Chrome. The
   script is the likelihood; `NVDA+T` is still the only proof.
3. **Headings, in two responses.** First `NVDA+Tab` then
   `Control+Home`, each with `send_key_and_wait`, and read what came
   back. Only the skip link (or whatever the first focusable text is)
   proves browse mode. If `NVDA+Tab` named an edit, combo box, radio, or
   spin button as focused, the page is in focus mode: send `NVDA+Space`
   alone, then `Control+Home` alone, and wait for the skip link before
   any letter. Then, in a second response, `H` until "no next heading"
   (at most six). Note every level. Never put the letters in the same
   batch as `NVDA+Tab`: when the user has clicked into a text field
   before invoking the skill, the whole batch runs in focus mode and
   every `H` press types an "h" into their form. A letter sent in focus
   mode is text, not navigation.
4. **Landmarks.** `NVDA+T` alone. Then `Control+Home`, `D` until "no
   next landmark". Listen for a bare "section" where a form should be.
5. **Tab pass.** `NVDA+T` alone before every batch. Batches of at most
   six `Tab` presses, and never more Tabs than stops remain: once the
   template tells you how many controls are left before the footer
   link, send exactly that many plus one. A Tab past the footer leaves
   the document for Chrome's toolbar and address bar, and the only way
   back is one Tab at a time with no letters. After each batch call
   `get_speech` with `since_sequence` set to the sequence before the
   batch, because `send_key_and_wait` returns on the first utterance and
   drops the rest of a multi-part announcement (landmark, grouping, then
   the control).
6. **Radio and checkbox groups.** Tab stops only on the first item of a
   group. Read the rest with quick-nav: `R` for radios, `X` for
   checkboxes, `C` for combo boxes, again six keys per batch behind a
   fresh `NVDA+T`. A Tab that lands on a radio, edit, or combo box leaves
   NVDA in focus mode, where quick-nav letters are swallowed with no
   speech at all. `NVDA+Space` is a toggle, not a "browse mode on"
   command, so look at what the last Tab announced before sending it:
   radio, edit, or combo box means send `NVDA+Space` first; link,
   button, or document means skip it, because browse mode is already on
   and the toggle would turn it off and silence the whole batch. Either
   way `Control+Home` comes before the first letter, and it doubles as
   the proof: the skip link means browse mode is on. A batch that
   returns no speech and an unchanged sequence number is the wrong mode,
   not a missing control: send `NVDA+T` alone, then `NVDA+Space` alone,
   then `Control+Home`, and repeat the letters.
7. **Cross-reference the template** with the shell while keys are not
   in flight: grep for `<label`, `<legend`, `aria-required`,
   `aria-describedby`, `id=`. A rendered-HTML count of duplicate ids
   catches what axe no longer reports.
8. **Report** in the shape below.

Activate Chrome (PowerShell 7 tool). Pass a word from the page's window
title. Adjust the path if the skill is installed project-scoped under
`.claude/skills/` instead of `~/.claude/skills/`:

```powershell
& "$HOME\.claude\skills\nvda-scan\scripts\activate-chrome.ps1" -Title "Donate"; "exit: $LASTEXITCODE"
```

Never fall back to `AppActivate` or to a synthetic key press. Windows
refuses a focus change from a process that is not already in the
foreground, so `AppActivate` reports True while focus stays in the
editor. A faked ALT press does release that lock, but NVDA tracks the
modifier and reads the next `NVDA+T` as `NVDA+Alt+T`, which toggles
braille mode. The script sends no key events at all.

## Keys you never send

F5, Enter, Escape, Alt+Tab, arrow keys, Ctrl+R, any letter while focus
is not confirmed in Chrome. F5 in an editor starts the debugger; in a
mail client it can open a dialog. Both happen when a key is queued in
the same response as the title check. If the page needs reloading, ask
the user to press F5.

## Report shape

The report has these parts, in this order:

1. **Flags.** Each a bold lead-in and one to two sentences: what NVDA
   said, what the markup does, where (`file:line`). Order: unlabeled or
   misnamed controls, required-but-not-announced, title/H1/step-label
   disagreement, unnamed form, generic legend.
2. **Headings (H key).** The outline as spoken.
3. **Tab order, verbatim.** A table: `#`, NVDA announced (quoted, exactly
   as returned), type, required?. Write **not announced** when the
   server requires the field and NVDA said nothing.
4. **Groups read individually.** One line per group with each item's
   spoken label.
5. **Also observed.** Anything true but not a defect.

Ignore every message from browser extensions, completely. Password
managers in particular announce their own menus ("… menu is available.
Press down arrow to select."). That speech comes from the extension,
not the page. It is not a tab stop, not a finding, and not an
observation: drop it while reading a batch, and do not mention it
anywhere in the report, not even to say it was excluded or how many
times it spoke.

## Rationalization table

| Excuse | Reality |
| --- | --- |
| "I just confirmed Chrome, the next key is safe in the same call" | Parallel calls cannot see each other's results. The title check only protects the keys sent after you read it. |
| "One F5 to reload is quicker than asking" | F5 in the wrong window opens a debugger or a mail dialog. Ask. |
| "The Chrome MCP tool can reload or switch tabs instead" | It drives its own tab. NVDA reads the foreground tab, which is the user's. |
| "Six keys is too slow, I'll send twelve" | A batch is only as safe as its first key. Twelve keys in the wrong app is twelve chances to do damage. |
| "The first utterance was enough" | Landmark, grouping, and control names arrive as separate utterances. Without `get_speech` the field name is missing from the report. |
| "axe passed, so the ids are fine" | axe disabled its duplicate-id rules in 4.8. NVDA finds nameless fields that axe calls clean. |

## Red flags, stop and re-read this skill

- A key other than `NVDA+T` in the same response as `NVDA+T`.
- Any of F5, Enter, Escape, Alt+Tab, or an arrow in a batch.
- A title result naming the editor, a mail client, or anything but
  Chrome, and you sent keys anyway.
- A tab-order row whose announcement starts with "main landmark" and
  ends there. You dropped the rest; call `get_speech`.
- A quick-nav letter (`H`, `D`, `E`, `R`, `X`, `C`, `F`) in a batch
  whose browse-mode proof you have not yet read. The letter becomes
  typed text if focus is in a field.
- A browser-extension announcement anywhere in the draft report.

## Common mistakes

- Trusting the activation script's exit 0 as the proof. It reads the
  Windows foreground title, which is a different observer from NVDA.
  Only `NVDA+T` proves where keys will land.
- Reporting the first radio's tip as attached to every radio, or the
  reverse. Read each item with `R` before saying how the tip is wired.
- Treating "form landmark" on Tab as proof the form is named. Browse
  mode says "section" for the same anonymous form. Only a named form is
  announced the same way both ways.
