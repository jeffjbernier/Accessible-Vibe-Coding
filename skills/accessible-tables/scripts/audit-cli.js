#!/usr/bin/env node
/**
 * audit-cli.js — run audit-tables.js against URLs or local HTML files.
 *
 * Part of the accessible-tables skill. It loads each target in Chromium, so
 * tables built by the page's own JavaScript are audited too.
 *
 * Usage:
 *   node audit-cli.js <target> [target...] [options]
 *
 *   <target>            A URL (https://…) or a path to a local .html file.
 *
 * Options:
 *   --json              Emit raw JSON instead of the text report.
 *   --fail-on <level>   Lowest severity that fails the run: error (default)
 *                       or warning. --fail-on=warning also works.
 *   --no-heuristics     Skip the heuristic rules (fake-header, br-in-cell).
 *   --timeout <ms>      Page load timeout (default 30000).
 *   --executable <path> Chromium binary to drive, when Playwright's bundled
 *                       browser isn't the one you want (CI images, pinned
 *                       system Chrome). Also read from the environment variable
 *                       TABLE_AUDIT_CHROMIUM.
 *   --help              Show this message.
 *
 * Exit codes:
 *   0  no issues at or above the --fail-on level
 *   1  issues found at or above that level
 *   2  could not run (bad arguments, missing dependency, page failed to load)
 *
 * A <th> without scope and a data table without a <caption> are errors,
 * matching the hard rule in the accessibility skill, so both fail the
 * run by default.
 *
 * What it cannot check: whether the headers a cell announces make sense,
 * contrast on stripes and headers, or 400% reflow. Those stay on the manual
 * list in SKILL.md step 8.
 *
 * Dependencies (installed in the project you are scanning, not in this skill):
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const { formatReport } = require('./audit-tables.js');

const AUDITOR_SOURCE = fs.readFileSync(path.join(__dirname, 'audit-tables.js'), 'utf8');
const FAIL_LEVELS = ['error', 'warning'];
const DEFAULT_TIMEOUT_MS = 30000;

/** Resolve a dependency from the scanned project first, then from this script. */
function loadDep(name) {
  const fromProject = createRequire(path.join(process.cwd(), 'package.json'));
  for (const req of [fromProject, require]) {
    try { return req(name); } catch (_) { /* try the next resolver */ }
  }
  fail(
    `Missing dependency: ${name}\n` +
    `  Install it in the project you're scanning:\n` +
    `    npm install --save-dev playwright\n` +
    `    npx playwright install chromium`
  );
}

function fail(message) {
  process.stderr.write(`audit-cli: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = {
    targets: [], json: false, failOn: 'error', heuristics: true,
    timeout: DEFAULT_TIMEOUT_MS,
    executable: process.env.TABLE_AUDIT_CHROMIUM || undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    let inlineValue;
    if (arg.startsWith('--') && arg.includes('=')) {
      inlineValue = arg.slice(arg.indexOf('=') + 1);
      arg = arg.slice(0, arg.indexOf('='));
    }
    const next = () => {
      const value = inlineValue !== undefined ? inlineValue : argv[++i];
      if (value === undefined) fail(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case '--help': case '-h': printHelp(); process.exit(0); break;
      case '--json': opts.json = true; break;
      case '--no-heuristics': opts.heuristics = false; break;
      case '--fail-on': opts.failOn = next(); break;
      case '--timeout': opts.timeout = parseInt(next(), 10); break;
      case '--executable': opts.executable = next(); break;
      default:
        if (arg.startsWith('-')) fail(`Unknown option: ${arg}`);
        opts.targets.push(arg);
    }
  }
  if (!FAIL_LEVELS.includes(opts.failOn)) fail('--fail-on must be "error" or "warning".');
  if (!opts.targets.length) { printHelp(); process.exit(2); }
  return opts;
}

function printHelp() {
  const block = fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1] || '';
  process.stdout.write(block.replace(/^ \* ?/gm, '').trim() + '\n');
}

function toUrl(target) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return target;
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) fail(`No such file: ${target}`);
  return pathToFileURL(abs).href;
}

async function auditPage(page, url, opts) {
  await page.goto(url, { waitUntil: 'load', timeout: opts.timeout });
  // Evaluated as a string, not added as a <script>, so a page's Content
  // Security Policy cannot block the auditor.
  await page.evaluate(AUDITOR_SOURCE);
  return page.evaluate(
    (includeHeuristics) => window.auditTables(document, { includeHeuristics }),
    opts.heuristics
  );
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  // Resolve every target before spending time on a browser launch, so a typo
  // in a filename fails in milliseconds instead of after Chromium boots.
  const urls = opts.targets.map(toUrl);
  const playwright = loadDep('playwright');

  const browser = await playwright.chromium.launch(
    opts.executable ? { executablePath: opts.executable } : {}
  );
  const results = [];
  let failed = false;

  try {
    for (const [i, url] of urls.entries()) {
      const target = opts.targets[i];
      const page = await browser.newPage();
      try {
        const report = await auditPage(page, url, opts);
        const { errors, warnings } = report.summary;
        if (errors > 0 || (opts.failOn === 'warning' && warnings > 0)) failed = true;
        results.push({ target, url, report });
        if (!opts.json) process.stdout.write(`\n=== ${target} ===\n${formatReport(report)}\n`);
      } catch (err) {
        // fail() exits the process, which skips the finally below.
        await browser.close().catch(() => {});
        fail(`${target}: ${err.message}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (opts.json) process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  process.exit(failed ? 1 : 0);
}

run().catch((err) => fail(err.stack || err.message));
