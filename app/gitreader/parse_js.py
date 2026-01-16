import os
from dataclasses import dataclass
from typing import List, Optional

try:
    from tree_sitter_languages import get_parser as get_ts_parser
except Exception:
    get_ts_parser = None

try:
    from tree_sitter import Language, Parser
except Exception:
    Parser = None
    Language = None

from .models import ParseWarning


@dataclass
class ParsedJsFile:
    path: str
    module: str
    tree: Optional[object]
    source: str
    language: str


@dataclass
class ParsedJs:
    files: List[ParsedJsFile]
    warnings: List[ParseWarning]


LANGUAGE_BY_EXT = {
    '.js': ['javascript'],
    '.jsx': ['javascript', 'jsx'],
    '.ts': ['typescript'],
    '.tsx': ['tsx', 'typescript'],
}


def parse_js_files(root_path: str, rel_paths: List[str]) -> ParsedJs:
    parsed_files: List[ParsedJsFile] = []
    warnings: List[ParseWarning] = []
    for rel_path in rel_paths:
        full_path = os.path.join(root_path, rel_path)
        source = _read_source(full_path, rel_path, warnings)
        if source is None:
            continue
        parser, language = _get_parser_for_path(rel_path, warnings)
        tree = None
        if parser and language:
            try:
                tree = parser.parse(source.encode('utf-8'))
            except Exception as exc:
                warnings.append(ParseWarning(
                    code='parse_failed',
                    message=f'Parser failed: {exc}',
                    path=rel_path,
                ))
                tree = None
            if tree and getattr(tree.root_node, "has_error", False):
                warnings.append(ParseWarning(
                    code='syntax_error',
                    message='Tree-sitter reported syntax errors',
                    path=rel_path,
                ))
        module_path = module_path_from_file(rel_path)
        parsed_files.append(ParsedJsFile(
            path=rel_path,
            module=module_path,
            tree=tree,
            source=source,
            language=language,
        ))
    return ParsedJs(files=parsed_files, warnings=warnings)


def module_path_from_file(rel_path: str) -> str:
    module_path = rel_path.replace(os.sep, '.')
    for ext in ('.js', '.jsx', '.ts', '.tsx'):
        if module_path.endswith(ext):
            module_path = module_path[:-len(ext)]
            break
    return module_path.strip('.')


def _language_candidates(rel_path: str) -> List[str]:
    _, ext = os.path.splitext(rel_path)
    ext = ext.lower()
    candidates = LANGUAGE_BY_EXT.get(ext)
    if candidates:
        return list(candidates)
    return ['javascript']


def _get_parser_for_path(rel_path: str, warnings: List[ParseWarning]):
    errors: List[str] = []
    for language in _language_candidates(rel_path):
        parser = _build_parser(language, errors)
        if parser:
            return parser, language
    warnings.append(ParseWarning(
        code='parser_unavailable',
        message=f'Unable to load tree-sitter parser(s): {", ".join(errors)}',
        path=rel_path,
    ))
    return None, None


def _build_parser(language: str, errors: List[str]):
    if get_ts_parser:
        try:
            return get_ts_parser(language)
        except Exception as exc:
            errors.append(f'{language} (tree_sitter_languages: {exc})')
    if not Parser:
        errors.append(f'{language} (tree_sitter Parser unavailable)')
        return None
    ts_language = _load_language(language, errors)
    if not ts_language:
        return None
    parser = Parser()
    _set_parser_language(parser, ts_language, errors)
    return parser


def _load_language(language: str, errors: List[str]):
    if language in {'javascript', 'jsx'}:
        try:
            import tree_sitter_javascript as ts_js
            return _ensure_language(ts_js.language())
        except Exception as exc:
            errors.append(f'{language} (tree_sitter_javascript: {exc})')
            return None
    if language in {'typescript', 'tsx'}:
        try:
            import tree_sitter_typescript as ts_ts
            if language == 'tsx' and hasattr(ts_ts, 'language_tsx'):
                return _ensure_language(ts_ts.language_tsx())
            if hasattr(ts_ts, 'language_typescript'):
                return _ensure_language(ts_ts.language_typescript())
            if hasattr(ts_ts, 'language'):
                return _ensure_language(ts_ts.language())
        except Exception as exc:
            errors.append(f'{language} (tree_sitter_typescript: {exc})')
            return None
    errors.append(f'{language} (no grammar module)')
    return None


def _set_parser_language(parser: object, language: object, errors: List[str]) -> None:
    if hasattr(parser, 'set_language'):
        try:
            parser.set_language(language)
            return
        except Exception as exc:
            errors.append(f'set_language failed ({exc})')
    try:
        parser.language = language
    except Exception as exc:
        errors.append(f'language assignment failed ({exc})')


def _ensure_language(raw: object) -> object:
    if Language is None:
        return raw
    if isinstance(raw, Language):
        return raw
    try:
        return Language(raw)
    except Exception:
        return raw


def _read_source(full_path: str, rel_path: str, warnings: List[ParseWarning]) -> Optional[str]:
    try:
        with open(full_path, 'r', encoding='utf-8') as handle:
            return handle.read()
    except UnicodeDecodeError:
        try:
            with open(full_path, 'r', encoding='utf-8', errors='replace') as handle:
                warnings.append(ParseWarning(
                    code='decode_lossy',
                    message='Decoded with replacement characters',
                    path=rel_path,
                ))
                return handle.read()
        except OSError as exc:
            warnings.append(ParseWarning(
                code='read_failed',
                message=str(exc),
                path=rel_path,
            ))
            return None
    except OSError as exc:
        warnings.append(ParseWarning(
            code='read_failed',
            message=str(exc),
            path=rel_path,
        ))
        return None
