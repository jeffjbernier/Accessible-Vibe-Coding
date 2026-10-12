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
 *   --skills <dir>   read skills from here instead of ./skills
 *   --rules <dir>    write or check rules here instead of ./rules
 *
 * No dependencies. Node 18+.
 *
 * Any folder under skills/ with a SKILL.md is built; nothing in this file
 * has to name it. A skill is skipped when its frontmatter says it is a slash
 * command (`disable-model-invocation: true`) or opts out with
 * `rules-file: false` under `metadata`.
 *
 * Paths a skill gives to its own `scripts/` and `references/` files are
 * turned into links automatically. The per-skill rewrites below are only for
 * wording. Each is matched literally and MUST be found: if you edit a skill
 * and a rewrite stops matching, this script fails loudly rather than
 * shipping a rules file that quietly kept the old wording.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

/** The directory given after a flag, or the fallback when the flag is absent. */
function dirOption(flag, fallback) {
  const at = args.indexOf(flag);
  if (at === -1) return fallback;
  const value = args[at + 1];
  if (!value || value.startsWith('--')) {
    console.error(`${flag} needs a directory.`);
    process.exit(1);
  }
  return resolve(value);
}

const SKILLS_DIR = dirOption('--skills', join(REPO, 'skills'));
const RULES_DIR = dirOption('--rules', join(REPO, 'rules'));

// GitHub resolves /blob/HEAD/ to whatever the repo's default branch is called,
// so links in the generated files survive a branch rename and this script does
// not have to know or guess the branch name.
const REF = 'HEAD';

const check = args.includes('--check');

/* ------------------------------------------------------------------ *
 * Per-skill rewrites — optional.
 *
 * A rules file is read on its own, detached from this repo, so a mention of
 * "this skill" should stop claiming to be a skill. That wording is specific
 * to each skill, so it lives here. A skill with no entry builds unchanged;
 * its own scripts/ and references/ paths are linked by linkLocalPaths().
 * ------------------------------------------------------------------ */

const rewrites = {
  'accessibility': () => [
    [
      '**Relationship to the accessible-forms skill.** For form layout, grid, tokens,\nand the error pattern, the `accessible-forms` skill is the source of truth.\nWhere the two overlap, accessible-forms wins. Touch-target sizing is defined\nonce in "Touch and pointer" and applies across this file.',
      '**Relationship to the accessible-forms ruleset.** For form layout, grid,\ntokens, and the error pattern, the companion `accessible-forms` file is the\nsource of truth. Where the two overlap, accessible-forms wins. Touch-target\nsizing is defined once in "Touch and pointer" and applies across this file.',
    ],
    [
      'apply whenever this skill is\nloaded, whether or not the request mentions',
      'apply whenever this file is\nloaded, whether or not the request mentions',
    ],
    [
      '- The project may include `scripts/axe-check.js`; if present, it can be used to\n  drive axe-core over a URL or a local HTML file:',
      '- The project may include [scripts/axe-check.js][axe-check]; if present, it\n  can be used to drive axe-core over a URL or a local HTML file:',
    ],
    [
      'runtime (including `references/patterns.md`).',
      'runtime (including [references/patterns.md][patterns]).',
    ],
  ],
  'accessible-forms': (blob) => [
    [
      'the read-only record display — live in `references/markup.md`. Read that file\nbefore writing or reviewing any form markup. Use it as a concrete starting\npoint only. If the reference file differs from §2 or §3, follow §2 and §3 and\nnote the discrepancy in a code comment or TODO so the mismatch is explicit. If\n`references/markup.md` is not present or cannot be read, proceed using §2 and §3\nas the sole source of truth and note in a code comment that the reference file\nwas unavailable.',
      'the read-only record display — live in [references/markup.md][markup]. Read\nthat file before writing or reviewing any form markup. Use it as a concrete\nstarting point only. If the reference file differs from §2 or §3, follow §2\nand §3 and note the discrepancy in a code comment or TODO so the mismatch is\nexplicit. If [references/markup.md][markup] is not present or cannot be read,\nproceed using §2 and §3 as the sole source of truth and note in a code\ncomment that the reference file was unavailable.',
    ],
    [
      '**Checking the mechanical half.** This skill bundles `scripts/form-check.js`,',
      `**Checking the mechanical half.** The accessible-vibe-coding repo ships [form-check.js](${blob}/skills/accessible-forms/scripts/form-check.js),`,
    ],
    [
      "the accessibility skill's `axe-check.js` covers the rules this one",
      "the accessibility ruleset's `axe-check.js` covers the rules this one",
    ],
    [
      '  "Form grid" in `references/markup.md`.',
      `  "Form grid" in [references/markup.md](${blob}/skills/accessible-forms/references/markup.md).`,
    ],
    [
      'treat every line as its own gate. `scripts/form-check.js` (see §8) catches the',
      'treat every line as its own gate. `form-check.js` (see §8) catches the',
    ],
  ],
  'accessible-tables': () => [
    [
      '**Relationship to the accessibility skill.** That skill sets the',
      '**Relationship to the accessibility ruleset.** That file sets the',
    ],
    ['Files in this skill:', 'Files in the accessible-vibe-coding repo:'],
    [
      '  accessibility skill requires; the CSS starter in the patterns file',
      '  accessibility ruleset requires; the CSS starter in the patterns file',
    ],
  ],
};

