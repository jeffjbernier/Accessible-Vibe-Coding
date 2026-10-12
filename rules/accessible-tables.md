<!--
  GENERATED FILE — DO NOT EDIT.
  Source: skills/accessible-tables/SKILL.md
  Regenerate: node tools/build-rules.mjs
  Edits belong in the skill; this file is overwritten on every build.
-->

# Accessible Tables

> **When this applies.** Use when creating, changing, reviewing, or fixing an
> HTML table, a data grid, a pricing or comparison table, a schedule, or a
> table from a CMS or WYSIWYG editor, even when the request never mentions
> accessibility. Also use when auditing existing tables against WCAG 1.3.1
> (Info and Relationships), or when a task mentions table headers, scope,
> id/headers, captions, summaries, layout tables, responsive tables, or
> sortable tables.
>
> Always-apply ruleset, generated from the accessible-tables skill v1.0.0 in
> accessible-vibe-coding. Licensed MIT.
>
> Source: <https://github.com/jeffjbernier/Accessible-Vibe-Coding>

Data tables organize data with a logical relationship in a grid. Sighted users
connect each cell to its row and column headers by looking. Screen reader
users can't, so the markup has to make those relationships programmatic. When
it does, a screen reader announces the relevant headers as the user moves cell
to cell ("Eric, Thursday, MATH 100") instead of a stream of disconnected
values.

The governing requirement is **Web Content Accessibility Guidelines (WCAG) 2.2
SC 1.3.1 Info and Relationships (Level A)**. Related techniques: H51 (table
markup), H63 (`scope`), H43 (`id`/`headers`), H39 (`caption`).

**Relationship to the accessibility ruleset.** That file sets the
baseline for every data table: `<th>` with `scope`, and a `<caption>`. This
one is the detail behind that rule. Where the two overlap on a table, this
one wins. Everything outside the table (contrast, focus, touch targets,
motion) stays with `accessibility`.

Files in the accessible-vibe-coding repo:

- [references/patterns.md] — copy-paste markup for every table type, plus
  anti-patterns and CSS.
- [scripts/audit-tables.js] — dependency-free auditor. Runs in the browser
  console, a bookmarklet, Playwright/Puppeteer, or Node via `audit-cli.js`.
- [scripts/audit-cli.js] — Node CLI that runs the auditor against URLs or
  local HTML files in Chromium (needs `playwright`).
- [scripts/table-enhance.js] — optional runtime helper: accessible scroll
  wrapper for wide tables and accessible column sorting.

---

## Workflow

Follow these steps in order whenever you write or change a table.

### 1. Decide whether it's a table at all

Use a `<table>` only for **tabular data**: information where meaning depends
on the row and column a value sits in. Ask: "Would this make sense as a
spreadsheet?"

- **Layout** (columns of content, form alignment, card grids, nav) → use CSS
  Grid or Flexbox, never a table.
- **Legacy layout table you can't remove yet** → add `role="presentation"` to
  `<table>` and strip all data-table semantics: no `<th>`, `<caption>`,
  `<thead>`, `scope`, `headers`, or `summary`. Keep the source order readable
  when linearized.
- **A list of name/value pairs** (one item's specs) → a `<dl>` is often
  simpler than a two-column table.
- **Interactive widget** where every cell is focusable and editable
  (spreadsheet UI) → that's an ARIA `grid`, which is a different, much heavier
  pattern. Don't put `role="grid"` on a static data table.

### 2. Classify the header structure

Pick the simplest category that fits. Then use the matching pattern (P1 to
P10) in the patterns file.

<!-- markdownlint-disable MD013 -->
| Header structure | Markup approach | Pattern |
| --- | --- | --- |
| One header row **or** one header column, small and obvious | `<th>` for headers, `<td>` for data, with `scope` | P1, P2 |
| Data that's ambiguous without headers (names, codes, numbers) | `<th scope="col">` / `<th scope="row">` | P3 |
| Header row **and** header column | `scope="col"` on the top row, `scope="row"` on the row headers | P4, P5 |
| Headers spanning multiple columns or rows | `<colgroup>`/`<col>` + `scope="colgroup"`; `<tbody>` groups + `scope="rowgroup"` | P6, P7 |
| Headers that change mid-table, or 3+ headers per data cell that don't line up horizontally/vertically | `id` on every `<th>`, `headers` on every `<td>` | P8, P9 |
<!-- markdownlint-enable MD013 -->

Before reaching for the last row: **split the table.** Complex tables are
harder to build, harder to maintain, inconsistently supported by screen
readers, and harder for everyone (including sighted users with cognitive
disabilities) to read. Two simple tables beat one multi-level table nearly
every time (P10). If a section header row would restart the column headers,
that's a new `<table>`.

### 3. Write the markup

Non-negotiable rules:

1. **Header cells are `<th>`; data cells are `<td>`.** Never fake a header
   with a bold or styled `<td>`. Screen readers only use the element, not the
   styling.
2. **Every `<th>` gets `scope`** (`col`, `row`, `colgroup`, or `rowgroup`),
   unless the table uses the `id`/`headers` method. WebAIM recommends `scope`
   on all `<th>` elements; screen readers can guess direction, but guessing
   fails on ambiguous or offset layouts.
3. **No empty `<th>`.** The top-left corner cell over a row-header column is
   usually a `<td>` (empty is fine there), or give it real text like "Time
   slot" as a `<th scope="col">`. A header that holds only a control (a
   select-all checkbox, an icon button) is named by that control's
   `aria-label`.
