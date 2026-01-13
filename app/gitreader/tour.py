import hashlib
import json
import logging
import os
import urllib.request
from typing import Dict, List, Optional, Tuple

from . import storage
from .models import RepoIndex, RepoSpec, SymbolNode
from .service import build_symbol_snippet, get_story_arcs
from .signals import extract_signals, format_signals, signal_summary


LOGGER = logging.getLogger(__name__)
PROMPT_VERSION = 'tour-v3'
MAX_CONTEXT_WINDOW = 3
MAX_SNIPPET_LINES = 20


def start_tour(
    spec: RepoSpec,
    cache_root: str,
    mode: str,
    arc_id: Optional[str] = None,
) -> Tuple[Dict[str, object], Dict[str, object], List[dict]]:
    index, arcs, warnings = get_story_arcs(spec, cache_root=cache_root)
    arc = _select_arc(arcs, arc_id)
    if not arc:
        raise ValueError('No story arcs available.')
    normalized_mode = _normalize_mode(mode)
    state = _init_state(index, arc, normalized_mode)
    step = _build_tour_step(index, arc, normalized_mode, state, cache_root, [])
    return state, step, [warning.to_dict() for warning in warnings]


def step_tour(
    spec: RepoSpec,
    cache_root: str,
    state: Dict[str, object],
    action: str,
    target_node_id: Optional[str] = None,
    target_arc_id: Optional[str] = None,
) -> Tuple[Dict[str, object], Dict[str, object], List[dict]]:
    index, arcs, warnings = get_story_arcs(spec, cache_root=cache_root)
    normalized_mode = _normalize_mode(str(state.get('mode') or 'story'))

    arc_id = str(state.get('arc_id') or '')
    if action == 'branch' and target_arc_id:
        arc_id = target_arc_id
    arc = _select_arc(arcs, arc_id)
    if not arc:
        raise ValueError('Story arc not found.')

    step_index = int(state.get('step_index') or 0)
    if action == 'next':
        step_index += 1
    elif action == 'prev':
        step_index -= 1
    elif action == 'jump' and target_node_id:
        step_index = _find_scene_index(arc, target_node_id, fallback=step_index)
    elif action == 'branch':
        step_index = 0

    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    max_index = max(len(scenes) - 1, 0)
    step_index = max(0, min(step_index, max_index))

    context_window = state.get('context_window') if isinstance(state.get('context_window'), list) else []
    step = _build_tour_step(index, arc, normalized_mode, state, cache_root, context_window, step_index=step_index)
    state = _update_state(state, arc, step_index, step, normalized_mode, action)
    return state, step, [warning.to_dict() for warning in warnings]


def _normalize_mode(mode: str) -> str:
    mode = (mode or 'story').lower()
    if mode not in {'story', 'teacher', 'expert'}:
        return 'story'
    return mode


def _select_arc(arcs: List[dict], arc_id: Optional[str]) -> Optional[dict]:
    if arc_id:
        for arc in arcs:
            if arc.get('id') == arc_id:
                return arc
    main_arcs = [arc for arc in arcs if arc.get('thread') == 'main']
    if main_arcs:
        return main_arcs[0]
    return arcs[0] if arcs else None


def _find_scene_index(arc: dict, node_id: str, fallback: int) -> int:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    for idx, scene in enumerate(scenes):
        if scene.get('id') == node_id:
            return idx
    return fallback


def _init_state(index: RepoIndex, arc: dict, mode: str) -> Dict[str, object]:
    return {
        'repo_id': index.repo_id,
        'ref': index.commit_sha,
        'subdir': None,
        'arc_id': arc.get('id'),
        'mode': mode,
        'step_index': 0,
        'last_node_id': arc.get('entry_id'),
        'visited_node_ids': [],
        'branch_stack': [],
        'context_window': [],
    }


def _update_state(
    state: Dict[str, object],
    arc: dict,
    step_index: int,
    step: Dict[str, object],
    mode: str,
    action: str,
) -> Dict[str, object]:
    visited = list(state.get('visited_node_ids') or [])
    node_id = step.get('node_id')
    if node_id and (not visited or visited[-1] != node_id):
        visited.append(node_id)
    branch_stack = list(state.get('branch_stack') or [])
    if action == 'branch' and arc.get('id'):
        branch_stack.append(arc['id'])
    context_window = _extend_context_window(state.get('context_window'), step)
    return {
        **state,
        'arc_id': arc.get('id'),
        'mode': mode,
        'step_index': step_index,
        'last_node_id': node_id,
        'visited_node_ids': visited[-50:],
        'branch_stack': branch_stack[-8:],
        'context_window': context_window,
    }


