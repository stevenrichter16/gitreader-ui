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

## Graph rendering performance

The canvas originally rebuilt the entire Cytoscape graph on every refresh (`elements().remove()` + `add()`), which guaranteed correctness but caused avoidable work and FPS drops for large graphs or small incremental changes (like expanding a single folder).

We now keep the graph instance alive and apply a diff on render:
- Remove only nodes/edges that no longer exist.
- Add only new nodes/edges.
- Update element data in place.
- Run layout only when the graph changes or the layout mode changes (manual cluster skips layout entirely).

This reduces full re-index/layout cycles and keeps selection/positions more stable during incremental updates.

## Label visibility throttling

Label visibility was previously recalculated across **every node** on a wide range of events (hover, selection changes, zoom, layout), which became expensive on large graphs.

We now throttle label updates with `requestAnimationFrame` and only do full passes when the zoom bucket changes (i.e., crossing the label visibility threshold). At low zoom levels, we only update labels for nodes that became selected/hovered (or left those states) instead of touching all nodes. Cache resets happen on graph re-renders to keep newly added nodes correct.

This reduces per-interaction work and helps the canvas stay responsive under heavy node counts.

## Filter pass optimization

Graph filtering used to re-run a full show/hide pass on every call to `applyFilters`, even when only selection or hover state changed. This meant all nodes/edges were iterated repeatedly during normal interaction.

We now cache a visibility signature (edge filters + external toggle + focused node + guided mode) and only run the expensive visibility pass when that signature changes or when a caller explicitly forces it (e.g., filter toggles, focus changes, guided steps, or graph re-render). Selection/hover updates only refresh edge highlights and label visibility, which are much cheaper.

## Tooltip update throttling

The graph tooltip previously recomputed container bounds and updated its transform on every `mousemove`, which forced frequent layout reads and writes.

We now cache the tooltip container bounds on hover start and throttle position updates with `requestAnimationFrame`. Mousemove events only store the latest position, and a single rAF tick applies the transform. This reduces layout thrash while keeping the tooltip responsive.
