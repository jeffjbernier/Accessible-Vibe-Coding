/**
 * table-enhance.js — progressive enhancement for accessible data tables.
 *
 * Two features, both opt-in per table:
 *
 *   1. Scroll region (data-scroll)
 *      Wraps a wide table in <div class="table-scroll" role="region"> named by the
 *      table's caption. The wrapper gets tabindex="0" only while the table actually
 *      overflows, so keyboard users can scroll it without gaining a useless tab stop.
 *
 *   2. Sortable columns (data-sortable)
 *      Puts a <button> inside each sortable column header, keeps aria-sort on the one
 *      sorted header, hides the arrow icon from screen readers, adds a caption hint,
 *      and announces the new order in a polite live region. Follows the WAI-ARIA APG
 *      Sortable Table example.
 *
 * Markup:
 *   <table data-scroll data-sortable> <caption>…</caption> <thead>…</thead> <tbody>…</tbody> </table>
 *   <th scope="col" data-sort="none">   → column is not sortable
 *   <th scope="col" data-sort-type="number|date|text">  → force a comparison type
 *   <td data-sort-value="2026-10-12">Oct 12</td>  → sort key different from display text
 *
 * Load:
 *   <script src="table-enhance.js" defer></script>   (auto-initializes on DOMContentLoaded)
 *   or call TableEnhance.enhanceAll(root) / TableEnhance.makeSortable(table) / TableEnhance.enhanceScroll(table)
 *   For SPA frameworks, call these after the table renders.
 *
 * Limits: sorting handles a single <tbody> with no rowspan/colspan in the body.
 * Tables that break that rule are skipped with a console warning, never mangled.
 */
