# Graph Node Context Menu Plan

## Goals
- Right‑click on a graph node opens a small action menu.
- Actions apply to the clicked node and its relationships.
- Keep behavior consistent with cluster view rules and guided mode.

## Menu Actions (Behavior)
### Select Parent
- **Method → Class**: parent is the class (contains edge).
- **Function → File**: parent is the file (contains edge).
- **Class → File**: parent is the file (contains edge).
- **File → Folder**: parent is the nearest folder cluster node (if visible).
- **Behavior**: replace selection with the parent and **center** the canvas on it.

### Select Children
- **File**: select direct `contains` children (classes + functions) that are visible.
- **Class**: select `contains` children (methods) that are visible.
- **Folder (cluster)**: select visible descendants under the folder path.
- **Behavior**: replace selection (use additive only if modifier pressed).

### Organize Children
- **Scope**: operates on the same children set used by “Select Children”.
- **Layouts**:
  - **Circle**: arrange children around parent in a circular ring.
  - **Grid**: arrange children into a compact grid near the parent.
- **Behavior**: position children only; keep parent anchored.

## Interaction Rules
- Right‑click uses Cytoscape `cxttap` on nodes.
- Menu closes on click outside, Esc, or after selecting an action.
- Hide actions that are not applicable (e.g., no parent or no visible children).
- Guided/tour mode: block actions on locked nodes and show a brief message.

## Implementation Plan (File‑by‑File)
### 1) New UI module: `app/static/gitreader/modules/ui/graphContextMenu.ts`
- Build a small menu component:
  - `show({ x, y, node, actions })`, `hide()`, `isOpen()`
  - Emits action callbacks (`selectParent`, `selectChildren`, `organizeChildren`)
- Keep it framework‑free and reuse existing style tokens.

### 2) Graph events wiring: `app/static/gitreader/modules/ui/graphEvents.ts`
- Add `cxttap` handler for nodes:
  - Resolve node + guard guided mode.
  - Compute available actions.
  - Show menu at cursor position.
- Add document listeners for dismiss (click outside + Esc).

### 3) App orchestration: `app/static/gitreader/app.ts`
- Provide action handlers to the menu:
  - `selectParent(node)`:
    - Resolve parent via `contains` edges and/or folder cluster path.
    - Select parent and call `graphView.fit()` or `graphInstance.center(node)`.
  - `selectChildren(node)`:
    - Use existing cluster path logic + `contains` edges.
    - Filter to visible nodes only.
  - `organizeChildren(node, layout)`:
    - Compute child positions around parent.
    - Apply positions via Cytoscape `position()` (preset).
- Ensure actions respect current layout mode (esp. cluster view).

### 4) Styling: `app/static/gitreader/styles.css`
- Add a small context menu style:
  - light background, rounded corners, subtle shadow.
  - hover state and disabled state for unavailable actions.
- Add two submenu items for layout choice (Circle / Grid).

## Manual Verification Checklist
- Right‑click opens menu at cursor.
- Select Parent centers on the parent node.
- Select Children selects only visible children.
- Organize Children → Circle & Grid layout choices reposition children correctly.
- Guided mode blocks actions on locked nodes.
