from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from .models import GraphEdge, SourceLocation, SymbolNode, external_id, file_id, symbol_id
from .parse_swift import ParsedSwiftFile


@dataclass
class GraphResult:
    nodes: Dict[str, SymbolNode]
    edges: List[GraphEdge]
    files: List[str]


TYPE_NODES = {
    'class_declaration',
    'struct_declaration',
    'enum_declaration',
    'protocol_declaration',
    'extension_declaration',
}

SWIFTUI_PROTOCOLS = {'View', 'App', 'Scene'}
SWIFTUI_MODIFIERS = {
    'accessibilityHint',
    'accessibilityLabel',
    'alert',
    'animation',
    'background',
    'badge',
    'bold',
    'border',
    'buttonStyle',
    'clipShape',
    'confirmationDialog',
    'contextMenu',
    'cornerRadius',
    'environment',
    'environmentObject',
    'foregroundColor',
    'foregroundStyle',
    'font',
    'fontWeight',
    'frame',
    'fullScreenCover',
    'gesture',
    'help',
    'hidden',
    'id',
    'italic',
    'keyboardShortcut',
    'lineLimit',
    'listStyle',
    'mask',
    'navigationBarTitle',
    'navigationBarTitleDisplayMode',
    'navigationDestination',
    'navigationTitle',
    'offset',
    'onAppear',
    'onDisappear',
    'onLongPressGesture',
    'onTapGesture',
    'opacity',
    'overlay',
    'padding',
    'pickerStyle',
    'position',
    'rotationEffect',
    'safeAreaInset',
    'scaleEffect',
    'shadow',
    'sheet',
    'tabViewStyle',
    'textFieldStyle',
    'toggleStyle',
    'toolbar',
    'transition',
    'underline',
}


def build_graph_swift(parsed_files: List[ParsedSwiftFile]) -> GraphResult:
    nodes: Dict[str, SymbolNode] = {}
    edges: List[GraphEdge] = []
    files: List[str] = []

    types_by_module: Dict[str, Dict[str, str]] = {}
    symbols_by_module: Dict[str, Dict[str, str]] = {}
    methods_by_type: Dict[Tuple[str, str], Dict[str, str]] = {}
    types_by_name: Dict[str, Set[str]] = {}
    symbols_by_name: Dict[str, Set[str]] = {}

    for parsed in parsed_files:
        file_node = SymbolNode(
            id=file_id(parsed.path),
            name=parsed.path,
            kind='file',
            summary='',
            module=parsed.module,
            location=SourceLocation(path=parsed.path),
        )
        nodes[file_node.id] = file_node
        files.append(parsed.path)
        types_by_module.setdefault(parsed.module, {})
        symbols_by_module.setdefault(parsed.module, {})

    for parsed in parsed_files:
        _extract_definitions(
            parsed,
            nodes,
            edges,
            types_by_module,
            symbols_by_module,
            methods_by_type,
            types_by_name,
            symbols_by_name,
        )

    swiftui_types_by_module = _collect_swiftui_conformance(parsed_files)

    for parsed in parsed_files:
        _extract_imports(parsed, nodes, edges)
        _extract_inheritance(parsed, nodes, edges, types_by_module, types_by_name)
        _extract_calls(
            parsed,
            nodes,
            edges,
            symbols_by_module,
            types_by_module,
            methods_by_type,
            symbols_by_name,
            types_by_name,
        )
        _extract_swiftui_composition(parsed, nodes, edges, types_by_module, swiftui_types_by_module)

    return GraphResult(nodes=nodes, edges=edges, files=files)


