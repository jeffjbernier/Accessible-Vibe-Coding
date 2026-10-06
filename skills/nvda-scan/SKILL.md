---
name: nvda-scan
description: Runs an NVDA screen-reader scan of the currently-focused web page — checks heading structure via browse mode, then tabs through form fields reporting exactly what NVDA announces for each (label, required status, field type). Flags anything unclear or unlabeled. Invoke with /nvda-scan once NVDA and the page under test are ready.
license: MIT
metadata:
  version: 2.0.0
  source: https://github.com/jeffjbernier/Accessible-Vibe-Coding
---

# NVDA scan

## Before you run

Run the scan in a dedicated, clean browser profile with no extensions
installed. Password managers, autofill tools, grammar checkers, ad
blockers and other accessibility extensions inject their own markup,
buttons and ARIA into the page, and NVDA announces that markup as
though it belonged to the site under test.

### One-time setup (Chrome)

1. Click your profile avatar in the top-right corner and choose Add
   Chrome profile.
2. Choose Stay signed out. Signing in with a Google account that syncs
   extensions pulls your everyday extensions into the testing profile.
3. Name the profile something like "A11y Testing" and give it a distinct
   color.
4. In the new profile, open chrome://settings/manageProfile and turn on
   Create desktop shortcut so you can launch straight into it.
5. Open chrome://extensions and confirm the list is empty. Extensions
   marked "Installed by your administrator" are forced by policy and
   can't be removed; if one of them injects into pages, note it so you
   can account for it in scan results.
6. Open chrome://password-manager/settings and turn on Offer to save
   passwords. Chrome's built-in password manager is browser UI, not page
   markup, so it doesn't affect the scan, and it makes logging back in
   quick when a site's session expires.

### Each time

1. Open the page under test in the clean profile, load it fresh, and
   give it focus.
2. If the site requires login, make sure you're logged in and the
   session hasn't expired.
3. Make sure NVDA is running and listening on 127.0.0.1 port 6837.
4. Run /nvda-scan.

## Focus Chrome

The user invokes the skill from their editor, so focus is in the editor
at the start of every run. Before any key, bring Chrome to the
foreground with `scripts/activate-chrome.ps1`. It needs a word from the
Chrome window title of the page under test to pick the right window.
The user names it when invoking the skill ("scan the Donate page"). If
they did not, ask for it before sending any key.

Run it with the PowerShell 7 tool. Adjust the path if the skill is
installed project-scoped under `.claude/skills/` instead of
`~/.claude/skills/`:

```powershell
$script = "$HOME\.claude\skills\nvda-scan\scripts\activate-chrome.ps1"
& $script -Title "Donate"; "exit: $LASTEXITCODE"
```

Read its exit code. 0 means Chrome holds the foreground, 1 means focus
would not move, and 2 means no Chrome window has the title word you
passed. On a non-zero exit, stop and ask the user to open or click into
Chrome; do not send any key. Do not report where focus was before the
script ran; that is expected, not a finding.

On exit 0, `connect` to `127.0.0.1` port `6837` if NVDA is not already
connected, then send `NVDA+T` as the only key in the response and read
the result. If it does not name the Chrome page, run the script again
and send `NVDA+T` alone again. Two failures in a row: stop and ask the
user to click into Chrome. The script is the likelihood; `NVDA+T` is
still the only proof.

Never fall back to `AppActivate` or to a synthetic key press. Windows
refuses a focus change from a process that is not already in the
foreground, so `AppActivate` reports True while focus stays in the
editor. A faked ALT press does release that lock, but NVDA tracks the
modifier and reads the next `NVDA+T` as `NVDA+Alt+T`, which toggles
braille mode. The script sends no key events at all.

## Pre-scan check

Connect to NVDA at 127.0.0.1 port 6837 and read the page title and first
heading. If the page looks like a login screen, a "session expired" or
"signed out" message, or an error page, and the user didn't say they're
testing that page, stop and tell the user to log in or reload the page
under test, then rerun /nvda-scan. Don't scan the wrong page.

## Scan

Navigate the currently-focused page starting with browse-mode headings
(H key) to check the structure, then tab through every form on the page
field by field and report exactly what NVDA announces for each: label,
whether it's marked required, and field type. Flag anything unclear or
unlabeled.

## Keys you never send

F5, Enter, Escape, Alt+Tab, arrow keys, Ctrl+R, any letter while focus
is not confirmed in Chrome. F5 in an editor starts the debugger; in a
mail client it can open a dialog. Both happen when a key is queued in
the same response as the title check. If the page needs reloading, ask
the user to press F5.

## Extension interference check

If NVDA announces anything that looks like it came from a browser
extension rather than the page (for example a password manager name, an
autofill or "fill with" button, a grammar suggestion, or a field label
that doesn't appear in the page's visible text), list it separately
under "Possible extension interference" and don't count it as a page
issue. At the end of the report, if any were found, remind the user to
rerun the scan in a clean profile with no extensions.
