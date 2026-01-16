import os
from dataclasses import dataclass
from typing import Dict, List, Optional

from .models import GraphEdge, SourceLocation, SymbolNode, external_id, file_id, symbol_id
from .parse_js import ParsedJsFile


@dataclass
class GraphResult:
    nodes: Dict[str, SymbolNode]
    edges: List[GraphEdge]
    files: List[str]


def build_graph_js(parsed_files: List[ParsedJsFile]) -> GraphResult:
    nodes: Dict[str, SymbolNode] = {}
    edges: List[GraphEdge] = []
    files: List[str] = []

    file_paths = {parsed.path for parsed in parsed_files}
    symbols_by_name: Dict[str, str] = {}
    classes_by_name: Dict[str, str] = {}
    methods_by_class: Dict[str, Dict[str, str]] = {}

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
        _extract_definitions(parsed, nodes, edges, symbols_by_name, classes_by_name, methods_by_class)

    for parsed in parsed_files:
        _extract_imports(parsed, nodes, edges, file_paths)
        _extract_inheritance(parsed, nodes, edges, classes_by_name)
        _extract_calls(parsed, nodes, edges, symbols_by_name, classes_by_name, methods_by_class)

    return GraphResult(nodes=nodes, edges=edges, files=files)


def _extract_definitions(
    parsed: ParsedJsFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    symbols_by_name: Dict[str, str],
    classes_by_name: Dict[str, str],
    methods_by_class: Dict[str, Dict[str, str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    for child in root.children:
        if child.type == 'class_declaration':
            class_name = _node_name(child, source_bytes)
            if not class_name:
                continue
            class_id = symbol_id(f'{parsed.module}.{class_name}')
            nodes[class_id] = SymbolNode(
                id=class_id,
                name=class_name,
                kind='class',
                summary='',
                signature=_signature_from_node(child, source_bytes),
                location=_location_from_node(parsed.path, child),
                module=parsed.module,
            )
            classes_by_name[class_name] = class_id
            symbols_by_name[class_name] = class_id
            methods_by_class[class_name] = {}
            edges.append(GraphEdge(
                source=file_id(parsed.path),
                target=class_id,
                kind='contains',
                confidence='high',
            ))
            class_body = _child_by_type(child, 'class_body')
            if class_body:
                for item in class_body.children:
                    if item.type != 'method_definition':
                        continue
                    method_name = _node_name(item, source_bytes)
                    if not method_name:
                        continue
                    method_id = symbol_id(f'{parsed.module}.{class_name}.{method_name}')
                    nodes[method_id] = SymbolNode(
                        id=method_id,
                        name=method_name,
                        kind='method',
                        summary='',
                        signature=_signature_from_node(item, source_bytes),
                        location=_location_from_node(parsed.path, item),
                        module=parsed.module,
                    )
                    methods_by_class[class_name][method_name] = method_id
                    edges.append(GraphEdge(
                        source=class_id,
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
        elif child.type in {'lexical_declaration', 'variable_declaration'}:
            for declarator in child.children:
                if declarator.type != 'variable_declarator':
                    continue
                value = declarator.child_by_field_name('value')
                if value and value.type in {'arrow_function', 'function'}:
                    name_node = declarator.child_by_field_name('name')
                    func_name = _node_text(name_node, source_bytes) if name_node else ''
                    if not func_name:
                        continue
                    func_id = symbol_id(f'{parsed.module}.{func_name}')
                    nodes[func_id] = SymbolNode(
                        id=func_id,
                        name=func_name,
                        kind='function',
                        summary='',
                        signature=_signature_from_node(declarator, source_bytes),
                        location=_location_from_node(parsed.path, declarator),
                        module=parsed.module,
                    )
                    symbols_by_name[func_name] = func_id
                    edges.append(GraphEdge(
                        source=file_id(parsed.path),
                        target=func_id,
                        kind='contains',
                        confidence='high',
                    ))


def _extract_imports(
    parsed: ParsedJsFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    file_paths: set[str],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    base_dir = os.path.dirname(parsed.path)
    for child in root.children:
        if child.type != 'import_statement':
            continue
        source_node = child.child_by_field_name('source')
        raw = _node_text(source_node, source_bytes) if source_node else ''
        module_name = raw.strip('\'"')
        if not module_name:
            continue
        target_id = _resolve_import_target(module_name, base_dir, file_paths)
        edges.append(GraphEdge(
            source=file_id(parsed.path),
            target=target_id,
            kind='imports',
            confidence='medium' if target_id.startswith('file:') else 'low',
        ))


def _resolve_import_target(module_name: str, base_dir: str, file_paths: set[str]) -> str:
    if module_name.startswith('.'):
        normalized = os.path.normpath(os.path.join(base_dir, module_name)).replace(os.sep, '/')
        candidates = [
            normalized,
            f'{normalized}.js',
            f'{normalized}.jsx',
            f'{normalized}.ts',
            f'{normalized}.tsx',
            f'{normalized}/index.js',
            f'{normalized}/index.jsx',
            f'{normalized}/index.ts',
            f'{normalized}/index.tsx',
        ]
        for candidate in candidates:
            if candidate in file_paths:
                return file_id(candidate)
    return external_id(module_name)


def _extract_inheritance(
    parsed: ParsedJsFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    classes_by_name: Dict[str, str],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    for child in root.children:
        if child.type != 'class_declaration':
            continue
        class_name = _node_name(child, source_bytes)
        if not class_name:
            continue
        class_id = classes_by_name.get(class_name)
        heritage = _child_by_type(child, 'class_heritage')
        if not heritage or not class_id:
            continue
        for node in heritage.children:
            if node.type in {'extends_clause', 'implements_clause'}:
                for ident in node.children:
                    if ident.type not in {'identifier', 'type_identifier'}:
                        continue
                    base_name = _node_text(ident, source_bytes)
                    if not base_name:
                        continue
                    target_id = classes_by_name.get(base_name, external_id(base_name))
                    edges.append(GraphEdge(
                        source=class_id,
                        target=target_id,
                        kind='inherits',
                        confidence='medium' if target_id.startswith('symbol:') else 'low',
                    ))


def _extract_calls(
    parsed: ParsedJsFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    symbols_by_name: Dict[str, str],
    classes_by_name: Dict[str, str],
    methods_by_class: Dict[str, Dict[str, str]],
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
                _walk_calls(child, func_id, None, edges, symbols_by_name, classes_by_name, methods_by_class, source_bytes)
        elif child.type == 'class_declaration':
            class_name = _node_name(child, source_bytes)
            class_body = _child_by_type(child, 'class_body')
            if not class_body or not class_name:
                continue
            for item in class_body.children:
                if item.type != 'method_definition':
                    continue
                method_name = _node_name(item, source_bytes)
                method_id = methods_by_class.get(class_name, {}).get(method_name)
                if method_id:
                    _walk_calls(item, method_id, class_name, edges, symbols_by_name, classes_by_name, methods_by_class, source_bytes)


def _walk_calls(
    node: object,
    source_id: str,
    current_class: Optional[str],
    edges: List[GraphEdge],
    symbols_by_name: Dict[str, str],
    classes_by_name: Dict[str, str],
    methods_by_class: Dict[str, Dict[str, str]],
    source_bytes: bytes,
) -> None:
    stack = [node]
    while stack:
        current = stack.pop()
        if getattr(current, "type", None) == 'call_expression':
            func_node = current.child_by_field_name('function')
            target_id, confidence = _resolve_call_target(
                func_node,
                current_class,
                symbols_by_name,
                classes_by_name,
                methods_by_class,
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
    func_node: Optional[object],
    current_class: Optional[str],
    symbols_by_name: Dict[str, str],
    classes_by_name: Dict[str, str],
    methods_by_class: Dict[str, Dict[str, str]],
    source_bytes: bytes,
) -> tuple[Optional[str], str]:
    if not func_node:
        return None, 'low'
    if func_node.type == 'identifier':
        name = _node_text(func_node, source_bytes)
        if not name:
            return None, 'low'
        target_id = symbols_by_name.get(name)
        if target_id:
            return target_id, 'high'
        return external_id(name), 'low'
    if func_node.type == 'member_expression':
        obj = func_node.child_by_field_name('object')
        prop = func_node.child_by_field_name('property')
        prop_name = _node_text(prop, source_bytes) if prop else ''
        if not prop_name:
            return None, 'low'
        if obj and obj.type in {'this', 'super'} and current_class:
            method_id = methods_by_class.get(current_class, {}).get(prop_name)
            if method_id:
                return method_id, 'medium'
        if obj and obj.type == 'identifier':
            obj_name = _node_text(obj, source_bytes)
            if obj_name in classes_by_name:
                method_id = methods_by_class.get(obj_name, {}).get(prop_name)
                if method_id:
                    return method_id, 'medium'
            return external_id(f'{obj_name}.{prop_name}'), 'low'
        return external_id(prop_name), 'low'
    return None, 'low'


def _child_by_type(node: object, node_type: str) -> Optional[object]:
    for child in getattr(node, "children", []) or []:
        if child.type == node_type:
            return child
    return None


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
