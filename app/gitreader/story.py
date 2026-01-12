import ast
import hashlib
import os
from dataclasses import dataclass
from typing import Dict, List, Optional

from .models import RepoIndex, SymbolNode, symbol_id
from .parse_python import ParsedFile


ROUTE_DECORATORS = {'route', 'get', 'post', 'put', 'patch', 'delete'}
METHOD_DECORATORS = {'get', 'post', 'put', 'patch', 'delete'}
LOW_SIGNAL_BASENAMES = {'utils.py', 'helpers.py'}
LOW_SIGNAL_SEGMENTS = {'/tests/', '/test/', '/utils/', '/helpers/'}


@dataclass
class RouteInfo:
    handler_id: str
    handler_name: str
    module: str
    file_path: str
    line: int
    path: str
    methods: List[str]


def build_story_arcs(
    index: RepoIndex,
    parsed_files: List[ParsedFile],
    max_depth: int = 3,
    max_scenes: int = 12,
) -> List[Dict[str, object]]:
    routes = _find_flask_routes(parsed_files)
    if not routes:
        return []
    adjacency = _build_call_adjacency(index)
    arcs: List[Dict[str, object]] = []
    for route in routes:
        if route.handler_id not in index.nodes:
            continue
        scenes = _build_scene_path(index, adjacency, route.handler_id, max_depth, max_scenes)
        arcs.append(_arc_from_route(route, scenes))
    arcs.sort(key=lambda arc: (
        str(arc.get('route', {}).get('path', '')),
        str(arc.get('route', {}).get('handler_name', '')),
    ))
    return arcs


def _find_flask_routes(parsed_files: List[ParsedFile]) -> List[RouteInfo]:
    routes: List[RouteInfo] = []
    for parsed in parsed_files:
        module = parsed.module
        for node in parsed.tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            handler_id = symbol_id(f'{module}.{node.name}')
            for decorator in node.decorator_list:
                route_spec = _route_from_decorator(decorator)
                if not route_spec:
                    continue
                path, methods = route_spec
                routes.append(RouteInfo(
                    handler_id=handler_id,
                    handler_name=node.name,
                    module=module,
                    file_path=parsed.path,
                    line=getattr(node, 'lineno', 0) or 0,
                    path=path,
                    methods=methods,
                ))
    return routes


def _route_from_decorator(decorator: ast.AST) -> Optional[tuple[str, List[str]]]:
    if not isinstance(decorator, ast.Call):
        return None
    if not isinstance(decorator.func, ast.Attribute):
        return None
    attr = decorator.func.attr
    if attr not in ROUTE_DECORATORS:
        return None
    path = _extract_route_path(decorator)
    methods = _extract_route_methods(decorator, attr)
    return path, methods


def _extract_route_path(call: ast.Call) -> str:
    if call.args:
        value = _string_value(call.args[0])
        if value:
            return value
    for keyword in call.keywords:
        if keyword.arg in {'rule', 'path'}:
            value = _string_value(keyword.value)
            if value:
                return value
    return ''


def _extract_route_methods(call: ast.Call, attr: str) -> List[str]:
    methods: List[str] = []
    if attr in METHOD_DECORATORS:
        methods.append(attr.upper())
    for keyword in call.keywords:
        if keyword.arg != 'methods':
            continue
        methods.extend(_extract_string_list(keyword.value))
    seen = set()
    ordered: List[str] = []
    for method in methods:
        method = method.upper()
        if method and method not in seen:
            seen.add(method)
            ordered.append(method)
    return ordered


def _extract_string_list(node: ast.AST) -> List[str]:
    if isinstance(node, (ast.List, ast.Tuple, ast.Set)):
        values: List[str] = []
        for item in node.elts:
            value = _string_value(item)
            if value:
                values.append(value)
        return values
    value = _string_value(node)
    return [value] if value else []


def _string_value(node: ast.AST) -> Optional[str]:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Str):
        return node.s
    return None


def _build_call_adjacency(index: RepoIndex) -> Dict[str, List[str]]:
    adjacency: Dict[str, set[str]] = {}
    for edge in index.edges:
        if edge.kind != 'calls':
            continue
        if edge.source not in index.nodes or edge.target not in index.nodes:
            continue
        target = index.nodes[edge.target]
        if target.kind == 'external':
            continue
        adjacency.setdefault(edge.source, set()).add(edge.target)
    ordered: Dict[str, List[str]] = {}
    for source, targets in adjacency.items():
        ordered[source] = sorted(targets, key=lambda node_id: _node_sort_key(index.nodes.get(node_id)))
    return ordered