def _extend_context_window(previous: object, step: Dict[str, object]) -> List[dict]:
    context_window: List[dict] = []
    if isinstance(previous, list):
        for item in previous:
            if isinstance(item, dict):
                context_window.append(item)
    summary = step.get('hook') or step.get('title') or ''
    node_id = step.get('node_id') or ''
    if summary and node_id:
        context_window.append({'node_id': node_id, 'summary': str(summary)[:160]})
    return context_window[-MAX_CONTEXT_WINDOW:]


def _build_tour_step(
    index: RepoIndex,
    arc: dict,
    mode: str,
    state: Dict[str, object],
    cache_root: str,
    context_window: List[dict],
    step_index: Optional[int] = None,
) -> Dict[str, object]:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    if step_index is None:
        step_index = int(state.get('step_index') or 0)
    step_index = max(0, min(step_index, max(len(scenes) - 1, 0)))
    scene = scenes[step_index] if scenes else {}
    node_id = scene.get('id') or arc.get('entry_id') or ''
    node = index.nodes.get(node_id) if node_id else None

    cache_key = _tour_cache_key(index, arc, step_index, mode, node_id)
    tour_cache_root = os.path.join(cache_root, 'tour')
    cached = storage.load_tour(tour_cache_root, index.repo_id, cache_key)
    if cached:
        cached['cached'] = True
        return cached

    step = _generate_tour_step(index, arc, node, scene, step_index, mode, context_window)
    step['cached'] = False
    storage.save_tour(tour_cache_root, index.repo_id, cache_key, step)
    return step


def _generate_tour_step(
    index: RepoIndex,
    arc: dict,
    node: Optional[SymbolNode],
    scene: dict,
    step_index: int,
    mode: str,
    context_window: List[dict],
) -> Dict[str, object]:
    arc_context = _build_arc_context(arc)
    snippet = _snippet_for_node(index, node) if node else {}
    snippet_text = str(snippet.get('snippet') or '')
    signals = extract_signals(snippet_text)
    node_context = _build_node_context(index, node, scene, snippet, signals)
    scene_context = _scene_context(arc, step_index)
    payload = {
        'mode': mode,
        'arc': arc_context,
        'node': node_context,
        'scene_context': scene_context,
        'context_window': context_window[-MAX_CONTEXT_WINDOW:],
    }

    fallback = _fallback_tour_step(arc, node, scene, step_index, signals, snippet, context_window)
    api_key = os.getenv('GITREADER_LLM_API_KEY') or os.getenv('OPENAI_API_KEY')
    model = os.getenv('GITREADER_LLM_MODEL', 'gpt-4o-mini')
    base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    if not api_key:
        return fallback

    messages = _build_messages(payload)
    try:
        content = _call_openai(
            api_key=api_key,
            base_url=base_url,
            model=model,
            messages=messages,
        )
    except Exception as exc:
        LOGGER.warning('gitreader tour failed: %s', exc)
        return fallback
    parsed = _parse_step(content)
    merged = _merge_step(parsed, fallback)
    merged['model'] = model
    merged['source'] = 'openai'
    return merged


def _build_arc_context(arc: dict) -> dict:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    return {
        'arc': {
            'id': arc.get('id'),
            'title': arc.get('title'),
            'thread': arc.get('thread'),
            'scene_count': arc.get('scene_count'),
            'related_ids': arc.get('related_ids', []),
        },
        'route': arc.get('route', {}),
        'scenes': scenes[:6],
        'calls': arc.get('calls', {}),
    }


def _scene_context(arc: dict, step_index: int) -> dict:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    current = scenes[step_index] if 0 <= step_index < len(scenes) else {}
    previous = scenes[step_index - 1] if step_index - 1 >= 0 else None
    next_scene = scenes[step_index + 1] if step_index + 1 < len(scenes) else None
    return {
        'current': current,
        'previous': previous,
        'next': next_scene,
    }


