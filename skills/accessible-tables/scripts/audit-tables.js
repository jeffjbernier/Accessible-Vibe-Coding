/**
 * audit-tables.js — dependency-free accessibility auditor for HTML tables.
 *
 * Checks data tables against WCAG 2.2 SC 1.3.1 techniques (H51, H63, H43, H39)
 * and the W3C WAI Tables Tutorial / WebAIM guidance. Rule IDs match the review
 * checklist in SKILL.md.
 *
 * Usage
 *   Browser console:  paste this file, then  auditTables()  or  console.table(auditTables().issues)
 *   Playwright:       await page.addScriptTag({ path: 'scripts/audit-tables.js' });
 *                     const report = await page.evaluate(() => auditTables());
 *   Node:             const { auditTables } = require('./audit-tables.js');
 *                     auditTables(anyDocument)   (or use audit-cli.js)
 *
 * auditTables(root = document, options = {}) → {
 *   tables: [{ index, label, kind, rows, cols, issues: [...] }],
 *   issues: [{ table, rule, severity, message, snippet }],
 *   summary: { tables, dataTables, layoutTables, errors, warnings }
 * }
 * options.includeHeuristics (default true) toggles the heuristic rules.
 *
 * Automated checks can't confirm a table makes sense. Always follow up with a
 * screen reader spot-check (see SKILL.md, step 8).
 */
