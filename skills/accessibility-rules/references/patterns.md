# Accessibility patterns

Worked examples for the rules in `SKILL.md`: landmark markup, a dialog, a tab
list with roving tabindex, an arrow-key handler, a step indicator, a form field
with hint and error, and focus-ring CSS. Copy the shape, not the content.
Where an example here and a rule in `SKILL.md` disagree, the rule wins.

The React examples use JSX because that is where assistants most often invent
a `<div onClick>`. Every pattern translates directly to plain HTML, Vue, or a
server template; the attributes are the point, not the framework.

## Semantic HTML

```html
<!-- Use semantic elements instead of generic divs -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/" aria-current="page">Home</a></li>
      <li><a href="/products">Products</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Product Details</h1>
    <section aria-labelledby="specs-heading">
      <h2 id="specs-heading">Specifications</h2>
      <dl>
        <dt>Weight</dt>
        <dd>1.2 kg</dd>
        <dt>Dimensions</dt>
        <dd>30 x 20 x 10 cm</dd>
      </dl>
    </section>
  </article>
</main>

<footer>
  <p>&copy; Company Name</p>
</footer>
```

## Dialog and Tabs

The modal below implements the modal contract in `SKILL.md` ("Modals and
dialogs"). The contract is the requirement; this is one way to meet it.

```tsx
import { useEffect, useId, useRef } from "react";

function Modal({ isOpen, onClose, title, children }) {
  const ref = useRef<HTMLDialogElement>(null);
  // The dialog stays mounted while closed, so a fixed id would collide as soon
  // as a page has two modals.
  const titleId = useId();

  // showModal() meets the whole modal contract natively and also makes the
  // rest of the page inert. A <div role="dialog"> does none of that on its own.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      <div>{children}</div>
      {/* close() fires the dialog's close event, the same path Escape takes,
          so onClose runs once however the dialog is dismissed. */}
      <button onClick={() => ref.current?.close()} aria-label="Close dialog">
        <XIcon aria-hidden="true" />
      </button>
    </dialog>
  );
}

function Tabs({ tabs, activeIndex, onChange }) {
  return (
    <div>
      <div role="tablist" aria-label="Settings sections">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={i === activeIndex}
            aria-controls={`panel-${tab.id}`}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => onChange(i)}
            onKeyDown={(e) => handleArrowKeys(e, i, tabs.length, onChange)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={i !== activeIndex}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Combobox (autocomplete)

- Use `role="combobox"` on the input, with `aria-expanded`, `aria-controls`
  pointing at the `role="listbox"` popup, and `aria-activedescendant` naming
  the highlighted `role="option"`.
- Announce the result count through a polite live region
  (`role="status"`), not through the input itself.
- Arrow keys move through options, Enter selects, Escape closes the popup and
  keeps focus in the input.
- Follow the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
  exactly; do not improvise the role combination.

## Keyboard Navigation

```tsx
function handleArrowKeys(
  event: React.KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  onSelect: (index: number) => void
) {
  let newIndex = currentIndex;

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      newIndex = (currentIndex + 1) % totalItems;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      newIndex = (currentIndex - 1 + totalItems) % totalItems;
      break;
    case "Home":
      newIndex = 0;
      break;
    case "End":
      newIndex = totalItems - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  onSelect(newIndex);
}
```

## Step Indicator

Completed and current steps are links; the current one carries
`aria-current="step"`. Upcoming steps are plain text. State is spoken through
visually hidden text and shown by a checkmark, weight, and border thickness,
never by color alone.

```html
<nav class="steps" aria-label="Checkout progress">
  <ol>
    <li class="steps__item steps__item--done">
      <a href="/checkout/cart">Cart<span class="sr-only"> (completed)</span></a>
    </li>
    <li class="steps__item steps__item--done">
      <a href="/checkout/shipping">Shipping<span class="sr-only"> (completed)</span></a>
    </li>
    <li class="steps__item steps__item--current">
      <a href="/checkout/payment" aria-current="step">Payment</a>
    </li>
    <li class="steps__item">
      <span class="steps__label">Review<span class="sr-only"> (not started)</span></span>
    </li>
  </ol>
</nav>
```

```css
/* One row at every width: columns share the space instead of wrapping. */
.steps ol {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps__item {
  border-bottom: 2px solid var(--text-secondary);
  line-height: 1.5;
  text-align: center;
}

/* Fill the cell so each link is at least a 44x44px target. Labels wrap to
   at most three lines; shorten the copy rather than clamping it. Column
   direction stacks the checkmark above the label: in a row, ::before is a
   separate flex item that never wraps, and pushes long words out of the cell. */
.steps__item a,
.steps__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.25rem;
  color: var(--text-primary);
  hyphens: auto;
}

/* Empty alt text after the slash: the hidden "(completed)" already says it. */
.steps__item--done a::before {
  content: "✓" / "";
}

.steps__item--current {
  border-bottom-width: 6px;
  border-bottom-color: var(--text-primary);
  font-weight: 700;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## Form Accessibility

```tsx
// emailError comes from validation and says how to fix the input, e.g.
// "Enter an email address in the format name@example.org".
function SignupForm({ emailError }: { emailError?: string }) {
  // Reference the error id only while the error is rendered, so
  // aria-describedby never points at an element that is not there.
  // Error first, then hint: the same order they appear on screen.
  const emailDescribedBy = emailError ? "email-error email-hint" : "email-hint";

  return (
    <form
      aria-labelledby="form-title"
      method="post"
      action="/signup"
      noValidate
    >
      <h2 id="form-title">Create Account</h2>

      <div>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={emailDescribedBy}
          aria-invalid={emailError ? "true" : undefined}
        />
        {emailError && (
          <p id="email-error" className="error-message">
            {emailError}
          </p>
        )}
        <p id="email-hint" className="field-hint">
          <span className="sr-only">Tip:&nbsp;</span>
          We will never share your email.
        </p>
      </div>

      <button type="submit">Create Account</button>
    </form>
  );
}
```

The inline error has no `role="alert"` on purpose. On a failed submit, the
announcement comes from the error summary at the top of the form, which takes
focus. An alert on every field makes the screen reader read each error over
the others. The summary, the grid, and the full error pattern are defined in
the `form-rules` skill (§7, and `references/markup.md`), which wins wherever
this example is thinner.

## Color and Contrast

```css
:root {
  --text-primary: #1a1a1a;      /* 17.4:1 on white */
  --text-secondary: #595959;    /* 7.0:1 on white */
  --text-on-primary: #ffffff;   /* Ensure 4.5:1 on brand color */
  --border-focus: #0066cc;      /* Visible focus ring */
}

*:focus-visible {
  outline: 3px solid var(--border-focus);
  outline-offset: 2px;
}

.error-message {
  color: #d32f2f;
  /* Don't rely on color alone - add icon or text prefix */
}
.error-message::before {
  content: "Error: ";
  font-weight: bold;
}
```