def _node_sort_key(node: Optional[SymbolNode]) -> tuple[str, str]:
    if not node:
        return ('', '')
    path = ''
    if node.location and node.location.path:
        path = node.location.path
    return (node.name, path)


def _build_scene_path(
    index: RepoIndex,
    adjacency: Dict[str, List[str]],
    entry_id: str,
    max_depth: int,
    max_scenes: int,
) -> List[Dict[str, object]]:
    visited: set[str] = set()
    scenes: List[Dict[str, object]] = []

    def visit(node_id: str, depth: int, role: str) -> None:
        if node_id in visited:
            return
        node = index.nodes.get(node_id)
        if not node or node.kind == 'external':
            return
        if role != 'entry' and _should_skip(node):
            return
        visited.add(node_id)
        scenes.append(_scene_from_node(node, role))
        if depth >= max_depth or len(scenes) >= max_scenes:
            return
        for target_id in adjacency.get(node_id, []):
            if len(scenes) >= max_scenes:
                break
            visit(target_id, depth + 1, 'step')

    visit(entry_id, 0, 'entry')
    return scenes


def _scene_from_node(node: SymbolNode, role: str) -> Dict[str, object]:
    location = node.location
    path = location.path if location else ''
    line = location.start_line if location else 0
    return {
        'id': node.id,
        'name': node.name,
        'kind': node.kind,
        'file_path': path,
        'line': line,
        'role': role,
    }


def _should_skip(node: SymbolNode) -> bool:
    if node.kind not in {'function', 'method', 'class'}:
        return True
    location = node.location
    if not location or not location.path:
        return False
    normalized = location.path.replace(os.sep, '/').lower()
    base = os.path.basename(normalized)
    if base in LOW_SIGNAL_BASENAMES:
        return True
    padded = f'/{normalized}/'
    return any(segment in padded for segment in LOW_SIGNAL_SEGMENTS)


def _arc_from_route(route: RouteInfo, scenes: List[Dict[str, object]]) -> Dict[str, object]:
    methods_label = _methods_label(route.methods)
    if route.path:
        title = f'{methods_label} {route.path}'.strip()
    else:
        title = f'{methods_label} {route.handler_name}'.strip()
    arc_id = _route_arc_id(route)
    return {
        'id': arc_id,
        'title': title,
        'summary': _arc_summary(route, scenes),
        'entry_id': route.handler_id,
        'route': {
            'path': route.path,
            'methods': route.methods,
            'handler_id': route.handler_id,
            'handler_name': route.handler_name,
            'module': route.module,
            'file_path': route.file_path,
            'line': route.line,
        },
        'scenes': scenes,
        'scene_count': len(scenes),
    }


def _route_arc_id(route: RouteInfo) -> str:
    payload = f'{route.handler_id}|{route.path}|{",".join(route.methods)}'
    digest = hashlib.sha1(payload.encode("utf-8", errors="replace")).hexdigest()[:12]
    return f'arc:{digest}'


def _arc_summary(route: RouteInfo, scenes: List[Dict[str, object]]) -> str:
    label = _route_label(route)
    call_names = [scene['name'] for scene in scenes[1:] if isinstance(scene.get('name'), str)]
    if call_names:
        preview = ', '.join(call_names[:3])
        suffix = '...' if len(call_names) > 3 else ''
        return _compact_summary(f'{label} calls {preview}{suffix}.')
    return _compact_summary(f'{label} starts here.')


def _route_label(route: RouteInfo) -> str:
    methods_label = _methods_label(route.methods)
    if route.path:
        return f'{methods_label} {route.path}'.strip()
    return f'{methods_label} {route.handler_name}'.strip()


def _methods_label(methods: List[str]) -> str:
    if not methods:
        return 'ANY'
    return '|'.join(methods)


def _compact_summary(text: str, limit: int = 160) -> str:
    cleaned = ' '.join(text.split())
    if len(cleaned) <= limit:
        return cleaned
    return f'{cleaned[:limit - 3].rstrip()}...'
