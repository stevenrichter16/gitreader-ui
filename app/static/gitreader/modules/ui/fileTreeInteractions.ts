import { normalizePath } from '../utils/strings';

// Toggles a folder path in the collapsed set so the file tree can expand/collapse.
export function toggleFileTreePath(collapsed: Set<string>, path: string): void {
    if (collapsed.has(path)) {
        collapsed.delete(path);
    } else {
        collapsed.add(path);
    }
}

// Expands all ancestor folders for a file path so the focused file is visible.
export function expandFileTreePath(collapsed: Set<string>, path: string): void {
    const normalized = normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    let current = '';
    for (const part of parts.slice(0, -1)) {
        current = current ? `${current}/${part}` : part;
        if (collapsed.has(current)) {
            break;
        }
        collapsed.delete(current);
    }
}

// Expands folders for either a file or folder focus, depending on whether the path is a file node.
export function expandFileTreeForFocus(
    collapsed: Set<string>,
    path: string,
    fileNodesByPath: Map<string, unknown>,
): void {
    const normalized = normalizePath(path);
    if (fileNodesByPath.has(normalized)) {
        expandFileTreePath(collapsed, normalized);
        return;
    }
    expandFileTreeFolder(collapsed, normalized);
}

// Ensures every folder along a path is expanded, used when focusing a folder itself.
export function expandFileTreeFolder(collapsed: Set<string>, path: string): void {
    const normalized = normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        collapsed.delete(current);
    }
}
