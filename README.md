# gitreader-ui

## Frontend build

Install the dev dependencies once:

```sh
npm install
```

Build the bundled frontend:

```sh
npm run build
```

For watch mode during development:

```sh
npm run build:watch
```

## Reader facade

`app/static/gitreader/modules/ui/readerController.ts` exposes a minimal reader API (`render`, `showFileTree`, `setSnippetMode`, plus code-surface event handlers) so `app.ts` can orchestrate reader behavior without owning interaction details.

## Reader

The Reader is the code-viewing surface that renders file bodies/snippets, highlights relevant lines, and supports navigation actions like import jumps, definition jumps, folding, and file-tree browsing. It is composed of:

- `ReaderView` (`app/static/gitreader/modules/ui/reader.ts`) which renders the snippet UI, header/footer, and manages snippet mode (body vs full).
- `ReaderInteractions` (`app/static/gitreader/modules/ui/readerInteractions.ts`) which handles click/keyboard interactions, import/definition resolution, folding, breadcrumbs, and the reader file tree view.
- `ReaderController` (`app/static/gitreader/modules/ui/readerController.ts`) which exposes the minimal API (`render`, `showFileTree`, `setSnippetMode`, and event handlers) used by `app/static/gitreader/app.ts` to orchestrate reader behavior.

In practice, `app.ts` fetches snippet data from the backend and calls `ReaderController.render(...)` to show it. The reader’s interactions then update the UI and navigate between files/symbols without `app.ts` needing to know the low-level DOM details.
