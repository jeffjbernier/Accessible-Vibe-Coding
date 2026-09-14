# Bring the Chrome window for the page under test to the foreground and
# prove it.
#
# Usage:  activate-chrome.ps1 -Title "Donate"
#         -Title is a word or phrase from the Chrome window title.
#
# Exit codes:
#   0  Chrome holds the foreground (title printed)
#   1  focus would not move after three attempts
#   2  no Chrome window matched -Title
#
# Why not AppActivate: Windows refuses a focus change requested by a
# process that is not already in the foreground. AppActivate reports
# True, the taskbar button flashes, and focus stays in the editor the
# skill was invoked from.
#
# Why not a synthetic ALT press: it releases the foreground lock, but
# NVDA tracks the modifier and reads the next NVDA+T as NVDA+Alt+T, which
# toggles braille mode. No key events, ever.
#
# AttachThreadInput joins this process's input queue to the foreground
# window's, which is the documented way for a background process to hand
# focus over. Then the actual foreground title is polled and printed, and
# the exit code says whether Chrome has it. NVDA+T is still the proof the
# skill trusts; this script only makes it likely to pass.
#
# ASCII only: Windows PowerShell 5.1 reads a BOM-less file as CP1252.

param(
    [Parameter(Mandatory = $true)]
    [string]$Title
)

$ErrorActionPreference = 'Stop'

$source = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class ChromeFocus
{
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr lpdwProcessId);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

    public static string ForegroundTitle()
    {
        StringBuilder sb = new StringBuilder(512);
        GetWindowText(GetForegroundWindow(), sb, 512);
        return sb.ToString();
    }

    public static void Activate(IntPtr target)
    {
        const int SW_RESTORE = 9;
        if (IsIconic(target)) { ShowWindowAsync(target, SW_RESTORE); }

        IntPtr current = GetForegroundWindow();
        uint ours = GetCurrentThreadId();
        uint theirs = GetWindowThreadProcessId(current, IntPtr.Zero);

        bool attached = theirs != ours && AttachThreadInput(ours, theirs, true);
        try
        {
            BringWindowToTop(target);
            SetForegroundWindow(target);
        }
        finally
        {
            if (attached) { AttachThreadInput(ours, theirs, false); }
        }
    }
}
'@

if (-not ('ChromeFocus' -as [type])) {
    Add-Type -TypeDefinition $source
}

$chrome = Get-Process chrome -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -like "*$Title*" } |
    Select-Object -First 1

if ($null -eq $chrome) {
    Write-Output "no Chrome window with '$Title' in its title"
    exit 2
}

$wanted = $chrome.MainWindowTitle

for ($attempt = 1; $attempt -le 3; $attempt++) {
    [ChromeFocus]::Activate($chrome.MainWindowHandle)

    # Poll rather than sleep once: focus lands within a few hundred ms
    # when it is going to land at all.
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Milliseconds 200
        if ([ChromeFocus]::ForegroundTitle() -eq $wanted) {
            Write-Output "foreground: $wanted (attempt $attempt)"
            exit 0
        }
    }
}

Write-Output "foreground: $([ChromeFocus]::ForegroundTitle()) -- not Chrome after 3 attempts"
exit 1
