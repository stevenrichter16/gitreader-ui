# Rendering Diagnostic: FPS + Unnecessary Work

This document summarizes likely performance sinks in the current rendering pipeline (canvas + reader + narrator) and concrete ways to reduce unnecessary renders/computation. Each item includes the observed behavior, why it’s expensive, and the proposed fix.

## 1) Full graph rebuilds on refresh
**Where**: `app/static/gitreader/modules/ui/graphView.ts` (`GraphViewController.render`)

**What happens**
- Every refresh calls `elements().remove()` and `add(elements)` and then re-runs layout. This happens even when the change is small (e.g., expanding a single folder).

**Why it’s expensive**
- Removing/re-adding all elements forces Cytoscape to re-index, re-layout, and repaint the entire graph.

**Fix**
- Introduce a diffing layer to update only changed nodes/edges:
  - Track the previous visible node/edge ids and compute a delta on refresh.
  - Add only newly visible elements; remove only hidden ones.
  - Re-run layout only if the delta is above a threshold or the layout mode changes.

**Expected impact**
- Major reduction in layout time and DOM churn for cluster expand/collapse and small filter changes.

---

## 2) Filters cause global element show/hide every time
**Where**: `app/static/gitreader/modules/ui/graphView.ts` (`applyFilters`)

**What happens**
- `applyFilters()` shows all elements, then hides nodes/edges based on filters, then runs guided filter, focus filter, edge highlighting, and label updates.

**Why it’s expensive**
- Iterating all nodes/edges on every change (including selection/hover changes) is costly with large graphs.

**Fix**
- Separate filter changes from selection changes:
  - Only re-apply full filters when edge/node filter state changes.
  - Selection/hover should update edge highlights and label visibility without re-show/hide passes.
- Cache the last applied filter state to avoid redundant work.

**Expected impact**
- Reduced CPU and fewer layout invalidations when clicking nodes or hovering.

---

## 3) Label visibility recalculated too often
**Where**: `app/static/gitreader/app.ts` (`updateLabelVisibility`)

**What happens**
- `updateLabelVisibility()` loops all nodes on many events: select/unselect, hover in/out, zoom, pan, and render.

**Why it’s expensive**
- Large graphs mean thousands of node updates per interaction.

**Fix**
- Throttle label visibility with `requestAnimationFrame`.
- Only recompute when zoom crosses the label threshold or when the selection/hover set changes:
  - Track `lastZoomBucket` (e.g., `zoom >= threshold`) and return early if unchanged.
  - Update only the selected/hovered nodes instead of all nodes when the zoom bucket didn’t change.

**Expected impact**
- Fewer DOM updates, smoother hover and selection.

---

## 4) Edge highlighting clears all edges on every selection/hover
**Where**: `app/static/gitreader/modules/ui/graphView.ts` (`refreshEdgeHighlights`)

**What happens**
- Removes the highlight class from every edge, then re-adds for connected edges.

**Why it’s expensive**
- Full edge iteration happens for simple selection changes.

**Fix**
- Track the previously highlighted edge set and only add/remove differences.
- Alternatively: add/remove classes only on edges connected to the newly selected/hovered node and clear only when selection is empty.

**Expected impact**
- Reduced graph class churn; improved hover responsiveness.

---

## 5) Tooltip position updates on every mousemove
**Where**: `app/static/gitreader/modules/ui/graphView.ts` (`updateTooltipPosition`)

**What happens**
- Reads bounding box and sets transforms on every mousemove.

**Why it’s expensive**
- High-frequency DOM reads/writes per frame (forces layout + style recalculation).

**Fix**
- Cache tooltip container bounding rect on mouseenter and only recompute on resize.
- Throttle updates via `requestAnimationFrame`.

**Expected impact**
- Lower CPU during hover; smoother pointer movement.

---

## 6) Reader builds huge DOM per render
**Where**: `app/static/gitreader/modules/ui/reader.ts` (`renderSnippetLines`)

**What happens**
- Highlight.js generates span-heavy HTML, then we wrap every line with additional spans.

**Why it’s expensive**
- Line‑by‑line span structure increases DOM size; large files hurt both render and scroll.

**Fix**
- Lower highlight threshold (e.g., 300–500 lines) or disable highlighting in Body mode.
- Cache highlighted HTML by file+range to avoid re-highlighting on repeated renders.
- Consider virtualizing long code blocks (render only visible lines).

**Expected impact**
- Significant FPS gain when browsing large JS files.

---

## 7) highlightAuto on unknown languages
**Where**: `app/static/gitreader/modules/ui/reader.ts` (`highlightSnippet`)

**What happens**
- If language is unknown, highlight.js tries auto-detection (expensive).

**Why it’s expensive**
- Auto-detect parses multiple grammars for large text.

**Fix**
- Skip highlighting when language is unknown and fall back to escaped text.

**Expected impact**
- Reduced CPU on uncommon file types.

---

## 8) Narrator renders even when hidden
**Where**: `app/static/gitreader/app.ts` (`updateNarrator`, `renderFileTreeNarrator`)

**What happens**
- Narrator is hidden via CSS, but we still render HTML and perform fetches.

**Why it’s expensive**
- Wasted network + DOM updates that the user can’t see.

**Fix**
- Short‑circuit narrator updates when narrator is hidden.
- Defer narrator fetches until the panel is visible.

**Expected impact**
- Less background work while focusing on Reader/Canvas.

---

## 9) Fit-to-view on every layout toggle
**Where**: `app/static/gitreader/app.ts` (`refreshGraphViewport`)

**What happens**
- `fit()` is called on layout changes and other flows that already trigger layout.

**Why it’s expensive**
- Fit computes bounding boxes and animates; can cause big jumps and reflow.

**Fix**
- Replace with `resize()` only, and reserve `fit()` for explicit user action.

**Expected impact**
- Fewer layout spikes and less jitter.

---

## 10) File tree refresh churn
**Where**: `app/static/gitreader/modules/ui/fileTreeController.ts` and `fileTreeView.ts`

**What happens**
- File tree renders are triggered on many navigation changes (reader, narrator, tour).

**Why it’s expensive**
- Building and injecting large HTML for the tree is expensive even if the focus hasn’t changed.

**Fix**
- Cache the last rendered focus path and skip re-render if unchanged.
- Consider incremental updates if only one path’s expanded state changes.

**Expected impact**
- Reduces DOM churn when navigating between symbols.

---

## Suggested Implementation Order
1. Throttle label visibility + edge highlight updates.
2. Skip narrator renders when hidden.
3. Remove auto‑fit except on explicit Fit action.
4. Reduce reader highlighting (threshold + skip body mode).
5. Cache tooltip bounds and rAF‑throttle mousemove.
6. Add graph diffing for cluster updates.

