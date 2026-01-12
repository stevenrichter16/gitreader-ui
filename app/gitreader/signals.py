import re
from typing import Dict, List


ROUTE_DECORATOR_RE = re.compile(
    r'@(?P<owner>[\w\.]+)\.route\(\s*[\'"](?P<path>[^\'"]+)[\'"](?P<rest>[^)]*)\)',
    re.MULTILINE,
)
METHODS_RE = re.compile(r'methods\s*=\s*\[([^\]]+)\]')
TEMPLATE_RE = re.compile(r'render_template\(\s*[\'"]([^\'"]+)')
URL_FOR_RE = re.compile(r'url_for\(\s*[\'"]([^\'"]+)')
REQUEST_RE = re.compile(r'\brequest\.(args|form|json|values)\b')
DB_WRITE_RE = re.compile(r'\bdb\.session\.(add|commit|delete)\b')
DB_QUERY_RE = re.compile(r'\b\w+\.query\b')
LOGIN_RE = re.compile(r'\blogin_user\(')
LOGOUT_RE = re.compile(r'\blogout_user\(')
CURRENT_USER_RE = re.compile(r'\bcurrent_user\b')
JSONIFY_RE = re.compile(r'\bjsonify\(')
REDIRECT_RE = re.compile(r'\bredirect\(')
ABORT_RE = re.compile(r'\babort\(')
FLASH_RE = re.compile(r'\bflash\(')


def extract_signals(snippet_text: str) -> Dict[str, List[str]]:
    signals = {
        'routes': [],
        'templates': [],
        'redirects': [],
        'responses': [],
        'auth': [],
        'db': [],
        'request': [],
        'flash': [],
    }
    if not snippet_text:
        return signals

    for match in ROUTE_DECORATOR_RE.finditer(snippet_text):
        path = match.group('path').strip()
        rest = match.group('rest') or ''
        methods = _parse_methods(rest)
        label = f'{"|".join(methods) if methods else "ANY"} {path}'
        _append_unique(signals['routes'], label)

    for match in TEMPLATE_RE.finditer(snippet_text):
        _append_unique(signals['templates'], match.group(1).strip())

    for match in URL_FOR_RE.finditer(snippet_text):
        _append_unique(signals['redirects'], match.group(1).strip())

    for match in REQUEST_RE.finditer(snippet_text):
        _append_unique(signals['request'], f'request.{match.group(1)}')

    for match in DB_WRITE_RE.finditer(snippet_text):
        _append_unique(signals['db'], match.group(1))

    if DB_QUERY_RE.search(snippet_text):
        _append_unique(signals['db'], 'query')

    if LOGIN_RE.search(snippet_text):
        _append_unique(signals['auth'], 'login_user')
    if LOGOUT_RE.search(snippet_text):
        _append_unique(signals['auth'], 'logout_user')
    if CURRENT_USER_RE.search(snippet_text):
        _append_unique(signals['auth'], 'current_user')

    if JSONIFY_RE.search(snippet_text):
        _append_unique(signals['responses'], 'jsonify')
    if REDIRECT_RE.search(snippet_text):
        _append_unique(signals['responses'], 'redirect')
    if ABORT_RE.search(snippet_text):
        _append_unique(signals['responses'], 'abort')

    if FLASH_RE.search(snippet_text):
        _append_unique(signals['flash'], 'flash')

    return signals


def format_signals(signals: Dict[str, List[str]]) -> List[str]:
    lines: List[str] = []
    routes = signals.get('routes') or []
    templates = signals.get('templates') or []
    redirects = signals.get('redirects') or []
    responses = signals.get('responses') or []
    auth = signals.get('auth') or []
    request = signals.get('request') or []
    db = signals.get('db') or []
    flash = signals.get('flash') or []

    if routes:
        lines.append(f'route: {", ".join(routes[:2])}')
    if templates:
        lines.append(f'renders: {", ".join(templates[:2])}')
    if responses:
        lines.append(f'response: {", ".join(responses[:2])}')
    if redirects:
        lines.append(f'url_for: {", ".join(redirects[:2])}')
    if auth:
        lines.append(f'auth: {", ".join(auth[:2])}')
    if request:
        lines.append(f'request: {", ".join(request[:2])}')
    if db:
        lines.append(f'db: {", ".join(db[:2])}')
    if flash:
        lines.append('flash: yes')
    return lines


def primary_route(signals: Dict[str, List[str]]) -> str:
    routes = signals.get('routes') or []
    return routes[0] if routes else ''


def signal_summary(signals: Dict[str, List[str]], limit: int = 3) -> List[str]:
    lines: List[str] = []
    templates = signals.get('templates') or []
    responses = signals.get('responses') or []
    redirects = signals.get('redirects') or []
    auth = signals.get('auth') or []
    request = signals.get('request') or []
    db = signals.get('db') or []
    flash = signals.get('flash') or []

    if templates:
        lines.append(f'Renders: {", ".join(templates[:2])}.')
    if responses:
        lines.append(f'Response: {", ".join(responses[:2])}.')
    if redirects:
        lines.append(f'Navigation: {", ".join(redirects[:2])}.')
    if auth:
        lines.append(f'Auth: {", ".join(auth[:2])}.')
    if request:
        lines.append(f'Request: {", ".join(request[:2])}.')
    if db:
        lines.append(f'Database: {", ".join(db[:2])}.')
    if flash:
        lines.append('Flash messages emitted.')
    return lines[:limit]


def _append_unique(items: List[str], value: str) -> None:
    if value and value not in items:
        items.append(value)


def _parse_methods(rest: str) -> List[str]:
    match = METHODS_RE.search(rest)
    if not match:
        return []
    raw = match.group(1)
    methods: List[str] = []
    for item in raw.split(','):
        cleaned = item.strip().strip('\'"')
        if cleaned:
            methods.append(cleaned)
    return methods
