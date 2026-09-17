# Accessibility patterns

Worked examples for the rules in `SKILL.md`: landmark markup, a dialog, a tab
list with roving tabindex, the combobox pattern, an arrow-key handler, a form
field with hint and error, and focus-ring CSS. Copy the shape, not the content. Where an example
here and a rule in `SKILL.md` disagree, the rule wins.

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

Use `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>` instead of `<div>` for landmarks. Screen readers use these to navigate the page.

## ARIA Patterns

```tsx
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <h2 id="modal-title">{title}</h2>
      <div>{children}</div>
      <button onClick={onClose} aria-label="Close dialog">
        <XIcon aria-hidden="true" />
      </button>
    </div>
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

All interactive elements must be reachable via keyboard. Tab for focus navigation, Enter/Space for activation, Arrow keys for within-component navigation.

## Form Accessibility

```tsx
function SignupForm({ errors }) {
  const emailError = errors.email;

  return (
    <form aria-labelledby="form-title" method="post" noValidate>
      <h2 id="form-title">Create Account</h2>

      <div>
        <label htmlFor="email">Email address</label>
        <p id="email-hint">We will never share your email.</p>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={emailError ? "email-hint email-error" : "email-hint"}
          aria-invalid={emailError ? "true" : undefined}
        />
        {emailError && (
          <p id="email-error" className="field-error">
            Enter an email address in the format name@example.org
          </p>
        )}
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
  --text-primary: #1a1a1a;      /* 15.3:1 on white */
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

WCAG AA requires 4.5:1 contrast for normal text, 3:1 for large text (18pt/24px+ regular, or 14pt/~18.66px+ bold).