def _build_node_context(
    index: RepoIndex,
    node: Optional[SymbolNode],
    scene: dict,
    snippet: dict,
    signals: Dict[str, List[str]],
) -> dict:
    node_id = scene.get('id') if isinstance(scene, dict) else ''
    location = ''
    if node and node.location and node.location.path:
        location = node.location.path
    return {
        'node': {
            'id': node_id,
            'kind': node.kind if node else scene.get('kind'),
            'name': node.name if node else scene.get('name'),
            'signature': node.signature if node else '',
            'summary': node.summary if node else '',
            'docstring': (node.docstring or '') if node else '',
            'location': location,
        },
        'snippet': _format_snippet(snippet),
        'signals': format_signals(signals),
        'graph': _graph_context(index, node_id),
    }


def _snippet_for_node(index: RepoIndex, node: Optional[SymbolNode]) -> dict:
    if not node or not node.location or not node.location.path:
        return {}
    section = 'body' if node.kind in {'function', 'method', 'class'} else 'full'
    try:
        snippet = build_symbol_snippet(index, node, max_lines=MAX_SNIPPET_LINES, section=section)
    except ValueError:
        return {}
    return snippet


def _format_snippet(snippet: dict) -> str:
    raw = str(snippet.get('snippet') or '')
    if not raw:
        return ''
    start_line = int(snippet.get('start_line') or 1)
    lines = raw.splitlines()[:MAX_SNIPPET_LINES]
    formatted = []
    for offset, line in enumerate(lines):
        formatted.append(f'{start_line + offset:>4} {line}')
    return '\n'.join(formatted)


def _graph_context(index: RepoIndex, node_id: str, limit: int = 6) -> Dict[str, List[str]]:
    incoming: List[str] = []
    outgoing: List[str] = []
    for edge in index.edges:
        if edge.source == node_id:
            target = index.nodes.get(edge.target)
            name = target.name if target else edge.target
            kind = target.kind if target else 'unknown'
            outgoing.append(f'{edge.kind} -> {name} ({kind})')
        elif edge.target == node_id:
            source = index.nodes.get(edge.source)
            name = source.name if source else edge.source
            kind = source.kind if source else 'unknown'
            incoming.append(f'{edge.kind} <- {name} ({kind})')
        if len(incoming) >= limit and len(outgoing) >= limit:
            break
    return {
        'incoming': incoming[:limit],
        'outgoing': outgoing[:limit],
    }


def _fallback_tour_step(
    arc: dict,
    node: Optional[SymbolNode],
    scene: dict,
    step_index: int,
    signals: Dict[str, List[str]],
    snippet: dict,
    context_window: List[dict],
) -> Dict[str, object]:
    node_name = node.name if node else scene.get('name', 'Unknown')
    arc_title = arc.get('title', 'Route')
    next_click = _next_click(arc, step_index)
    signal_lines = _signal_lines(signals)
    concept, why_here, remember = _build_explanatory_context(arc, node, scene, signals)
    explanation = [
        f'{node_name} appears in this route’s main flow.',
        'Use the next step to continue along the path.',
    ]
    if signal_lines:
        explanation.insert(0, signal_lines[0])
    focus = _build_focus(scene, node, snippet)
    allowed_node_ids = _allowed_node_ids(arc, step_index)
    context_links = _build_context_links(arc, scene, step_index)
    return {
        'step_index': step_index,
        'total_steps': len(arc.get('scenes') or []),
        'node_id': node.id if node else scene.get('id'),
        'arc_id': arc.get('id'),
        'arc_title': arc_title,
        'title': f'Step {step_index + 1}: {node_name}',
        'hook': f'Follow {node_name} in the {arc_title} flow.',
        'explanation': explanation[:3],
        'why_it_matters': 'It keeps the request moving through its core path.',
        'concept': concept,
        'why_here': why_here,
        'remember': remember,
        'next_click': next_click,
        'pitfall': '',
        'confidence': scene.get('confidence', 'medium'),
        'related_nodes': _fallback_related_nodes(arc, step_index),
        'related_arcs': _fallback_related_arcs(arc),
        'focus': focus,
        'allowed_node_ids': allowed_node_ids,
        'context_links': context_links,
        'story_so_far': _story_so_far(context_window),
        'source': 'fallback',
        'prompt_version': PROMPT_VERSION,
    }


