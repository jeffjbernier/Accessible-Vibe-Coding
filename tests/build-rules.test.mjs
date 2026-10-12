/**
 * build-rules.test.mjs — regression tests for tools/build-rules.mjs
 *
 * Each test writes a small skills/ tree into a temporary directory and runs
 * the generator against it with --skills and --rules, so nothing here reads
 * or writes this repo's own skills/ or rules/.
 *
 *   node --test "tests/*.test.mjs"
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATOR = join(HERE, '..', 'tools', 'build-rules.mjs');
const BLOB = 'https://github.com/jeffjbernier/Accessible-Vibe-Coding/blob/HEAD';

let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'build-rules-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write one skill: its SKILL.md plus any extra files, keyed by relative path. */
function writeSkill(name, { frontmatter = '', body, files = {} }) {
  const dir = join(root, 'skills', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Use when testing ${name}.\n${frontmatter}---\n\n${body}\n`
  );
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
}

function runGenerator(...flags) {
  const result = spawnSync(
    process.execPath,
    [GENERATOR, '--skills', join(root, 'skills'), '--rules', join(root, 'rules'), ...flags],
    { encoding: 'utf8' }
  );
  return { status: result.status, output: result.stdout + result.stderr };
}

const rulesPath = (name) => join(root, 'rules', `${name}.md`);
const readRules = (name) => readFileSync(rulesPath(name), 'utf8');

const COLOR_SKILL = {
  body: '# Color Contrast\n\nRun `scripts/contrast-check.js` and read\n`references/palettes.md` first.',
  files: {
    'scripts/contrast-check.js': '// checks contrast\n',
    'references/palettes.md': '# Palettes\n',
  },
};

test('builds a skill the generator has never heard of', () => {
  writeSkill('color-contrast', COLOR_SKILL);

  const { status, output } = runGenerator();

  assert.equal(status, 0, output);
  const rules = readRules('color-contrast');
  assert.match(rules, /^# Color Contrast$/m);
  assert.match(rules, /\*\*When this applies\.\*\* Use when testing color-contrast\./);
});

test('links a skill\'s own scripts and references without lengthening the line', () => {
  writeSkill('color-contrast', COLOR_SKILL);

  runGenerator();
  const rules = readRules('color-contrast');

  assert.match(rules, /^Run \[scripts\/contrast-check\.js\] and read$/m);
  assert.match(rules, /^\[references\/palettes\.md\] first\.$/m);
  assert.ok(rules.includes(
    `[scripts/contrast-check.js]: ${BLOB}/skills/color-contrast/scripts/contrast-check.js`
  ));
  assert.ok(rules.includes(
    `[references/palettes.md]: ${BLOB}/skills/color-contrast/references/palettes.md`
  ));
});

test('leaves a path inside a fenced code block alone', () => {
  writeSkill('color-contrast', {
    body: '# Color Contrast\n\n```markdown\nSee `scripts/not-a-real-file.js`.\n```',
  });

  const { status, output } = runGenerator();

  assert.equal(status, 0, output);
  assert.ok(readRules('color-contrast').includes('See `scripts/not-a-real-file.js`.'));
});

test('fails, naming the path, when a skill points at a file it does not have', () => {
  writeSkill('color-contrast', {
    body: '# Color Contrast\n\nRun `scripts/missing-check.js` before you commit.',
  });

  const { status, output } = runGenerator();

  assert.equal(status, 1);
  assert.match(output, /points at files the skill does not have: scripts\/missing-check\.js/);
  assert.equal(existsSync(rulesPath('color-contrast')), false);
});

const SKIPPED_SKILLS = [
  ['a slash command', 'disable-model-invocation: true\n'],
  ['a skill that opts out in its metadata', 'metadata:\n  version: 1.0.0\n  rules-file: false\n'],
];

for (const [label, frontmatter] of SKIPPED_SKILLS) {
  test(`writes no rules file for ${label}`, () => {
    writeSkill('color-contrast', COLOR_SKILL);
    writeSkill('procedure', { frontmatter, body: '# Procedure\n\nSteps a person runs.' });

    const { status, output } = runGenerator();

    assert.equal(status, 0, output);
    assert.equal(existsSync(rulesPath('procedure')), false);
    assert.equal(existsSync(rulesPath('color-contrast')), true);
  });
}

test('--check passes straight after a build', () => {
  writeSkill('color-contrast', COLOR_SKILL);
  runGenerator();

  const { status, output } = runGenerator('--check');

  assert.equal(status, 0, output);
});

test('--check fails when a skill changed after the last build', () => {
  writeSkill('color-contrast', COLOR_SKILL);
  runGenerator();
  writeSkill('color-contrast', { ...COLOR_SKILL, body: `${COLOR_SKILL.body}\n\nOne more rule.` });

  const { status, output } = runGenerator('--check');

  assert.equal(status, 1);
  assert.match(output, /out of sync: rules\/color-contrast\.md/);
});

test('--check fails on a rules file whose skill is gone', () => {
  writeSkill('color-contrast', COLOR_SKILL);
  runGenerator();
  writeFileSync(rulesPath('renamed-away'), '# Left behind by a rename\n');

  const { status, output } = runGenerator('--check');

  assert.equal(status, 1);
  assert.match(output, /no source skill: rules\/renamed-away\.md/);
});
