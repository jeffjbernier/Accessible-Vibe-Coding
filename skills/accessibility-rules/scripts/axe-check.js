#!/usr/bin/env node
/**
 * axe-check.js — run axe-core against a URL or a local HTML file.
 *
 * Part of the accessibility-rules skill. Automated scanning catches roughly a
 * third to a half of WCAG issues — the mechanical ones. A clean run here is the
 * floor, not the finish line: keyboard and screen reader passes still apply.
 *
 * Usage:
 *   node axe-check.js <target> [target...] [options]
 *
 *   <target>            A URL (https://…) or a path to a local .html file.
 *
 * Options:
 *   --tags <list>       Comma-separated axe tags.
 *                       Default: wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa
 *   --all               Run every rule axe knows, including best-practice.
 *   --json              Emit raw JSON instead of the text report.
 *   --nodes <n>         Max offending elements printed per violation (default 3).
 *   --exit-zero         Always exit 0, even when violations are found.
 *   --timeout <ms>      Page load timeout (default 30000).
 *   --executable <path> Chromium binary to drive, when Playwright's bundled
 *                       browser isn't the one you want (CI images, pinned
 *                       system Chrome). Also read from the environment variable
 *                       AXE_CHECK_CHROMIUM.
 *   --help              Show this message.
 *
 * Exit codes:
 *   0  no violations (or --exit-zero)
 *   1  violations found
 *   2  could not run (bad arguments, missing dependency, page failed to load)
 *
 * Dependencies (installed in the project you are scanning, not in this skill):
 *   npm install --save-dev playwright axe-core
 *   npx playwright install chromium
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor', 'unknown'];

/** Resolve a dependency from the scanned project first, then from this script. */
function loadDep(name) {
  const fromProject = createRequire(path.join(process.cwd(), 'package.json'));
  for (const req of [fromProject, require]) {
    try {
      return { mod: req(name), path: req.resolve(name) };
    } catch (_) { /* try the next resolver */ }
  }
  fail(
    `Missing dependency: ${name}\n` +
    `  Install it in the project you're scanning:\n` +
    `    npm install --save-dev playwright axe-core\n` +
    `    npx playwright install chromium`
  );
}

function fail(message) {
  process.stderr.write(`axe-check: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = {
    targets: [], tags: DEFAULT_TAGS, all: false, json: false,
    maxNodes: 3, exitZero: false, timeout: 30000,
    executable: process.env.AXE_CHECK_CHROMIUM || undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`${arg} needs a value`);
      return v;
    };
    switch (arg) {
      case '--help': case '-h': printHelp(); process.exit(0); break;
      case '--tags': opts.tags = next().split(',').map(s => s.trim()).filter(Boolean); break;
      case '--all': opts.all = true; break;
      case '--json': opts.json = true; break;
      case '--nodes': opts.maxNodes = parseInt(next(), 10); break;
      case '--exit-zero': opts.exitZero = true; break;
      case '--timeout': opts.timeout = parseInt(next(), 10); break;
      case '--executable': opts.executable = next(); break;
      default:
        if (arg.startsWith('-')) fail(`Unknown option: ${arg}`);
        opts.targets.push(arg);
    }
  }
  if (!opts.targets.length) { printHelp(); process.exit(2); }
  return opts;
}

function printHelp() {
  const block = fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1] || '';
  process.stdout.write(block.replace(/^ \* ?/gm, '').trim() + '\n');
}

/** Turn a CLI target into something the browser can navigate to. */
function toUrl(target) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return target;
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) fail(`No such file: ${target}`);
  return pathToFileURL(abs).href;
}

function indent(text, pad = '      ') {
  return String(text).split('\n').map(l => pad + l.trim()).join('\n');
}

function reportText(results, opts) {
  const lines = [];
  const { violations, incomplete, url } = results;

  lines.push('', `Target: ${url}`);

  if (!violations.length) {
    lines.push('Result: PASS — no violations detected.', '');
  } else {
    const total = violations.reduce((n, v) => n + v.nodes.length, 0);
    lines.push(`Result: FAIL — ${violations.length} rule(s) violated across ${total} element(s).`, '');

    const sorted = [...violations].sort(
      (a, b) => IMPACT_ORDER.indexOf(a.impact || 'unknown') - IMPACT_ORDER.indexOf(b.impact || 'unknown')
    );

    for (const v of sorted) {
      const impact = (v.impact || 'unknown').toUpperCase();
      lines.push(`  [${impact}] ${v.id} — ${v.help}`);
      lines.push(`      ${v.helpUrl}`);
      for (const node of v.nodes.slice(0, opts.maxNodes)) {
        lines.push(`      at: ${node.target.join(' ')}`);
        if (node.failureSummary) lines.push(indent(node.failureSummary, '          '));
      }
      const hidden = v.nodes.length - opts.maxNodes;
      if (hidden > 0) lines.push(`      …and ${hidden} more element(s). Re-run with --nodes ${v.nodes.length}.`);
      lines.push('');
    }
  }

  if (incomplete && incomplete.length) {
    lines.push(`Needs review: ${incomplete.length} check(s) axe could not decide automatically.`);
    for (const item of incomplete) lines.push(`  - ${item.id}: ${item.help}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  // Resolve every target before spending time on a browser launch, so a typo
  // in a filename fails in milliseconds instead of after Chromium boots.
  const urls = opts.targets.map(toUrl);
  const { mod: playwright } = loadDep('playwright');
  const { path: axePath } = loadDep('axe-core');

  const browser = await playwright.chromium.launch(
    opts.executable ? { executablePath: opts.executable } : {}
  );
  const allResults = [];
  let violationCount = 0;

  try {
    for (const [i, url] of urls.entries()) {
      const target = opts.targets[i];
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'load', timeout: opts.timeout });
        await page.addScriptTag({ path: axePath });

        const axeOptions = opts.all ? {} : { runOnly: { type: 'tag', values: opts.tags } };
        const results = await page.evaluate(
          ([options]) => window.axe.run(document, options),
          [axeOptions]
        );

        results.url = url;
        allResults.push(results);
        violationCount += results.violations.length;
        if (!opts.json) process.stdout.write(reportText(results, opts));
      } catch (err) {
        await page.close().catch(() => {});
        fail(`${target}: ${err.message}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(allResults.length === 1 ? allResults[0] : allResults, null, 2) + '\n');
  } else if (opts.targets.length > 1) {
    process.stdout.write(
      violationCount
        ? `\nOverall: FAIL — ${violationCount} rule violation(s) across ${opts.targets.length} target(s).\n`
        : `\nOverall: PASS — ${opts.targets.length} target(s) clean.\n`
    );
  }

  const reminder =
    '\nAutomated scanning catches roughly a third to a half of WCAG issues.\n' +
    'Still required: keyboard-only pass, screen reader pass, and testing with disabled users.\n';
  // In --json mode stdout must stay parseable, so the reminder goes to stderr.
  (opts.json ? process.stderr : process.stdout).write(reminder);

  process.exit(opts.exitZero || violationCount === 0 ? 0 : 1);
}

run().catch(err => fail(err.stack || err.message));
