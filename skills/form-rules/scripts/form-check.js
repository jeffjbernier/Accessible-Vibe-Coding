#!/usr/bin/env node
/**
 * form-check.js — check form markup against the §8 merge-gating checklist.
 *
 * Part of the form-rules skill. This is deliberately NOT another axe wrapper:
 * it looks for the failures axe passes. A placeholder-only label, a <div>
 * pretending to be a submit button, a disabled submit, a dangling
 * aria-describedby — axe waves all of those through, and every one of them is
 * a §8 gate.
 *
 * Run it alongside axe, not instead of it:
 *   node ../accessibility-rules/scripts/axe-check.js page.html
 *   node scripts/form-check.js page.html
 *
 * Usage:
 *   node form-check.js <target> [target...] [options]
 *
 *   <target>            A URL (https://…) or a path to a local .html file.
 *
 * Options:
 *   --warn-only         Treat every finding as a warning; exit 0 unless the
 *                       page failed to load.
 *   --json              Emit raw JSON instead of the text report.
 *   --nodes <n>         Max offending elements printed per check (default 3).
 *   --exit-zero         Always exit 0, even when gates fail.
 *   --timeout <ms>      Page load timeout (default 30000).
 *   --executable <path> Chromium binary to drive, when Playwright's bundled
 *                       browser isn't the one you want (CI images, pinned
 *                       system Chrome). Also read from the environment variable
 *                       FORM_CHECK_CHROMIUM.
 *   --help              Show this message.
 *
 * Exit codes:
 *   0  no gates failed (or --warn-only / --exit-zero)
 *   1  at least one §8 gate failed
 *   2  could not run (bad arguments, missing dependency, page failed to load)
 *
 * What it cannot check: whether focus order makes sense, whether an error
 * message explains the fix, whether the screen-reader announcement is right,
 * contrast in dark mode, or 400% reflow. Those stay on the human list in §8.
 *
 * Dependencies (installed in the project you are scanning, not in this skill):
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');

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
  process.stderr.write(`form-check: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = {
    targets: [], json: false, maxNodes: 3, exitZero: false,
    warnOnly: false, timeout: 30000,
    executable: process.env.FORM_CHECK_CHROMIUM || undefined,
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
      case '--warn-only': opts.warnOnly = true; break;
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

function toUrl(target) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return target;
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) fail(`No such file: ${target}`);
  return pathToFileURL(abs).href;
}

/**
 * Runs inside the page. Returns { findings: [...], formCount }.
 * Each finding: { id, level, section, message, elements: [selector] }.
 */