def _fallback_related_nodes(arc: dict, step_index: int) -> List[dict]:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    suggestions: List[dict] = []
    for next_index in range(step_index + 1, min(step_index + 3, len(scenes))):
        scene = scenes[next_index]
        node_id = scene.get('id')
        name = scene.get('name')
        if node_id and name:
            suggestions.append({'node_id': node_id, 'label': name})
    return suggestions


def _fallback_related_arcs(arc: dict) -> List[dict]:
    related = arc.get('related_ids') if isinstance(arc.get('related_ids'), list) else []
    return [{'arc_id': arc_id, 'title': arc_id} for arc_id in related]


def _build_explanatory_context(
    arc: dict,
    node: Optional[SymbolNode],
    scene: dict,
    signals: Dict[str, List[str]],
) -> tuple[str, str, str]:
    route_label = _route_label(arc)
    node_name = node.name if node else scene.get('name', 'this step')
    role = scene.get('role') if isinstance(scene, dict) else ''
    templates = signals.get('templates') or []
    responses = signals.get('responses') or []
    redirects = signals.get('redirects') or []
    auth = signals.get('auth') or []
    request = signals.get('request') or []
    db = signals.get('db') or []

    if role == 'entry' and route_label:
        concept = f'This is the entry handler for {route_label}.'
        why_here = f'The story starts at {route_label} before any downstream logic.'
        remember = f'Entering {route_label} puts us inside {node_name}.'
        return concept, why_here, remember

    if auth:
        concept = f'Authentication gate: {", ".join(auth[:2])}.'
        why_here = f'{node_name} decides who can proceed in this flow.'
        remember = 'If auth fails, the request diverts away from the main path.'
        return concept, why_here, remember

    if db:
        concept = f'Database access: {", ".join(db[:2])}.'
        why_here = f'{node_name} needs data to decide the next step.'
        remember = 'The query result becomes the data the rest of the flow uses.'
        return concept, why_here, remember

    if templates:
        concept = f'Render step: {templates[0]}.'
        why_here = f'This is where the flow turns into a user-facing response.'
        remember = f'The output template is {templates[0]}.'
        return concept, why_here, remember

    if responses or redirects:
        response_label = ', '.join((responses + redirects)[:2])
        concept = f'Response decision: {response_label}.'
        why_here = f'{node_name} ends or redirects the request.'
        remember = 'Once we return/redirect, the current flow is done.'
        return concept, why_here, remember

    if request:
        concept = f'Request input: {", ".join(request[:2])}.'
        why_here = f'{node_name} reads input to shape the next action.'
        remember = 'Input here controls the branch we follow.'
        return concept, why_here, remember

    if node and node.kind == 'class':
        concept = f'Class focus: {node_name}.'
        why_here = f'This class groups behavior used by the current flow.'
        remember = 'Instances of this class carry the state downstream.'
        return concept, why_here, remember

    if node and node.summary:
        concept = f'Concept: {node.summary}'
        why_here = f'{node_name} is part of the main route flow.'
        remember = 'Keep this name in mind; it reappears later.'
        return concept, why_here, remember

    return (
        f'Concept: {node_name} advances the route flow.',
        'Why here: this is the next concrete step in the path.',
        'Remember: each step sets up the next move.',
    )


def _route_label(arc: dict) -> str:
    route = arc.get('route') if isinstance(arc.get('route'), dict) else {}
    methods = route.get('methods') if isinstance(route.get('methods'), list) else []
    path = route.get('path') or ''
    if not methods:
        methods = ['ANY']
    label = f'{"|".join(methods)} {path}'.strip()
    return label if label.strip() else ''


def _build_focus(scene: dict, node: Optional[SymbolNode], snippet: dict) -> dict:
    file_path = ''
    if node and node.location and node.location.path:
        file_path = node.location.path
    elif isinstance(scene, dict):
        file_path = scene.get('file_path') or ''
    start_line = snippet.get('start_line') if isinstance(snippet.get('start_line'), int) else None
    end_line = snippet.get('end_line') if isinstance(snippet.get('end_line'), int) else None
    if start_line is None and isinstance(scene.get('line'), int):
        start_line = scene.get('line')
    if end_line is None:
        end_line = start_line
    return {
        'file_path': file_path,
        'start_line': start_line,
        'end_line': end_line,
        'node_id': node.id if node else scene.get('id'),
    }


