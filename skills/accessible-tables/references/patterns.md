# Accessible Table Patterns

Copy-paste markup for each table type in `SKILL.md`. Every pattern uses real
`<th>`/`<td>`, a `<caption>`, and `scope` or `id`/`headers`. Pick the simplest
pattern that fits your data. If you find yourself at P8 or P9, try P10 first.

Contents:

- P1–P3: one header
- P4–P5: two headers
- P6–P7: irregular (spanned) headers
- P8–P10: multi-level headers
- S1–S3: summaries
- L1: layout table
- R1–R2: responsive
- X1: sortable
- CSS starter
- Anti-patterns and fixes

The P and S examples are adapted from the
[W3C WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/), edited by
Eric Eggert and Shadi Abou-Zahra, copyright World Wide Web Consortium (W3C).
See [Permission to Use WAI Material](https://www.w3.org/WAI/about/using-wai-material/).

---

## P1. Header row only

Small table, each column's data clearly different. Always add `scope`, so the
header direction is never left to a screen reader's guess.

```html
<table>
  <caption>Concerts</caption>
  <thead>
    <tr>
      <th scope="col">Date</th>
      <th scope="col">Event</th>
      <th scope="col">Venue</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>12 February</td><td>Waltz with Strauss</td><td>Main Hall</td></tr>
    <tr><td>24 March</td><td>The Obelisks</td><td>West Wing</td></tr>
  </tbody>
</table>
```

## P2. Header column only

Same data, transposed. Headers sit in the first column.

```html
<table>
  <caption>Concerts</caption>
  <tbody>
    <tr><th scope="row">Date</th><td>12 February</td><td>24 March</td></tr>
    <tr>
      <th scope="row">Event</th>
      <td>Waltz with Strauss</td>
      <td>The Obelisks</td>
    </tr>
    <tr><th scope="row">Venue</th><td>Main Hall</td><td>West Wing</td></tr>
  </tbody>
</table>
```

## P3. Ambiguous data

First name, last name, and city are indistinguishable without their headers.
`scope="col"` is required here, and for any larger single-header table.

```html
<table>
  <caption>Teddy bear collectors</caption>
  <thead>
    <tr>
      <th scope="col">Last name</th>
      <th scope="col">First name</th>
      <th scope="col">City</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Phoenix</td><td>Imari</td><td>Henry</td></tr>
    <tr><td>Zeki</td><td>Rome</td><td>Min</td></tr>
  </tbody>
</table>
```

---

## P4. Header row and header column

"Open"/"Closed" only mean something with both a day and a time. The top-left
cell is an empty `<td>`, not an empty `<th>`.

```html
<table>
  <caption>Delivery slots</caption>
  <thead>
    <tr>
      <td></td>
      <th scope="col">Monday</th>
      <th scope="col">Tuesday</th>
      <th scope="col">Wednesday</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">09:00–11:00</th>
      <td>Closed</td><td>Open</td><td>Open</td>
    </tr>
    <tr>
      <th scope="row">11:00–13:00</th>
      <td>Open</td><td>Open</td><td>Closed</td>
    </tr>
  </tbody>
</table>
```

Alternative: make the corner cell meaningful, for example
`<th scope="col">Time slot</th>`.

## P5. Offset row header

The row header is in the second column. `scope="row"` applies it to cells on
both sides.

```html
<table>
  <caption>Holidays taken in the last six months</caption>
  <thead>
    <tr>
      <th scope="col">ID</th>
      <th scope="col">Name</th>
      <th scope="col">July</th>
      <th scope="col">August</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>215</td><th scope="row">Abel</th><td>5</td><td>2</td></tr>
    <tr><td>231</td><th scope="row">Annette</th><td>0</td><td>5</td></tr>
  </tbody>
</table>
```

---

## P6. Two-tier column headers (colspan)

Declare column structure first. One `<col>` per single column, one
`<colgroup span="n">` per spanned group. Total must equal the column count
(here 1 + 2 + 2 = 5). First-tier headers get `scope="colgroup"`.

```html
<table>
  <caption>Production and sales by planet</caption>
  <col>
  <colgroup span="2"></colgroup>
  <colgroup span="2"></colgroup>
  <thead>
    <tr>
      <td rowspan="2"></td>
      <th colspan="2" scope="colgroup">Mars</th>
      <th colspan="2" scope="colgroup">Venus</th>
    </tr>
    <tr>
      <th scope="col">Produced</th>
      <th scope="col">Sold</th>
      <th scope="col">Produced</th>
      <th scope="col">Sold</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Teddy bears</th>
      <td>50,000</td><td>30,000</td><td>100,000</td><td>80,000</td>
    </tr>
    <tr>
      <th scope="row">Board games</th>
      <td>10,000</td><td>5,000</td><td>12,000</td><td>9,000</td>
    </tr>
  </tbody>
</table>
```

## P7. Headers spanning rows (rowspan) and columns

Each `rowspan` header gets its own `<tbody>` and `scope="rowgroup"`. If a
header spans multiple header rows, group those rows in `<thead>`; for footer
rows, `<tfoot>`. Consider a summary (S1) for tables like this.

```html
<table>
  <caption>Poster availability</caption>
  <col>
  <col>
  <colgroup span="3"></colgroup>
  <thead>
    <tr>
      <th scope="col">Poster name</th>
      <th scope="col">Color</th>
      <th colspan="3" scope="colgroup">Sizes available</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th rowspan="3" scope="rowgroup">Zodiac</th>
      <th scope="row">Full color</th>
      <td>A2</td><td>A3</td><td>A4</td>
    </tr>
    <tr>
      <th scope="row">Black and white</th>
      <td>A1</td><td>A2</td><td>A3</td>
    </tr>
    <tr><th scope="row">Sepia</th><td>A3</td><td>A4</td><td>A5</td></tr>
  </tbody>
  <tbody>
    <tr>
      <th rowspan="2" scope="rowgroup">Angels</th>
      <th scope="row">Black and white</th>
      <td>A1</td><td>A3</td><td>A4</td>
    </tr>
    <tr><th scope="row">Sepia</th><td>A2</td><td>A3</td><td>A5</td></tr>
  </tbody>
</table>
```

---

## P8. Column headers that change mid-table (id/headers)

The header row repeats with different values halfway down, so `scope` can't
express it. Every `<th>` gets a document-unique `id`; every `<td>` lists its
headers. Prefix ids per table (`sup-`) to avoid collisions with other tables
on the page.

```html
<table>
  <caption>Supplier contacts</caption>
  <tbody>
    <tr>
      <td></td>
      <th id="sup-co1">Example 1 Ltd</th>
      <th id="sup-co2">Example 2 Co</th>
    </tr>
    <tr>
      <th id="sup-c1">Contact</th>
      <td headers="sup-co1 sup-c1">James Phillips</td>
      <td headers="sup-co2 sup-c1">Marie Beauchamp</td>
    </tr>
    <tr>
      <th id="sup-e1">Email</th>
      <td headers="sup-co1 sup-e1">jp@1ltd.example.com</td>
      <td headers="sup-co2 sup-e1">marie@2co.example.com</td>
    </tr>
    <tr>
      <td></td>
      <th id="sup-co3">Example 3 Ltd</th>
      <th id="sup-co4">Example 4 Inc</th>
    </tr>
    <tr>
      <th id="sup-c2">Contact</th>
      <td headers="sup-co3 sup-c2">Suzette Jones</td>
      <td headers="sup-co4 sup-c2">Alex Howe</td>
    </tr>
  </tbody>
</table>
```

Better: this is really two tables, or one table with a "Company" column. See
P10.

## P9. Three headers per data cell (id/headers)

Section headers ("Paris") apply to the rows below them, plus a row header and
a column header. Header cells under a section header also point to it with
`headers`.

```html
<table>
  <caption>Availability of holiday accommodation</caption>
  <thead>
    <tr>
      <td></td>
      <th id="ha-stud">Studio</th>
      <th id="ha-apt">Apartment</th>
      <th id="ha-chal">Chalet</th>
    </tr>
  </thead>
  <tbody>
    <tr><th id="ha-par" colspan="4">Paris</th></tr>
    <tr>
      <th id="ha-pbed1" headers="ha-par">1 bedroom</th>
      <td headers="ha-par ha-pbed1 ha-stud">11</td>
      <td headers="ha-par ha-pbed1 ha-apt">20</td>
      <td headers="ha-par ha-pbed1 ha-chal">25</td>
    </tr>
    <tr>
      <th id="ha-pbed2" headers="ha-par">2 bedroom</th>
      <td headers="ha-par ha-pbed2 ha-stud">–</td>
      <td headers="ha-par ha-pbed2 ha-apt">43</td>
      <td headers="ha-par ha-pbed2 ha-chal">52</td>
    </tr>
  </tbody>
</table>
```

Order ids in the sequence a screen reader should announce them (broad to
narrow is a sensible default). It's very easy to break: one typo silently
drops a header.

## P10. Split instead (recommended over P8/P9)

Same data as P9, easier for everyone, easier to code, and fully supported by
WYSIWYG ("what you see is what you get") editors.

```html
<h3>Availability of holiday accommodation</h3>

<table>
  <caption>Paris</caption>
  <thead>
    <tr>
      <td></td>
      <th scope="col">Studio</th>
      <th scope="col">Apartment</th>
      <th scope="col">Chalet</th>
    </tr>
  </thead>
  <tbody>
    <tr><th scope="row">1 bedroom</th><td>11</td><td>20</td><td>25</td></tr>
    <tr><th scope="row">2 bedroom</th><td>–</td><td>43</td><td>52</td></tr>
  </tbody>
</table>

<table>
  <caption>Rome</caption>
  <!-- same structure -->
</table>
```

Another option: flatten into a long table with a "City" column
(`<th scope="col">City</th>`) so every value has exactly one row header and
one column header.

---

## S1. Summary inside the caption (best supported)

Visible to everyone. Style the summary span differently if you like.

```html
<caption>
  Availability of holiday accommodation<br>
  <span class="table-summary">Column one has the location and size of
    accommodation; other columns show the type and number of properties
    available.</span>
</caption>
```

## S2. Summary with aria-describedby

Keep the paragraph next to the table so sighted users find it too.

```html
<p id="acc-desc">Column one has the location and size of accommodation; other
  columns show the type and number of properties available.</p>
<table aria-describedby="acc-desc">
  <caption>Paris: availability of holiday accommodation</caption>
  <!-- … -->
</table>
```

## S3. figure/figcaption (weakest support)

Tables-mode users may not get a name from `<figcaption>`, and caption and
summary can be read twice. Only use when a `<figure>` wrapper is required for
other reasons, and wire it explicitly:

```html
<figure>
  <figcaption>
    <strong id="paris-caption">Paris: availability of holiday
      accommodation</strong><br>
    <span id="paris-summary">Column one has the location and size of
      accommodation; other columns show the type and number of properties
      available.</span>
  </figcaption>
  <table aria-labelledby="paris-caption" aria-describedby="paris-summary">
    <!-- … -->
  </table>
</figure>
```

---

## L1. Legacy layout table (only if you can't replace it)

```html
<table role="presentation">
  <tr><td>Sidebar content</td><td>Main content</td></tr>
</table>
```

No `<th>`, `<caption>`, `<thead>`, `scope`, `headers`, or `summary`. Content
must read in a sensible order left-to-right, top-to-bottom. Replace with CSS
Grid when you can:

```css
.layout {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) 3fr;
  gap: 1.5rem;
}
```

---

## R1. Scrollable wide table (preferred responsive pattern)

```html
<div class="table-scroll" role="region" aria-labelledby="sales-cap"
     tabindex="0">
  <table>
    <caption id="sales-cap">Quarterly sales by region</caption>
    <!-- … -->
  </table>
</div>
```

```css
.table-scroll { overflow-x: auto; max-width: 100%; }
.table-scroll:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 2px;
}
```

`scripts/table-enhance.js` (`enhanceScroll`) adds this wrapper and only keeps
`tabindex="0"` when the table actually overflows, so you don't add useless tab
stops.

## R2. Stacked "card" layout on narrow screens (use with care)

Changing `display` on table elements drops table semantics in several
browser/screen reader pairs. Restore them with explicit roles and show each
header label visually.

```html
<table class="stack" role="table">
  <caption>Orders</caption>
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" scope="col">Order</th>
      <th role="columnheader" scope="col">Status</th>
    </tr>
  </thead>
  <tbody role="rowgroup">
    <tr role="row">
      <th role="rowheader" scope="row">#1042</th>
      <td role="cell" data-label="Status">Shipped</td>
    </tr>
  </tbody>
</table>
```

```css
@media (max-width: 40rem) {
  .stack thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .stack tr, .stack th, .stack td { display: block; }
  .stack td::before { content: attr(data-label) ": "; font-weight: 700; }
}
```

Test with a screen reader at the narrow breakpoint. If cells stop announcing
headers, use R1 instead.

---

## X1. Sortable columns

Buttons inside `<th>`, `aria-sort` on the one sorted header, decorative icons
hidden. `scripts/table-enhance.js` (`makeSortable`) builds this from
`<table data-sortable>`.

Keep the `table-sort-hint` and `sort-icon` class names if you write the
markup by hand and also load the script. It looks for those two classes, and
adds a second hint and a second icon when it does not find them.

```html
<table data-sortable>
  <caption>
    Team members
    <span class="table-sort-hint">(column headers with buttons are
      sortable)</span>
  </caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">
        <button type="button">
          Name <span class="sort-icon" aria-hidden="true">▲</span>
        </button>
      </th>
      <th scope="col">
        <button type="button">
          Start date <span class="sort-icon" aria-hidden="true">♢</span>
        </button>
      </th>
      <th scope="col" data-sort="none">Notes</th> <!-- not sortable -->
    </tr>
  </thead>
  <tbody>…</tbody>
</table>
```

---

## CSS starter

Colors are tokens with a light and a dark value. If the site theme already
defines color tokens, point these at them and delete the values here.

```css
:root {
  --table-text: #1a1a1a;
  --table-bg: #ffffff;
  --table-border: #767676;        /* 4.5:1 on white, 3.7:1 on the header */
  --table-header-bg: #e8e8e8;     /* text on it: 14:1 */
  --table-stripe-bg: #f5f5f5;
  --table-highlight-bg: #fff4c2;
  --table-focus: #005a9c;         /* 5.8:1 on the header */
}

@media (prefers-color-scheme: dark) {
  :root {
    --table-text: #f2f2f2;
    --table-bg: #121212;
    --table-border: #8c8c8c;      /* 5.6:1 on the background */
    --table-header-bg: #2b2b2b;   /* text on it: 12:1 */
    --table-stripe-bg: #1c1c1c;
    --table-highlight-bg: #3a3000;
    --table-focus: #7cc0ff;       /* 7:1 on the header */
  }
}

table {
  border-collapse: collapse;
  width: 100%;
  color: var(--table-text);
  background: var(--table-bg);
}
caption {
  text-align: start;
  font-weight: 700;
  padding-block: 0.5rem;
  caption-side: top;
}
.table-summary, .table-sort-hint { display: block; font-weight: 400; }

th, td {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--table-border);
  vertical-align: top;
  text-align: start;
}
th { background: var(--table-header-bg); font-weight: 700; }

/* Numbers right-aligned, header matching its data */
td.num, th.num { text-align: end; font-variant-numeric: tabular-nums; }

/* Zebra striping: check contrast on BOTH stripe colors */
tbody tr:nth-child(even) td { background: var(--table-stripe-bg); }

/* Highlight on hover AND keyboard focus within the row */
tbody tr:hover td, tbody tr:focus-within td {
  background: var(--table-highlight-bg);
}

/* Sort buttons look like header text. Reset the button's own box; do not
   use "all: inherit", which copies the cell's border and padding onto it. */
th button {
  font: inherit;
  color: inherit;
  text-align: inherit;
  background: none;
  border: 0;
  padding: 0;
  min-block-size: 2.75rem;        /* 44px touch target */
  min-inline-size: 2.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}
th button:focus-visible {
  outline: 3px solid var(--table-focus);
  outline-offset: 2px;
}

/* Borders and outlines survive Windows contrast themes (forced-colors);
   backgrounds do not, so no state above depends on a background alone. */
@media (prefers-contrast: more) {
  th, td { border-width: 2px; }
}

/* Never fix cell heights; never overflow: hidden on a table wrapper */
```

---

## Anti-patterns and fixes

<!-- markdownlint-disable MD013 -->
| Don't | Why it fails | Do |
| --- | --- | --- |
| `<td class="header"><b>Monday</b></td>` | Screen readers ignore styling; no header relationship | `<th scope="col">Monday</th>` |
| `<th></th>` in the corner | Announced as a blank header | `<td></td>`, or `<th scope="col">Time slot</th>` |
| `Sizes: S 6<br>M 13<br>XL 10` in one cell | Data can't be navigated or associated; breaks on text resize | Separate Size and Stock columns, one row per size |
| Header column + one "everything else" column | Relationships across columns are lost | One value per cell |
| Extra `<th>` row in the middle to start a new topic | Screen readers may read all `<th>` in a column, mixing topics | Start a new `<table>` |
| `<table summary="…">` | Obsolete; invisible to sighted users; poorly supported | `<caption>` + S1 or S2 |
| `colspan` header without `<colgroup>` | `scope="colgroup"` has no group to apply to | Declare `<col>`/`<colgroup span>` first |
| `rowspan` header in a shared `<tbody>` | `scope="rowgroup"` applies to the wrong rows | One `<tbody>` per row group |
| Duplicate ids across two `headers`-based tables | Cells reference the wrong table's headers | Prefix ids per table |
| `<table>` for page layout | Forces table navigation on non-tabular content | CSS Grid/Flexbox (or L1 as a stopgap) |
| `role="presentation"` on a data table | Removes all table semantics | Remove the role |
| `role="grid"` on a static table | Promises arrow-key cell navigation you didn't build | Plain `<table>` |
| Nested tables | Very hard to navigate and announce | Flatten or split |
| `overflow: hidden` on a wrapper | Clips data at zoom and on small screens | R1 scroll region |
| Arrow icon as the only sort indicator | Not announced, color/shape-only | `aria-sort` + button |
| `th button { all: inherit }` | Copies the cell's border and padding onto the button | Reset `font`, `background`, `border`, `padding` one by one |
<!-- markdownlint-enable MD013 -->
