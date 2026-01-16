# JS/TS/Swift Support Execution Checklist (Graph + Reader Only)

Goal: add first-class support for `.js/.jsx/.ts/.tsx/.swift` so the existing canvas + reader work without story arcs or tour logic.

---

## Step 1 - Dependencies and parsing setup
- [ ] `requirements.txt`: add tree-sitter bindings.
  - Recommended: `tree_sitter` + `tree_sitter_languages` (multi-language bundle).
  - Alternative: `tree_sitter` + per-language packages (`tree_sitter_javascript`, `tree_sitter_typescript`, `tree_sitter_swift`).
- [ ] Decide mapping strategy:
  - Minimal UI change: map Swift `struct/enum/protocol/extension` and TS `interface/type` to existing `class`.
  - Richer UI: add new symbol kinds and update UI colors/legend.

---

## Step 2 - Expand scanning and signatures
- [ ] `app/gitreader/scan.py`
  - Add new tracked lists (example): `js_files`, `ts_files`, `tsx_files`, `swift_files` (or a single `files_by_ext`).
  - Extend `scan_repo` to recognize: `.js`, `.jsx`, `.ts`, `.tsx`, `.swift`.
  - Add Swift-specific skip dirs to `DEFAULT_SKIP_DIRS`: `DerivedData`, `.swiftpm`, `.build`, `Pods`, `Carthage`.
- [ ] `app/gitreader/service.py`
  - Update `_compute_signature` to include new file counts so cache invalidates.
  - Update `stats` dict and log output to include new counts.

---

## Step 3 - Tree-sitter parsing modules
- [ ] `app/gitreader/parse_js.py` (new)
  - Define `ParsedJsFile` dataclass: `path`, `module`, `tree`, `source`.
  - Implement `parse_js_files(root_path, rel_paths)`:
    - Choose language based on extension (`.js/.jsx/.ts/.tsx`).
    - Parse with tree-sitter and store `tree` + `source`.
  - Use the same `module_path_from_file` behavior as Python (path to module string).
- [ ] `app/gitreader/parse_swift.py` (new)
  - Define `ParsedSwiftFile` dataclass: `path`, `module`, `tree`, `source`.
  - Implement `parse_swift_files(root_path, rel_paths)` using tree-sitter Swift.

Concrete parser patterns (tree-sitter JS/TS/TSX)
- Class
  - `class_declaration name: (identifier) @class.name`
  - `class_body (method_definition name: (property_identifier) @method.name)`
- Function
  - `function_declaration name: (identifier) @function.name`
- Arrow function (top-level)
  - `(variable_declarator name: (identifier) @function.name value: (arrow_function))`
- Import
  - `(import_statement source: (string) @import.path)`
  - CommonJS: `(call_expression function: (identifier) @call.name (#eq? @call.name "require") arguments: (arguments (string) @import.path))`
- Call
  - `(call_expression function: (identifier) @call.name)`
  - `(call_expression function: (member_expression object: (_) @call.object property: (property_identifier) @call.property))`
- Inheritance (TS)
  - Look for `class_heritage` children:
    - `extends_clause` with `identifier` or `type_identifier`
    - `implements_clause` with `type_identifier` list

Concrete parser patterns (tree-sitter Swift)
- Types
  - `(class_declaration name: (identifier) @class.name)`
  - `(struct_declaration name: (identifier) @struct.name)`
  - `(enum_declaration name: (identifier) @enum.name)`
  - `(protocol_declaration name: (identifier) @protocol.name)`
  - `(extension_declaration type_name: (type_identifier) @extension.name)`
- Functions
  - `(function_declaration name: (identifier) @function.name)`
- Import
  - `(import_declaration path: (import_path) @import.path)`
- Call
  - `(function_call_expression function: (_) @call.callee)`
  - `(member_expression base: (_) @call.object name: (identifier) @call.property)`
- Inheritance / conformance
  - `(type_inheritance_clause (type_identifier) @inherits.type)`

Note: verify node type names against your installed grammar by printing `node.type` during parsing. Adjust query node names if the grammar differs.

---