// A full URL inline pushes its line past 80 columns (MD013), so the
// rewrites above that would put one mid-line use a reference link instead,
// and the definition goes at the end of the file.
const links = {
  'accessibility': (blob) => ({
    'axe-check': `${blob}/skills/accessibility/scripts/axe-check.js`,
    patterns: `${blob}/skills/accessibility/references/patterns.md`,
  }),
  'accessible-forms': (blob) => ({
    markup: `${blob}/skills/accessible-forms/references/markup.md`,
  }),
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

const LOCAL_PATH = /`((?:scripts|references)\/[^`\s]+)`/g;

/**
 * Turn a skill's own `scripts/…` and `references/…` paths into links.
 *
 * Each becomes a shortcut reference link, `[scripts/x.js]`, which is exactly
 * as long as the backticked path it replaces, so no line grows past the
 * 80-column limit. The matching definitions are returned for the end of the
 * file. Fenced code blocks are left alone.
 */
function linkLocalPaths(body, name, blob) {
  const definitions = new Map();
  const missing = new Set();
  let inFence = false;

  const lines = body.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    return line.replace(LOCAL_PATH, (match, path, offset) => {
      if (!existsSync(join(SKILLS_DIR, name, path.split('#')[0]))) {
        missing.add(path);
        return match;
      }
      definitions.set(path, `${blob}/skills/${name}/${path}`);
      // "[x](" or "[x][" would read as a different kind of link.
      const next = line[offset + match.length];
      return next === '(' || next === '[' ? `[${path}][]` : `[${path}]`;
    });
  });

  if (missing.size) {
    throw new Error(
      `skills/${name}/SKILL.md points at files the skill does not have: ` +
        `${[...missing].join(', ')}\n` +
        `  A rules file is copied out of this repo, so each path must be a real\n` +
        `  file under skills/${name}/ that it can link to. Fix the path, add the\n` +
        `  file, or reword the sentence if it means a file in the reader's project.`
    );
  }
  return { body: lines.join('\n'), definitions };
}

/** True when the skill is a procedure, not a ruleset, and gets no rules file. */
function skipsRulesFile(meta) {
  return meta['disable-model-invocation'] === 'true' || meta['metadata.rules-file'] === 'false';
}

function readSkill(name) {
  const file = join(SKILLS_DIR, name, 'SKILL.md');
  return parseFrontmatter(readFileSync(file, 'utf8'), `skills/${name}/SKILL.md`);
}

function build(name) {
  const { meta, body: raw } = readSkill(name);

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

  const linked = linkLocalPaths(body, name, blob);
  body = linked.body;

  // The skill's `description` is what makes it fire. A rules file has no
  // frontmatter to carry it, so it becomes a visible trigger block instead.
  const heading = /^#\s+.+$/m.exec(body);
  if (!heading) throw new Error(`skills/${name}/SKILL.md: no H1 in the body`);

  const trigger = [
    quote(`**When this applies.** ${meta.description}`),
    '>',
    quote(
      `Always-apply ruleset, generated from the ${name} skill v${version} in ` +
        `accessible-vibe-coding. Licensed ${meta.license || 'MIT'}.`
    ),
    `>`,
    `> Source: <${source}>`,
  ].join('\n');

  // A skill that opens with its own blockquote would be split from the
  // trigger by a blank line (MD028), so continue one quote into the other.
  const at = heading.index + heading[0].length;
  const rest = body.slice(at).replace(/^\n+/, '');
  const gap = rest.startsWith('>') ? '\n>\n' : '\n\n';
  body = `${body.slice(0, at)}\n\n${trigger}${gap}${rest}`;

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

  const defs = [...Object.entries(links[name]?.(blob) ?? {}), ...linked.definitions]
    .map(([label, url]) => `[${label}]: ${url}`)
    .join('\n');
  return `${banner}${body.replace(/\s*$/, '')}\n${defs ? `\n${defs}\n` : ''}`;
}

// Skills that are procedures rather than rulesets — slash commands a person
// types, or a skill that drives a live tool such as NVDA — have no meaning as
// an always-apply rules file for Cursor or Copilot. They ship as skills only,
// and say so in their own frontmatter (see skipsRulesFile).
const names = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SKILLS_DIR, e.name, 'SKILL.md')))
  .map((e) => e.name)
  .filter((name) => !skipsRulesFile(readSkill(name).meta))
  .sort();

if (!names.length) {
  console.error(`No skills that take a rules file found under ${SKILLS_DIR}.`);
  process.exit(1);
}

// A rules file whose skill was renamed, removed, or opted out keeps shipping
// stale rules unless something notices it.
const orphans = existsSync(RULES_DIR)
  ? readdirSync(RULES_DIR)
      .filter((entry) => entry.endsWith('.md') && !names.includes(entry.slice(0, -3)))
      .sort()
  : [];

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
    console.log(`wrote rules/${name}.md (${Buffer.byteLength(out)} bytes)`);
  }
}

for (const orphan of orphans) {
  if (check) stale++;
  console.error(
    `${check ? 'no source skill' : 'warning: no source skill'}: rules/${orphan}` +
      (check ? '' : ' — delete it if its skill is gone')
  );
}

if (check && stale) {
  console.error(
    `\n${stale} rules file(s) do not match skills/.\n` +
      `Run "node tools/build-rules.mjs" and commit the result. Delete any rules\n` +
      `file listed as having no source skill.`
  );
  process.exit(1);
}