4. **One piece of data per cell.** Don't cram "S: 6; M: 13; XL: 10" into a
   cell, and don't use `<br>` to fake rows inside a cell. Break the data into
   real rows and columns.
5. **Spans need groups.** A `colspan` header needs `<colgroup span="n">` (or
   `<col>` elements) declared before any rows, and `scope="colgroup"`. A
   `rowspan` header needs its rows wrapped in their own `<tbody>` and
   `scope="rowgroup"`. The `<col>` count plus `colgroup span` values must
   equal the table's total column count.
6. **`id`/`headers` only when `scope` can't express it.** Every `id` must be
   unique in the **document**, not just the table. Every `<td>` must list
   every relevant header id, space-separated. List them in a consistent
   logical order that matches the reading order a screen reader should follow
   (WebAIM); the association itself is order-independent (MDN), but a
   consistent order keeps the code maintainable. Header cells that sit under a
   higher-level header can also carry `headers`.

   - **Shadow DOM / web component caveat:** If the table lives inside a shadow
     root, `id`/`headers` associations do not cross shadow boundaries. Prefer
     `scope` in shadow DOM contexts, or ensure both the `<th id>` and the
     referencing `<td headers>` are in the same shadow root. The same applies
     to `aria-describedby` / `aria-labelledby`: references must resolve within
     the same shadow boundary, or they will not be announced.
7. **Section order:** `<caption>` first, then `<colgroup>`/`<col>`, then
   `<thead>`, `<tbody>` (one or more), `<tfoot>`. `<thead>`/`<tfoot>` add
   little accessibility on their own, but they're required for row groups,
   help printing (headers repeat per page), and make styling easier. Use them
   by default.
8. **Never put structural markup on a layout table**, and never use a data
   table for layout.

### 4. Name the table (caption) and, if needed, describe it (summary)

- Give every data table a **`<caption>` as the first child of `<table>`**. It
  works like a heading: screen readers announce it, and in "tables mode" it's
  the main way users tell tables apart. Keep it short: "Concerts", "Delivery
  slots", "Q3 sales by region".
- If a heading or other visible text just above the table already names it,
  move that text into the `<caption>` rather than duplicating it. Do not omit
  the `<caption>`.
- Add a **summary** only for complex tables, and describe the **structure**,
  not the content: "Column one lists location and unit size; other columns
  show the number of properties by type." Don't repeat the caption.
- Summary techniques, best supported first:
  1. Inside the caption:
     `<caption>Title<br><span class="table-summary">Structure note</span></caption>`.
     Visible to everyone.
  2. `aria-describedby` on the `<table>` pointing at a nearby paragraph. Place
     the paragraph close to the table.
  3. `<figure>` + `<figcaption>`, with `aria-labelledby`/`aria-describedby` on
     the table pointing into the figcaption. Weakest support: tables-mode
     users may not get the name, and it can be announced twice. Prefer a real
     `<caption>`.
- **Don't use the `summary` attribute.** It's obsolete in HTML, invisible to
  sighted users, and unevenly supported. If a table needs a long explanation
  of its structure, simplify the table.

### 5. Style it accessibly

- Visually distinguish `<th>` from `<td>` (background, weight, border). Style
  **real** `<th>` elements; don't style `<td>`s to look like headers.
- Zebra striping and row/column highlight on hover **and** keyboard focus help
  people with reading difficulties and people using zoom. Keep text contrast
  at 4.5:1 or better on every stripe and header color (WCAG 1.4.3), in light
  and dark mode.
- Align text left and numbers right (in LTR languages); align column headers
  like their data.
- Use relative widths (percentages, `ch`, `fr` via wrapper) instead of fixed
  pixel widths. Don't fix cell heights; let cells grow when users enlarge
  text.
- Never cut a table off with `overflow: hidden`. For wide tables, wrap in a
  scroll container (see below).

