#!/usr/bin/env node
/**
 * build-rules.mjs — generate rules/*.md from skills/<name>/SKILL.md
 *
 * The skills are the single source of truth. This script produces the
 * standalone always-apply rules files that Cursor, Windsurf, Copilot and
 * other assistants consume, because those tools cannot load Agent Skills.
 *
 *   node tools/build-rules.mjs           write rules/
 *   node tools/build-rules.mjs --check   verify rules/ matches skills/ (CI)
 *
 * No dependencies. Node 18+.
 *
 * Every rewrite below is matched literally and MUST be found. If you edit a
 * skill and a rewrite stops matching, this script fails loudly rather than
 * shipping a rules file with a path that points nowhere.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(REPO, 'skills');
const RULES_DIR = join(REPO, 'rules');

// GitHub resolves /blob/HEAD/ to whatever the repo's default branch is called,
// so links in the generated files survive a branch rename and this script does
// not have to know or guess the branch name.
const REF = 'HEAD';

const check = process.argv.includes('--check');

/* ------------------------------------------------------------------ *
 * Per-skill rewrites.
 *
 * A rules file is read on its own, detached from this repo, so every
 * repo-relative path has to become an absolute URL and every mention of
 * "this skill" has to stop claiming to be a skill.
 * ------------------------------------------------------------------ */

const rewrites = {
  'accessibility-rules': (blob) => [
    [
      '**Relationship to the form-rules skill.** For form layout, grid, tokens, and the\nerror pattern, the `form-rules` skill is the source of truth.',
      '**Relationship to the form-rules ruleset.** For form layout, grid, tokens,\nand the error pattern, the companion `form-rules` file is the source of truth.',
    ],
    [
      'them whenever this skill is loaded, whether or not the request mentions',
      'them whenever this file is loaded, whether or not the request mentions',
    ],
    [
      '  This skill bundles one — `scripts/axe-check.js`, which drives axe-core over a\n  URL or a local HTML file:',
      `  The accessible-vibe-coding repo ships one — [axe-check.js](${blob}/skills/accessibility-rules/scripts/axe-check.js),\n  which drives axe-core over a URL or a local HTML file:`,
    ],
    [
      'live in `references/patterns.md`. Read it before building',
      `live in [references/patterns.md](${blob}/skills/accessibility-rules/references/patterns.md). Read it before building`,
    ],
  ],
  'form-rules': (blob) => [
    [
      'live in `references/markup.md`. Read that file',
      `live in [references/markup.md](${blob}/skills/form-rules/references/markup.md). Read that file`,
    ],
    [
      '**Checking the mechanical half.** This skill bundles `scripts/form-check.js`,',
      `**Checking the mechanical half.** The accessible-vibe-coding repo ships [form-check.js](${blob}/skills/form-rules/scripts/form-check.js),`,
    ],
    [
      "the accessibility-rules skill's `axe-check.js` covers the rules this one",
      "the accessibility-rules ruleset's `axe-check.js` covers the rules this one",
    ],
    [
      '  "Form grid" in `references/markup.md`.',
      `  "Form grid" in [references/markup.md](${blob}/skills/form-rules/references/markup.md).`,
    ],
    [
      'treat every line as its own gate. `scripts/form-check.js` (see §8) catches the',
      'treat every line as its own gate. `form-check.js` (see §8) catches the',
    ],
  ],
};

/* ------------------------------------------------------------------ */

/** Minimal frontmatter reader — the skills use a flat shape plus `metadata`. */
function parseFrontmatter(src, file) {
  if (!src.startsWith('---\n')) {
    throw new Error(`${file}: no frontmatter on line 1`);
  }
  const end = src.indexOf('\n---\n', 3);
  if (end === -1) throw new Error(`${file}: unterminated frontmatter`);

  const head = src.slice(4, end);
  const body = src.slice(end + 5).replace(/^\n+/, '');
  const meta = {};

  let section = null;
  for (const line of head.split('\n')) {
    if (!line.trim()) continue;
    const nested = /^\s+(\w[\w.-]*):\s*(.*)$/.exec(line);
    if (nested && section) {
      meta[`${section}.${nested[1]}`] = nested[2].trim();
      continue;
    }
    const top = /^(\w[\w.-]*):\s*(.*)$/.exec(line);
    if (!top) continue;
    if (top[2].trim() === '') {
      section = top[1];
    } else {
      section = null;
      meta[top[1]] = top[2].trim();
    }
  }

  for (const key of ['name', 'description']) {
    if (!meta[key]) throw new Error(`${file}: frontmatter is missing "${key}"`);
  }
  return { meta, body };
}

