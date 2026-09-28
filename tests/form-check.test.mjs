/**
 * form-check.test.mjs — regression tests for skills/form-rules/scripts/form-check.js
 *
 * Runs the checker against the fixture pages in tests/form-check/ and asserts
 * on its exit code and JSON findings.
 *
 * The checker drives Chromium through Playwright, which this repo does not
 * install. Make it resolvable first — install it in a scratch project, or
 * point NODE_PATH at an existing copy — then run:
 *
 *   node --test "tests/*.test.mjs"
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, '..', 'skills', 'form-rules', 'scripts', 'form-check.js');
const FIXTURES = join(HERE, 'form-check');
const EXIT_GATE_FAILED = 1;
const EXIT_COULD_NOT_RUN = 2;

/** Run form-check.js on one fixture and return its exit code and JSON report. */
function runCheck(fixture) {
  const result = spawnSync(
    process.execPath,
    [CHECKER, join(FIXTURES, fixture), '--json'],
    { encoding: 'utf8' }
  );
  // Exit 2 means the checker never looked at the page (no Playwright, no
  // browser). Fail on that loudly rather than as a confusing assertion.
  if (result.status === EXIT_COULD_NOT_RUN) {
    throw new Error(`form-check.js could not run:\n${result.stderr}`);
  }
  return { status: result.status, report: JSON.parse(result.stdout) };
}

const findingsFor = (report, id) => report.findings.filter((f) => f.id === id);

test('§7.4: fails a page that pre-renders hidden summary and confirmation regions', () => {
  const { status, report } = runCheck('prehidden-regions.html');

  assert.equal(status, EXIT_GATE_FAILED);

  const [emptyHeading] = findingsFor(report, 'empty-heading');
  assert.ok(emptyHeading, 'expected an empty-heading finding');
  assert.equal(emptyHeading.level, 'FAIL');
  assert.match(emptyHeading.section, /§7\.4/);
  assert.equal(emptyHeading.elements.length, 2);

  const [prehidden] = findingsFor(report, 'prehidden-region');
  assert.ok(prehidden, 'expected a prehidden-region finding');
  assert.equal(prehidden.level, 'FAIL');
  assert.match(prehidden.section, /§7\.4/);
  assert.deepEqual(prehidden.elements, ['#error-summary', '#save-confirmation']);
});

test('§7.4: passes a page that keeps those regions in <template> until they apply', () => {
  const { status, report } = runCheck('template-regions.html');

  assert.deepEqual(report.findings, []);
  assert.equal(status, 0);
});