/* istanbul ignore next — executed in the browser, not in Node */
function auditForms() {
  const findings = [];
  const add = (id, level, section, message, elements) => {
    if (elements.length) findings.push({ id, level, section, message, elements });
  };

  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(`#${node.id}`); break; }
      if (node.name) part += `[name="${node.name}"]`;
      else if (node.classList.length) part += `.${node.classList[0]}`;
      else {
        const sibs = [...(node.parentNode ? node.parentNode.children : [])]
          .filter(s => s.tagName === node.tagName);
        if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };

  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const accName = (el) =>
    (el.getAttribute('aria-label') || '').trim() ||
    (el.getAttribute('aria-labelledby') || '').split(/\s+/)
      .map(id => { const t = document.getElementById(id); return t ? text(t) : ''; })
      .join(' ').trim();

  const forms = [...document.querySelectorAll('form')];
  const scopes = forms.length ? forms : [document.body];
  const within = (s) => (q) => [...s.querySelectorAll(q)];
  const all = (q) => scopes.flatMap(s => within(s)(q));

  const controls = all('input, select, textarea').filter(
    el => !['hidden', 'submit', 'button', 'reset', 'image'].includes((el.type || '').toLowerCase())
  );

  // --- §5 / §8: every control has a programmatic label ---
  const labelFor = new Map();
  for (const l of document.querySelectorAll('label[for]')) labelFor.set(l.getAttribute('for'), l);
  const unlabeled = controls.filter(el => {
    if (el.id && labelFor.has(el.id)) return false;
    if (el.closest('label')) return false;
    if (accName(el)) return false;
    return true;
  });
  add('control-label', 'FAIL', '§5, §8',
      'Control has no programmatic label. A <label for> (or aria-label/aria-labelledby) is required.',
      unlabeled.map(sel));

  // --- §5: placeholder standing in for a label. axe passes this; §5 forbids it ---
  const placeholderOnly = controls.filter(el => {
    if (!el.placeholder) return false;
    const labelled = (el.id && labelFor.has(el.id)) || el.closest('label');
    return !labelled && !el.getAttribute('aria-labelledby');
  });
  add('placeholder-as-label', 'FAIL', '§5',
      'Placeholder used as the label. Placeholders vanish on input and are not labels — add a real <label for>.',
      placeholderOnly.map(sel));

  // --- §6 / §10: every form has a unique accessible name ---
  const unnamedForms = forms.filter(f => !accName(f) && !f.getAttribute('title'));
  add('form-name', 'FAIL', '§6, §10',
      'Form has no accessible name. Point aria-labelledby at the visible heading, or use aria-label.',
      unnamedForms.map(sel));

  if (forms.length > 1) {
    const seen = new Map();
    const dupes = [];
    for (const f of forms) {
      const n = accName(f).toLowerCase();
      if (!n) continue;
      if (seen.has(n)) dupes.push(f); else seen.set(n, f);
    }
    add('form-name-unique', 'FAIL', '§10',
        'Two forms on this page share an accessible name. Names must be unique when a page has more than one form.',
        dupes.map(sel));
  }

  // --- §8: no positive tabindex ---
  const positiveTab = all('[tabindex]').filter(el => parseInt(el.getAttribute('tabindex'), 10) > 0);
  add('positive-tabindex', 'FAIL', '§8',
      'tabindex greater than 0 overrides natural tab order. Fix DOM order instead.',
      positiveTab.map(sel));

  // --- §11: fake buttons ---
  const fakeButtons = all('[onclick], [role="button"]').filter(
    el => !['BUTTON', 'A', 'INPUT', 'SUMMARY'].includes(el.tagName)
  );
  add('fake-button', 'FAIL', '§11',
      'Non-button element used as a control. Use a real <button> or <a href> — no keyboard support or role comes for free otherwise.',
      fakeButtons.map(sel));

  // --- §11: icon-only controls need a name ---
  const iconOnly = all('button, a[href], [role="button"]').filter(el => {
    if (text(el)) return false;
    if (accName(el)) return false;
    if (el.tagName === 'INPUT' && el.value) return false;
    return el.querySelector('svg, img, i, span') !== null || !text(el);
  });
  add('icon-only-name', 'FAIL', '§11',
      'Control has no accessible name (icon-only or empty). Add aria-label describing the action, not the icon.',
      iconOnly.map(sel));

  // --- §11: submit button disabled on load ---
  const disabledSubmit = all('button[type="submit"], input[type="submit"], button:not([type])')
    .filter(el => el.disabled);
  add('disabled-submit', 'FAIL', '§11',
      'Submit button is disabled on load. A disabled button is unfocusable and silent — leave it enabled and validate per §7.',
      disabledSubmit.map(sel));

  // --- §11: autofocus ---
  const autofocused = all('[autofocus]');
  const singlePurpose = forms.length === 1 && controls.length <= 2;
  add('autofocus', singlePurpose ? 'WARN' : 'FAIL', '§11',
      singlePurpose
        ? 'autofocus on a single-purpose form. Allowed only when the form IS the page — confirm that is the case.'
        : 'autofocus skips content above the field and disorients screen-reader and keyboard users (3.2.1).',
      autofocused.map(sel));

  // --- §8: autocomplete on personal-data fields (1.3.5) ---
  const personal = /(^|[-_])(email|tel|phone|mobile|fname|lname|fullname|name|address|street|city|state|zip|postal|country|cc|card|organization|company|username|password)([-_]|$)/i;
  // 1.3.5 covers fields the user types their OWN data into. Radios, checkboxes
  // and selects pick from options the page supplies, so they are out of scope —
  // a radio named "c-email" is a choice, not an email field.
  const TEXT_ENTRY = ['text', 'email', 'tel', 'password', 'url', 'number', 'date', ''];
  const missingAutocomplete = controls.filter(el => {
    if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return false;
    const type = (el.type || '').toLowerCase();
    if (el.tagName === 'INPUT' && !TEXT_ENTRY.includes(type)) return false;
    const hint = `${el.name || ''} ${el.id || ''}`;
    const isPersonal = ['email', 'tel', 'password'].includes(type) || personal.test(hint);
    return isPersonal && !el.getAttribute('autocomplete');
  });
  add('autocomplete', 'FAIL', '§8',
      'Personal-data field has no autocomplete attribute (1.3.5).',
      missingAutocomplete.map(sel));

  // --- §11 / 3.3.8: paste blocking ---
  const pasteBlocked = all('[onpaste]').filter(el => /false|preventDefault/i.test(el.getAttribute('onpaste')));
  add('paste-blocked', 'FAIL', '§11',
      'Field blocks paste. Password and verification-code fields must stay paste-able (3.3.8).',
      pasteBlocked.map(sel));

  // --- §5: radio/checkbox groups need fieldset + legend ---
  const groups = new Map();
  for (const el of all('input[type="radio"], input[type="checkbox"]')) {
    if (!el.name) continue;
    if (!groups.has(el.name)) groups.set(el.name, []);
    groups.get(el.name).push(el);
  }
  const ungrouped = [];
  for (const [, members] of groups) {
    if (members.length < 2) continue;
    const fs = members[0].closest('fieldset');
    if (!fs || !fs.querySelector('legend')) ungrouped.push(members[0]);
  }
  add('group-legend', 'FAIL', '§5',
      'Radio/checkbox group is not wrapped in a <fieldset> with a <legend>.',
      ungrouped.map(sel));

  // --- §2: no layout tables ---
  const tables = all('table').filter(t => !t.querySelector('th') || !t.querySelector('caption'));
  add('layout-table', 'FAIL', '§2',
      'Table inside a form with no <th>/<caption> — layout tables are not allowed; the grid is CSS Grid.',
      tables.map(sel));

  // --- broken references: for / aria-describedby / aria-labelledby pointing nowhere ---
  const dangling = [];
  for (const el of all('[aria-describedby], [aria-labelledby]')) {
    for (const attr of ['aria-describedby', 'aria-labelledby']) {
      const v = el.getAttribute(attr);
      if (!v) continue;
      if (v.split(/\s+/).some(id => id && !document.getElementById(id))) { dangling.push(el); break; }
    }
  }
  for (const l of document.querySelectorAll('label[for]')) {
    if (!document.getElementById(l.getAttribute('for'))) dangling.push(l);
  }
  add('dangling-reference', 'FAIL', '§5, §7',
      'Attribute references an id that does not exist on the page. The hint or error it points at is announced to nobody.',
      dangling.map(sel));

  // --- §8 / 2.5.8: pointer targets ≥ 24×24 CSS px ---
  const small = all('input[type="checkbox"], input[type="radio"], button, a[href], select')
    .filter(el => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return false; // not rendered; nothing to measure
      return r.width < 24 || r.height < 24;
    });
  add('target-size', 'FAIL', '§8',
      'Pointer target smaller than 24×24 CSS px including padding (2.5.8).',
      small.map(el => `${sel(el)} — ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`));

  // --- §11 / 1.3.3: sensory-only instructions ---
  const sensory = /\b(the (field|button|box|link|menu)s? (on|to) the (right|left)|the (green|red|blue|yellow) (button|field|box|link)|click the (round|square) )/i;
  const sensoryHits = scopes.filter(s => sensory.test(text(s)));
  add('sensory-instruction', 'WARN', '§11',
      'Copy may identify a field by position or color alone (1.3.3). Pair any such reference with its text.',
      sensoryHits.map(sel));

  // --- §1: server path intact ---
  const noAction = forms.filter(f => !f.getAttribute('action') && !f.getAttribute('method'));
  add('no-server-path', 'WARN', '§1',
      'Form declares neither action nor method. Confirm a native POST path exists and JS is only an enhancement.',
      noAction.map(sel));

  // --- §8: focus ring suppressed in the page stylesheets ---
  const suppressed = [];
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try { rules = [...(sheet.cssRules || [])]; } catch (_) { continue; } // cross-origin
    for (const rule of rules) {
      if (!rule.style || !rule.selectorText) continue;
      const outline = rule.style.outline || rule.style.outlineStyle || rule.style.outlineWidth;
      if (/focus/i.test(rule.selectorText) && /^(none|0|0px)$/.test((outline || '').trim())) {
        const hasReplacement = rule.style.boxShadow || rule.style.border || rule.style.outlineOffset;
        if (!hasReplacement) suppressed.push(rule.selectorText);
      }
    }
  }
  add('focus-ring-suppressed', 'WARN', '§8',
      'Stylesheet removes the focus outline without an obvious replacement. Verify a visible 3:1 indicator remains.',
      suppressed);

  return { findings, formCount: forms.length };
}

