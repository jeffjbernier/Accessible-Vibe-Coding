/**
 * table-enhance.test.mjs — regression tests for
 * skills/accessible-tables/scripts/table-enhance.js
 *
 * Loads the fixture page in tests/table-enhance/ in Chromium, lets the script
 * auto-initialize, and asserts on the resulting DOM and sort behavior.
 *
 * Needs Playwright resolvable from this repo (see CONTRIBUTING.md), then:
 *
 *   node --test "tests/*.test.mjs"
 */

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { after, before, beforeEach, afterEach, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_URL = pathToFileURL(join(HERE, 'table-enhance', 'sortable-and-scroll.html')).href;
const SORT_HINT = '(column headers with buttons are sortable)';

let browser;
let page;

before(async () => {
  const executablePath = process.env.TABLE_AUDIT_CHROMIUM;
  browser = await chromium.launch(executablePath ? { executablePath } : {});
});

after(async () => {
  await browser.close();
});

// A fresh page per test, so no test sees another's sort order.
beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(FIXTURE_URL, { waitUntil: 'load' });
});

afterEach(async () => {
  await page.close();
});

/** The first-column text of every body row, top to bottom. */
const firstColumn = (tableId) => page.$$eval(
  `#${tableId} tbody tr`,
  (rows) => rows.map((row) => row.cells[0].textContent.trim())
);

/** The aria-sort value of every header cell, null where it is absent. */
const sortStates = (tableId) => page.$$eval(
  `#${tableId} thead th`,
  (headers) => headers.map((header) => header.getAttribute('aria-sort'))
);

const normalized = (text) => text.replace(/\s+/g, ' ').trim();

test('adds no second hint or icon to hand-written sortable markup', async () => {
  const caption = normalized(await page.textContent('#team caption'));
  const iconsPerButton = await page.$$eval(
    '#team thead button',
    (buttons) => buttons.map((button) => button.querySelectorAll('.sort-icon').length)
  );

  assert.equal(caption, `Team members ${SORT_HINT}`);
  assert.deepEqual(iconsPerButton, [1, 1]);
});

test('leaves a data-sort="none" column without a button', async () => {
  const buttonsInNotes = await page.locator('#team thead th[data-sort="none"] button').count();

  assert.equal(buttonsInNotes, 0);
});

test('builds a button, a hidden icon and one hint from plain markup', async () => {
  const caption = normalized(await page.textContent('#venues caption'));
  const buttons = await page.$$eval('#venues thead th', (headers) => headers.map((header) => {
    const button = header.querySelector('button[type="button"]');
    const icon = button && button.querySelector('.sort-icon');
    return { hasButton: Boolean(button), iconHidden: icon && icon.getAttribute('aria-hidden') };
  }));

  assert.equal(caption, `Venues ${SORT_HINT}`);
  assert.deepEqual(buttons, [
    { hasButton: true, iconHidden: 'true' },
    { hasButton: true, iconHidden: 'true' },
  ]);
});

test('sorts numbers by value and toggles direction on a second press', async () => {
  const seats = page.locator('#venues thead th:nth-child(2) button');

  await seats.click();
  assert.deepEqual(await firstColumn('venues'), ['West Wing', 'Garden Stage', 'Main Hall']);
  assert.deepEqual(await sortStates('venues'), [null, 'ascending']);

  await seats.click();
  assert.deepEqual(await firstColumn('venues'), ['Main Hall', 'Garden Stage', 'West Wing']);
  assert.deepEqual(await sortStates('venues'), [null, 'descending']);
});

test('keeps aria-sort on only the column sorted last', async () => {
  await page.locator('#team thead th:nth-child(2) button').click();

  assert.deepEqual(await firstColumn('team'), ['Rafael Duarte', 'Amara Nwosu', 'Yuki Tanaka']);
  assert.deepEqual(await sortStates('team'), [null, 'ascending', null]);
});

test('announces the new order in a polite live region outside the table', async () => {
  await page.locator('#venues thead th:nth-child(2) button').click();
  const status = page.locator('#venues ~ .table-sort-status');
  await status.filter({ hasText: 'Sorted by' }).waitFor();

  assert.equal(await status.textContent(), 'Sorted by Seats, ascending.');
  assert.equal(await status.getAttribute('aria-live'), 'polite');
});

test('makeSortable hands back the same sort API after auto-init', async () => {
  const result = await page.evaluate(() => {
    const table = document.getElementById('venues');
    const first = window.TableEnhance.makeSortable(table);
    const second = window.TableEnhance.makeSortable(table);
    first.sortBy(table.querySelector('thead th'), 'descending');
    return {
      sameObject: first === second,
      sortByType: typeof first.sortBy,
      buttonCount: table.querySelectorAll('thead button').length,
      order: [...table.tBodies[0].rows].map((row) => row.cells[0].textContent),
    };
  });

  assert.deepEqual(result, {
    sameObject: true,
    sortByType: 'function',
    buttonCount: 2,
    order: ['West Wing', 'Main Hall', 'Garden Stage'],
  });
});

test('wraps an overflowing table in a focusable region named by its caption', async () => {
  const wrapper = await page.$eval('#wide', (table) => {
    const region = table.parentElement;
    return {
      className: region.className,
      role: region.getAttribute('role'),
      namedByCaption: region.getAttribute('aria-labelledby') === table.caption.id,
      tabindex: region.getAttribute('tabindex'),
    };
  });

  assert.deepEqual(wrapper, {
    className: 'table-scroll',
    role: 'region',
    namedByCaption: true,
    tabindex: '0',
  });
});

test('gives a table that fits no extra tab stop', async () => {
  const tabindex = await page.$eval('#fits', (table) => table.parentElement.getAttribute('tabindex'));

  assert.equal(tabindex, null);
});