def _allowed_node_ids(arc: dict, step_index: int) -> List[str]:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    ids: List[str] = []
    entry_id = arc.get('entry_id')
    if entry_id:
        ids.append(entry_id)
    for idx in (step_index - 1, step_index, step_index + 1):
        if 0 <= idx < len(scenes):
            node_id = scenes[idx].get('id')
            if node_id:
                ids.append(node_id)
    deduped: List[str] = []
    seen = set()
    for node_id in ids:
        if node_id in seen:
            continue
        seen.add(node_id)
        deduped.append(node_id)
    return deduped


def _build_context_links(arc: dict, scene: dict, step_index: int) -> List[dict]:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    links: List[dict] = []

    def add_link(label: str, source: Optional[dict]) -> None:
        if not source:
            return
        node_id = source.get('id')
        file_path = source.get('file_path')
        line = source.get('line')
        if not (file_path or node_id):
            return
        if not isinstance(line, int) or line <= 0:
            line = None
        links.append({
            'label': label,
            'file_path': file_path,
            'line': line,
            'node_id': node_id,
        })

    add_link(f'Current: {scene.get("name", "step")}', scene)
    if step_index - 1 >= 0:
        add_link(f'Previous: {scenes[step_index - 1].get("name", "step")}', scenes[step_index - 1])
    if step_index + 1 < len(scenes):
        add_link(f'Next: {scenes[step_index + 1].get("name", "step")}', scenes[step_index + 1])
    return links[:4]


def _signal_lines(signals: Dict[str, List[str]]) -> List[str]:
    return signal_summary(signals, limit=2)


def _next_click(arc: dict, step_index: int) -> str:
    scenes = arc.get('scenes') if isinstance(arc.get('scenes'), list) else []
    if step_index + 1 < len(scenes):
        name = scenes[step_index + 1].get('name', 'the next step')
        return f'Click {name} to continue.'
    return 'You reached the end of this thread.'


def _build_messages(payload: dict) -> List[Dict[str, str]]:
    system = (
        'You are the GitReader Tour Guide. Respond with valid JSON only. '
        'Be specific to the provided code: cite file paths, routes, templates, and real symbols. '
        'Do not invent symbols or files. Avoid generic filler; every sentence should anchor '
        'to a concrete detail from the context.'
    )
    signals = payload.get('node', {}).get('signals') if isinstance(payload.get('node'), dict) else None
    signals_block = '- none'
    if isinstance(signals, list) and signals:
        signals_block = '\n'.join(f'- {item}' for item in signals)
    user = (
        f'Mode: {payload.get("mode")}\n'
        f'Arc context:\n{json.dumps(payload.get("arc"), ensure_ascii=True, indent=2)}\n'
        f'Node context:\n{json.dumps(payload.get("node"), ensure_ascii=True, indent=2)}\n'
        f'Scene context:\n{json.dumps(payload.get("scene_context"), ensure_ascii=True, indent=2)}\n'
        f'Signals:\n{signals_block}\n'
        f'Recent context:\n{json.dumps(payload.get("context_window"), ensure_ascii=True, indent=2)}\n'
        'Return JSON with keys: '
        'title, hook, explanation (array of 2-3 strings), why_it_matters, '
        'concept, why_here, remember, next_click, pitfall (string or empty), '
        'confidence (high|medium|low), '
        'related_nodes (array of {"node_id": "...", "label": "..."}) '
        'related_arcs (array of {"arc_id": "...", "title": "..."}), '
        'context_links (array of {"label": "...", "file_path": "...", "line": number, "node_id": "..."?}), '
        'story_so_far (array of short strings).'
    )
    return [
        {'role': 'system', 'content': system},
        {'role': 'user', 'content': user},
    ]


def _call_openai(
    api_key: str,
    base_url: str,
    model: str,
    messages: List[Dict[str, str]],
) -> str:
    payload = {
        'model': model,
        'messages': messages,
        'temperature': _env_float('GITREADER_LLM_TEMPERATURE', 0.4),
        'max_tokens': _env_int('GITREADER_LLM_MAX_TOKENS', 700),
    }
    body = json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(
        f'{base_url}/chat/completions',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
        method='POST',
    )
    timeout = _env_int('GITREADER_LLM_TIMEOUT', 30)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode('utf-8', errors='replace')
    payload = json.loads(raw)
    choices = payload.get('choices') if isinstance(payload, dict) else None
    if not choices:
        raise ValueError('No choices in LLM response')
    message = choices[0].get('message') if isinstance(choices[0], dict) else None
    content = message.get('content') if isinstance(message, dict) else None
    if not content:
        raise ValueError('Empty LLM response')
    return str(content)