## Step 4 - Graph extraction for JS/TS
- [ ] `app/gitreader/graph_js.py` (new)
  - Build file nodes for each parsed file.
  - Extract class/function/method nodes.
  - Add edges:
    - `contains`: file -> class/function, class -> method.
    - `imports`: file -> imported module/file (best effort).
    - `inherits`: class -> base class / interface.
    - `calls`: function/method -> called symbol or external.
  - Provide a helper to resolve imported symbols to internal nodes when possible.

Concrete extraction mapping (JS/TS)
- `class_declaration` -> `kind="class"` node with `signature` from source segment.
- `method_definition` inside class body -> `kind="method"`.
- `function_declaration` or arrow function at top level -> `kind="function"`.
- `call_expression` -> `kind="calls"` edge from current function/method.
- `import_statement` -> `kind="imports"` edge from file node.

---

## Step 5 - Graph extraction for Swift
- [ ] `app/gitreader/graph_swift.py` (new)
  - Build file nodes.
  - Extract type nodes (class/struct/enum/protocol/extension).
  - Extract method nodes inside type bodies.
  - Add edges:
    - `contains`: file -> type/function, type -> method.
    - `imports`: file -> module.
    - `inherits`: type -> base class / protocol.
    - `calls`: function/method -> called symbol or external.

Concrete extraction mapping (Swift)
- `class_declaration` / `struct_declaration` / `enum_declaration` / `protocol_declaration` / `extension_declaration` -> type nodes.
- `function_declaration` inside type body -> `kind="method"`.
- `function_declaration` at top level -> `kind="function"`.
- `function_call_expression` -> `kind="calls"` edge from current function/method.
- `import_declaration` -> `kind="imports"` edge from file node.

---

## Step 6 - Integrate parsing + graph building
- [ ] `app/gitreader/service.py`
  - Parse Python + JS/TS + Swift based on `ScanResult` lists.
  - Call:
    - `build_graph(parsed_python.files)` (existing)
    - `build_graph_js(parsed_js.files)` (new)
    - `build_graph_swift(parsed_swift.files)` (new)
  - Merge node/edge dictionaries:
    - Node IDs must remain unique (`file:` and `symbol:` prefixes).
    - Prefer first writer for duplicates to avoid oscillation.
  - Build TOC from the full list of file paths (Python + JS/TS + Swift).

---

## Step 7 - Update model kinds (if adding new kinds)
- [ ] `app/gitreader/models.py`
  - Add new `SymbolNode.kind` values if you choose richer UI (e.g., `struct`, `enum`, `protocol`, `extension`, `interface`, `type`).
  - Keep `to_dict` unchanged; it will serialize the new kind strings.

---

## Step 8 - UI updates (canvas + reader)
- [ ] `app/static/gitreader/app.ts`
  - Extend `SymbolKind` union if adding new kinds.
  - Update `getKindBadge`, `getKindLabel`, and `getGraphStyles` to include new kinds.
  - Update legend labels if adding new kinds.
  - Highlight by file extension (see Step 9).
- [ ] `app/static/gitreader/app.js`
  - Mirror the TypeScript changes.
- [ ] `app/static/gitreader/styles.css`
  - Add styles for any new `kind` selectors and legend swatches.
- [ ] `app/templates/gitreader/index.html`
  - Update legend markup if new kinds are added.

---

## Step 9 - Reader syntax highlighting by extension
- [ ] `app/static/gitreader/app.ts`
  - Replace hardcoded `python` in `highlightSnippet` with a file-extension map:
    - `.js/.jsx` -> `javascript`
    - `.ts` -> `typescript`
    - `.tsx` -> `tsx` (fallback to `typescript`)
    - `.swift` -> `swift`
    - `.py` -> `python`
  - Use `hljs.getLanguage(lang)` to confirm support; fall back to `highlightAuto`.
- [ ] `app/static/gitreader/app.js`
  - Mirror the TypeScript changes.

---

## Step 10 - Manual verification checklist
- [ ] Load a JS/TS repo and confirm:
  - TOC shows JS/TS files.
  - Graph shows file + function/class nodes with `contains` edges.
  - Reader highlights JS/TS syntax.
- [ ] Load a SwiftUI repo and confirm:
  - TOC shows `.swift` files.
  - Graph shows type nodes with `contains` edges.
  - Reader highlights Swift syntax.
- [ ] Ensure Python behavior unchanged:
  - Flask repo still renders routes in TOC.
  - Graph + reader still work for Python files.
