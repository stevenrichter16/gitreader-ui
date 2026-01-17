# Reader Interactions Unit Test Plan

This plan covers unit tests for reader interaction helpers in `app/static/gitreader/modules/ui/readerInteractions.ts` using a DOM-capable test runner, plus the minimal reader facade in `app/static/gitreader/modules/ui/readerController.ts`.

## Test Harness

- Use Vitest with `jsdom` environment for DOM manipulation and event tests.
- Add `@testing-library/dom` (optional) or use direct DOM APIs.
- Stub `HTMLElement.prototype.scrollIntoView` in test setup to avoid errors and to assert calls.
- Create `vitest.config.ts` with `environment: 'jsdom'`.
- Add `test/setup.ts` and wire via `setupFiles`.
- Add scripts:
  - `test`: run vitest once
  - `test:watch`: watch mode

## Test Helpers / Fixtures

- `makeDeps()` to construct `ReaderInteractionDependencies` with spy functions.
- `makeState()` to construct a mutable `ReaderInteractionState` backing store with setters.
- `renderCodeLines()` helper to insert `.code-line` elements with:
  - `data-line`
  - `.line-no` and `.line-text`
  - optional `data-imports` and `data-import-statement`
- Sample graph fixtures:
  - File nodes with `location.path`.
  - Function/method/class nodes with `location.start_line`/`end_line`.
  - Duplicate symbol names across multiple files to test preference ordering.

## ReaderController Unit Coverage

### Construction

- Instantiates with `ReaderView` + `ReaderInteractions` dependencies.
- Does not mutate inputs or attach events on construction.

### `render(symbol, snippet)`

- Delegates directly to `readerView.renderCode(symbol, snippet)`.
- Accepts undefined snippet and still calls `renderCode`.

### `showFileTree(path)`

- Delegates to `readerInteractions.renderReaderFileTree(path)`.
- Does not call `renderFileTree` directly (orchestrator responsibility).

### `setSnippetMode(mode)`

- Delegates to `readerView.setSnippetMode(mode)` and returns the promise.

### Event handlers

- `handleCodeSurfaceClick(event)` delegates to `readerInteractions.handleCodeSurfaceClick(event)`.
- `handleCodeSurfaceKeydown(event)` delegates to `readerInteractions.handleCodeSurfaceKeydown(event)`.

## Public API Coverage (ReaderInteractions)

### `handleCodeSurfaceClick`

- Fold toggle click (target with `[data-fold-toggle]`)
  - Toggles fold state and updates `.is-folded` and `.is-fold-collapsed`.
- Breadcrumb click (target with `[data-breadcrumb-path]`)
  - Navigates and calls `jumpToSymbol` for known files.
- File tree toggle click (target with `[data-tree-toggle]`)
  - Calls `toggleFileTreePath`.
- Reader actions (target with `[data-reader-action]`)
  - `copy` calls `copySnippet`.
  - `jump` calls `jumpToInputLine`.
- Import click (target with `[data-import-name]`)
  - Modifier click triggers import navigation.
  - Non-modifier click triggers usage highlighting.
- Import line click (line with `data-imports`)
  - Uses first import and behaves like above.
- Definition jump (modifier click on identifier)
  - Navigates to definition or sets status if missing.

### `handleCodeSurfaceKeydown`

- Pressing Enter in `[data-line-input]` triggers `jumpToInputLine`.
- Other keys or targets do not trigger.

### `showReaderFileTreeForCurrent`

- Uses `currentSymbol.location.path` when set.
- Falls back to `readerTreeFocusPath`.
- Does nothing when neither path exists.

### `renderReaderFileTree`

- Builds and caches file tree root when missing.
- Sets `readerTreeFocusPath`, clears snippet state.
- Expands focus path in collapsed set.
- Produces HTML and stores `readerFileTreeRows`.

### `updateReaderControls`

- When reader tree is visible:
  - File tree button is active.
  - Snippet buttons are inactive.
- When reader tree is hidden:
  - File tree button is inactive.
  - Snippet mode UI updates.

### `decorateImportLines`

- JS/TS: multi-line import blocks
  - All lines in the block become decorated.
- Python/Swift: single-line imports
  - Only valid import lines decorated.
- Comment-only lines are ignored.
- Import names are wrapped in `.code-import` buttons.

## Import Resolution Scenarios

### JS/TS

- `import { a as b } from './x'` resolves to `a`.
- `export { a } from './x'` resolves to `a`.
- `import Foo = require('./x')` resolves `Foo`.
- `const { a } = require('./x')` resolves `a`.
- Non-relative imports (e.g. `react`) return null and show modal.

### Python

- `import pkg as p` resolves `pkg`.
- `from pkg import x as y` resolves `x`.
- `from pkg import *` does not create clickable names.

### Swift

- `import Module` resolves to `Module.swift` when it exists.

### Missing Imports

- Shows modal with a clear message.
- Modal closes on backdrop click and `Escape` key.

## Definition Jump Behavior

- String/comment tokens are ignored.
- Prefers same-file definition when duplicates exist.
- Emits status text when no definition is found.

## Folding Logic

- `applyFoldControls` creates toggles for function/method/class ranges.
- Toggle reflects `foldedSymbolIds` state (`+` vs `-`).
- Collapsed ranges hide lines via `.is-folded` and `.is-fold-collapsed`.
- No fold ranges for non-file symbols clears state.

## Breadcrumb Trail

- `renderImportBreadcrumbs` returns HTML only when:
  - there are at least 2 crumbs
  - the current path is in the trail
- `navigateBreadcrumb`:
  - updates breadcrumb list
  - navigates to file when present
  - sets status if missing

## File Tree Rendering

- Uses shared collapsed set with narrator tree.
- Focus file highlights bubble to collapsed parent folders.
- Folder toggles update collapse state properly.

## Regression & Edge Cases

- Multi-line imports with blank lines still produce correct `data-imports` on each line.
- `currentSnippetText` missing falls back to DOM line text.
- `setReaderState` only updates provided keys (no implicit resets).
- `scrollIntoView` called for first usage highlight and for jump navigation.

## Suggested Test File Layout

- `app/static/gitreader/modules/ui/__tests__/readerController.test.ts`
- `app/static/gitreader/modules/ui/__tests__/readerInteractions.clicks.test.ts`
- `app/static/gitreader/modules/ui/__tests__/readerInteractions.imports.test.ts`
- `app/static/gitreader/modules/ui/__tests__/readerInteractions.folding.test.ts`
- `app/static/gitreader/modules/ui/__tests__/readerInteractions.fileTree.test.ts`
- `app/static/gitreader/modules/ui/__tests__/readerInteractions.definitionJump.test.ts`

## Minimal Setup Snippets

- `test/setup.ts`:
  - stub `scrollIntoView` to `vi.fn()`
  - reset DOM between tests
- `vitest.config.ts`:
  - set `environment: 'jsdom'`
  - `setupFiles: ['./test/setup.ts']`

