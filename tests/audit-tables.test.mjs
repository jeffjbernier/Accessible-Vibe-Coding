/**
 * audit-tables.test.mjs — regression tests for the accessible-tables auditor
 * (skills/accessible-tables/scripts/audit-cli.js and audit-tables.js).
 *
 * Runs the CLI against the fixture pages in tests/audit-tables/ and asserts on
 * its exit code and JSON report. It also audits every example in the skill's
 * references/patterns.md, so a pattern the auditor rejects cannot ship.
 *
 * The CLI drives Chromium through Playwright, which this repo does not
 * install. Make it resolvable first (see CONTRIBUTING.md), then run:
 *
 *   node --test "tests/*.test.mjs"
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, '..', 'skills', 'accessible-tables');
const CLI = join(SKILL, 'scripts', 'audit-cli.js');
const PATTERNS = join(SKILL, 'references', 'patterns.md');
const FIXTURES = join(HERE, 'audit-tables');
const EXIT_ISSUES_FOUND = 1;
const EXIT_COULD_NOT_RUN = 2;

/** Run audit-cli.js on one page and return its exit code and JSON report. */
function runAudit(pagePath, extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    [CLI, pagePath, '--json', ...extraArgs],
    { encoding: 'utf8' }
  );
  // Exit 2 means the auditor never looked at the page (no Playwright, no
  // browser). Fail on that loudly rather than as a confusing assertion.
  if (result.status === EXIT_COULD_NOT_RUN) {
    throw new Error(`audit-cli.js could not run:\n${result.stderr}`);
  }
  const [{ report }] = JSON.parse(result.stdout);
  return { status: result.status, report };
}

const runFixture = (fixture, extraArgs) => runAudit(join(FIXTURES, fixture), extraArgs);

/** The issues as sorted "severity rule" strings, one per issue. */
const issueList = (report) => report.issues.map((issue) => `${issue.severity} ${issue.rule}`).sort();

test('passes a section-header row, control-named headers, and a full rowgroup span', () => {
  const { status, report } = runFixture('valid-tables.html');

  assert.deepEqual(report.issues, []);
  assert.equal(report.summary.dataTables, 3);
  assert.equal(status, 0);
});

test('fails a table whose headers have no scope and that has no caption', () => {
  const { status, report } = runFixture('missing-scope-and-caption.html');

  assert.equal(status, EXIT_ISSUES_FOUND);
  assert.deepEqual(issueList(report), [
    'error missing-caption',
    'error missing-scope',
    'error missing-scope',
    'error missing-scope',
    'warning missing-caption',
  ]);
});

test('keeps a missing caption a warning when the table is named with ARIA', () => {
  const { report } = runFixture('missing-scope-and-caption.html');

  const [venues] = report.tables.filter((table) => table.label === 'Venues');
  assert.deepEqual(issueList(venues), ['warning missing-caption']);
});

test('fails spanned headers with the wrong scope and an empty header', () => {
  const { status, report } = runFixture('wrong-spans-and-empty-header.html');

  assert.equal(status, EXIT_ISSUES_FOUND);
  assert.deepEqual(issueList(report), [
    'error empty-th',
    'error span-scope',
    'error span-scope',
  ]);
});

test('audits a table that only exists after the page script runs', () => {
  const { status, report } = runFixture('script-built-table.html');

  assert.equal(status, EXIT_ISSUES_FOUND);
  assert.equal(report.summary.tables, 1);
  assert.deepEqual(issueList(report), ['error no-headers']);
});

test('fails a layout table that still carries data-table markup', () => {
  const { status, report } = runFixture('layout-table-with-headers.html');

  assert.equal(status, EXIT_ISSUES_FOUND);
  assert.equal(report.summary.layoutTables, 1);
  assert.deepEqual(issueList(report), ['error layout-table-semantics']);
});

test('keeps a missing caption a warning on a table with no header cells', () => {
  const { status, report } = runFixture('headerless-single-row.html');

  assert.deepEqual(issueList(report), [
    'warning missing-caption',
    'warning no-headers',
  ]);
  assert.equal(status, 0);
});

test('--fail-on warning turns a warnings-only page into a failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-tables-'));
  try {
    const file = join(dir, 'layout-table.html');
    writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<title>Layout table</title></head><body><main><h1>Layout</h1>' +
      '<table role="presentation"><tr><td>Sidebar</td><td>Main</td></tr></table>' +
      '</main></body></html>');

    assert.equal(runAudit(file).status, 0);
    assert.equal(runAudit(file, ['--fail-on', 'warning']).status, EXIT_ISSUES_FOUND);
    assert.equal(runAudit(file, ['--fail-on=warning']).status, EXIT_ISSUES_FOUND);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every example in references/patterns.md audits without an error', () => {
  const markdown = readFileSync(PATTERNS, 'utf8').replace(/\r\n/g, '\n');
  // S1 is a bare <caption>, which is not a table on its own.
  const examples = [...markdown.matchAll(/```html\n(<(?:table|div|figure|h3|p)[\s\S]*?)```/g)]
    .map((match) => match[1]);
  assert.ok(examples.length >= 15, `expected the pattern examples, found ${examples.length}`);

  const dir = mkdtempSync(join(tmpdir(), 'audit-tables-'));
  try {
    const file = join(dir, 'patterns.html');
    writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      `<title>Patterns</title></head><body><main><h1>Patterns</h1>${examples.join('\n')}` +
      '</main></body></html>');
    const { status, report } = runAudit(file);

    // The only warnings allowed come from the examples that are deliberately
    // partial: "<!-- … -->" placeholder tables, the figure-named table (S3),
    // and the legacy layout table (L1).
    const unexpected = report.issues.filter((issue) => issue.severity === 'error' ||
      !['no-headers', 'missing-caption', 'layout-table'].includes(issue.rule));
    assert.deepEqual(unexpected, []);
    assert.equal(status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