(function (global) {
  'use strict';

  var ICONS = { none: '♢', ascending: '▲', descending: '▼' };
  var idCounter = 0;
  var sortApis = new WeakMap();

  function uid(prefix) {
    idCounter += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + idCounter;
  }

  function visuallyHidden(el) {
    el.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0;';
    return el;
  }

  function cellText(cell) {
    if (!cell) return '';
    if (cell.hasAttribute('data-sort-value')) return cell.getAttribute('data-sort-value');
    return (cell.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function captionId(table) {
    var cap = table.querySelector(':scope > caption');
    if (!cap) return null;
    if (!cap.id) cap.id = uid('tbl-caption');
    return cap.id;
  }

  /* ---------------------------------------------------------------- scroll */

  function enhanceScroll(table, options) {
    options = options || {};
    if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return table.parentElement;

    var wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    wrapper.setAttribute('role', 'region');
    wrapper.style.overflowX = 'auto';
    wrapper.style.maxWidth = '100%';

    var capId = captionId(table);
    if (capId) {
      wrapper.setAttribute('aria-labelledby', capId);
    } else {
      wrapper.setAttribute('aria-label', options.label || table.getAttribute('aria-label') || 'Data table');
      if (!options.label) console.warn('[table-enhance] Table has no <caption>; scroll region uses a generic name. Add a caption.', table);
    }

    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);

    function update() {
      var overflowing = wrapper.scrollWidth > wrapper.clientWidth + 1;
      if (overflowing) wrapper.setAttribute('tabindex', '0');
      else wrapper.removeAttribute('tabindex');
    }
    update();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(update).observe(wrapper);
    } else {
      window.addEventListener('resize', update);
    }
    return wrapper;
  }

  /* --------------------------------------------------------------- sorting */

  // Map each header cell in the header row to its logical column index, honoring
  // colspans and rowspans from rows above it in <thead>.
  function headerColumnMap(thead) {
    var rows = Array.prototype.slice.call(thead.rows);
    var grid = [];
    var map = new Map();
    rows.forEach(function (row, r) {
      grid[r] = grid[r] || [];
      var c = 0;
      Array.prototype.forEach.call(row.cells, function (cell) {
        while (grid[r][c]) c++;
        var cs = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
        var rs = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1);
        for (var dr = 0; dr < rs; dr++) {
          grid[r + dr] = grid[r + dr] || [];
          for (var dc = 0; dc < cs; dc++) grid[r + dr][c + dc] = cell;
        }
        if (cs === 1) map.set(cell, c);
        c += cs;
      });
    });
    return map;
  }

  function detectType(values) {
    var nonEmpty = values.filter(function (v) { return v !== ''; });
    if (!nonEmpty.length) return 'text';
    var numeric = nonEmpty.every(function (v) { return !isNaN(parseNumber(v)); });
    if (numeric) return 'number';
    var dates = nonEmpty.every(function (v) { return /\d/.test(v) && !isNaN(Date.parse(v)); });
    return dates ? 'date' : 'text';
  }

  function parseNumber(v) {
    var cleaned = String(v).replace(/[\s,$€£¥%]/g, '').replace(/^\((.*)\)$/, '-$1');
    return cleaned === '' || cleaned === '-' ? NaN : Number(cleaned);
  }

  function comparator(type, direction) {
    var dir = direction === 'descending' ? -1 : 1;
    var collator = typeof Intl !== 'undefined' ? new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }) : null;
    return function (a, b) {
      // Empty values always sort last.
      if (a.key === '' && b.key !== '') return 1;
      if (b.key === '' && a.key !== '') return -1;
      var result;
      if (type === 'number') result = parseNumber(a.key) - parseNumber(b.key);
      else if (type === 'date') result = Date.parse(a.key) - Date.parse(b.key);
      else result = collator ? collator.compare(a.key, b.key) : a.key.localeCompare(b.key);
      return (result * dir) || (a.index - b.index); // stable
    };
  }

  function makeSortable(table, options) {
    options = options || {};
    var announce = options.announce !== false;
    var thead = table.tHead;
    var tbodies = table.tBodies;

    if (!thead) {
      console.warn('[table-enhance] makeSortable needs a <thead>. Skipped.', table);
      return false;
    }
    if (tbodies.length !== 1 || tbodies[0].querySelector('[rowspan]:not([rowspan="1"]), [colspan]:not([colspan="1"])')) {
      console.warn('[table-enhance] makeSortable supports one <tbody> without row/col spans. Skipped.', table);
      return false;
    }
    // Auto-init usually gets here first, so a later call hands back the same
    // API instead of wiring the table a second time.
    if (sortApis.has(table)) return sortApis.get(table);

    var tbody = tbodies[0];
    var colMap = headerColumnMap(thead);
    var headerRow = thead.rows[thead.rows.length - 1];
    var headers = Array.prototype.filter.call(headerRow.cells, function (th) {
      return th.tagName === 'TH' && th.getAttribute('data-sort') !== 'none' && colMap.has(th);
    });
    if (!headers.length) return false;

    var live = null;
    if (announce) {
      live = visuallyHidden(document.createElement('div'));
      live.setAttribute('aria-live', 'polite');
      live.className = 'table-sort-status';
      var anchor = table.parentElement && table.parentElement.classList.contains('table-scroll') ? table.parentElement : table;
      anchor.parentNode.insertBefore(live, anchor.nextSibling);
    }

    var caption = table.querySelector(':scope > caption');
    if (caption && options.hint !== false && !caption.querySelector('.table-sort-hint')) {
      var hint = document.createElement('span');
      hint.className = 'table-sort-hint';
      hint.textContent = ' ' + (options.hintText || '(column headers with buttons are sortable)');
      caption.appendChild(hint);
    }

    headers.forEach(function (th) {
      var button = th.querySelector('button');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        while (th.firstChild) button.appendChild(th.firstChild);
        th.appendChild(button);
      }
      var icon = button.querySelector('.sort-icon');
      if (!icon) {
        icon = document.createElement('span');
        icon.className = 'sort-icon';
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(document.createTextNode(' '));
        button.appendChild(icon);
      }
      var state = th.getAttribute('aria-sort');
      icon.textContent = ICONS[state === 'ascending' || state === 'descending' ? state : 'none'];

      button.addEventListener('click', function () {
        var current = th.getAttribute('aria-sort');
        var next = current === 'ascending' ? 'descending' : 'ascending';
        sortBy(th, next);
      });
    });

    function sortBy(th, direction) {
      var col = colMap.get(th);
      var rows = Array.prototype.slice.call(tbody.rows).map(function (row, index) {
        return { row: row, index: index, key: cellText(row.cells[col]) };
      });
      var type = th.getAttribute('data-sort-type') || detectType(rows.map(function (r) { return r.key; }));
      rows.sort(comparator(type, direction));

      var frag = document.createDocumentFragment();
      rows.forEach(function (r) { frag.appendChild(r.row); });
      tbody.appendChild(frag);

      headers.forEach(function (h) {
        var icon = h.querySelector('.sort-icon');
        if (h === th) {
          h.setAttribute('aria-sort', direction);
          if (icon) icon.textContent = ICONS[direction];
        } else {
          h.removeAttribute('aria-sort');
          if (icon) icon.textContent = ICONS.none;
        }
      });

      if (live) {
        var name = (th.querySelector('button').textContent || '').replace(/[▲▼♢]/g, '').replace(/\s+/g, ' ').trim();
        live.textContent = '';
        // Small delay so repeated clicks re-announce.
        setTimeout(function () { live.textContent = 'Sorted by ' + name + ', ' + direction + '.'; }, 50);
      }
      table.dispatchEvent(new CustomEvent('tablesort', { detail: { column: col, direction: direction } }));
    }

    var sortApi = { sortBy: sortBy };
    sortApis.set(table, sortApi);
    return sortApi;
  }

  /* ------------------------------------------------------------------ init */

  function enhanceAll(root) {
    root = root || document;
    Array.prototype.forEach.call(root.querySelectorAll('table[data-scroll]'), function (t) { enhanceScroll(t); });
    Array.prototype.forEach.call(root.querySelectorAll('table[data-sortable]'), function (t) { makeSortable(t); });
  }

  var api = { enhanceAll: enhanceAll, enhanceScroll: enhanceScroll, makeSortable: makeSortable };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (global && global.document) {
    global.TableEnhance = api;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { enhanceAll(document); });
    } else {
      enhanceAll(document);
    }
  }
})(typeof window !== 'undefined' ? window : null);