(function (global) {
  'use strict';

  var VALID_SCOPES = ['col', 'row', 'colgroup', 'rowgroup'];
  var VALID_SORT = ['ascending', 'descending', 'none', 'other'];
  var LAYOUT_ROLES = ['presentation', 'none'];

  function text(el) {
    if (!el) return '';
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return t;
    var label = el.getAttribute && el.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    // A cell can be named by what it holds: a select-all checkbox or an
    // icon-only button with aria-label, or an image with alt text.
    var named = el.querySelectorAll ? el.querySelectorAll('[aria-label], img[alt]') : [];
    for (var i = 0; i < named.length; i++) {
      var name = (named[i].getAttribute('aria-label') || named[i].getAttribute('alt') || '').trim();
      if (name) return name;
    }
    return '';
  }

  function snippet(el) {
    if (!el || !el.outerHTML) return '';
    var html = el.outerHTML.replace(/\s+/g, ' ');
    return html.length > 140 ? html.slice(0, 137) + '...' : html;
  }

  function tokens(value) {
    return (value || '').trim().split(/\s+/).filter(Boolean);
  }

  // Own rows only (exclude rows of nested tables).
  function ownRows(table) {
    return Array.prototype.slice.call(table.rows || []);
  }

  // Build a slot grid honoring colspan/rowspan. Returns { cols, grid }.
  function buildGrid(rows) {
    var grid = [];
    var maxCols = 0;
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
        c += cs;
        if (c > maxCols) maxCols = c;
      });
    });
    return { cols: maxCols, grid: grid };
  }

  function declaredColumns(table) {
    var groups = Array.prototype.filter.call(table.children, function (el) {
      return el.tagName === 'COLGROUP';
    });
    var looseCols = Array.prototype.filter.call(table.children, function (el) {
      return el.tagName === 'COL';
    });
    if (!groups.length && !looseCols.length) return null;
    var total = 0;
    groups.forEach(function (g) {
      var cols = g.querySelectorAll('col');
      if (cols.length) {
        Array.prototype.forEach.call(cols, function (col) {
          total += parseInt(col.getAttribute('span') || '1', 10) || 1;
        });
      } else {
        total += parseInt(g.getAttribute('span') || '1', 10) || 1;
      }
    });
    looseCols.forEach(function (col) {
      total += parseInt(col.getAttribute('span') || '1', 10) || 1;
    });
    return total;
  }

  function tableLabel(table, index) {
    var cap = table.querySelector(':scope > caption');
    if (cap && text(cap)) return text(cap).slice(0, 60);
    if (table.getAttribute('aria-label')) return table.getAttribute('aria-label');
    if (table.id) return '#' + table.id;
    return 'table ' + (index + 1);
  }

  function auditTables(root, options) {
    root = root || (typeof document !== 'undefined' ? document : null);
    if (!root) throw new Error('auditTables: pass a Document or Element (no global document found).');
    options = options || {};
    var heuristics = options.includeHeuristics !== false;
    var doc = root.nodeType === 9 ? root : root.ownerDocument;

    var tables = Array.prototype.slice.call(root.querySelectorAll('table'));
    var report = { tables: [], issues: [], summary: { tables: tables.length, dataTables: 0, layoutTables: 0, errors: 0, warnings: 0 } };

    tables.forEach(function (table, index) {
      var issues = [];
      var label = tableLabel(table, index);
      function add(rule, severity, message, el) {
        var issue = { table: label, rule: rule, severity: severity, message: message, snippet: snippet(el || table) };
        issues.push(issue);
        report.issues.push(issue);
        report.summary[severity === 'error' ? 'errors' : 'warnings']++;
      }

      var rows = ownRows(table);
      var gridInfo = buildGrid(rows);
      var role = (table.getAttribute('role') || '').trim().toLowerCase();
      var ths = Array.prototype.filter.call(table.querySelectorAll('th'), function (th) {
        return th.closest('table') === table;
      });
      var tds = Array.prototype.filter.call(table.querySelectorAll('td'), function (td) {
        return td.closest('table') === table;
      });
      var caption = table.querySelector(':scope > caption');
      var entry = { index: index, label: label, kind: 'data', rows: rows.length, cols: gridInfo.cols, issues: issues };

      // ---- Layout tables -------------------------------------------------
      if (LAYOUT_ROLES.indexOf(role) !== -1) {
        entry.kind = 'layout';
        report.summary.layoutTables++;
        var structural = ths.length || caption || table.querySelector(':scope > thead, :scope > tfoot') ||
          table.hasAttribute('summary') || table.querySelector('[scope], [headers]');
        if (structural) {
          add('layout-table-semantics', 'error',
            'Table has role="' + role + '" but also data-table markup (th, caption, thead/tfoot, scope, headers, or summary). ' +
            'If it holds data, remove the role; if it is layout, remove the structural markup (better: replace with CSS).');
        } else {
          add('layout-table', 'warning', 'Layout table found. Replace with CSS Grid/Flexbox when possible.');
        }
        report.tables.push(entry);
        return;
      }
      report.summary.dataTables++;

      if (role && role !== 'table') {
        var gridRole = role === 'grid' || role === 'treegrid';
        add('role-override', 'warning', gridRole
          ? 'role="' + role + '" promises arrow-key cell navigation and focus management. Remove it unless the full ARIA grid pattern is implemented.'
          : 'role="' + role + '" overrides native table semantics. Remove it.');
      }

      // ---- Headers --------------------------------------------------------
      var usesHeadersAttr = !!table.querySelector('td[headers], th[headers]');
      if (!ths.length) {
        if (rows.length >= 2 && gridInfo.cols >= 2) {
          add('no-headers', 'error', 'Data table has no <th> header cells. Mark row and/or column headers with <th> (WCAG 1.3.1, H51).');
        } else {
          add('no-headers', 'warning', 'Table has no <th> cells. If it is layout, use CSS instead; if it is data, add headers.');
        }
      }

      ths.forEach(function (th) {
        if (!text(th)) {
          add('empty-th', 'error', 'Empty <th>. Use <td> for an empty corner cell, or give the header real text.', th);
        }
        var scope = (th.getAttribute('scope') || '').trim().toLowerCase();
        if (scope && VALID_SCOPES.indexOf(scope) === -1) {
          add('invalid-scope', 'error', 'scope="' + scope + '" is not valid. Use col, row, colgroup, or rowgroup.', th);
        }
        if (!scope && !usesHeadersAttr) {
          add('missing-scope', 'error', '<th> has no scope. Add scope="col" or "row" so header direction is unambiguous (H63).', th);
        }
        var cs = parseInt(th.getAttribute('colspan') || '1', 10) || 1;
        var rs = parseInt(th.getAttribute('rowspan') || '1', 10) || 1;
        // Only the mismatched pairs are wrong. A colspan header with
        // scope="rowgroup" is a valid section-header row for its <tbody>.
        if (!usesHeadersAttr && cs > 1 && scope === 'col') {
          var full = cs >= gridInfo.cols && gridInfo.cols > 1;
          add('span-scope', 'error', 'Header spans ' + cs + ' columns but has scope="' + scope + '". Use scope="colgroup" with a matching <colgroup>.' +
            (full ? ' It spans the whole table: if it is a title, move it into <caption>.' : ''), th);
        }
        if (!usesHeadersAttr && rs > 1 && scope === 'row') {
          add('span-scope', 'error', 'Header spans ' + rs + ' rows but has scope="' + scope + '". Use scope="rowgroup" and wrap its rows in their own <tbody>.', th);
        }
        if (scope === 'rowgroup') {
          var section = th.closest('thead, tbody, tfoot');
          var row = th.parentElement;
          var sectionRows = section ? Array.prototype.filter.call(section.rows, function (r) { return r.closest('table') === table; }) : [];
          var pos = sectionRows.indexOf(row);
          if (!section || section.closest('table') !== table) {
            add('rowgroup-structure', 'error', 'scope="rowgroup" header is not inside <thead>, <tbody>, or <tfoot>.', th);
          } else if (pos !== 0 || (rs !== sectionRows.length && cs < gridInfo.cols)) {
            add('rowgroup-structure', 'warning', 'scope="rowgroup" header should be in the first row of its own <tbody> and either span all ' +
              sectionRows.length + ' rows of that group (rowspan is ' + rs + ') or span every column as a section-header row.', th);
          }
        }
      });

      if (!usesHeadersAttr && table.querySelector('th[scope="colgroup"]')) {
        var declared = declaredColumns(table);
        if (declared === null) {
          add('colgroup-missing', 'error', 'scope="colgroup" used but no <colgroup>/<col> elements define the column groups.');
        } else if (declared !== gridInfo.cols) {
          add('colgroup-count', 'warning', '<col>/<colgroup> elements declare ' + declared + ' columns but the table has ' + gridInfo.cols + '.');
        }
      }

      // ---- id / headers ---------------------------------------------------
      ths.forEach(function (th) {
        if (th.id && doc && doc.querySelectorAll('[id="' + th.id.replace(/"/g, '\\"') + '"]').length > 1) {
          add('duplicate-id', 'error', 'id="' + th.id + '" is not unique in the document; headers references may resolve to the wrong element.', th);
        }
      });
      Array.prototype.forEach.call(table.querySelectorAll('[headers]'), function (cell) {
        if (cell.closest('table') !== table) return;
        tokens(cell.getAttribute('headers')).forEach(function (id) {
          var target = doc ? doc.getElementById(id) : null;
          if (!target) {
            add('headers-broken-ref', 'error', 'headers references id="' + id + '", which does not exist.', cell);
          } else if (target.tagName !== 'TH' || target.closest('table') !== table) {
            add('headers-broken-ref', 'error', 'headers references id="' + id + '", which is not a <th> in this table.', cell);
          }
        });
      });
      if (usesHeadersAttr) {
        var unmapped = tds.filter(function (td) { return text(td) && !td.hasAttribute('headers'); });
        if (unmapped.length) {
          add('headers-incomplete', 'warning', unmapped.length + ' data cell(s) lack a headers attribute in a table that uses id/headers. ' +
            'Map every cell, or switch to scope. (Consider splitting the table.)', unmapped[0]);
        }
      }

      // ---- Caption / summary / naming -------------------------------------
      var ariaLabelled = table.getAttribute('aria-label') || table.getAttribute('aria-labelledby');
      if (!caption) {
        // With no header cells the table may be untagged layout, and no-headers
        // has already said so; "add a caption" must not be what fails the run.
        add('missing-caption', ariaLabelled || !ths.length ? 'warning' : 'error', ariaLabelled
          ? 'No <caption>; table is named with ARIA instead. A <caption> is better supported in screen reader tables mode.'
          : 'No <caption>. Add a short caption as the first child of <table> so users can identify the table (H39).');
      } else {
        if (table.firstElementChild !== caption) {
          add('caption-position', 'error', '<caption> must be the first child of <table>.', caption);
        }
        if (!text(caption)) add('empty-caption', 'error', '<caption> is empty.', caption);
      }
      if (table.hasAttribute('summary')) {
        add('summary-attribute', 'warning', 'The summary attribute is obsolete and invisible to sighted users. Move structure notes into <caption> or use aria-describedby.');
      }
      ['aria-describedby', 'aria-labelledby'].forEach(function (attr) {
        tokens(table.getAttribute(attr)).forEach(function (id) {
          if (doc && !doc.getElementById(id)) {
            add('aria-broken-ref', 'error', attr + ' references id="' + id + '", which does not exist.');
          }
        });
      });

      // ---- Structure ------------------------------------------------------
      if (Array.prototype.some.call(table.querySelectorAll('table'), function (t) { return t !== table; })) {
        add('nested-table', 'error', 'Table contains a nested table. Flatten or split it; nested tables are very hard to navigate.');
      }

      // ---- Sorting --------------------------------------------------------
      var sorted = Array.prototype.filter.call(table.querySelectorAll('[aria-sort]'), function (el) {
        return el.closest('table') === table;
      });
      sorted.forEach(function (el) {
        var v = el.getAttribute('aria-sort');
        if (el.tagName !== 'TH' && el.getAttribute('role') !== 'columnheader' && el.getAttribute('role') !== 'rowheader') {
          add('aria-sort-on-td', 'error', 'aria-sort belongs on a header cell, not <' + el.tagName.toLowerCase() + '>.', el);
        }
        if (VALID_SORT.indexOf(v) === -1) add('aria-sort-invalid', 'error', 'aria-sort="' + v + '" is not valid.', el);
      });
      var active = sorted.filter(function (el) { return el.getAttribute('aria-sort') !== 'none'; });
      if (active.length > 1) {
        add('aria-sort-multiple', 'error', active.length + ' headers have aria-sort set. Only the currently sorted column should.', active[1]);
      }

      // ---- Heuristics -----------------------------------------------------
      if (heuristics) {
        tds.forEach(function (td) {
          var brs = Array.prototype.filter.call(td.querySelectorAll('br'), function (br) { return br.closest('td') === td; });
          if (brs.length >= 2) {
            add('br-in-cell', 'warning', 'Cell uses ' + brs.length + ' <br> line breaks. If these are separate values, give each its own cell/row.', td);
          }
        });
        if (rows.length) {
          var firstCells = Array.prototype.slice.call(rows[0].cells);
          var headerClass = /(^|[\s_-])(head|header|heading|th|firstrow|firstcol)([\s_-]|$)/i;
          var looksFake = firstCells.length > 1 && firstCells.every(function (c) { return c.tagName === 'TD'; }) &&
            (headerClass.test(rows[0].className || '') || firstCells.filter(function (c) { return text(c); }).every(function (c) {
              var kids = c.children;
              return headerClass.test(c.className || '') ||
                (kids.length === 1 && /^(B|STRONG)$/.test(kids[0].tagName) && text(kids[0]) === text(c));
            }));
          if (looksFake && firstCells.some(function (c) { return text(c); })) {
            add('fake-header', 'warning', 'First row looks like headers but uses <td>. Use <th scope="col">.', rows[0]);
          }
          var fakeRowHeaders = rows.slice(1).filter(function (r) {
            var c = r.cells[0];
            return c && c.tagName === 'TD' && headerClass.test(c.className || '');
          });
          if (fakeRowHeaders.length) {
            add('fake-header', 'warning', fakeRowHeaders.length + ' row(s) start with a <td> styled as a header. Use <th scope="row">.', fakeRowHeaders[0]);
          }
        }
      }

      report.tables.push(entry);
    });

    return report;
  }

  function formatReport(report) {
    var out = [];
    var s = report.summary;
    out.push(s.tables + ' table(s): ' + s.dataTables + ' data, ' + s.layoutTables + ' layout — ' + s.errors + ' error(s), ' + s.warnings + ' warning(s)');
    report.tables.forEach(function (t) {
      out.push('');
      out.push('[' + (t.index + 1) + '] ' + t.label + ' (' + t.kind + ', ' + t.rows + '×' + t.cols + ')' + (t.issues.length ? '' : ' — no issues found'));
      t.issues.forEach(function (i) {
        out.push('  ' + (i.severity === 'error' ? 'ERROR' : 'WARN ') + ' ' + i.rule + ': ' + i.message);
        if (i.snippet) out.push('        ' + i.snippet);
      });
    });
    out.push('');
    out.push('Automated checks are not enough: spot-check with a screen reader (SKILL.md step 8).');
    return out.join('\n');
  }

  var api = { auditTables: auditTables, formatReport: formatReport };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    if (typeof require !== 'undefined' && require.main === module) {
      console.log('audit-tables.js is a library. Run it on files with:\n  node scripts/audit-cli.js page.html [more.html] [--json] [--fail-on=warning]\n' +
        'or paste it into a browser console and call auditTables().');
    }
  }
  if (global) {
    global.auditTables = auditTables;
    global.formatTableReport = formatReport;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
