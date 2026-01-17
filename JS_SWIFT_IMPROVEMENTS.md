# JS/TS + SwiftUI Support Improvements

## JavaScript / TypeScript
- Scope symbol maps by module to avoid cross-file name collisions.
- Support export-wrapped declarations (e.g., `export function`, `export class`, `export default`).
- Handle class expressions assigned to variables (e.g., `const Foo = class {}`).
- Expand import coverage: CommonJS `require`, `module.exports`, `exports.*`, and `export ... from`.
- Expand definition coverage: interfaces/types/enums/namespaces (TS), object literal methods, class fields.
- Expand call graph coverage: arrow functions in class fields, object literal methods, IIFEs.
- Support more extensions: `.mjs`, `.cjs`, `.mts`, `.cts`, `.d.ts` (opt-in).

## Swift / SwiftUI
- Scope symbol maps by module to avoid cross-file name collisions.
- Preserve Swift type kind (struct/enum/protocol/extension) without breaking existing UI.
- Detect SwiftUI entry points (`App`, `Scene`, `View`) and connect `body` composition nodes.
- Improve call resolution for SwiftUI-style initializers and chained modifiers.
- Merge extensions into the base type definition (avoid duplicate type nodes).

## Implementation started
- Module-scoped symbol maps for JS/TS and Swift (initial pass complete).
- JS/TS import/export: re-exports + CommonJS `require` scanning added.
- TS declarations: interface/type/enum/namespace nodes added.
- SwiftUI: View/App/Scene detection with body composition edges (initial).
