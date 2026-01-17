# GitReader Frontend Split Plan (Detailed)

## Purpose
Refactor `app/static/gitreader/app.ts` (and the compiled `app.js`) into smaller modules so changes are safer, faster to reason about, and easier to test—without altering behavior.

## Key Constraints
- **Behavior parity:** UI, flows, and data must remain identical through each phase.
- **Incremental moves:** Move small, coherent blocks; verify after every phase.
- **No feature changes:** Refactor only; no visual or functional changes unless explicitly requested.
- **Dual output:** Keep `app.js` in sync with module changes (build step or manual sync).

## Inventory (Current Responsibilities in app.ts)
Use this as a checklist for extraction so nothing is missed:

**Reader / Code Surface**
- `renderCode`, `renderSnippetLines`, `highlightSnippet`
- snippet mode (`body` vs `full`), code actions (copy/jump)
- import decoration + cmd/ctrl-click resolution
- method/class/function folding
- breadcrumbs
- “File system” reader view

**File Tree**
- build tree from graph nodes
- render tree (narrator + reader)
- focus highlight + collapsed folders
- reader/narrator sync

**Graph / Canvas**
- layout modes (cluster/layer/free)
- edge filters + node filters
- rendering + hover tooltips
- selection + focus logic
- reveal/cap logic

**Narrator**
- narrator fetch + caching
- rendering of story arcs
- narration modes

**Tour**
- tour state, steps, UI sync
- focus gating + guided actions

**TOC / Routes**
- TOC modes (story/tree/routes)
- route picker + arc selection

**Shared state / glue**
- repo params + fetch helpers
- UI toggles + layout prefs
- common caches

## Preconditions / Decisions (Before Refactor)
1. **Build strategy**
   - Option A: add a minimal build step (TS → JS bundling). Recommended.
   - Option B: manual sync of `app.ts` → `app.js`. Slower + error‑prone.
2. **Module system**
   - Use ES module imports in TS.
   - Output: either bundle to single `app.js` or multiple modules loaded in `index.html`.
3. **Type ownership**
   - Centralize shared types in `modules/types.ts`.
   - Avoid circular imports by keeping modules thin + explicit interfaces.
4. **State ownership model**
   - `app.ts` becomes orchestrator; each module owns its internal state.
   - Keep shared state minimal and pass via constructor parameters.

## Module Map (Proposed)
```
app/static/gitreader/
  app.ts                 # orchestrator, wires modules
  modules/
    types.ts             # SymbolNode, GraphEdge, etc.
    utils/
      dom.ts             # getElement, query helpers
      strings.ts         # escapeHtml, normalizePath
      format.ts          # formatLocation, labels
    ui/
      reader.ts          # reader rendering + actions
      fileTree.ts        # file tree model + render
      fileTreeView.ts    # tree state + narrator/reader render helpers
      fileTreeEvents.ts  # file tree event wiring (toggles, file clicks)
      fileTreeController.ts # narrator file-tree DOM wrapper
      graphView.ts       # graph rendering + controls
      narrator.ts        # narrator fetch/render
      tour.ts            # tour state + UI
      toc.ts             # TOC + routes
```

## Phase 0 — Prep
- Create `modules/` and `modules/utils/` folders.
- Move shared interfaces into `modules/types.ts`.
- Add minimal build path if needed (e.g. `esbuild` or TS compiler).

**Validation**
- App loads, no runtime errors.

## Phase 1 — Utilities (Lowest Risk)
Move stateless helpers:
- `getElement` → `utils/dom.ts`
- `escapeHtml`, `normalizePath` → `utils/strings.ts`
- label/format helpers → `utils/format.ts`

**Validation**
- Load app, click around reader/narrator/canvas to ensure no regressions.

## Phase 2 — Reader Module
Create `modules/reader.ts`.

**Move**
- `renderCode`, `renderSnippetLines`, snippet toggles
- import highlighting + cmd/ctrl-click resolution
- folding logic
- breadcrumbs
- reader file tree view
- reader controls state

**Module API**
- `render(symbol, snippet)`
- `showFileTree(path)`
- `setSnippetMode(mode)`
- `setSnippetCache(symbol, snippet)`
- `onAction(callbacks)` for events (jump, copy, line)

**Dependencies**
- uses `types.ts`, `utils/*`, `fileTree` for tree rendering

**Validation**
- Switch Body/Full
- Cmd/ctrl-click imports
- Breadcrumbs
- Folding
- File System button

## Phase 3 — File Tree Modules
Split file tree responsibilities across dedicated modules:

**Move**
- `fileTree.ts`: tree build + render + focus highlight
- `fileTreeView.ts`: shared collapse/focus state + narrator/reader render helpers
- `fileTreeEvents.ts`: DOM event wiring for toggles + file clicks
- `fileTreeController.ts`: narrator DOM wrapper (render/refresh)

**Module API**
- `fileTreeView.setNodes(nodes)`
- `fileTreeView.renderNarratorTree(focusPath)`
- `fileTreeView.renderReaderTree(focusPath)`
- `fileTreeView.toggle(path)`

**Validation**
- File tree renders, expands, highlights focus
- Narrator + reader in sync

## Phase 4 — Graph Module
Create `modules/graphView.ts`.

**Move**
- graph render, layout selection
- edge/node filters
- tooltips + hover
- selection and focus logic

**Module API**
- `render(nodes, edges)`
- `setLayout(mode)`
- `setFilters(filters)`
- `selectNode(id)`

**Validation**
- Graph renders; filters toggle; selection sync works

## Phase 5 — Narrator Module
Create `modules/narrator.ts`.

**Move**
- narrator fetch + caching
- story arc rendering
- narration modes

**Validation**
- Narrator modes switch
- Story arcs render

## Phase 6 — Tour Module
Create `modules/tour.ts`.

**Move**
- tour state, step rendering
- guided gating
- focus sync

**Validation**
- Tour start/next/prev/end
- Focus updates in graph + reader

## Phase 7 — TOC / Routes Module
Create `modules/toc.ts`.

**Move**
- TOC rendering
- route picker + arc selection
- tree vs story vs routes mode

**Validation**
- TOC clicks work
- route picker works

## Phase 8 — Final Orchestrator Cleanup
- `app.ts` becomes a thin coordinator.
- Shared state is only what modules can’t own independently.
- Remove dead code paths.

## Regression Checklist
- Reader: body/full toggle
- Import highlighting + cmd/ctrl-click
- Fold/expand
- Breadcrumbs
- File tree sync
- Graph filters, selection, layout
- Narrator modes
- Tour flow
- Routes / TOC

## Rollback Strategy
- Each phase is a commit; if a phase causes regressions, revert only that phase.
- Avoid multi-module moves in a single commit.

## Estimated Effort
- Phase 1–2: 1–2 days
- Phase 3–4: 1–2 days
- Phase 5–8: 1–2 days

## Start Recommendation
Begin with Phase 1 (utils) + Phase 2 (reader), since the reader is the most complex and most frequently edited surface.
