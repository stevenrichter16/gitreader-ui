import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from .models import GraphEdge, SourceLocation, SymbolNode, external_id, file_id, symbol_id
from .parse_js import ParsedJsFile


@dataclass
class GraphResult:
    nodes: Dict[str, SymbolNode]
    edges: List[GraphEdge]
    files: List[str]

TS_TYPE_NODES = {
    'interface_declaration',
    'type_alias_declaration',
    'enum_declaration',
    'namespace_declaration',
    'module_declaration',
    'internal_module',
}


def build_graph_js(parsed_files: List[ParsedJsFile]) -> GraphResult:
    nodes: Dict[str, SymbolNode] = {}
    edges: List[GraphEdge] = []
    files: List[str] = []

    file_paths = {parsed.path for parsed in parsed_files}
    symbols_by_module: Dict[str, Dict[str, str]] = {}
    classes_by_module: Dict[str, Dict[str, str]] = {}
    methods_by_class: Dict[Tuple[str, str], Dict[str, str]] = {}
    symbols_by_name: Dict[str, Set[str]] = {}
    classes_by_name: Dict[str, Set[str]] = {}

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
        symbols_by_module.setdefault(parsed.module, {})
        classes_by_module.setdefault(parsed.module, {})

    for parsed in parsed_files:
        _extract_definitions(
            parsed,
            nodes,
            edges,
            symbols_by_module,
            classes_by_module,
            methods_by_class,
            symbols_by_name,
            classes_by_name,
        )

    for parsed in parsed_files:
        _extract_imports(parsed, nodes, edges, file_paths)
        _extract_inheritance(parsed, nodes, edges, classes_by_module, classes_by_name)
        _extract_calls(
            parsed,
            nodes,
            edges,
            symbols_by_module,
            classes_by_module,
            methods_by_class,
            symbols_by_name,
            classes_by_name,
        )

    return GraphResult(nodes=nodes, edges=edges, files=files)