### 6. Make it responsive without losing structure

Tables often change shape on small screens, zoom, or large text (WCAG 1.4.10
Reflow allows two-dimensional scrolling for data tables). Whatever the layout,
the header-to-cell relationships must survive.

- **Preferred:** a horizontally scrollable wrapper:
  `<div class="table-scroll" role="region" aria-labelledby="caption-id" tabindex="0">`.
  The `tabindex="0"` lets keyboard users scroll it; the region name lets
  screen reader users know what they've landed in. `table-enhance.js` adds
  this automatically and only makes the wrapper focusable when it actually
  overflows.
- **Careful:** CSS that switches `<table>`, `<tr>`, or `<td>` to
  `display: block`/`flex`/`grid` wipes table semantics in several browser and
  screen reader combinations. If you must stack cells as cards on mobile,
  restore semantics with explicit `role="table"`, `role="row"`,
  `role="columnheader"`, `role="rowheader"`, `role="cell"`, and repeat the
  header label visibly in each cell (e.g. `data-label` + `::before`). Test
  with a screen reader afterward.
- **Alternative:** split one wide table into several narrower ones, or let
  users toggle columns.

### 7. Sortable and dynamic tables

The source tutorials don't cover interactivity, so this follows the WAI-ARIA
Authoring Practices "Sortable Table" example:

- Put a real `<button>` inside each sortable `<th>`. Don't make the `<th>`
  itself clickable. Give the button the 44×44 CSS pixel touch target the
  accessibility ruleset requires; the CSS starter in the patterns file
  does.
- Set `aria-sort="ascending"` or `"descending"` on the **one** currently
  sorted `<th>`; remove it from the others.
- Don't rely on an arrow icon alone. Hide decorative icons with
  `aria-hidden="true"`, and add a short caption hint such as "(column headers
  with buttons are sortable)".
- If you announce the change, use a polite live region outside the table.
  `table-enhance.js` implements all of this. Mark a column it should leave
  alone with `data-sort="none"`.
- When rows load or filter dynamically, keep the caption accurate (e.g.
  "Orders, 12 of 340 shown") and keep focus where the user was.

### 8. Verify

Run the auditor, then hand the manual checks to a person. Automated checks
catch markup errors; only a screen reader confirms the table makes sense.

A `<th>` without `scope` and a data table without a `<caption>` are errors,
so either one fails the run.

The command-line route loads each target in Chromium, so it also sees tables
the page builds with JavaScript. It needs `playwright` in the project being
scanned, the same dependency `form-check.js` and `axe-check.js` use. Do not
install it without asking. When it is missing, use the browser console route,
which needs nothing installed.

```bash
node scripts/audit-cli.js path/to/page.html another.html
node scripts/audit-cli.js https://staging.example.com/pricing
node scripts/audit-cli.js page.html --json > report.json
```

In a browser: paste the contents of `audit-tables.js` into DevTools, then run
`auditTables()` (or `console.table(auditTables().issues)`). In a Playwright
test you already have:

```js
await page.addScriptTag({ path: 'scripts/audit-tables.js' });
const report = await page.evaluate(() => auditTables());
```

Manual checks. A coding assistant cannot do these; list them in the
deliverable as a testing checklist for a person:

1. Turn CSS off (or use reader view). Does the table still read logically?
2. With NVDA or JAWS, press `T` to jump to the table; confirm the caption and
   row/column count are announced.
3. Move with `Ctrl+Alt+Arrow` keys. Each data cell should announce its correct
   row and column headers, and only the right ones. Spot-check spanned headers
   and any `headers`-mapped cells.
4. VoiceOver (macOS): `VO+Arrow` through cells; check the same announcements.
   Try iOS/Android too if the table is responsive.
5. Zoom to 400% and 200% text. Nothing should be clipped; the scroll wrapper
   should be reachable by keyboard.
6. Check contrast on header cells and both stripe colors.

If a cell announces the wrong headers, or too many to follow, simplify the
table before adding more markup.

---

## Review checklist

Use this when reviewing a PR or auditing a page. Each item maps to an auditor
rule ID where one exists.

- [ ] Table contains tabular data; layout uses CSS. Legacy layout tables have
  `role="presentation"` and no data-table markup (`layout-table`,
  `layout-table-semantics`).
- [ ] Data table has at least one `<th>` (`no-headers`).
- [ ] No `<td>` is styled or bolded to act as a header (`fake-header`,
  heuristic).
- [ ] Every `<th>` has a valid `scope`, or the table uses `id`/`headers`
  consistently (`missing-scope`, `invalid-scope`).
