# Cmd/Ctrl Multi-Select on Graph Nodes

## Goal
Add cmd/ctrl-click multi-select on graph nodes so users can highlight multiple nodes without opening the Reader, then drag the selection as a group.

## Primary Integration Points
- `app/static/gitreader/modules/ui/graphEvents.ts`: central node tap handler.
- `app/static/gitreader/modules/ui/graphView.ts`: graph initialization + selection behavior.
- `app/static/gitreader/app.ts`: event wiring.

**Note:** `GraphViewController` now owns the Cytoscape lifecycle (creation, styling, layout) via `graphView.ts`, so multi-select behavior should be implemented there rather than in `app.ts`.

## Behavior Specification
- Cmd/ctrl-click toggles node selection state.
- Cmd/ctrl-click does **not** open the Reader and does **not** trigger cluster single-click behavior.
- Regular click keeps current behavior (single selection + snippet load).
- Box selection continues to work.

## Implementation Steps
1. **Expose modifier detection to graph events**
   - Extend `GraphEventHandlers` with `isModifierClick(event?: MouseEvent): boolean`.
   - Wire it from `app.ts` using the existing `isModifierClick`.

2. **Handle cmd/ctrl-click in `bindGraphEvents`**
   - In the node `tap` handler, check `handlers.isModifierClick(event.originalEvent)`.
   - If true:
     - Toggle selection: `node.selected() ? node.unselect() : node.select()`.
     - Call `refreshEdgeHighlights()` and `updateLabelVisibility()`.
     - `return;` to skip reader navigation + cluster behavior.

3. **Enable additive selection for multi-select**
   - Set Cytoscape `selectionType: 'additive'` in `GraphViewController.ensureGraph()` (`app/static/gitreader/modules/ui/graphView.ts`).
   - On normal (non-modifier) click, manually clear selection before selecting the clicked node so behavior stays single-select by default.

4. **Bulk movement**
   - Verify selected nodes drag together by default in Cytoscape.
   - If not:
     - On `grab`, capture offsets of all selected nodes relative to the grabbed node.
     - On `drag`, apply deltas to each selected node.

5. **Guided/Tour mode guardrails**
   - If tour mode disallows a node, block cmd/ctrl-click selection and show the guided message.

## Known Interaction Decision
Cmd/ctrl-click is currently used for file-focus jump in `handleFileFocusClick`. Decide whether to:
- Replace it with multi-select (recommended for consistency), or
- Move file-focus jump to a different modifier (e.g., `cmd+shift`) so both behaviors can coexist.

## Manual Verification Checklist
- Cmd/ctrl-click toggles node selection without opening Reader.
- Normal click still opens Reader and selects just that node.
- Box selection still works.
- Dragging one selected node moves the full selection (or use custom drag if needed).
- Guided mode restrictions still enforced.
