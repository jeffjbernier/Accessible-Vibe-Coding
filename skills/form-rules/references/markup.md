# Reference markup and CSS

Canonical implementations for the form grid, its mobile-first CSS, and the
read-only record display. Copy these; don't reinvent them. The rules they
implement live in `SKILL.md` — this file is the markup, not the reasoning.

Contents:

- Form grid — the `<form>` skeleton, field wrappers, and error hooks
- Error summary — server-rendered, and as a `<template>` for client-side
  validation (§7.4)
- CSS (mobile-first) — grid, spans, tokens in use, focus ring, visually-hidden
- Record display (read-only) — the `dl` pattern for single-record pages

---

## Form grid

```html
<h1 id="contact-form-heading">Contact us</h1>
<!-- the action ends #error-summary so a refused submit starts the screen
     reader at the summary (SKILL.md §7.1) -->
<form method="post" action="/register/contact#error-summary" novalidate
      class="form-grid" id="contact-form"
      aria-labelledby="contact-form-heading">

  <!-- general input -->
  <label for="first-name">
    First name <span class="req" aria-hidden="true">*</span>
  </label>
  <div class="field">
    <input type="text" id="first-name" name="first_name" required
           autocomplete="given-name" value="<?= e($old['first_name'] ?? '') ?>"
           <?= isset($errors['first_name'])
             ? 'aria-invalid="true" aria-describedby="first-name-error"'
             : '' ?>>
    <?php if (isset($errors['first_name'])): ?>
      <p class="field-error" id="first-name-error">
        <?= e($errors['first_name']) ?>
      </p>
    <?php endif; ?>
  </div>

  <!-- input with a hint -->
  <label for="email">
    Email <span class="req" aria-hidden="true">*</span>
  </label>
  <div class="field">
    <input type="email" id="email" name="email" required autocomplete="email"
           aria-describedby="email-hint" value="<?= e($old['email'] ?? '') ?>">
    <p class="field-hint" id="email-hint">
      <span class="sr-only">Tip: </span>
      We send your confirmation and sign-in link here.
    </p>
  </div>

  <!-- single checkbox: merged row, control right-aligned to label column -->
  <div class="choice-row">
    <input type="checkbox" id="newsletter" name="newsletter" value="1">
    <label for="newsletter">Send me news and event announcements</label>
  </div>

  <!-- radio / checkbox GROUP: fieldset spans the grid;
       legend takes the label column -->
  <fieldset class="choice-group">
    <legend>
      Participant type <span class="req" aria-hidden="true">*</span>
    </legend>
    <div class="choice-row">
      <input type="radio" id="type-attendee" name="participant_type"
             value="attendee" required>
      <label for="type-attendee">Attendee</label>
    </div>
    <div class="choice-row">
      <input type="radio" id="type-volunteer" name="participant_type"
        value="volunteer">
      <label for="type-volunteer">
        Volunteer — includes on-site setup and check-in shifts
      </label>
    </div>
  </fieldset>

  <div class="form-actions">
    <button type="submit">Continue</button>
  </div>
</form>
```

## Error summary

The summary is in the page only on a render where the submit failed (§7.4) —
never on first load, never hidden, never with an empty heading. The same goes
for the save confirmation: it exists only on the render after a successful
save.

### Server-rendered

The template emits the summary only when there are errors. Place it directly
before the `<form>`. The form posts to `…#error-summary` (see the form grid
above), so the refused page's address carries the anchor: focus moves to the
summary, and so does the screen reader's reading position, which NVDA would
otherwise restore to where it was before the submit (SKILL.md §7.1).

```php
<title><?= $errors ? 'Error: ' : '' ?>Contact us</title>

<?php if ($errors): ?>
  <div class="error-summary" tabindex="-1" id="error-summary"
       role="group" aria-labelledby="error-summary-title">
    <h2 id="error-summary-title">
      There's a problem with <?= count($errors) ?>
      <?= count($errors) === 1 ? 'answer' : 'answers' ?>
    </h2>
    <ul>
      <?php foreach ($errors as $field => $message): ?>
        <li>
          <a href="#<?= e(str_replace('_', '-', $field)) ?>"><?= e($message) ?></a>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
  <script>document.getElementById('error-summary').focus();</script>
<?php endif; ?>
```

### Client-side (`<template>`)

When JavaScript validates before the POST, keep the summary's markup in a
`<template>`. Its content is not part of the page, so there is nothing to hide.
The template's heading has real text, and the script replaces it with the count
before the summary is inserted:

```html
<template id="error-summary-template">
  <div class="error-summary" tabindex="-1" id="error-summary"
       role="group" aria-labelledby="error-summary-title">
    <h2 id="error-summary-title">There's a problem with this form</h2>
    <ul></ul>
  </div>
</template>
```