def _parse_step(content: str) -> Dict[str, object]:
    content = content.strip()
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        start = content.find('{')
        end = content.rfind('}')
        if start == -1 or end == -1 or end <= start:
            return {}
        try:
            payload = json.loads(content[start:end + 1])
        except json.JSONDecodeError:
            return {}
    if not isinstance(payload, dict):
        return {}
    return payload


def _merge_step(primary: Dict[str, object], fallback: Dict[str, object]) -> Dict[str, object]:
    merged = dict(fallback)
    for key in (
        'title',
        'hook',
        'why_it_matters',
        'next_click',
        'pitfall',
        'confidence',
        'concept',
        'why_here',
        'remember',
    ):
        value = primary.get(key)
        if isinstance(value, str) and value.strip():
            merged[key] = value.strip()
    explanation = primary.get('explanation')
    if isinstance(explanation, list):
        cleaned = [str(item).strip() for item in explanation if str(item).strip()]
        if cleaned:
            merged['explanation'] = cleaned[:3]
    related_nodes = primary.get('related_nodes')
    if isinstance(related_nodes, list) and related_nodes:
        merged['related_nodes'] = _normalize_related_nodes(related_nodes)
    related_arcs = primary.get('related_arcs')
    if isinstance(related_arcs, list) and related_arcs:
        merged['related_arcs'] = _normalize_related_arcs(related_arcs)
    context_links = primary.get('context_links')
    if isinstance(context_links, list) and context_links:
        merged['context_links'] = _normalize_context_links(context_links)
    story_so_far = primary.get('story_so_far')
    if isinstance(story_so_far, list) and story_so_far:
        merged['story_so_far'] = _normalize_story_so_far(story_so_far)
    merged['prompt_version'] = PROMPT_VERSION
    return merged


def _normalize_related_nodes(raw: List[object]) -> List[dict]:
    results: List[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        node_id = str(item.get('node_id') or '').strip()
        label = str(item.get('label') or '').strip()
        if node_id and label:
            results.append({'node_id': node_id, 'label': label})
    return results[:4]


def _normalize_related_arcs(raw: List[object]) -> List[dict]:
    results: List[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        arc_id = str(item.get('arc_id') or '').strip()
        title = str(item.get('title') or '').strip()
        if arc_id and title:
            results.append({'arc_id': arc_id, 'title': title})
    return results[:4]


def _normalize_context_links(raw: List[object]) -> List[dict]:
    results: List[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        label = str(item.get('label') or '').strip()
        file_path = str(item.get('file_path') or '').strip()
        node_id = str(item.get('node_id') or '').strip()
        line = item.get('line')
        if not label:
            continue
        if file_path or node_id:
            entry: Dict[str, object] = {'label': label}
            if file_path:
                entry['file_path'] = file_path
            if node_id:
                entry['node_id'] = node_id
            if isinstance(line, int) and line > 0:
                entry['line'] = line
            results.append(entry)
    return results[:6]


def _normalize_story_so_far(raw: List[object]) -> List[str]:
    results: List[str] = []
    for item in raw:
        text = str(item).strip()
        if text:
            results.append(text)
    return results[:6]


def _story_so_far(context_window: List[dict]) -> List[str]:
    summary: List[str] = []
    for item in context_window[-3:]:
        if not isinstance(item, dict):
            continue
        text = str(item.get('summary') or '').strip()
        if text:
            summary.append(text)
    return summary


def _tour_cache_key(index: RepoIndex, arc: dict, step_index: int, mode: str, node_id: str) -> str:
    payload = '|'.join([
        index.repo_id,
        index.content_signature or '',
        str(arc.get('id') or ''),
        str(step_index),
        mode,
        node_id,
        PROMPT_VERSION,
    ])
    return hashlib.sha1(payload.encode('utf-8', errors='replace')).hexdigest()


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default