/** Wrap prose in a blockquote at a sane line width. */
function quote(text, width = 76) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.map((l) => `> ${l}`).join('\n');
}

function build(name) {
  const file = join(SKILLS_DIR, name, 'SKILL.md');
  const { meta, body: raw } = parseFrontmatter(readFileSync(file, 'utf8'), `skills/${name}/SKILL.md`);

  const source = meta['metadata.source'] || 'https://github.com/jeffjbernier/Accessible-Vibe-Coding';
  const blob = `${source.replace(/\/+$/, '')}/blob/${REF}`;
  const version = meta['metadata.version'] || 'unversioned';

  let body = raw;
  for (const [from, to] of rewrites[name]?.(blob) ?? []) {
    if (!body.includes(from)) {
      throw new Error(
        `skills/${name}/SKILL.md: rewrite target not found.\n` +
          `  Looked for: ${JSON.stringify(from.slice(0, 70))}...\n` +
          `  The skill changed. Update the rewrite in tools/build-rules.mjs so the\n` +
          `  generated rules file does not ship a path that points nowhere.`
      );
    }
    body = body.replace(from, to);
  }

  // The skill's `description` is what makes it fire. A rules file has no
  // frontmatter to carry it, so it becomes a visible trigger block instead.
  const heading = /^#\s+.+$/m.exec(body);
  if (!heading) throw new Error(`skills/${name}/SKILL.md: no H1 in the body`);

  const trigger = [
    quote(`**When this applies.** ${meta.description}`),
    '>',
    quote(
      `Always-apply ruleset, generated from the ${name} skill in accessible-vibe-coding ` +
        `v${version}. Licensed ${meta.license || 'MIT'}.`
    ),
    `>`,
    `> Source: ${source}`,
  ].join('\n');

  const at = heading.index + heading[0].length;
  body = `${body.slice(0, at)}\n\n${trigger}${body.slice(at)}`;

  const banner = [
    '<!--',
    '  GENERATED FILE — DO NOT EDIT.',
    `  Source: skills/${name}/SKILL.md`,
    '  Regenerate: node tools/build-rules.mjs',
    '  Edits belong in the skill; this file is overwritten on every build.',
    '-->',
    '',
    '',
  ].join('\n');

  const out = `${banner}${body.replace(/\s*$/, '')}\n`;

  // A rules file that still carries a repo-relative path is broken the moment
  // someone copies it out of this repo.
  const dangling = out.match(/`(?:scripts|references)\/[^`]+`/g);
  if (dangling) {
    throw new Error(
      `rules/${name}.md would ship repo-relative paths: ${dangling.join(', ')}\n` +
        `  Add a rewrite in tools/build-rules.mjs turning each into an absolute URL.`
    );
  }

  return out;
}

// Skills that are procedures rather than rulesets — slash commands a person
// types, or a skill that drives a live tool such as NVDA — have no meaning as
// an always-apply rules file for Cursor or Copilot. They ship as skills only.
const NO_RULES_FILE = new Set(['a11y-report', 'a11y-scan', 'aria-fix', 'nvda-scan']);

const names = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SKILLS_DIR, e.name, 'SKILL.md')))
  .map((e) => e.name)
  .filter((name) => !NO_RULES_FILE.has(name))
  .sort();

if (!names.length) {
  console.error('No skills found under skills/.');
  process.exit(1);
}

if (!check) mkdirSync(RULES_DIR, { recursive: true });

let stale = 0;
for (const name of names) {
  const out = build(name);
  const dest = join(RULES_DIR, `${name}.md`);

  if (check) {
    const current = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
    if (current !== out) {
      stale++;
      console.error(`out of sync: rules/${name}.md`);
    } else {
      console.log(`ok: rules/${name}.md`);
    }
  } else {
    writeFileSync(dest, out);
    console.log(`wrote rules/${name}.md (${out.length} bytes)`);
  }
}

if (check && stale) {
  console.error(
    `\n${stale} rules file(s) do not match skills/.\n` +
      `Run "node tools/build-rules.mjs" and commit the result.`
  );
  process.exit(1);
}
