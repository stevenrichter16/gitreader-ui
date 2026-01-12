# Tracing and Narrative Flow Plan (Phase 1-3)

Scope: Python + Flask first. Static analysis is the default and must always work without runtime analysis. Dynamic traces are optional enrichment in later phases.

## Phase 1: Static-First "Happy Path" (Flask)

Goal: Produce a narrative flow for each Flask route using static analysis only.

Deliverables:
- Route discovery for Flask: detect `@app.route(...)` and `@blueprint.route(...)`.
- Call graph (in-repo only) using Python AST.
- Simple path extraction: walk from route handler into downstream calls (depth-limited).
- Narrative output: one "story arc" per route, with ordered scenes.
- Backend API to serve story arcs for the narrator UI.

Implementation details:
- Parsing:
  - Use `ast` to collect function defs, class methods, and call sites.
  - Store `file_path`, `line`, `name`, `kind` (function/method/class), and docstring.
- Linking:
  - In phase 1, link calls by name within the same module or same package when possible.
  - Skip unresolved calls (external libs or ambiguous names).
- Entry points:
  - Detect routes by decorator inspection.
  - Each route handler becomes a "chapter".
- Path extraction:
  - Depth-first walk (2-4 levels).
  - Skip low-signal nodes (`utils`, `helpers`, very small functions).
- Output data model:
  - `StoryArc`: `id`, `title`, `entry_node`, `scenes[]`, `summary`.
  - `Scene`: `node_id`, `label`, `file_path`, `line`, `kind`, `notes`.
- API:
  - `GET /story/arcs` -> list arcs by route.
  - `GET /story/arcs/<id>` -> arc details with scene list.
- UI wiring:
  - Narrator pills display "Hook", "What it does", "Key lines", "Connections", "Next thread".
  - Phase 1 uses templates for these fields based on static data.

Success criteria:
- Every detected route returns at least one narrative arc.
- UI shows an ordered flow of real functions and files from the repo.

## Phase 2: Stronger Static Graph + Multiple Threads

Goal: Improve call linking, ranking, and branching to build richer stories.

Deliverables:
- Import resolution and cross-file call linking.
- Node/edge scoring to rank "primary flows".
- Multiple arcs per entry (main flow + side threads).
- Better narrative: summarize key roles and add "Connections".

Implementation details:
- Linking:
  - Build symbol tables per module.
  - Resolve imports for calls across files (local packages).
  - Attach confidence scores to edges.
- Ranking:
  - Score nodes by fan-in/fan-out, docstring presence, and cross-file edges.
  - Weight edges to avoid noise (utilities, tests).
- Path selection:
  - Identify one "happy path" per route.
  - Add 1-2 secondary arcs (related branches).
- Caching:
  - Cache story arcs by repo + ref + subdir to avoid repeated parsing.
- UI:
  - Allow "Next thread" to jump to a related arc.
  - Highlight ambiguous edges (low-confidence links).

Success criteria:
- Main flow is stable across runs.
- Multiple arcs exist for non-trivial routes.
- Call links across files are reliable for common patterns.

## Phase 3: Optional Dynamic Trace Overlay

Goal: Use runtime traces to refine ordering and validate static links, without requiring traces.

Deliverables:
- Trace collection pipeline (optional).
- Trace-to-graph alignment.
- Merge algorithm to adjust arc ordering and confidence.
- UI indicator showing "traced" vs "static-only".

Implementation details:
- Trace capture:
  - Optional instrumentation to record calls (decorator or sys.setprofile).
  - Store trace events as `call -> callee` with timestamps.
- Alignment:
  - Map trace symbols to graph nodes by file + function name.
  - Increase confidence and reorder scenes if trace confirms order.
- Merge logic:
  - Static arcs remain the baseline.
  - If traces exist, overlay a "confirmed path" with higher priority.
- UI:
  - Badge or color to mark traced scenes.
  - Toggle to view static vs traced ordering.

Success criteria:
- App works fully without traces.
- When traces exist, story arcs reflect real runtime paths.

## Notes and future expansion

- JavaScript + frameworks: add parsers for JS/TS AST, route detection for Express/Next/etc.
- Traces for JS: use source maps or instrumentation in Node.
- Keep the interface stable: the narrator should always work from static data alone.
