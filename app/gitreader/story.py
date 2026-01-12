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
EDGE_CONFIDENCE_WEIGHT = {
    'high': 1.0,
    'medium': 0.7,
    'low': 0.4,
}


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
    adjacency, incoming = _build_call_graph(index)
    scores = _score_nodes(index, adjacency, incoming)
    arcs: List[Dict[str, object]] = []
    for route in routes:
        if route.handler_id not in index.nodes:
            continue
        entry_node = index.nodes.get(route.handler_id)
        entry_path = entry_node.location.path if entry_node and entry_node.location else ''
        ranked_targets = _rank_targets(index, adjacency, scores, route.handler_id, entry_path)
        internal_calls, external_calls = _collect_call_targets(index, route.handler_id)

        thread_arcs: List[Dict[str, object]] = []
        primary = ranked_targets[0] if ranked_targets else None
        main_scenes = _build_thread_path(
            index,
            adjacency,
            scores,
            route.handler_id,
            entry_path,
            max_depth,
            max_scenes,
            forced_first=primary,
        )
        main_id = _route_arc_id(route, 'main')
        thread_arcs.append(_arc_from_route(
            route,
            main_scenes,
            internal_calls,
            external_calls,
            arc_id=main_id,
            thread='main',
            thread_index=0,
            parent_id=None,
        ))

        branch_index = 1
        for candidate in ranked_targets[1:3]:
            branch_scenes = _build_thread_path(
                index,
                adjacency,
                scores,
                route.handler_id,
                entry_path,
                max_depth,
                max_scenes,
                forced_first=candidate,
            )
            if len(branch_scenes) <= 1:
                continue
            branch_id = _route_arc_id(route, f'branch-{branch_index}')
            thread_arcs.append(_arc_from_route(
                route,
                branch_scenes,
                internal_calls,
                external_calls,
                arc_id=branch_id,
                thread='branch',
                thread_index=branch_index,
                parent_id=main_id,
            ))
            branch_index += 1

        related_ids = [arc['id'] for arc in thread_arcs]
        for arc in thread_arcs:
            arc['related_ids'] = [item for item in related_ids if item != arc['id']]
        arcs.extend(thread_arcs)
    arcs.sort(key=lambda arc: (
        str(arc.get('route', {}).get('path', '')),
        str(arc.get('route', {}).get('handler_name', '')),
        int(arc.get('thread_index', 0)),
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


def _build_call_graph(index: RepoIndex) -> tuple[Dict[str, List[tuple[str, str]]], Dict[str, List[tuple[str, str]]]]:
    adjacency: Dict[str, List[tuple[str, str]]] = {}
    incoming: Dict[str, List[tuple[str, str]]] = {}
    for edge in index.edges:
        if edge.kind != 'calls':
            continue
        if edge.source not in index.nodes or edge.target not in index.nodes:
            continue
        target = index.nodes[edge.target]
        if target.kind == 'external':
            continue
        adjacency.setdefault(edge.source, []).append((edge.target, edge.confidence))
        incoming.setdefault(edge.target, []).append((edge.source, edge.confidence))
    for source in adjacency:
        adjacency[source] = sorted(
            adjacency[source],
            key=lambda item: _node_sort_key(index.nodes.get(item[0])),
        )
    return adjacency, incoming


def _score_nodes(
    index: RepoIndex,
    adjacency: Dict[str, List[tuple[str, str]]],
    incoming: Dict[str, List[tuple[str, str]]],
) -> Dict[str, float]:
    scores: Dict[str, float] = {}
    for node_id, node in index.nodes.items():
        if node.kind == 'external':
            continue
        fan_out = len(adjacency.get(node_id, []))
        fan_in = len(incoming.get(node_id, []))
        doc_bonus = 1.5 if node.summary else 0.0
        score = fan_out * 2.0 + fan_in * 1.0 + doc_bonus
        if node.kind == 'class':
            score += 0.5
        if _should_skip(node):
            score -= 2.0
        scores[node_id] = score
    return scores


def _rank_targets(
    index: RepoIndex,
    adjacency: Dict[str, List[tuple[str, str]]],
    scores: Dict[str, float],
    source_id: str,
    entry_path: str,
) -> List[tuple[str, str, float]]:
    ranked: List[tuple[str, str, float]] = []
    for target_id, confidence in adjacency.get(source_id, []):
        target = index.nodes.get(target_id)
        if not target or target.kind == 'external':
            continue
        score = scores.get(target_id, 0.0)
        if entry_path and target.location and target.location.path and target.location.path != entry_path:
            score += 0.8
        score += EDGE_CONFIDENCE_WEIGHT.get(confidence, 0.4)
        if _should_skip(target):
            score -= 1.5
        ranked.append((target_id, confidence, score))
    ranked.sort(key=lambda item: item[2], reverse=True)
    return ranked


def _node_sort_key(node: Optional[SymbolNode]) -> tuple[str, str]:
    if not node:
        return ('', '')
    path = ''
    if node.location and node.location.path:
        path = node.location.path
    return (node.name, path)


def _build_thread_path(
    index: RepoIndex,
    adjacency: Dict[str, List[tuple[str, str]]],
    scores: Dict[str, float],
    entry_id: str,
    entry_path: str,
    max_depth: int,
    max_scenes: int,
    forced_first: Optional[tuple[str, str, float]] = None,
) -> List[Dict[str, object]]:
    visited: set[str] = set()
    scenes: List[Dict[str, object]] = []

    def add_scene(node_id: str, role: str, confidence: str) -> bool:
        if node_id in visited:
            return False
        node = index.nodes.get(node_id)
        if not node or node.kind == 'external':
            return False
        if role != 'entry' and _should_skip(node):
            return False
        visited.add(node_id)
        scenes.append(_scene_from_node(node, role, confidence))
        return True

    def walk(node_id: str, depth: int) -> None:
        if depth >= max_depth or len(scenes) >= max_scenes:
            return
        ranked = _rank_targets(index, adjacency, scores, node_id, entry_path)
        for target_id, confidence, _score in ranked:
            if len(scenes) >= max_scenes:
                break
            if not add_scene(target_id, 'step', confidence):
                continue
            walk(target_id, depth + 1)
            break

    add_scene(entry_id, 'entry', 'high')
    if forced_first:
        target_id, confidence, _score = forced_first
        if add_scene(target_id, 'step', confidence):
            walk(target_id, 1)
        return scenes
    walk(entry_id, 0)
    return scenes


def _scene_from_node(node: SymbolNode, role: str, confidence: str) -> Dict[str, object]:
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
        'confidence': confidence,
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


def _arc_from_route(
    route: RouteInfo,
    scenes: List[Dict[str, object]],
    internal_calls: List[str],
    external_calls: List[str],
    arc_id: str,
    thread: str,
    thread_index: int,
    parent_id: Optional[str],
) -> Dict[str, object]:
    methods_label = _methods_label(route.methods)
    if route.path:
        title = f'{methods_label} {route.path}'.strip()
    else:
        title = f'{methods_label} {route.handler_name}'.strip()
    if thread != 'main':
        title = f'{title} (branch {thread_index})'
    return {
        'id': arc_id,
        'title': title,
        'summary': _arc_summary(route, scenes),
        'entry_id': route.handler_id,
        'thread': thread,
        'thread_index': thread_index,
        'parent_id': parent_id,
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
        'calls': {
            'internal': internal_calls,
            'external': external_calls,
        },
    }


def _collect_call_targets(index: RepoIndex, entry_id: str, limit: int = 6) -> tuple[List[str], List[str]]:
    internal: List[str] = []
    external: List[str] = []
    seen_internal = set()
    seen_external = set()
    for edge in index.edges:
        if edge.kind != 'calls' or edge.source != entry_id:
            continue
        target = index.nodes.get(edge.target)
        if not target:
            continue
        if target.kind == 'external':
            if target.name in seen_external:
                continue
            seen_external.add(target.name)
            external.append(target.name)
        else:
            if target.name in seen_internal:
                continue
            seen_internal.add(target.name)
            internal.append(target.name)
        if len(internal) >= limit and len(external) >= limit:
            break
    return internal[:limit], external[:limit]


def _route_arc_id(route: RouteInfo, thread_label: str) -> str:
    payload = f'{route.handler_id}|{route.path}|{",".join(route.methods)}|{thread_label}'
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
