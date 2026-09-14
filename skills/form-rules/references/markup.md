# Reference markup and CSS

Canonical implementations for the form grid, its mobile-first CSS, and the
read-only record display. Copy these; don't reinvent them. The rules they
implement live in `SKILL.md` — this file is the markup, not the reasoning.

Contents:

- Form grid — the `<form>` skeleton, field wrappers, and error hooks
- CSS (mobile-first) — grid, spans, tokens in use, focus ring, visually-hidden
- Record display (read-only) — the `dl` pattern for single-record pages

---

## Form grid

```html
<h1 id="contact-form-heading">Contact us</h1>
<form method="post" action="/register/contact" novalidate class="form-grid"
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