def _extract_definitions(
    parsed: ParsedSwiftFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    types_by_module: Dict[str, Dict[str, str]],
    symbols_by_module: Dict[str, Dict[str, str]],
    methods_by_type: Dict[Tuple[str, str], Dict[str, str]],
    types_by_name: Dict[str, Set[str]],
    symbols_by_name: Dict[str, Set[str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    module_types = types_by_module.get(parsed.module, {})
    module_symbols = symbols_by_module.get(parsed.module, {})
    for child in root.children:
        if child.type in TYPE_NODES:
            type_name = _type_name(child, source_bytes)
            if not type_name:
                continue
            type_id = module_types.get(type_name)
            if not type_id:
                type_id = symbol_id(f'{parsed.module}.{type_name}')
                nodes[type_id] = SymbolNode(
                    id=type_id,
                    name=type_name,
                    kind='class',
                    summary='',
                    signature=_signature_from_node(child, source_bytes),
                    location=_location_from_node(parsed.path, child),
                    module=parsed.module,
                )
                module_types[type_name] = type_id
                module_symbols[type_name] = type_id
                types_by_name.setdefault(type_name, set()).add(type_id)
                symbols_by_name.setdefault(type_name, set()).add(type_id)
                methods_by_type[(parsed.module, type_name)] = {}
                edges.append(GraphEdge(
                    source=file_id(parsed.path),
                    target=type_id,
                    kind='contains',
                    confidence='high',
                ))
            for fn_node in _direct_function_decls(child):
                method_name = _node_name(fn_node, source_bytes)
                if not method_name:
                    continue
                method_id = symbol_id(f'{parsed.module}.{type_name}.{method_name}')
                nodes[method_id] = SymbolNode(
                    id=method_id,
                    name=method_name,
                    kind='method',
                    summary='',
                    signature=_signature_from_node(fn_node, source_bytes),
                    location=_location_from_node(parsed.path, fn_node),
                    module=parsed.module,
                )
                methods_by_type[(parsed.module, type_name)][method_name] = method_id
                edges.append(GraphEdge(
                    source=type_id,
                    target=method_id,
                    kind='contains',
                    confidence='high',
                ))
        elif child.type == 'function_declaration':
            func_name = _node_name(child, source_bytes)
            if not func_name:
                continue
            func_id = symbol_id(f'{parsed.module}.{func_name}')
            nodes[func_id] = SymbolNode(
                id=func_id,
                name=func_name,
                kind='function',
                summary='',
                signature=_signature_from_node(child, source_bytes),
                location=_location_from_node(parsed.path, child),
                module=parsed.module,
            )
            module_symbols[func_name] = func_id
            symbols_by_name.setdefault(func_name, set()).add(func_id)
            edges.append(GraphEdge(
                source=file_id(parsed.path),
                target=func_id,
                kind='contains',
                confidence='high',
            ))


def _direct_function_decls(node: object) -> List[object]:
    candidates: List[object] = []
    for child in getattr(node, "children", []) or []:
        if child.type == 'function_declaration':
            candidates.append(child)
        if child.type in {'member_declaration_list', 'class_body', 'struct_body', 'enum_body', 'protocol_body', 'extension_body'}:
            for item in getattr(child, "children", []) or []:
                if item.type == 'function_declaration':
                    candidates.append(item)
                for nested in getattr(item, "children", []) or []:
                    if nested.type == 'function_declaration':
                        candidates.append(nested)
    return candidates


def _extract_imports(parsed: ParsedSwiftFile, nodes: Dict[str, SymbolNode], edges: List[GraphEdge]) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    for child in root.children:
        if child.type != 'import_declaration':
            continue
        path_node = child.child_by_field_name('path') or _first_named_child(child, 'import_path')
        module_name = _node_text(path_node, source_bytes).strip()
        if not module_name:
            continue
        target_id = _ensure_external(nodes, module_name)
        edges.append(GraphEdge(
            source=file_id(parsed.path),
            target=target_id,
            kind='imports',
            confidence='low',
        ))


def _extract_inheritance(
    parsed: ParsedSwiftFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    types_by_module: Dict[str, Dict[str, str]],
    types_by_name: Dict[str, Set[str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    for child in root.children:
        if child.type not in TYPE_NODES:
            continue
        type_name = _type_name(child, source_bytes)
        if not type_name:
            continue
        type_id = types_by_module.get(parsed.module, {}).get(type_name)
        if not type_id:
            continue
        inheritance = _first_named_child(child, 'type_inheritance_clause')
        if not inheritance:
            continue
        for node in getattr(inheritance, "children", []) or []:
            if node.type != 'type_identifier':
                continue
            base_name = _node_text(node, source_bytes)
            if not base_name:
                continue
            target_id = types_by_module.get(parsed.module, {}).get(base_name)
            if not target_id:
                target_id = _resolve_unique_symbol(base_name, types_by_name)
            if not target_id:
                target_id = _ensure_external(nodes, base_name)
            edges.append(GraphEdge(
                source=type_id,
                target=target_id,
                kind='inherits',
                confidence='medium' if target_id.startswith('symbol:') else 'low',
            ))


def _extract_calls(
    parsed: ParsedSwiftFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    symbols_by_module: Dict[str, Dict[str, str]],
    types_by_module: Dict[str, Dict[str, str]],
    methods_by_type: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    types_by_name: Dict[str, Set[str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    module_symbols = symbols_by_module.get(parsed.module, {})
    module_types = types_by_module.get(parsed.module, {})
    for child in root.children:
        if child.type == 'function_declaration':
            func_name = _node_name(child, source_bytes)
            func_id = module_symbols.get(func_name)
            if func_id:
                _walk_calls(
                    child,
                    func_id,
                    parsed.module,
                    None,
                    nodes,
                    edges,
                    module_symbols,
                    module_types,
                    methods_by_type,
                    symbols_by_name,
                    types_by_name,
                    source_bytes,
                )
        elif child.type in TYPE_NODES:
            type_name = _type_name(child, source_bytes)
            if not type_name:
                continue
            for fn_node in _direct_function_decls(child):
                method_name = _node_name(fn_node, source_bytes)
                method_id = methods_by_type.get((parsed.module, type_name), {}).get(method_name)
                if method_id:
                    _walk_calls(
                        fn_node,
                        method_id,
                        parsed.module,
                        type_name,
                        nodes,
                        edges,
                        module_symbols,
                        module_types,
                        methods_by_type,
                        symbols_by_name,
                        types_by_name,
                        source_bytes,
                    )


def _extract_swiftui_composition(
    parsed: ParsedSwiftFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    types_by_module: Dict[str, Dict[str, str]],
    swiftui_types_by_module: Dict[str, Set[str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    module_types = types_by_module.get(parsed.module, {})
    module_swiftui_types = swiftui_types_by_module.get(parsed.module, set())
    for child in root.children:
        if child.type not in TYPE_NODES:
            continue
        type_name = _type_name(child, source_bytes)
        if not type_name:
            continue
        type_id = module_types.get(type_name)
        if not type_id:
            continue
        if not _is_swiftui_type(child, source_bytes) and type_name not in module_swiftui_types:
            continue
        body_node = _find_swiftui_body(child, source_bytes)
        if not body_node:
            continue
        view_names, modifier_names = _collect_swiftui_views(body_node, source_bytes)
        if not view_names and not modifier_names:
            continue
        for view_name in sorted(view_names):
            target_id = _ensure_external(nodes, view_name)
            edges.append(GraphEdge(
                source=type_id,
                target=target_id,
                kind='contains',
                confidence='low',
            ))
        for modifier_name in sorted(modifier_names):
            target_id = _ensure_external(nodes, f'modifier:{modifier_name}')
            edges.append(GraphEdge(
                source=type_id,
                target=target_id,
                kind='contains',
                confidence='low',
            ))


def _collect_swiftui_conformance(parsed_files: List[ParsedSwiftFile]) -> Dict[str, Set[str]]:
    swiftui_types_by_module: Dict[str, Set[str]] = {}
    for parsed in parsed_files:
        swiftui_types_by_module.setdefault(parsed.module, set())
        if not parsed.tree:
            continue
        source_bytes = parsed.source.encode('utf-8')
        for child in parsed.tree.root_node.children:
            if child.type not in TYPE_NODES:
                continue
            type_name = _type_name(child, source_bytes)
            if not type_name:
                continue
            if _is_swiftui_type(child, source_bytes):
                swiftui_types_by_module[parsed.module].add(type_name)
    return swiftui_types_by_module


def _is_swiftui_type(node: object, source_bytes: bytes) -> bool:
    inheritance = _first_named_child(node, 'type_inheritance_clause')
    if not inheritance:
        return False
    for child in getattr(inheritance, "children", []) or []:
        if child.type != 'type_identifier':
            continue
        base_name = _node_text(child, source_bytes)
        if base_name in SWIFTUI_PROTOCOLS:
            return True
    return False


def _find_swiftui_body(node: object, source_bytes: bytes) -> Optional[object]:
    stack = [node]
    while stack:
        current = stack.pop()
        if getattr(current, "type", None) == 'variable_declaration':
            if _contains_identifier(current, 'body', source_bytes):
                code_block = _find_first_child(current, 'code_block')
                if code_block:
                    return code_block
                initializer = current.child_by_field_name('value') or current.child_by_field_name('initializer')
                if initializer:
                    return initializer
        for child in getattr(current, "children", []) or []:
            stack.append(child)
    return None


def _collect_swiftui_views(node: object, source_bytes: bytes) -> Tuple[Set[str], Set[str]]:
    view_names: Set[str] = set()
    modifier_names: Set[str] = set()
    stack = [node]
    while stack:
        current = stack.pop()
        if getattr(current, "type", None) == 'function_call_expression':
            callee = current.child_by_field_name('function') or current.child_by_field_name('called_expression')
            name = _swiftui_view_name(callee, source_bytes)
            if name:
                view_names.add(name)
            modifier = _swiftui_modifier_name(callee, source_bytes)
            if modifier:
                modifier_names.add(modifier)
        for child in getattr(current, "children", []) or []:
            stack.append(child)
    return view_names, modifier_names


def _swiftui_view_name(callee: Optional[object], source_bytes: bytes) -> Optional[str]:
    if not callee:
        return None
    if callee.type == 'identifier':
        name = _node_text(callee, source_bytes)
        if name[:1].isupper():
            return name
        return None
    if callee.type == 'member_expression':
        prop = callee.child_by_field_name('name') or callee.child_by_field_name('property')
        prop_name = _node_text(prop, source_bytes) if prop else ''
        if prop_name[:1].isupper():
            return prop_name
    return None


def _swiftui_modifier_name(callee: Optional[object], source_bytes: bytes) -> Optional[str]:
    if not callee or callee.type != 'member_expression':
        return None
    prop = callee.child_by_field_name('name') or callee.child_by_field_name('property')
    prop_name = _node_text(prop, source_bytes) if prop else ''
    if not prop_name:
        return None
    if prop_name in SWIFTUI_MODIFIERS:
        return prop_name
    if not prop_name[:1].islower():
        return None
    candidates: List[object] = []
    for field_name in ('expression', 'object', 'value', 'target', 'operand'):
        base = callee.child_by_field_name(field_name)
        if base:
            candidates.append(base)
    if not candidates:
        for child in getattr(callee, "children", []) or []:
            if prop and child == prop:
                continue
            candidates.append(child)
    for base in candidates:
        if _expression_contains_view_call(base, source_bytes):
            return prop_name
    return None


def _expression_contains_view_call(node: Optional[object], source_bytes: bytes) -> bool:
    if not node:
        return False
    stack = [node]
    while stack:
        current = stack.pop()
        if getattr(current, "type", None) == 'function_call_expression':
            callee = current.child_by_field_name('function') or current.child_by_field_name('called_expression')
            if _swiftui_view_name(callee, source_bytes):
                return True
        for child in getattr(current, "children", []) or []:
            stack.append(child)
    return False


def _contains_identifier(node: object, name: str, source_bytes: bytes) -> bool:
    for child in getattr(node, "children", []) or []:
        if child.type == 'identifier' and _node_text(child, source_bytes) == name:
            return True
        if _contains_identifier(child, name, source_bytes):
            return True
    return False


def _find_first_child(node: object, child_type: str) -> Optional[object]:
    for child in getattr(node, "children", []) or []:
        if child.type == child_type:
            return child
        found = _find_first_child(child, child_type)
        if found:
            return found
    return None


def _walk_calls(
    node: object,
    source_id: str,
    module_name: str,
    current_type: Optional[str],
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    module_symbols: Dict[str, str],
    module_types: Dict[str, str],
    methods_by_type: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    types_by_name: Dict[str, Set[str]],
    source_bytes: bytes,
) -> None:
    stack = [node]
    while stack:
        current = stack.pop()
        if getattr(current, "type", None) == 'function_call_expression':
            callee = current.child_by_field_name('function') or current.child_by_field_name('called_expression')
            target_id, confidence = _resolve_call_target(
                callee,
                module_name,
                current_type,
                nodes,
                module_symbols,
                module_types,
                methods_by_type,
                symbols_by_name,
                types_by_name,
                source_bytes,
            )
            if target_id:
                edges.append(GraphEdge(
                    source=source_id,
                    target=target_id,
                    kind='calls',
                    confidence=confidence,
                ))
        for child in getattr(current, "children", []) or []:
            stack.append(child)


def _resolve_call_target(
    callee: Optional[object],
    module_name: str,
    current_type: Optional[str],
    nodes: Dict[str, SymbolNode],
    module_symbols: Dict[str, str],
    module_types: Dict[str, str],
    methods_by_type: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    types_by_name: Dict[str, Set[str]],
    source_bytes: bytes,
) -> tuple[Optional[str], str]:
    if not callee:
        return None, 'low'
    if callee.type == 'identifier':
        name = _node_text(callee, source_bytes)
        if not name:
            return None, 'low'
        target_id = module_symbols.get(name)
        if target_id:
            return target_id, 'medium'
        unique_symbol = _resolve_unique_symbol(name, symbols_by_name)
        if unique_symbol:
            return unique_symbol, 'medium'
        return _ensure_external(nodes, name), 'low'
    if callee.type == 'member_expression':
        obj = callee.child_by_field_name('base') or callee.child_by_field_name('object')
        prop = callee.child_by_field_name('name') or callee.child_by_field_name('property')
        prop_name = _node_text(prop, source_bytes) if prop else ''
        if not prop_name:
            return None, 'low'
        if obj and obj.type == 'identifier':
            obj_name = _node_text(obj, source_bytes)
            type_id = module_types.get(obj_name)
            if type_id:
                method_id = methods_by_type.get((module_name, obj_name), {}).get(prop_name)
                if method_id:
                    return method_id, 'medium'
            type_id = _resolve_unique_symbol(obj_name, types_by_name)
            if type_id:
                type_node = nodes.get(type_id)
                type_module = type_node.module if type_node else module_name
                type_name = type_node.name if type_node else obj_name
                method_id = methods_by_type.get((type_module or '', type_name), {}).get(prop_name)
                if method_id:
                    return method_id, 'medium'
            return _ensure_external(nodes, f'{obj_name}.{prop_name}'), 'low'
        if current_type:
            method_id = methods_by_type.get((module_name, current_type), {}).get(prop_name)
            if method_id:
                return method_id, 'medium'
        return _ensure_external(nodes, prop_name), 'low'
    return None, 'low'


def _resolve_unique_symbol(name: str, symbol_map: Dict[str, Set[str]]) -> Optional[str]:
    candidates = symbol_map.get(name)
    if not candidates or len(candidates) != 1:
        return None
    return next(iter(candidates))


def _type_name(node: object, source_bytes: bytes) -> str:
    for field_name in ('name', 'type_name', 'extended_type'):
        field = node.child_by_field_name(field_name)
        if field:
            return _node_text(field, source_bytes)
    return _node_name(node, source_bytes)


def _node_name(node: object, source_bytes: bytes) -> str:
    name_node = node.child_by_field_name('name')
    if not name_node:
        return ''
    return _node_text(name_node, source_bytes)


def _signature_from_node(node: object, source_bytes: bytes) -> Optional[str]:
    text = _node_text(node, source_bytes)
    if not text:
        return None
    first_line = text.strip().splitlines()[0].strip()
    if first_line.endswith('{'):
        return first_line[:-1].rstrip()
    return first_line


def _first_named_child(node: object, child_type: str) -> Optional[object]:
    for child in getattr(node, "children", []) or []:
        if child.type == child_type:
            return child
    return None


def _node_text(node: Optional[object], source_bytes: bytes) -> str:
    if not node:
        return ''
    try:
        return source_bytes[node.start_byte:node.end_byte].decode('utf-8', errors='replace')
    except Exception:
        return ''


def _ensure_external(nodes: Dict[str, SymbolNode], name: str) -> str:
    node_id = external_id(name)
    if node_id not in nodes:
        nodes[node_id] = SymbolNode(
            id=node_id,
            name=name,
            kind='external',
            summary='External symbol',
        )
    return node_id


def _location_from_node(path: str, node: object) -> SourceLocation:
    start_row, start_col = getattr(node, 'start_point', (0, 0))
    end_row, end_col = getattr(node, 'end_point', (0, 0))
    return SourceLocation(
        path=path,
        start_line=(start_row or 0) + 1,
        end_line=(end_row or 0) + 1,
        start_col=(start_col or 0),
        end_col=(end_col or 0),
    )
