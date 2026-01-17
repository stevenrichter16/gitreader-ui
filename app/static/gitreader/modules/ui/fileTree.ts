import { getParentPath } from '../utils/paths';
import { escapeHtml, normalizePath } from '../utils/strings';

// Minimal node shape consumed to build a folder/file tree from the symbol graph.
export interface FileTreeSourceNode {
    kind?: string;
    location?: { path?: string };
}

// In-memory representation of the repository tree used for rendering and metadata.
export interface FileTreeNode {
    name: string;
    path: string;
    isFile: boolean;
    children: Map<string, FileTreeNode>;
}

// Per-row metadata captured during rendering so the caller can reason about focus state.
export interface FileTreeRow {
    path: string;
    name: string;
    depth: number;
    isFile: boolean;
    isCollapsed: boolean;
    isFocus: boolean;
    isFocusParent: boolean;
    isCollapsedFocusParent: boolean;
}

// Combined output of the file tree renderer: HTML plus row metadata for callers to store.
export interface FileTreeRenderResult {
    html: string;
    rows: FileTreeRow[];
}

// Builds a file tree from file nodes so both the narrator tree and cluster view share structure.
export function buildFileTreeFromNodes(nodes: FileTreeSourceNode[]): FileTreeNode {
    const root: FileTreeNode = {
        name: '',
        path: '',
        isFile: false,
        children: new Map(),
    };
    nodes.forEach((node) => {
        if (node.kind !== 'file' || !node.location?.path) {
            return;
        }
        const normalized = normalizePath(node.location.path);
        const parts = normalized.split('/').filter(Boolean);
        let cursor = root;
        let currentPath = '';
        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const isFile = index === parts.length - 1;
            let next = cursor.children.get(part);
            if (!next) {
                next = {
                    name: part,
                    path: currentPath,
                    isFile,
                    children: new Map(),
                };
                cursor.children.set(part, next);
            }
            if (isFile) {
                next.isFile = true;
            }
            cursor = next;
        });
    });
    return root;
}

// Counts file leaves so folder nodes can display file counts in the cluster view.
export function countFilesInTree(node: FileTreeNode): number {
    if (node.isFile) {
        return 1;
    }
    let count = 0;
    node.children.forEach((child) => {
        count += countFilesInTree(child);
    });
    return count;
}

// Renders the file tree HTML and captures row metadata for the caller to store.
export function renderFileTreeMarkup(
    root: FileTreeNode | null,
    focusPath: string | null | undefined,
    collapsed: Set<string>,
): FileTreeRenderResult {
    const normalizedFocus = focusPath ? normalizePath(focusPath) : '';
    if (!root || root.children.size === 0) {
        return { html: '<p class="file-tree-empty">No files loaded yet.</p>', rows: [] };
    }
    const focusParentPath = getParentPath(normalizedFocus);
    const collapsedFocusParents = getCollapsedFocusParents(normalizedFocus, collapsed);
    const rows: FileTreeRow[] = [];
    const html = renderFileTreeNode(
        root,
        normalizedFocus,
        focusParentPath,
        collapsedFocusParents,
        collapsed,
        rows,
        0,
    );
    return {
        html: html || '<p class="file-tree-empty">No files loaded yet.</p>',
        rows,
    };
}

// Identifies which ancestor folders are collapsed so focus highlighting can bubble upward.
function getCollapsedFocusParents(path: string, collapsed: Set<string>): Set<string> {
    const collapsedParents = new Set<string>();
    if (!path) {
        return collapsedParents;
    }
    const parts = normalizePath(path).split('/').filter(Boolean);
    let current = '';
    for (const part of parts.slice(0, -1)) {
        current = current ? `${current}/${part}` : part;
        if (collapsed.has(current)) {
            collapsedParents.add(current);
        }
    }
    return collapsedParents;
}

// Recursively renders tree rows into HTML while capturing per-row metadata for the caller.
function renderFileTreeNode(
    node: FileTreeNode,
    focusPath: string,
    focusParentPath: string | null,
    collapsedFocusParents: Set<string>,
    collapsed: Set<string>,
    rows: FileTreeRow[],
    depth: number,
): string {
    const entries = Array.from(node.children.values());
    if (entries.length === 0) {
        return '';
    }
    entries.sort((a, b) => {
        if (a.isFile !== b.isFile) {
            return a.isFile ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
    });
    const items = entries.map((child) => {
        const isFocus = Boolean(focusPath && child.path === focusPath);
        const isFocusFile = child.isFile && isFocus;
        const isFocusDir = !child.isFile && isFocus;
        const isFocusParent = !child.isFile && focusParentPath && child.path === focusParentPath;
        if (child.isFile) {
            rows.push({
                path: child.path,
                name: child.name,
                depth,
                isFile: true,
                isCollapsed: false,
                isFocus: isFocusFile,
                isFocusParent: false,
                isCollapsedFocusParent: false,
            });
            return `
                <li class="file-tree-item${isFocusFile ? ' is-focus' : ''}" data-tree-file="${escapeHtml(child.path)}">
                    <span class="file-tree-name">${escapeHtml(child.name)}</span>
                </li>
            `;
        }
        const isCollapsed = collapsed.has(child.path);
        const isCollapsedFocusParent = isCollapsed && collapsedFocusParents.has(child.path);
        rows.push({
            path: child.path,
            name: child.name,
            depth,
            isFile: false,
            isCollapsed,
            isFocus: isFocusDir,
            isFocusParent: Boolean(isFocusParent),
            isCollapsedFocusParent,
        });
        const childrenHtml = renderFileTreeNode(
            child,
            focusPath,
            focusParentPath,
            collapsedFocusParents,
            collapsed,
            rows,
            depth + 1,
        );
        return `
            <li class="file-tree-item is-dir${isCollapsed ? ' is-collapsed' : ''}${isFocusDir || isCollapsedFocusParent ? ' is-focus' : ''}">
                <button class="file-tree-toggle" type="button" data-tree-toggle="${escapeHtml(child.path)}">
                    <span class="file-tree-caret"></span>
                    <span class="file-tree-name">${escapeHtml(child.name)}/</span>
                </button>
                <div class="file-tree-children">${childrenHtml}</div>
            </li>
        `;
    });
    return `<ul class="file-tree-list">${items.join('')}</ul>`;
}