def _extract_definitions(
    parsed: ParsedJsFile,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    symbols_by_module: Dict[str, Dict[str, str]],
    classes_by_module: Dict[str, Dict[str, str]],
    methods_by_class: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    classes_by_name: Dict[str, Set[str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    module_symbols = symbols_by_module.get(parsed.module, {})
    module_classes = classes_by_module.get(parsed.module, {})
    for child in _iter_root_declarations(root):
        if child.type == 'class_declaration':
            class_name = _node_name(child, source_bytes)
            if class_name:
                _register_class(
                    parsed,
                    child,
                    class_name,
                    nodes,
                    edges,
                    module_symbols,
                    module_classes,
                    methods_by_class,
                    symbols_by_name,
                    classes_by_name,
                    source_bytes,
                )
        elif child.type in TS_TYPE_NODES:
            type_name = _node_name(child, source_bytes)
            if not type_name:
                continue
            _register_type_like(
                parsed,
                child,
                type_name,
                nodes,
                edges,
                module_symbols,
                module_classes,
                symbols_by_name,
                classes_by_name,
                source_bytes,
            )
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
        elif child.type in {'lexical_declaration', 'variable_declaration'}:
            for declarator in child.children:
                if declarator.type != 'variable_declarator':
                    continue
                value = declarator.child_by_field_name('value')
                name_node = declarator.child_by_field_name('name')
                symbol_name = _node_text(name_node, source_bytes) if name_node else ''
                if not symbol_name:
                    continue
                if value and value.type in {'arrow_function', 'function'}:
                    func_id = symbol_id(f'{parsed.module}.{symbol_name}')
                    nodes[func_id] = SymbolNode(
                        id=func_id,
                        name=symbol_name,
                        kind='function',
                        summary='',
                        signature=_signature_from_node(declarator, source_bytes),
                        location=_location_from_node(parsed.path, declarator),
                        module=parsed.module,
                    )
                    module_symbols[symbol_name] = func_id
                    symbols_by_name.setdefault(symbol_name, set()).add(func_id)
                    edges.append(GraphEdge(
                        source=file_id(parsed.path),
                        target=func_id,
                        kind='contains',
                        confidence='high',
                    ))
                elif value and value.type in {'class', 'class_declaration', 'class_expression'}:
                    _register_class(
                        parsed,
                        value,
                        symbol_name,
                        nodes,
                        edges,
                        module_symbols,
                        module_classes,
                        methods_by_class,
                        symbols_by_name,
                        classes_by_name,
                        source_bytes,
                    )


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
    seen: Set[tuple[str, str]] = set()

    def record_import(module_name: str) -> None:
        if not module_name:
            return
        target_id = _resolve_import_target(module_name, base_dir, file_paths)
        key = (file_id(parsed.path), target_id)
        if key in seen:
            return
        seen.add(key)
        edges.append(GraphEdge(
            source=key[0],
            target=key[1],
            kind='imports',
            confidence='medium' if target_id.startswith('file:') else 'low',
        ))

    for child in root.children:
        if child.type == 'import_statement':
            source_node = child.child_by_field_name('source')
            raw = _node_text(source_node, source_bytes) if source_node else ''
            record_import(_strip_quotes(raw))
        elif child.type in {'export_statement', 'export_named_declaration', 'export_all_statement'}:
            source_node = child.child_by_field_name('source')
            raw = _node_text(source_node, source_bytes) if source_node else ''
            record_import(_strip_quotes(raw))

    stack = [root]
    while stack:
        current = stack.pop()
        if getattr(current, 'type', None) == 'call_expression':
            func_node = current.child_by_field_name('function')
            if func_node and func_node.type == 'identifier' and _node_text(func_node, source_bytes) == 'require':
                args = current.child_by_field_name('arguments') or _child_by_type(current, 'arguments')
                arg_node = _first_named_child(args)
                record_import(_string_literal_value(arg_node, source_bytes))
        elif getattr(current, 'type', None) in {'import_call', 'import_expression'}:
            arg_node = current.child_by_field_name('argument') or _first_named_child(current)
            record_import(_string_literal_value(arg_node, source_bytes))
        for child in getattr(current, 'children', []) or []:
            stack.append(child)


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
    classes_by_module: Dict[str, Dict[str, str]],
    classes_by_name: Dict[str, Set[str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    for child in _iter_root_declarations(root):
        if child.type != 'class_declaration':
            continue
        class_name = _node_name(child, source_bytes)
        if not class_name:
            continue
        class_id = classes_by_module.get(parsed.module, {}).get(class_name)
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
                    target_id = classes_by_module.get(parsed.module, {}).get(base_name)
                    if not target_id:
                        target_id = _resolve_unique_symbol(base_name, classes_by_name) or external_id(base_name)
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
    symbols_by_module: Dict[str, Dict[str, str]],
    classes_by_module: Dict[str, Dict[str, str]],
    methods_by_class: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    classes_by_name: Dict[str, Set[str]],
) -> None:
    if not parsed.tree:
        return
    root = parsed.tree.root_node
    source_bytes = parsed.source.encode('utf-8')
    module_symbols = symbols_by_module.get(parsed.module, {})
    module_classes = classes_by_module.get(parsed.module, {})
    for child in _iter_root_declarations(root):
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
                    module_classes,
                    methods_by_class,
                    symbols_by_name,
                    classes_by_name,
                    source_bytes,
                )
        elif child.type == 'class_declaration':
            class_name = _node_name(child, source_bytes)
            _walk_class_methods(
                parsed,
                child,
                class_name,
                nodes,
                edges,
                module_symbols,
                module_classes,
                methods_by_class,
                symbols_by_name,
                classes_by_name,
                source_bytes,
            )
        elif child.type in {'lexical_declaration', 'variable_declaration'}:
            for declarator in child.children:
                if declarator.type != 'variable_declarator':
                    continue
                name_node = declarator.child_by_field_name('name')
                symbol_name = _node_text(name_node, source_bytes) if name_node else ''
                if not symbol_name:
                    continue
                value = declarator.child_by_field_name('value')
                if value and value.type in {'arrow_function', 'function'}:
                    func_id = module_symbols.get(symbol_name)
                    if func_id:
                        _walk_calls(
                            value,
                            func_id,
                            parsed.module,
                            None,
                            nodes,
                            edges,
                            module_symbols,
                            module_classes,
                            methods_by_class,
                            symbols_by_name,
                            classes_by_name,
                            source_bytes,
                        )
                elif value and value.type in {'class', 'class_declaration', 'class_expression'}:
                    _walk_class_methods(
                        parsed,
                        value,
                        symbol_name,
                        nodes,
                        edges,
                        module_symbols,
                        module_classes,
                        methods_by_class,
                        symbols_by_name,
                        classes_by_name,
                        source_bytes,
                    )


def _walk_class_methods(
    parsed: ParsedJsFile,
    class_node: object,
    class_name: Optional[str],
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    module_symbols: Dict[str, str],
    module_classes: Dict[str, str],
    methods_by_class: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    classes_by_name: Dict[str, Set[str]],
    source_bytes: bytes,
) -> None:
    if not class_name:
        return
    class_body = _child_by_type(class_node, 'class_body')
    if not class_body:
        return
    for item in class_body.children:
        if item.type != 'method_definition':
            continue
        method_name = _node_name(item, source_bytes)
        method_id = methods_by_class.get((parsed.module, class_name), {}).get(method_name)
        if method_id:
            _walk_calls(
                item,
                method_id,
                parsed.module,
                class_name,
                nodes,
                edges,
                module_symbols,
                module_classes,
                methods_by_class,
                symbols_by_name,
                classes_by_name,
                source_bytes,
            )


def _walk_calls(
    node: object,
    source_id: str,
    module_name: str,
    current_class: Optional[str],
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    module_symbols: Dict[str, str],
    module_classes: Dict[str, str],
    methods_by_class: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    classes_by_name: Dict[str, Set[str]],
    source_bytes: bytes,
) -> None:
    stack = [node]
    while stack:
        current = stack.pop()
        if getattr(current, "type", None) == 'call_expression':
            func_node = current.child_by_field_name('function')
            target_id, confidence = _resolve_call_target(
                func_node,
                module_name,
                current_class,
                nodes,
                module_symbols,
                module_classes,
                methods_by_class,
                symbols_by_name,
                classes_by_name,
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
    module_name: str,
    current_class: Optional[str],
    nodes: Dict[str, SymbolNode],
    module_symbols: Dict[str, str],
    module_classes: Dict[str, str],
    methods_by_class: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    classes_by_name: Dict[str, Set[str]],
    source_bytes: bytes,
) -> tuple[Optional[str], str]:
    if not func_node:
        return None, 'low'
    if func_node.type == 'identifier':
        name = _node_text(func_node, source_bytes)
        if not name:
            return None, 'low'
        target_id = module_symbols.get(name)
        if target_id:
            return target_id, 'high'
        unique_symbol = _resolve_unique_symbol(name, symbols_by_name)
        if unique_symbol:
            return unique_symbol, 'medium'
        return external_id(name), 'low'
    if func_node.type == 'member_expression':
        obj = func_node.child_by_field_name('object')
        prop = func_node.child_by_field_name('property')
        prop_name = _node_text(prop, source_bytes) if prop else ''
        if not prop_name:
            return None, 'low'
        if obj and obj.type in {'this', 'super'} and current_class:
            method_id = methods_by_class.get((module_name, current_class), {}).get(prop_name)
            if method_id:
                return method_id, 'medium'
        if obj and obj.type == 'identifier':
            obj_name = _node_text(obj, source_bytes)
            class_id = module_classes.get(obj_name)
            if class_id:
                method_id = methods_by_class.get((module_name, obj_name), {}).get(prop_name)
                if method_id:
                    return method_id, 'medium'
            class_id = _resolve_unique_symbol(obj_name, classes_by_name)
            if class_id:
                class_node = nodes.get(class_id)
                class_module = class_node.module if class_node else module_name
                class_name = class_node.name if class_node else obj_name
                method_id = methods_by_class.get((class_module or '', class_name), {}).get(prop_name)
                if method_id:
                    return method_id, 'medium'
            return external_id(f'{obj_name}.{prop_name}'), 'low'
        return external_id(prop_name), 'low'
    return None, 'low'


def _resolve_unique_symbol(name: str, symbol_map: Dict[str, Set[str]]) -> Optional[str]:
    candidates = symbol_map.get(name)
    if not candidates or len(candidates) != 1:
        return None
    return next(iter(candidates))


def _iter_root_declarations(root: object) -> List[object]:
    nodes: List[object] = []
    for child in getattr(root, "children", []) or []:
        if child.type in {'export_statement', 'export_default_declaration'}:
            declaration = child.child_by_field_name('declaration')
            if declaration:
                nodes.append(declaration)
                continue
        nodes.append(child)
    return nodes


def _register_class(
    parsed: ParsedJsFile,
    class_node: object,
    class_name: str,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    module_symbols: Dict[str, str],
    module_classes: Dict[str, str],
    methods_by_class: Dict[Tuple[str, str], Dict[str, str]],
    symbols_by_name: Dict[str, Set[str]],
    classes_by_name: Dict[str, Set[str]],
    source_bytes: bytes,
) -> None:
    if class_name in module_classes:
        return
    class_id = symbol_id(f'{parsed.module}.{class_name}')
    nodes[class_id] = SymbolNode(
        id=class_id,
        name=class_name,
        kind='class',
        summary='',
        signature=_signature_from_node(class_node, source_bytes),
        location=_location_from_node(parsed.path, class_node),
        module=parsed.module,
    )
    module_classes[class_name] = class_id
    module_symbols[class_name] = class_id
    symbols_by_name.setdefault(class_name, set()).add(class_id)
    classes_by_name.setdefault(class_name, set()).add(class_id)
    methods_by_class[(parsed.module, class_name)] = {}
    edges.append(GraphEdge(
        source=file_id(parsed.path),
        target=class_id,
        kind='contains',
        confidence='high',
    ))
    class_body = _child_by_type(class_node, 'class_body')
    if not class_body:
        return
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
        methods_by_class[(parsed.module, class_name)][method_name] = method_id
        edges.append(GraphEdge(
            source=class_id,
            target=method_id,
            kind='contains',
            confidence='high',
        ))


def _register_type_like(
    parsed: ParsedJsFile,
    node: object,
    type_name: str,
    nodes: Dict[str, SymbolNode],
    edges: List[GraphEdge],
    module_symbols: Dict[str, str],
    module_classes: Dict[str, str],
    symbols_by_name: Dict[str, Set[str]],
    classes_by_name: Dict[str, Set[str]],
    source_bytes: bytes,
) -> None:
    if type_name in module_symbols:
        return
    type_id = symbol_id(f'{parsed.module}.{type_name}')
    nodes[type_id] = SymbolNode(
        id=type_id,
        name=type_name,
        kind='class',
        summary=_ts_decl_label(node.type),
        signature=_signature_from_node(node, source_bytes),
        location=_location_from_node(parsed.path, node),
        module=parsed.module,
    )
    module_symbols[type_name] = type_id
    symbols_by_name.setdefault(type_name, set()).add(type_id)
    if node.type != 'type_alias_declaration':
        module_classes[type_name] = type_id
        classes_by_name.setdefault(type_name, set()).add(type_id)
    edges.append(GraphEdge(
        source=file_id(parsed.path),
        target=type_id,
        kind='contains',
        confidence='high',
    ))


def _ts_decl_label(node_type: str) -> str:
    labels = {
        'interface_declaration': 'Interface',
        'type_alias_declaration': 'Type alias',
        'enum_declaration': 'Enum',
        'namespace_declaration': 'Namespace',
        'module_declaration': 'Namespace',
        'internal_module': 'Namespace',
    }
    return labels.get(node_type, 'Type')


def _child_by_type(node: object, node_type: str) -> Optional[object]:
    for child in getattr(node, "children", []) or []:
        if child.type == node_type:
            return child
    return None


def _first_named_child(node: Optional[object]) -> Optional[object]:
    if not node:
        return None
    for child in getattr(node, "children", []) or []:
        if getattr(child, 'is_named', False):
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


def _strip_quotes(value: str) -> str:
    text = value.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {'"', "'"}:
        return text[1:-1]
    return text


def _string_literal_value(node: Optional[object], source_bytes: bytes) -> str:
    if not node:
        return ''
    if node.type in {'string', 'template_string'}:
        return _strip_quotes(_node_text(node, source_bytes))
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