- [ ] No empty `<th>` (`empty-th`).
- [ ] `colspan` headers use `scope="colgroup"` with matching
  `<colgroup>`/`<col>`; `rowspan` headers use `scope="rowgroup"` inside their
  own `<tbody>` (`span-scope`, `colgroup-missing`, `colgroup-count`,
  `rowgroup-structure`).
- [ ] Every `headers` value points to an existing `<th>` id, and ids are
  unique in the document (`headers-broken-ref`, `duplicate-id`).
- [ ] Tables using `headers` cover every data cell (`headers-incomplete`).
- [ ] `<caption>` exists, is the first child, and isn't empty
  (`missing-caption`, `caption-position`, `empty-caption`).
- [ ] No `summary` attribute (`summary-attribute`).
- [ ] `aria-describedby`/`aria-labelledby` targets exist (`aria-broken-ref`).
- [ ] No `<br>`-faked rows inside cells (`br-in-cell`, heuristic).
- [ ] No nested tables in data tables (`nested-table`).
- [ ] No `role` that strips semantics from a data table, and no `role="grid"`
  without full grid keyboard support (`role-override`).
- [ ] Wide tables scroll in a named, focusable region, not `overflow: hidden`
  (manual / `table-enhance.js`).
- [ ] Sortable headers use buttons and a valid `aria-sort` on exactly one
  column (`aria-sort-multiple`, `aria-sort-on-td`, `aria-sort-invalid`).
- [ ] Header text and stripe colors meet 4.5:1 contrast (manual).
- [ ] Screen reader spot-check passes (manual).

---

## Platform notes

- **WordPress / CMS editors:** the block editor's Table block supports a
  header section and a caption. Turn on "Header section" and fill "Caption".
  Check the output: some themes and plugins emit `<td>` headers or wrap tables
  in `overflow:hidden`. Many CMS editors let you define header cells without
  hand-editing code; use that instead of bolding a row.
- **Frameworks (React, Vue, etc.):** render real `<table>` elements. If a
  data-grid library renders `<div>`s, confirm it applies a complete ARIA table
  or grid role set and test it; many don't.
- **Markdown:** GitHub Flavored Markdown tables output a `<thead>` with `<th>`
  but no `scope` or `<caption>`. For anything beyond a trivial table, write
  HTML.
- **Format conversion:** table structure is often lost converting between
  HTML, Word, and PDF. Re-check headers after any export or import, and tag
  header rows in Word ("Repeat as header row") and PDF (TH tags) at the
  source.

---

## Quick reference

<!-- markdownlint-disable MD013 -->
| Element / attribute | Use for | Watch out for |
| --- | --- | --- |
| `<th>` | Any header cell | Never empty; never fake with `<td>` |
| `scope="col"` / `"row"` | Header applies to its column / row | Needed for offset row headers (not in first column) |
| `scope="colgroup"` | Header spans a group of columns | Requires `<colgroup>`/`<col>` |
| `scope="rowgroup"` | Header spans a group of rows | Requires its own `<tbody>` (or `<thead>`/`<tfoot>`) |
| `id` + `headers` | Irregular, multi-level tables | Document-unique ids; every `<td>` mapped; brittle |
| `<caption>` | Table name | First child of `<table>` |
| `aria-describedby` | Structural summary | Keep the text near the table |
| `summary` attr | Nothing | Obsolete. Don't use |
| `role="presentation"` | Legacy layout tables only | Never on data tables |
| `aria-sort` | The sorted column's `<th>` | One column at a time |
<!-- markdownlint-enable MD013 -->

## Sources

- [W3C WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)
  (one-header, two-headers, irregular, multi-level, caption-summary, tips)
- [WebAIM, Creating Accessible Tables: Data Tables](https://webaim.org/techniques/tables/data)
- [MDN, HTML table accessibility](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Table_accessibility)
- [George Mason University ATI, Creating Accessible Tables](https://ati.gmu.edu/web-accessibility/ictaccessibilitystandards/creating-accessible-tables/)
- [WAI-ARIA APG, Sortable Table example](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
  (for section 7)

[references/patterns.md]: https://github.com/jeffjbernier/Accessible-Vibe-Coding/blob/HEAD/skills/accessible-tables/references/patterns.md
[scripts/audit-tables.js]: https://github.com/jeffjbernier/Accessible-Vibe-Coding/blob/HEAD/skills/accessible-tables/scripts/audit-tables.js
[scripts/audit-cli.js]: https://github.com/jeffjbernier/Accessible-Vibe-Coding/blob/HEAD/skills/accessible-tables/scripts/audit-cli.js
[scripts/table-enhance.js]: https://github.com/jeffjbernier/Accessible-Vibe-Coding/blob/HEAD/skills/accessible-tables/scripts/table-enhance.js
