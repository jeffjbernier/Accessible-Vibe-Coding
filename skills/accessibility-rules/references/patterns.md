# Accessibility patterns

Worked examples for the rules in `SKILL.md`: landmark markup, a dialog, a tab
list with roving tabindex, an arrow-key handler, a form field with hint and
error, and focus-ring CSS. Copy the shape, not the content. Where an example
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

## Dialog and Tabs

```tsx
import { useEffect, useId, useRef } from "react";

function Modal({ isOpen, onClose, title, children }) {
  const ref = useRef<HTMLDialogElement>(null);
  // The dialog stays mounted while closed, so a fixed id would collide as soon
  // as a page has two modals.
  const titleId = useId();

  // showModal() traps focus, makes the rest of the page inert, closes on
  // Escape, and returns focus to the trigger. A <div role="dialog"> does none
  // of that on its own.
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

## Form Accessibility

```tsx
// emailError comes from validation and says how to fix the input, e.g.
// "Enter an email address in the format name@example.org".
function SignupForm({ emailError }: { emailError?: string }) {
  // Reference the error id only while the error is rendered, so
  // aria-describedby never points at an element that is not there.
  const emailDescribedBy = emailError ? "email-hint email-error" : "email-hint";

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
          type="email"
          required
          autoComplete="email"
          aria-describedby={emailDescribedBy}
          aria-invalid={emailError ? "true" : undefined}
        />
        <p id="email-hint">We will never share your email.</p>
        {emailError && (
          <p id="email-error" className="error-message">
            {emailError}
          </p>
        )}
      </div>

      <button type="submit">Create Account</button>
    </form>
  );
}
```

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
