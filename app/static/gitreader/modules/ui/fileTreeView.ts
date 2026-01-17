import { buildFileTreeFromNodes, renderFileTreeMarkup, type FileTreeNode, type FileTreeRenderResult, type FileTreeSourceNode } from './fileTree';
import { expandFileTreeForFocus } from './fileTreeInteractions';
import { normalizePath } from '../utils/strings';

// Shared dependencies used to build and render file trees without owning app state.
export interface FileTreeViewDependencies {
    // Builds the tree model from graph file nodes.
    buildTree: (nodes: FileTreeSourceNode[]) => FileTreeNode;
    // Renders HTML + row metadata for a given tree and focus path.
    renderTree: (
        root: FileTreeNode | null,
        focusPath: string | null | undefined,
        collapsed: Set<string>,
    ) => FileTreeRenderResult;
    // Expands ancestor folders so the focused file or folder is visible.
    expandForFocus: (collapsed: Set<string>, path: string, fileNodesByPath: Map<string, unknown>) => void;
    // Normalizes path separators for consistent matching across OSes.
    normalizePath: (path: string) => string;
}

// File tree view model that owns collapse/focus state for narrator + reader trees.
export class FileTreeView {
    private root: FileTreeNode | null = null;
    private nodes: FileTreeSourceNode[] = [];
    private fileNodesByPath: Map<string, unknown> = new Map();
    private collapsed: Set<string> = new Set();
    private narratorFocusPath: string | null = null;
    private narratorRows: FileTreeRenderResult['rows'] = [];
    private readerRows: FileTreeRenderResult['rows'] = [];

    // Captures rendering helpers so the view can be reused by app and reader modules.
    constructor(private deps: FileTreeViewDependencies) {}

    // Rebuilds the tree model when graph nodes change and keeps file-node lookups in sync.
    setNodes(nodes: FileTreeSourceNode[], fileNodesByPath: Map<string, unknown>): void {
        this.nodes = nodes;
        this.fileNodesByPath = fileNodesByPath;
        this.root = this.deps.buildTree(nodes);
    }

    // Returns the latest narrator rows (primarily for debugging or future use).
    getNarratorRows(): FileTreeRenderResult['rows'] {
        return this.narratorRows;
    }

    // Returns the latest reader rows (primarily for debugging or future use).
    getReaderRows(): FileTreeRenderResult['rows'] {
        return this.readerRows;
    }

    // Reads the current narrator focus path so callers can restore focus after updates.
    getNarratorFocusPath(): string | null {
        return this.narratorFocusPath;
    }

    // Toggles a folder path in the collapsed set to expand/collapse descendants.
    toggle(path: string): void {
        const normalized = this.deps.normalizePath(path);
        if (this.collapsed.has(normalized)) {
            this.collapsed.delete(normalized);
        } else {
            this.collapsed.add(normalized);
        }
    }

    // Renders the narrator file tree, expanding the focus path when provided.
    renderNarratorTree(focusPath?: string | null): FileTreeRenderResult {
        const normalized = typeof focusPath === 'undefined'
            ? (this.narratorFocusPath ?? '')
            : this.normalizeFocusPath(focusPath);
        this.narratorFocusPath = normalized || null;
        if (normalized) {
            this.deps.expandForFocus(this.collapsed, normalized, this.fileNodesByPath);
        }
        const result = this.renderTree(normalized);
        this.narratorRows = result.rows;
        return result;
    }

    // Renders the reader file tree for a specific focus path.
    renderReaderTree(focusPath: string): FileTreeRenderResult {
        const normalized = this.normalizeFocusPath(focusPath);
        if (normalized) {
            this.deps.expandForFocus(this.collapsed, normalized, this.fileNodesByPath);
        }
        const result = this.renderTree(normalized);
        this.readerRows = result.rows;
        return result;
    }

    // Ensures the tree model exists before rendering so empty graphs still render gracefully.
    private renderTree(focusPath: string): FileTreeRenderResult {
        if (!this.root) {
            this.root = this.nodes.length > 0 ? this.deps.buildTree(this.nodes) : null;
        }
        return this.deps.renderTree(this.root, focusPath, this.collapsed);
    }

    // Normalizes focus paths to avoid mismatched separators or empty values.
    private normalizeFocusPath(path: string | null | undefined): string {
        if (!path) {
            return '';
        }
        return this.deps.normalizePath(path);
    }
}

// Default production wiring for the file tree view (used by GitReaderApp).
export const fileTreeViewDefaults: FileTreeViewDependencies = {
    buildTree: buildFileTreeFromNodes,
    renderTree: renderFileTreeMarkup,
    expandForFocus: expandFileTreeForFocus,
    normalizePath,
};