```js
const form = document.getElementById('contact-form');
const summaryTemplate = document.getElementById('error-summary-template');
const baseTitle = document.title;

function removeSummary() {
  document.getElementById('error-summary')?.remove();
  document.title = baseTitle;
}

function showSummary(errors) {
  removeSummary(); // replace the old summary; never stack a second one
  const summary = summaryTemplate.content.firstElementChild.cloneNode(true);
  const noun = errors.length === 1 ? 'answer' : 'answers';
  summary.querySelector('h2').textContent =
    `There's a problem with ${errors.length} ${noun}`;
  for (const { id, message } of errors) {
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = message;
    const item = document.createElement('li');
    item.append(link);
    summary.querySelector('ul').append(item);
  }
  form.before(summary);
  document.title = `Error: ${baseTitle}`;
  summary.focus();
}

form.addEventListener('submit', (event) => {
  // validate() returns [{ id, message }] with the server's exact messages (§7.3)
  const errors = validate(form);
  if (errors.length) {
    event.preventDefault();
    showSummary(errors);
  } else {
    removeSummary();
  }
});
```

The inline errors under each field (§7.2) still apply and are left out here to
keep the example short. A confirmation shown without a reload follows the same
pattern: clone it from its own `<template>` after the save succeeds, and remove
it when the user goes back to edit.

## CSS (mobile-first)

```css
/* ---------- mobile: one column, labels above inputs ---------- */
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  row-gap: var(--form-gap-stack);          /* taller gap BETWEEN sets */
}
/* pull each .field up toward its own label so the pair reads as one unit:
   var(--form-gap-pair) inside a set, var(--form-gap-stack) between sets */
.form-grid > label + .field {
  margin-top: calc(-1 * (var(--form-gap-stack) - var(--form-gap-pair)));
}
.form-grid .field { display: grid; row-gap: var(--form-gap-pair); }

/* checkbox / radio: control + label on one line, hanging indent on wrap */
.choice-row {
  display: grid;
  grid-template-columns: auto 1fr;         /* wrapped label lines align left */
  column-gap: 0.5rem;
  align-items: start;
}
/* optically align with first text line */
.choice-row input { margin-top: 0.15em; }

.choice-group {
  border: 0; margin: 0; padding: 0;
  display: grid;
  row-gap: var(--form-gap-pair);
}
.choice-group legend { padding: 0; margin-bottom: var(--form-gap-pair); }

.form-actions { display: flex; gap: 0.75rem; }

/* ---------- desktop: two columns, equal gaps ---------- */
@media (min-width: 48rem) {
  .form-grid {
    grid-template-columns: var(--form-label-col) 1fr;
    column-gap: var(--form-gap);
    row-gap: var(--form-gap);              /* EQUAL to column-gap — required */
    align-items: start;
  }
  .form-grid > label {
    text-align: right;                     /* labels right-aligned */
    justify-self: end;
    padding-top: 0.4em;                    /* baseline-align with input text */
  }
  /* mobile pull-up doesn't apply */
  .form-grid > label + .field { margin-top: 0; }

  /* merged choice row: control right-aligned to the label column */
  .form-grid > .choice-row {
    grid-column: 1 / -1;                   /* one merged row across the grid */
    grid-template-columns: var(--form-label-col) 1fr; /* same tracks as parent */
    column-gap: var(--form-gap);
  }
  /* aligns with label edge */
  .form-grid > .choice-row input { justify-self: end; }

  .choice-group { grid-column: 1 / -1; }
  .choice-group .choice-row {
    display: grid;
    grid-template-columns: var(--form-label-col) 1fr;
    column-gap: var(--form-gap);
  }
  .choice-group .choice-row input { justify-self: end; }
  /* legend behaves like a right-aligned label */
  .choice-group legend {
    float: left; width: 100%;
    text-align: right;
  }

  /* actions align to the input column */
  .form-actions { grid-column: 2; }
}
```

> **Note on the label/input pairing:** on mobile, the pair-vs-set gap is easiest
> to get right by treating `label` + `.field` as adjacent grid children and
> letting `.field`'s internal `row-gap` handle hint/error spacing. If a form
> builder emits wrapper rows instead, keep the same visual result:
> `--form-gap-pair` inside a set, `--form-gap-stack` between sets.

## Record display (read-only)

```html
<dl class="record-grid">
  <dt>First name</dt><dd>Ada</dd>
  <dt>Email</dt><dd>ada@example.org</dd>
  <dt>Accommodations</dt><dd>Large-print materials; vegetarian meals</dd>
</dl>
```

```css
.record-grid {
  display: grid;
  grid-template-columns: 1fr;
  row-gap: var(--form-gap-pair);
  margin: 0;
}
.record-grid dt { font-weight: 600; margin-top: var(--form-gap-stack); }
.record-grid dt:first-of-type { margin-top: 0; }
.record-grid dd { margin: 0; }

@media (min-width: 48rem) {
  .record-grid {
    grid-template-columns: var(--form-label-col) 1fr;
    column-gap: var(--form-gap);
    row-gap: var(--form-gap);
  }
  .record-grid dt { text-align: right; margin-top: 0; font-weight: 600; }
}
```