function reportText(result, opts) {
  const lines = ['', `Target: ${result.url}`];

  if (!result.formCount) {
    lines.push('Note: no <form> element found — checked the whole document instead.');
  }

  const fails = result.findings.filter(f => f.level === 'FAIL');
  const warns = result.findings.filter(f => f.level === 'WARN');

  if (!result.findings.length) {
    lines.push('Result: PASS — no mechanical §8 failures found.', '');
  } else {
    const count = (list) => list.reduce((n, f) => n + f.elements.length, 0);
    lines.push(
      fails.length
        ? `Result: FAIL — ${fails.length} gate(s) failed across ${count(fails)} element(s), ${warns.length} warning(s).`
        : `Result: PASS with ${warns.length} warning(s) across ${count(warns)} element(s).`,
      ''
    );

    for (const f of [...fails, ...warns]) {
      lines.push(`  [${f.level}] ${f.id} (${f.section}) — ${f.message}`);
      for (const el of f.elements.slice(0, opts.maxNodes)) lines.push(`      at: ${el}`);
      const hidden = f.elements.length - opts.maxNodes;
      if (hidden > 0) lines.push(`      …and ${hidden} more. Re-run with --nodes ${f.elements.length}.`);
      lines.push('');
    }
  }
  return lines.join('\n');
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
  const all = [];
  let failCount = 0;

  try {
    for (const [i, url] of urls.entries()) {
      const target = opts.targets[i];
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'load', timeout: opts.timeout });
        const result = await page.evaluate(auditForms);
        result.url = url;
        if (opts.warnOnly) result.findings.forEach(f => { f.level = 'WARN'; });
        failCount += result.findings.filter(f => f.level === 'FAIL').length;
        all.push(result);
        if (!opts.json) process.stdout.write(reportText(result, opts));
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
    process.stdout.write(JSON.stringify(all.length === 1 ? all[0] : all, null, 2) + '\n');
  } else if (opts.targets.length > 1) {
    process.stdout.write(
      failCount
        ? `\nOverall: FAIL — ${failCount} gate(s) failed across ${opts.targets.length} target(s).\n`
        : `\nOverall: PASS — ${opts.targets.length} target(s) clean.\n`
    );
  }

  const reminder =
    '\nThis checks the mechanical half of §8. Still required before merge:\n' +
    'keyboard-only walkthrough, error-summary focus verified with a screen reader,\n' +
    'contrast checked in both themes, and 400% zoom / 320px reflow.\n';
  (opts.json ? process.stderr : process.stdout).write(reminder);

  process.exit(opts.exitZero || failCount === 0 ? 0 : 1);
}

run().catch(err => fail(err.stack || err.message));
