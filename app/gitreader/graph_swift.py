from dataclasses import dataclass
from typing import Dict, List, Optional

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


def build_graph_swift(parsed_files: List[ParsedSwiftFile]) -> GraphResult:
    nodes: Dict[str, SymbolNode] = {}
    edges: List[GraphEdge] = []
    files: List[str] = []

    types_by_name: Dict[str, str] = {}
    methods_by_type: Dict[str, Dict[str, str]] = {}
    symbols_by_name: Dict[str, str] = {}

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

    for parsed in parsed_files:
        _extract_definitions(parsed, nodes, edges, types_by_name, methods_by_type, symbols_by_name)

    for parsed in parsed_files:
        _extract_imports(parsed, edges)
        _extract_inheritance(parsed, nodes, edges, types_by_name)
        _extract_calls(parsed, edges, symbols_by_name, types_by_name, methods_by_type)

    return GraphResult(nodes=nodes, edges=edges, files=files)


def _extract_definitions(
    parsed: ParsedSwiftFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    types_by_name: Dict[str, str],
    methods_by_type: Dict[str, Dict[str, str]],
    symbols_by_name: Dict[str, str],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    for child in root.children:
        if child.type in TYPE_NODES:
            type_name = _type_name(child, source_bytes)
            if not type_name:
                continue
            type_id = types_by_name.get(type_name)
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
                types_by_name[type_name] = type_id
                symbols_by_name[type_name] = type_id
                methods_by_type[type_name] = {}
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
                methods_by_type[type_name][method_name] = method_id
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
            symbols_by_name[func_name] = func_id
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


def _extract_imports(parsed: ParsedSwiftFile, edges: List[GraphEdge]) -> None:
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
        edges.append(GraphEdge(
            source=file_id(parsed.path),
            target=external_id(module_name),
            kind='imports',
            confidence='low',
        ))


def _extract_inheritance(
    parsed: ParsedSwiftFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    types_by_name: Dict[str, str],
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
        type_id = types_by_name.get(type_name)
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
            target_id = types_by_name.get(base_name, external_id(base_name))
            edges.append(GraphEdge(
                source=type_id,
                target=target_id,
                kind='inherits',
                confidence='medium' if target_id.startswith('symbol:') else 'low',
            ))


def _extract_calls(
    parsed: ParsedSwiftFile,
    edges: List[GraphEdge],
    symbols_by_name: Dict[str, str],
    types_by_name: Dict[str, str],
    methods_by_type: Dict[str, Dict[str, str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    for child in root.children:
        if child.type == 'function_declaration':
            func_name = _node_name(child, source_bytes)
            func_id = symbols_by_name.get(func_name)
            if func_id:
                _walk_calls(child, func_id, None, edges, symbols_by_name, types_by_name, methods_by_type, source_bytes)
        elif child.type in TYPE_NODES:
            type_name = _type_name(child, source_bytes)
            if not type_name:
                continue
            for fn_node in _direct_function_decls(child):
                method_name = _node_name(fn_node, source_bytes)
                method_id = methods_by_type.get(type_name, {}).get(method_name)
                if method_id:
                    _walk_calls(fn_node, method_id, type_name, edges, symbols_by_name, types_by_name, methods_by_type, source_bytes)


def _walk_calls(
    node: object,
    source_id: str,
    current_type: Optional[str],
    edges: List[GraphEdge],
    symbols_by_name: Dict[str, str],
    types_by_name: Dict[str, str],
    methods_by_type: Dict[str, Dict[str, str]],
    source_bytes: bytes,
) -> None:
    stack = [node]
    while stack:
        current = stack.pop()
        if getattr(current, "type", None) == 'function_call_expression':
            callee = current.child_by_field_name('function') or current.child_by_field_name('called_expression')
            target_id, confidence = _resolve_call_target(
                callee,
                current_type,
                symbols_by_name,
                types_by_name,
                methods_by_type,
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
    current_type: Optional[str],
    symbols_by_name: Dict[str, str],
    types_by_name: Dict[str, str],
    methods_by_type: Dict[str, Dict[str, str]],
    source_bytes: bytes,
) -> tuple[Optional[str], str]:
    if not callee:
        return None, 'low'
    if callee.type == 'identifier':
        name = _node_text(callee, source_bytes)
        if not name:
            return None, 'low'
        target_id = symbols_by_name.get(name)
        if target_id:
            return target_id, 'medium'
        return external_id(name), 'low'
    if callee.type == 'member_expression':
        obj = callee.child_by_field_name('base') or callee.child_by_field_name('object')
        prop = callee.child_by_field_name('name') or callee.child_by_field_name('property')
        prop_name = _node_text(prop, source_bytes) if prop else ''
        if not prop_name:
            return None, 'low'
        if obj and obj.type == 'identifier':
            obj_name = _node_text(obj, source_bytes)
            if obj_name in types_by_name:
                method_id = methods_by_type.get(obj_name, {}).get(prop_name)
                if method_id:
                    return method_id, 'medium'
            return external_id(f'{obj_name}.{prop_name}'), 'low'
        if current_type:
            method_id = methods_by_type.get(current_type, {}).get(prop_name)
            if method_id:
                return method_id, 'medium'
        return external_id(prop_name), 'low'
    return None, 'low'


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
