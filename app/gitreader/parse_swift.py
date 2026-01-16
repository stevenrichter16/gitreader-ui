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
class ParsedSwiftFile:
    path: str
    module: str
    tree: Optional[object]
    source: str


@dataclass
class ParsedSwift:
    files: List[ParsedSwiftFile]
    warnings: List[ParseWarning]


def parse_swift_files(root_path: str, rel_paths: List[str]) -> ParsedSwift:
    parsed_files: List[ParsedSwiftFile] = []
    warnings: List[ParseWarning] = []
    for rel_path in rel_paths:
        full_path = os.path.join(root_path, rel_path)
        source = _read_source(full_path, rel_path, warnings)
        if source is None:
            continue
        parser = _get_parser(warnings, rel_path)
        tree = None
        if parser:
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
        parsed_files.append(ParsedSwiftFile(
            path=rel_path,
            module=module_path,
            tree=tree,
            source=source,
        ))
    return ParsedSwift(files=parsed_files, warnings=warnings)


def module_path_from_file(rel_path: str) -> str:
    module_path = rel_path.replace(os.sep, '.')
    if module_path.endswith('.swift'):
        module_path = module_path[:-len('.swift')]
    return module_path.strip('.')


def _get_parser(warnings: List[ParseWarning], rel_path: str):
    if get_ts_parser:
        try:
            return get_ts_parser('swift')
        except Exception:
            pass
    if not Parser:
        warnings.append(ParseWarning(
            code='parser_unavailable',
            message='Unable to load tree-sitter parser: swift (Parser unavailable)',
            path=rel_path,
        ))
        return None
    try:
        import tree_sitter_swift as ts_swift
        parser = Parser()
        _set_parser_language(parser, _ensure_language(ts_swift.language()), warnings, rel_path)
        return parser
    except Exception as exc:
        warnings.append(ParseWarning(
            code='parser_unavailable',
            message=f'Unable to load tree-sitter parser: swift ({exc})',
            path=rel_path,
        ))
        return None


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


def _set_parser_language(parser: object, language: object, warnings: List[ParseWarning], rel_path: str) -> None:
    if hasattr(parser, 'set_language'):
        try:
            parser.set_language(language)
            return
        except Exception as exc:
            warnings.append(ParseWarning(
                code='parser_unavailable',
                message=f'set_language failed ({exc})',
                path=rel_path,
            ))
    try:
        parser.language = language
    except Exception as exc:
        warnings.append(ParseWarning(
            code='parser_unavailable',
            message=f'language assignment failed ({exc})',
            path=rel_path,
        ))


def _ensure_language(raw: object) -> object:
    if Language is None:
        return raw
    if isinstance(raw, Language):
        return raw
    try:
        return Language(raw)
    except Exception:
        return raw
