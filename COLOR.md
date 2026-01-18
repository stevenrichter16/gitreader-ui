# Code Token Coloring Plan (JS/TS Focus)

## Goals
- Apply the “Charcoal + Ember” palette to code tokens for better readability.
- Optimize for JavaScript/TypeScript (including JSX/TSX) while keeping Python/Swift usable.
- Avoid extra runtime overhead by reusing the existing highlight.js path.

## Palette (Dark Variant)
- `--bg`: #121212
- `--panel`: #1B1B1B
- `--ink`: #E8E6E1
- `--muted-ink`: #A7A29A
- `--accent`: #E07A3F
- `--accent-strong`: #C6632E
- `--halo`: rgba(224,122,63,0.25)
- `--line`: #2B2B2B
- `--panel-shadow`: rgba(0,0,0,0.35)
- `--code-bg`: #171717
- `--code-line`: rgba(224,122,63,0.12)
- `--selection`: #3A2B22
- `--success`: #52B788
- `--warn`: #D4A24E
- `--danger`: #E35D4F

## Token Color Map (JS/TS oriented)
- Keywords/control flow (`if`, `return`, `async`): `#E07A3F`
- Types/interfaces (TS): `#7AA7D6`
- Classes/constructors: `#E2C06B`
- Functions/methods: `#E6A56B`
- Strings/template strings: `#88C999`
- Numbers: `#59B3A3`
- Literals (`true`, `false`, `null`, `undefined`): `#D38B5A`
- Variables/identifiers: `#D7D1C7`
- Properties/fields: `#C9B38E`
- Builtins/stdlib (`Array`, `Promise`): `#C95E4A`
- Comments: `#6E6A63`
- Operators: `#8B8781`
- Punctuation/brackets: `#7A7671`
- JSX tags: `#F08C4B`
- JSX attributes/props: `#9EC4A9`
- Regex/special: `#D66B6B`

## Implementation Steps

### 1) Add palette variables to CSS
- File: `app/static/gitreader/styles.css`
- Add/replace theme variables with the palette above.
- Ensure surfaces reference the palette:
  - Page/backgrounds use `--bg` and `--panel`.
  - Code blocks use `--code-bg`.
  - Borders use `--line`.

### 2) Add highlight.js token styles (scoped to Reader)
- File: `app/static/gitreader/styles.css`
- Add a scoped block:
  - `.code-details .hljs { color: var(--ink); background: transparent; }`
  - Map `.hljs-*` classes to the colors above.
- Keep the selectors inside the reader to avoid impacting narrator/canvas:
  - `.code-details .hljs-keyword`, `.code-details .hljs-title.function_`, etc.

### 3) Ensure code blocks get a language class (JS/TS priority)
- File: `app/static/gitreader/app.ts` (or `ReaderView` in `app/static/gitreader/modules/ui/reader.ts`)
- Confirm the `<code>` element gets `language-javascript`, `language-typescript`, `language-tsx`, or `language-jsx`.
- Add mappings to `getHighlightLanguage`:
  - `.js` → `javascript`
  - `.jsx` → `javascript` (or `jsx` if you load it)
  - `.ts` → `typescript`
  - `.tsx` → `tsx`

### 4) Run highlight.js once per render
- File: `app/static/gitreader/modules/ui/reader.ts` or `app/static/gitreader/app.ts`
- Ensure highlight runs after HTML is inserted, but only once per render:
  - `hljs.highlightElement(codeEl)` or `hljs.highlightAll()` scoped to the reader.
- Avoid re-highlighting on scroll.

### 5) Tune for JS/TS readability
- Make JSX tags/attributes distinct (tags in ember, props in sage).
- Boost type visibility (TS types in cool blue).
- Keep identifiers close to `--ink` so common JS doesn’t look “rainbowed”.

### 6) Guard performance for large files
- If a file exceeds a line threshold (e.g., 800), skip highlight:
  - Apply a `.code-plain` class and keep `color: var(--ink)`.
- Do not highlight in “Body” mode if the snippet is still huge.

### 7) Validate
- Open a JS/TS repo with JSX:
  - Verify JSX tags, props, and template strings.
  - Verify comments and operators stay low-contrast.
- Check that focus/dim line styles remain visible over `--code-bg`.

## CSS Snippet (scoped token styles)
```css
.code-details .hljs { color: var(--ink); background: transparent; }
.code-details .hljs-keyword,
.code-details .hljs-selector-tag,
.code-details .hljs-doctag { color: #E07A3F; }
.code-details .hljs-type { color: #7AA7D6; }
.code-details .hljs-title.class_,
.code-details .hljs-class .hljs-title { color: #E2C06B; }
.code-details .hljs-title.function_,
.code-details .hljs-function .hljs-title { color: #E6A56B; }
.code-details .hljs-string,
.code-details .hljs-quote,
.code-details .hljs-template-string { color: #88C999; }
.code-details .hljs-number { color: #59B3A3; }
.code-details .hljs-literal { color: #D38B5A; }
.code-details .hljs-variable,
.code-details .hljs-name { color: #D7D1C7; }
.code-details .hljs-property { color: #C9B38E; }
.code-details .hljs-built_in,
.code-details .hljs-builtin-name { color: #C95E4A; }
.code-details .hljs-comment { color: #6E6A63; }
.code-details .hljs-operator { color: #8B8781; }
.code-details .hljs-punctuation { color: #7A7671; }
.code-details .hljs-tag { color: #F08C4B; }
.code-details .hljs-attribute,
.code-details .hljs-attr { color: #9EC4A9; }
.code-details .hljs-regexp { color: #D66B6B; }
.code-details .hljs-meta,
.code-details .hljs-meta-keyword { color: #A7A29A; }
```

## Optional Enhancements
- Add a theme toggle later by scoping the palette to `body[data-theme="dark"]`.
- Add “Reduce noise” toggle to dim comments/strings for dense JS files.
