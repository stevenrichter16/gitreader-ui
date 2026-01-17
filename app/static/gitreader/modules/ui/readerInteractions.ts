import { renderImportBreadcrumbs } from './breadcrumbs';
import type { FileTreeView } from './fileTreeView';
import { escapeHtml, normalizePath } from '../utils/strings';
import type { FoldRange, SymbolNode, SymbolSnippetResponse } from '../types';
import type { ReaderStateUpdate } from './reader';

// State accessors used by reader interactions so GitReaderApp stays the source of truth.
export interface ReaderInteractionState {
    // Reads the symbol currently displayed in the reader.
    getCurrentSymbol(): SymbolNode | null;
    // Reads the raw snippet text so line-level operations can inspect it.
    getCurrentSnippetText(): string;
    // Reads the first line number for the current snippet body.
    getCurrentSnippetStartLine(): number;
    // Reads whether the reader is currently showing the file tree view.
    getReaderTreeFocusPath(): string | null;
    // Updates reader state fields owned by GitReaderApp.
    setReaderState(update: ReaderStateUpdate): void;
    // Returns the current import breadcrumb trail revealed in the reader header.
    getImportBreadcrumbs(): string[];
    // Replaces the import breadcrumb trail after a navigation step.
    setImportBreadcrumbs(breadcrumbs: string[]): void;
    // Returns the set of folded symbol ids so fold toggles persist across renders.
    getFoldedSymbolIds(): Set<string>;
    // Reads the active fold ranges for the currently rendered file.
    getCurrentFoldRanges(): Map<string, FoldRange>;
    // Updates the active fold ranges after recomputing them.
    setCurrentFoldRanges(ranges: Map<string, FoldRange>): void;
    // Updates the file path used to scope fold ranges.
    setCurrentFoldPath(path: string | null): void;
    // Returns the full list of graph nodes for symbol resolution.
    getGraphNodes(): SymbolNode[];
    // Returns the map of file nodes keyed by normalized path.
    getFileNodesByPath(): Map<string, SymbolNode>;
}

// Dependencies and callbacks required for reader-side interactions.
export interface ReaderInteractionDependencies {
    // Code surface element that receives reader HTML and event handling.
    codeSurface: HTMLElement;
    // Buttons used to show snippet mode state in the reader controls.
    snippetModeButtons: NodeListOf<HTMLButtonElement>;
    // Button that toggles reader file tree mode (may be null in minimal layouts).
    readerFileTreeButton: HTMLButtonElement | null;
    // Maps file paths to highlight.js language identifiers for import parsing.
    getHighlightLanguage: (path?: string) => string | undefined;
    // Returns whether a click uses a modifier (cmd/ctrl) for navigation.
    isModifierClick: (event?: MouseEvent) => boolean;
    // Updates the reader status line for feedback messages.
    setCodeStatus: (message: string) => void;
    // Refreshes the narrator file tree when the reader tree changes.
    renderFileTree: (focusPath?: string | null) => void;
    // Syncs snippet mode UI when the reader leaves file tree mode.
    updateSnippetModeUi: () => void;
    // Navigates the reader to a symbol and loads its snippet.
    jumpToSymbol: (symbol: SymbolNode) => void;
    // Loads a file and highlights a symbol within it for definition jumps.
    highlightSymbolInFile: (fileNode: SymbolNode, symbol: SymbolNode) => Promise<void>;
    // Resolves a symbol to its owning file node for navigation and selection.
    getFileNodeForSymbol: (symbol: SymbolNode) => SymbolNode | null;
    // Updates graph selection for file/symbol navigation.
    selectGraphNodes: (fileNode: SymbolNode | null, symbol?: SymbolNode | null) => void;
    // Copies the current snippet text to the clipboard.
    copySnippet: () => void;
    // Jumps to a user-entered line number inside the reader.
    jumpToInputLine: () => void;
    // Shared file tree view that renders narrator + reader trees and owns collapse state.
    fileTreeView: FileTreeView;
    // Reader state accessors/mutators wired from GitReaderApp.
    state: ReaderInteractionState;
}

// Reader interaction controller that owns click/keyboard behavior and navigation helpers.
export class ReaderInteractions {
    private importModal: HTMLElement | null = null;
    private importModalMessage: HTMLElement | null = null;

    // Captures app dependencies so reader handlers can orchestrate navigation and UI updates.
    constructor(private deps: ReaderInteractionDependencies) {}

    // Handles reader click interactions (folds, breadcrumbs, imports, cmd-click).
    handleCodeSurfaceClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const foldToggle = target.closest<HTMLElement>('[data-fold-toggle]');
        if (foldToggle) {
            const foldId = foldToggle.dataset.foldToggle;
            if (foldId) {
                this.toggleFold(foldId);
            }
            return;
        }
        const breadcrumbTarget = target.closest<HTMLElement>('[data-breadcrumb-path]');
        if (breadcrumbTarget) {
            const path = breadcrumbTarget.dataset.breadcrumbPath;
            if (path) {
                this.navigateBreadcrumb(path);
            }
            return;
        }
        const actionTarget = target.closest<HTMLElement>('[data-reader-action]');
        if (actionTarget) {
            const action = actionTarget.dataset.readerAction;
            if (action === 'copy') {
                this.deps.copySnippet();
            } else if (action === 'jump') {
                this.deps.jumpToInputLine();
            }
            return;
        }
        const importTarget = target.closest<HTMLElement>('[data-import-name]');
        if (importTarget) {
            const importName = importTarget.dataset.importName;
            if (importName) {
                if (this.deps.isModifierClick(event)) {
                    this.handleImportJump(importName, importTarget.closest<HTMLElement>('.code-line'));
                } else {
                    this.highlightImportUsage(importName);
                }
            }
            return;
        }
        const importLine = target.closest<HTMLElement>('.code-line[data-imports]');
        if (importLine) {
            const imports = (importLine.dataset.imports || '').split(',').map((value) => value.trim()).filter(Boolean);
            if (imports.length > 0) {
                if (this.deps.isModifierClick(event)) {
                    this.handleImportJump(imports[0], importLine);
                } else {
                    this.highlightImportUsage(imports[0]);
                }
            }
            return;
        }
        if (this.handleDefinitionJump(event, target)) {
            return;
        }
    }

    // Handles keydown events in the reader (line jump input).
    handleCodeSurfaceKeydown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;
        if (event.key === 'Enter' && target.matches('[data-line-input]')) {
            event.preventDefault();
            this.deps.jumpToInputLine();
        }
    }

    // Switches the reader into file tree mode for the current file/folder context.
    showReaderFileTreeForCurrent(): void {
        const path = this.deps.state.getCurrentSymbol()?.location?.path ?? this.deps.state.getReaderTreeFocusPath();
        if (!path) {
            return;
        }
        this.renderReaderFileTree(path);
        this.deps.renderFileTree(path);
        this.updateReaderControls();
    }

    // Renders the file tree inside the reader, updating shared state as needed.
    renderReaderFileTree(focusPath: string): void {
        const normalized = normalizePath(focusPath);
        const state = this.deps.state;
        state.setReaderState({
            readerTreeFocusPath: normalized || null,
            currentSymbol: null,
            currentSnippetText: '',
            currentSnippetStartLine: 1,
        });
        const { html } = this.deps.fileTreeView.renderReaderTree(normalized);
        const treeHtml = html;
        this.deps.codeSurface.innerHTML = `
            <article class="code-card">
                <div class="code-meta">
                    <span>FOLDER</span>
                    <span>${escapeHtml(normalized || 'Repository')}</span>
                </div>
                <div class="code-actions">
                    <span class="code-status">Folder contents</span>
                </div>
                <div class="file-tree">${treeHtml}</div>
            </article>
        `;
        this.updateReaderControls();
    }

    // Keeps reader controls in sync with file tree vs snippet view state.
    updateReaderControls(): void {
        if (!this.deps.readerFileTreeButton) {
            return;
        }
        const isFileTree = Boolean(this.deps.state.getReaderTreeFocusPath());
        this.deps.readerFileTreeButton.classList.toggle('is-active', isFileTree);
        if (isFileTree) {
            this.deps.snippetModeButtons.forEach((button) => button.classList.remove('is-active'));
        } else {
            this.deps.updateSnippetModeUi();
        }
    }

    // Builds the reader breadcrumb HTML from the current import trail.
    renderImportBreadcrumbs(path?: string): string {
        return renderImportBreadcrumbs(path, this.deps.state.getImportBreadcrumbs());
    }

    // Decorates import statements in the rendered snippet so tokens are clickable.
    decorateImportLines(snippet?: SymbolSnippetResponse, language?: string): void {
        if (!snippet?.snippet || !this.deps.state.getCurrentSymbol() || this.deps.state.getCurrentSymbol()?.kind !== 'file') {
            return;
        }
        this.clearImportUsageHighlights();
        const raw = snippet.snippet.replace(/\n$/, '');
        if (!raw) {
            return;
        }
        const lines = raw.split('\n');
        const startLine = snippet.start_line ?? 1;
        const isJsFamily = language === 'javascript' || language === 'typescript' || language === 'tsx';
        if (isJsFamily) {
            const blocks = this.findJSImportBlocks(lines);
            if (blocks.length > 0) {
                blocks.forEach((block) => {
                    const normalized = block.text.replace(/\s+/g, ' ').trim();
                    const importNames = this.extractImportNames(normalized, language);
                    if (importNames.length === 0) {
                        return;
                    }
                    for (let index = block.start; index <= block.end; index += 1) {
                        const lineText = lines[index];
                        const lineImports = this.filterImportNamesForLine(lineText, importNames);
                        if (lineImports.length === 0) {
                            continue;
                        }
                        const lineNumber = startLine + index;
                        const lineEl = this.deps.codeSurface.querySelector<HTMLElement>(`[data-line="${lineNumber}"]`);
                        if (!lineEl) {
                            continue;
                        }
                        lineEl.dataset.imports = lineImports.join(',');
                        lineEl.dataset.importStatement = normalized;
                        this.decorateImportLine(lineEl, lineImports);
                    }
                });
                return;
            }
        }
        lines.forEach((lineText, index) => {
            const importNames = this.extractImportNames(lineText, language);
            if (importNames.length === 0) {
                return;
            }
            const lineNumber = startLine + index;
            const lineEl = this.deps.codeSurface.querySelector<HTMLElement>(`[data-line="${lineNumber}"]`);
            if (!lineEl) {
                return;
            }
            lineEl.dataset.imports = importNames.join(',');
            this.decorateImportLine(lineEl, importNames);
        });
    }

    // Adds fold toggles to the rendered file and syncs them with fold state.
    applyFoldControls(symbol: SymbolNode): void {
        if (symbol.kind !== 'file' || !symbol.location?.path) {
            this.deps.state.setCurrentFoldRanges(new Map());
            this.deps.state.setCurrentFoldPath(null);
            return;
        }
        const path = normalizePath(symbol.location.path);
        const ranges = this.getFoldableRangesForPath(path);
        this.deps.state.setCurrentFoldRanges(new Map(ranges.map((range) => [range.id, range])));
        this.deps.state.setCurrentFoldPath(path);
        const foldedSymbolIds = this.deps.state.getFoldedSymbolIds();
        ranges.forEach((range) => {
            const lineEl = this.deps.codeSurface.querySelector<HTMLElement>(`[data-line="${range.start}"]`);
            if (!lineEl) {
                return;
            }
            if (lineEl.dataset.foldId === range.id) {
                return;
            }
            lineEl.dataset.foldId = range.id;
            lineEl.dataset.foldEnd = String(range.end);
            lineEl.classList.add('is-fold-start');
            const lineNo = lineEl.querySelector<HTMLElement>('.line-no');
            if (!lineNo) {
                return;
            }
            const lineNumber = (lineEl.dataset.line ?? lineNo.textContent ?? '').trim();
            lineNo.textContent = '';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'fold-toggle';
            button.dataset.foldToggle = range.id;
            button.setAttribute('aria-label', `Toggle ${range.kind} ${range.name}`);
            button.textContent = foldedSymbolIds.has(range.id) ? '+' : '-';
            const numberSpan = document.createElement('span');
            numberSpan.className = 'line-num';
            numberSpan.textContent = lineNumber;
            lineNo.append(button, numberSpan);
        });
        this.refreshFoldVisibility();
    }

    // Wraps matching import identifiers in a line with clickable tokens.
    private decorateImportLine(lineEl: HTMLElement, importNames: string[]): void {
        if (importNames.length === 0) {
            return;
        }
        const escaped = importNames.map((name) => this.escapeRegex(name));
        const matcher = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
        const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.textContent || !matcher.test(node.textContent)) {
                    matcher.lastIndex = 0;
                    return NodeFilter.FILTER_REJECT;
                }
                matcher.lastIndex = 0;
                const parent = node.parentElement;
                if (!parent || parent.closest('.line-no')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest('.code-import')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        const textNodes: Text[] = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode as Text);
        }
        textNodes.forEach((textNode) => {
            const text = textNode.textContent ?? '';
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match = matcher.exec(text);
            while (match) {
                const start = match.index;
                const end = start + match[0].length;
                if (start > lastIndex) {
                    fragment.append(text.slice(lastIndex, start));
                }
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'code-import';
                button.dataset.importName = match[0];
                button.textContent = match[0];
                fragment.append(button);
                lastIndex = end;
                match = matcher.exec(text);
            }
            matcher.lastIndex = 0;
            if (lastIndex < text.length) {
                fragment.append(text.slice(lastIndex));
            }
            textNode.parentNode?.replaceChild(fragment, textNode);
        });
    }

    // Updates the breadcrumb trail when navigation jumps between files.
    private updateImportBreadcrumbs(fromPath: string, toPath: string): void {
        const from = normalizePath(fromPath);
        const to = normalizePath(toPath);
        if (!from || !to) {
            return;
        }
        const breadcrumbs = this.deps.state.getImportBreadcrumbs();
        const last = breadcrumbs[breadcrumbs.length - 1];
        let next = breadcrumbs;
        if (!last || last !== from) {
            next = [from];
        }
        if (from !== to && next[next.length - 1] !== to) {
            next = [...next, to];
        }
        if (next !== breadcrumbs) {
            this.deps.state.setImportBreadcrumbs(next);
        }
    }

    // Navigates to a breadcrumb path when the reader header buttons are clicked.
    private navigateBreadcrumb(path: string): void {
        const normalized = normalizePath(path);
        const breadcrumbs = this.deps.state.getImportBreadcrumbs();
        const index = breadcrumbs.lastIndexOf(normalized);
        if (index < 0) {
            this.deps.state.setImportBreadcrumbs([normalized]);
        }
        const fileNode = this.deps.state.getFileNodesByPath().get(normalized);
        if (!fileNode) {
            this.deps.setCodeStatus(`"${normalized}" is not indexed in this project.`);
            return;
        }
        this.deps.jumpToSymbol(fileNode);
    }

    // Groups multi-line JS import/export blocks so we decorate every line in the block.
    private findJSImportBlocks(lines: string[]): Array<{ start: number; end: number; text: string }> {
        const blocks: Array<{ start: number; end: number; text: string }> = [];
        let inBlock = false;
        let blockStart = 0;
        let blockText = '';
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!inBlock) {
                if (!this.isJSImportStart(trimmed)) {
                    return;
                }
                inBlock = true;
                blockStart = index;
                blockText = trimmed;
                if (this.isJSImportComplete(blockText)) {
                    blocks.push({ start: blockStart, end: index, text: blockText });
                    inBlock = false;
                    blockText = '';
                }
                return;
            }
            if (trimmed) {
                blockText = blockText ? `${blockText} ${trimmed}` : trimmed;
            }
            if (this.isJSImportComplete(blockText)) {
                blocks.push({ start: blockStart, end: index, text: blockText });
                inBlock = false;
                blockText = '';
            }
        });
        if (inBlock) {
            blocks.push({ start: blockStart, end: lines.length - 1, text: blockText });
        }
        return blocks;
    }

    // Detects the start of a JS import/export statement so blocks can be collected.
    private isJSImportStart(trimmed: string): boolean {
        if (!trimmed) {
            return false;
        }
        if (trimmed.startsWith('import(')) {
            return false;
        }
        return /^import\b/.test(trimmed) || /^export\b/.test(trimmed);
    }

    // Determines when a JS import/export statement is complete for block grouping.
    private isJSImportComplete(statement: string): boolean {
        const normalized = statement.replace(/\s+/g, ' ').trim();
        if (!normalized) {
            return false;
        }
        if (/^export\b/.test(normalized) && !/\bfrom\s+['"][^'"]+['"]/.test(normalized)) {
            return true;
        }
        if (/\bfrom\s+['"][^'"]+['"]/.test(normalized)) {
            return true;
        }
        if (/^import\s+['"][^'"]+['"]/.test(normalized)) {
            return true;
        }
        if (/\brequire\s*\(\s*['"][^'"]+['"]\s*\)/.test(normalized)) {
            return true;
        }
        return normalized.endsWith(';');
    }

    // Filters import names to those actually present on the given line.
    private filterImportNamesForLine(lineText: string, importNames: string[]): string[] {
        if (!lineText || importNames.length === 0) {
            return [];
        }
        return importNames.filter((name) => {
            const matcher = new RegExp(`\\b${this.escapeRegex(name)}\\b`);
            return matcher.test(lineText);
        });
    }

    // Highlights usage lines for an import and scrolls to the first match.
    private highlightImportUsage(importName: string): void {
        if (!importName) {
            return;
        }
        this.clearImportUsageHighlights();
        const lines = Array.from(this.deps.codeSurface.querySelectorAll<HTMLElement>('.code-line'));
        let firstMatch: HTMLElement | null = null;
        let matchCount = 0;
        lines.forEach((line) => {
            const imports = (line.dataset.imports || '').split(',').map((value) => value.trim());
            if (imports.includes(importName)) {
                return;
            }
            if (this.lineHasIdentifierUsage(line, importName)) {
                line.classList.add('is-import-usage');
                matchCount += 1;
                if (!firstMatch) {
                    firstMatch = line;
                }
            }
        });
        if (!firstMatch) {
            this.deps.setCodeStatus(`No usages of ${importName} in this snippet.`);
            return;
        }
        this.deps.setCodeStatus(`Found ${matchCount} usage${matchCount === 1 ? '' : 's'} of ${importName}.`);
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Resolves cmd/ctrl-clicked imports into definitions and navigates the reader.
    private handleImportJump(importName: string, lineEl?: HTMLElement | null): void {
        const lineText = this.getLineTextForElement(lineEl ?? undefined);
        const language = this.deps.getHighlightLanguage(this.deps.state.getCurrentSymbol()?.location?.path);
        const currentPath = this.deps.state.getCurrentSymbol()?.location?.path;
        const statement = lineEl?.dataset.importStatement ?? lineText;
        const target = this.resolveImportTarget(importName, statement, language, currentPath);
        if (target) {
            const definitionName = this.getImportDefinitionName(importName, statement, language);
            this.navigateToSymbolDefinition(target, currentPath, definitionName);
            return;
        }
        const sourceLabel = statement ? ` from "${statement.trim()}"` : '';
        this.showImportModal(`"${importName}" is not defined in this project${sourceLabel}.`);
    }

    // Extracts a line of text for a code line element, preferring raw snippet text.
    private getLineTextForElement(lineEl?: HTMLElement): string {
        if (!lineEl) {
            return '';
        }
        const lineNumber = Number(lineEl.dataset.line);
        if (Number.isFinite(lineNumber) && this.deps.state.getCurrentSnippetText()) {
            const lines = this.deps.state.getCurrentSnippetText().replace(/\n$/, '').split('\n');
            const index = lineNumber - this.deps.state.getCurrentSnippetStartLine();
            if (index >= 0 && index < lines.length) {
                return lines[index];
            }
        }
        const textEl = lineEl.querySelector<HTMLElement>('.line-text');
        return textEl?.textContent ?? '';
    }

    // Routes import resolution based on the current snippet language.
    private resolveImportTarget(
        importName: string,
        lineText: string,
        language?: string,
        currentPath?: string,
    ): SymbolNode | null {
        const normalizedPath = currentPath ? normalizePath(currentPath) : '';
        if (language === 'python') {
            return this.resolvePythonImportTarget(importName, lineText, normalizedPath);
        }
        if (language === 'swift') {
            return this.resolveSwiftImportTarget(importName, lineText);
        }
        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            return this.resolveJsImportTarget(importName, lineText, normalizedPath);
        }
        return null;
    }

    // Resolves Python import statements to candidate files or symbols.
    private resolvePythonImportTarget(importName: string, lineText: string, currentPath: string): SymbolNode | null {
        const entry = this.parsePythonImportEntry(lineText, importName);
        if (!entry) {
            return null;
        }
        const candidates = this.resolvePythonModuleCandidates(entry.module, currentPath);
        if (!entry.importedName) {
            return this.findFileByCandidates(candidates);
        }
        const symbolName = entry.importedName ?? importName;
        const symbol = this.findSymbolInFiles(symbolName, candidates);
        if (symbol) {
            return symbol;
        }
        const fileNode = this.findFileByCandidates(candidates);
        if (fileNode) {
            return fileNode;
        }
        if (entry.importedName) {
            const extended = this.resolvePythonModuleCandidates(`${entry.module}.${entry.importedName}`, currentPath);
            const extendedFile = this.findFileByCandidates(extended);
            if (extendedFile) {
                return extendedFile;
            }
        }
        return null;
    }

    // Resolves JS/TS import statements to candidate files or symbols.
    private resolveJsImportTarget(importName: string, lineText: string, currentPath: string): SymbolNode | null {
        const info = this.parseJsImportEntry(lineText, importName);
        if (!info || !info.source) {
            return null;
        }
        if (!this.isRelativeImport(info.source)) {
            return null;
        }
        const candidates = this.resolveJsModuleCandidates(info.source, currentPath);
        if (candidates.length === 0) {
            return null;
        }
        const importedName = info.importedName ?? importName;
        const symbol = this.findSymbolInFiles(importedName, candidates);
        if (symbol) {
            return symbol;
        }
        return this.findFileByCandidates(candidates);
    }

    // Resolves Swift import statements to a matching module file if present.
    private resolveSwiftImportTarget(importName: string, lineText: string): SymbolNode | null {
        const moduleName = this.parseSwiftImportModule(lineText);
        if (!moduleName) {
            return null;
        }
        const moduleFile = this.findSwiftModuleFile(moduleName);
        if (moduleFile) {
            return moduleFile;
        }
        if (moduleName !== importName) {
            return this.findSwiftModuleFile(importName);
        }
        return null;
    }

    // Parses a Python import line to identify module and imported symbol.
    private parsePythonImportEntry(
        lineText: string,
        importName: string,
    ): { module: string; importedName?: string } | null {
        const trimmed = lineText.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return null;
        }
        if (trimmed.startsWith('import ')) {
            const rest = trimmed.slice('import '.length);
            const parts = rest.split(',');
            for (const part of parts) {
                const piece = part.trim();
                if (!piece) {
                    continue;
                }
                const segments = piece.split(/\s+as\s+/);
                const modulePart = segments[0].trim();
                const local = (segments[1] ?? modulePart).trim();
                if (local === importName) {
                    return { module: modulePart };
                }
            }
            return null;
        }
        if (trimmed.startsWith('from ')) {
            const match = trimmed.match(/^from\s+(\S+)\s+import\s+(.+)$/);
            if (!match) {
                return null;
            }
            const modulePart = match[1].trim();
            const importPart = match[2].split('#')[0].trim();
            const parts = importPart.split(',');
            for (const part of parts) {
                const piece = part.trim();
                if (!piece || piece === '*') {
                    continue;
                }
                const segments = piece.split(/\s+as\s+/);
                const imported = segments[0].trim();
                const local = (segments[1] ?? imported).trim();
                if (local === importName) {
                    return { module: modulePart, importedName: imported };
                }
            }
        }
        return null;
    }

    // Picks the best expected symbol name for a clicked import (handles aliases).
    private getImportDefinitionName(importName: string, statement: string, language?: string): string | null {
        if (!statement) {
            return null;
        }
        if (language === 'python') {
            const entry = this.parsePythonImportEntry(statement, importName);
            return entry?.importedName ?? null;
        }
        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            const entry = this.parseJsImportEntry(statement, importName);
            if (!entry) {
                return null;
            }
            return entry.importedName ?? importName;
        }
        return null;
    }

    // Parses JS/TS import/export lines to determine module source and local name mapping.
    private parseJsImportEntry(
        lineText: string,
        importName: string,
    ): { source: string; importedName?: string } | null {
        const importMatch = lineText.match(/^import\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/);
        const exportMatch = lineText.match(/^export\s+(?:type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"]/);
        const match = importMatch ?? exportMatch;
        if (match) {
            const binding = match[1];
            const source = match[2];
            const nameMap = this.parseJsImportBindingsMap(binding);
            if (nameMap.has(importName)) {
                return { source, importedName: nameMap.get(importName) };
            }
            return { source };
        }
        const importEqualsMatch = lineText.match(/^import\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (importEqualsMatch) {
            const local = importEqualsMatch[1];
            const source = importEqualsMatch[2];
            if (local === importName) {
                return { source, importedName: local };
            }
            return { source };
        }
        const requireMatch = lineText.match(/^(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (requireMatch) {
            const binding = requireMatch[1];
            const source = requireMatch[2];
            const nameMap = this.parseJsRequireBindingMap(binding);
            if (nameMap.has(importName)) {
                return { source, importedName: nameMap.get(importName) };
            }
            return { source };
        }
        return null;
    }

    // Extracts the module name from a Swift import statement.
    private parseSwiftImportModule(lineText: string): string | null {
        const trimmed = lineText.trim();
        if (!trimmed.startsWith('import ')) {
            return null;
        }
        const rest = trimmed.slice('import '.length).trim();
        const moduleName = rest.split(/\s+/)[0];
        return moduleName || null;
    }

    // Builds a map of local import names to original names for ES module bindings.
    private parseJsImportBindingsMap(binding: string): Map<string, string> {
        const map = new Map<string, string>();
        const trimmed = binding.trim();
        if (!trimmed) {
            return map;
        }
        if (trimmed.startsWith('{')) {
            this.fillBraceListMap(trimmed, map);
            return map;
        }
        if (trimmed.startsWith('*')) {
            const starMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
            if (starMatch) {
                map.set(starMatch[1], starMatch[1]);
            }
            return map;
        }
        const parts = trimmed.split(',');
        const defaultName = parts[0]?.trim();
        if (defaultName) {
            map.set(defaultName, defaultName);
        }
        if (parts.length > 1) {
            const rest = parts.slice(1).join(',').trim();
            if (rest.startsWith('{')) {
                this.fillBraceListMap(rest, map);
            } else if (rest.startsWith('*')) {
                const starMatch = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
                if (starMatch) {
                    map.set(starMatch[1], starMatch[1]);
                }
            }
        }
        return map;
    }

    // Builds a map of local require bindings to their source names.
    private parseJsRequireBindingMap(binding: string): Map<string, string> {
        const map = new Map<string, string>();
        const trimmed = binding.trim();
        if (!trimmed) {
            return map;
        }
        if (trimmed.startsWith('{')) {
            this.fillBraceListMap(trimmed, map);
            return map;
        }
        if (trimmed.startsWith('[')) {
            return map;
        }
        const local = trimmed.split(/\s+/)[0];
        if (local) {
            map.set(local, local);
        }
        return map;
    }

    // Fills a mapping based on brace-list import syntax for JS/TS.
    private fillBraceListMap(segment: string, map: Map<string, string>): void {
        const content = segment.replace(/^{/, '').replace(/}.*$/, '');
        content.split(',')
            .map((part) => part.trim())
            .forEach((part) => {
                if (!part) {
                    return;
                }
                if (part.includes(' as ')) {
                    const [imported, local] = part.split(/\s+as\s+/);
                    if (local && imported) {
                        map.set(local.trim(), imported.trim());
                    }
                    return;
                }
                if (part.includes(':')) {
                    const [imported, local] = part.split(':');
                    if (local && imported) {
                        map.set(local.trim(), imported.trim());
                    }
                    return;
                }
                map.set(part, part);
            });
    }

    // Resolves Python module names to candidate file paths.
    private resolvePythonModuleCandidates(modulePath: string, currentPath: string): string[] {
        if (!modulePath) {
            return [];
        }
        const normalizedCurrent = currentPath ? normalizePath(currentPath) : '';
        const baseDir = normalizedCurrent.split('/').slice(0, -1).join('/');
        const relativeMatch = modulePath.match(/^(\.+)(.*)$/);
        let baseParts = baseDir ? baseDir.split('/').filter(Boolean) : [];
        let remainder = modulePath;
        if (relativeMatch) {
            const dots = relativeMatch[1].length;
            remainder = relativeMatch[2] || '';
            for (let i = 1; i < dots; i += 1) {
                baseParts = baseParts.slice(0, -1);
            }
        }
        const moduleSuffix = remainder.replace(/^\./, '');
        const modulePathParts = moduleSuffix ? moduleSuffix.split('.').filter(Boolean) : [];
        const joined = [...baseParts, ...modulePathParts].join('/');
        if (!joined) {
            return [];
        }
        return [`${joined}.py`, `${joined}/__init__.py`];
    }

    // Resolves JS module paths to possible file candidates for local imports.
    private resolveJsModuleCandidates(modulePath: string, currentPath: string): string[] {
        const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
        const normalizedCurrent = currentPath ? normalizePath(currentPath) : '';
        const baseDir = normalizedCurrent.split('/').slice(0, -1).join('/');
        const resolved = this.resolvePath(baseDir, modulePath);
        if (!resolved) {
            return [];
        }
        const hasExtension = extensions.some((ext) => resolved.endsWith(ext));
        if (hasExtension) {
            return [resolved];
        }
        const candidates = extensions.map((ext) => `${resolved}${ext}`);
        extensions.forEach((ext) => candidates.push(`${resolved}/index${ext}`));
        return candidates;
    }

    // Determines whether a JS import source is a relative/local path.
    private isRelativeImport(modulePath: string): boolean {
        return modulePath.startsWith('.') || modulePath.startsWith('/');
    }

    // Resolves relative path segments against a base directory for import lookup.
    private resolvePath(baseDir: string, relative: string): string {
        const cleaned = relative.startsWith('/') ? relative.slice(1) : relative;
        const parts = [...(baseDir ? baseDir.split('/').filter(Boolean) : []), ...cleaned.split('/')];
        const stack: string[] = [];
        parts.forEach((part) => {
            if (!part || part === '.') {
                return;
            }
            if (part === '..') {
                stack.pop();
                return;
            }
            stack.push(part);
        });
        return stack.join('/');
    }

    // Finds a Swift module file matching the import name.
    private findSwiftModuleFile(moduleName: string): SymbolNode | null {
        if (!moduleName) {
            return null;
        }
        const target = `${moduleName}.swift`;
        for (const [path, node] of this.deps.state.getFileNodesByPath().entries()) {
            if (path.endsWith(`/${target}`) || path === target) {
                return node;
            }
        }
        return null;
    }

    // Searches candidate files for a named symbol within the graph node list.
    private findSymbolInFiles(symbolName: string, candidates: string[]): SymbolNode | null {
        if (!symbolName || candidates.length === 0) {
            return null;
        }
        const candidateSet = new Set(candidates.map((path) => normalizePath(path)));
        return this.deps.state.getGraphNodes().find((node) => {
            if (!node.location?.path || node.kind === 'external' || node.kind === 'folder') {
                return false;
            }
            if (node.name !== symbolName) {
                return false;
            }
            return candidateSet.has(normalizePath(node.location.path));
        }) ?? null;
    }

    // Picks the first file node that matches a list of possible file paths.
    private findFileByCandidates(candidates: string[]): SymbolNode | null {
        for (const candidate of candidates) {
            const normalized = normalizePath(candidate);
            const node = this.deps.state.getFileNodesByPath().get(normalized);
            if (node) {
                return node;
            }
        }
        return null;
    }

    // Creates the import modal lazily the first time a missing import is shown.
    private ensureImportModal(): void {
        if (this.importModal) {
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'import-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="import-modal__backdrop" data-import-modal-close></div>
            <div class="import-modal__dialog" role="dialog" aria-modal="true" aria-label="Import lookup">
                <h3>Not in this project</h3>
                <p class="import-modal__message"></p>
                <div class="import-modal__actions">
                    <button class="ghost-btn" type="button" data-import-modal-close>Close</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.closest('[data-import-modal-close]')) {
                this.hideImportModal();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideImportModal();
            }
        });
        document.body.append(modal);
        this.importModal = modal;
        this.importModalMessage = modal.querySelector<HTMLElement>('.import-modal__message');
    }

    // Opens the import modal with a message when a definition cannot be found.
    private showImportModal(message: string): void {
        this.ensureImportModal();
        if (this.importModalMessage) {
            this.importModalMessage.textContent = message;
        }
        if (this.importModal) {
            this.importModal.classList.add('is-visible');
            this.importModal.setAttribute('aria-hidden', 'false');
        }
    }

    // Closes the import modal after the user dismisses it.
    private hideImportModal(): void {
        if (!this.importModal) {
            return;
        }
        this.importModal.classList.remove('is-visible');
        this.importModal.setAttribute('aria-hidden', 'true');
    }

    // Checks whether a line contains identifier usage outside strings/comments.
    private lineHasIdentifierUsage(lineEl: HTMLElement, importName: string): boolean {
        const escaped = this.escapeRegex(importName);
        const matcher = new RegExp(`\\b${escaped}\\b`);
        const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.textContent || !matcher.test(node.textContent)) {
                    matcher.lastIndex = 0;
                    return NodeFilter.FILTER_REJECT;
                }
                matcher.lastIndex = 0;
                const parent = node.parentElement;
                if (!parent || parent.closest('.line-no')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest('.hljs-string') || parent.closest('.hljs-comment')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        while (walker.nextNode()) {
            return true;
        }
        return false;
    }

    // Rebuilds fold ranges for the current file based on graph node metadata.
    private getFoldableRangesForPath(path: string): FoldRange[] {
        const ranges: FoldRange[] = [];
        this.deps.state.getGraphNodes().forEach((node) => {
            if (!node.location?.path || !node.location.start_line || !node.location.end_line) {
                return;
            }
            if (node.kind !== 'function' && node.kind !== 'method' && node.kind !== 'class') {
                return;
            }
            if (normalizePath(node.location.path) !== path) {
                return;
            }
            const start = node.location.start_line;
            const end = node.location.end_line;
            if (end <= start) {
                return;
            }
            ranges.push({
                id: node.id,
                name: node.name,
                kind: node.kind,
                start,
                end,
            });
        });
        ranges.sort((a, b) => a.start - b.start || b.end - a.end);
        return ranges;
    }

    // Applies fold collapsed classes for the current file after toggles change.
    private refreshFoldVisibility(): void {
        this.deps.codeSurface.querySelectorAll<HTMLElement>('.code-line.is-folded')
            .forEach((line) => line.classList.remove('is-folded'));
        this.deps.codeSurface.querySelectorAll<HTMLElement>('.code-line.is-fold-collapsed')
            .forEach((line) => line.classList.remove('is-fold-collapsed'));
        const foldedSymbolIds = this.deps.state.getFoldedSymbolIds();
        this.deps.state.getCurrentFoldRanges().forEach((range) => {
            const isCollapsed = foldedSymbolIds.has(range.id);
            const startLine = this.deps.codeSurface.querySelector<HTMLElement>(`[data-line="${range.start}"]`);
            if (startLine) {
                startLine.classList.toggle('is-fold-collapsed', isCollapsed);
                const toggle = startLine.querySelector<HTMLButtonElement>('[data-fold-toggle]');
                if (toggle) {
                    toggle.textContent = isCollapsed ? '+' : '-';
                }
            }
            if (!isCollapsed) {
                return;
            }
            for (let line = range.start + 1; line <= range.end; line += 1) {
                const lineEl = this.deps.codeSurface.querySelector<HTMLElement>(`[data-line="${line}"]`);
                if (lineEl) {
                    lineEl.classList.add('is-folded');
                }
            }
        });
    }

    // Toggles a fold id in the persistent folded set and refreshes classes.
    private toggleFold(foldId: string): void {
        if (!this.deps.state.getCurrentFoldRanges().has(foldId)) {
            return;
        }
        const foldedSymbolIds = this.deps.state.getFoldedSymbolIds();
        if (foldedSymbolIds.has(foldId)) {
            foldedSymbolIds.delete(foldId);
        } else {
            foldedSymbolIds.add(foldId);
        }
        this.refreshFoldVisibility();
    }

    // Handles cmd/ctrl-clicks on identifiers to jump to their definitions.
    private handleDefinitionJump(event: MouseEvent, target: HTMLElement): boolean {
        if (!this.deps.isModifierClick(event)) {
            return false;
        }
        if (!this.deps.state.getCurrentSymbol()?.location?.path) {
            return false;
        }
        const lineEl = target.closest<HTMLElement>('.code-line');
        if (!lineEl) {
            return false;
        }
        if (target.closest('.code-import')) {
            return false;
        }
        const identifier = this.getIdentifierAtClick(event);
        if (!identifier) {
            return false;
        }
        const symbol = this.resolveDefinitionSymbol(identifier, this.deps.state.getCurrentSymbol()!.location!.path);
        if (!symbol) {
            this.deps.setCodeStatus(`No definition found for ${identifier}.`);
            return true;
        }
        this.navigateToSymbolDefinition(symbol, this.deps.state.getCurrentSymbol()!.location!.path);
        return true;
    }

    // Reads the identifier under the cursor, skipping comments and string tokens.
    private getIdentifierAtClick(event: MouseEvent): string | null {
        const range = this.getCaretRangeFromPoint(event.clientX, event.clientY);
        if (!range) {
            return null;
        }
        const node = range.startContainer;
        if (!node || node.nodeType !== Node.TEXT_NODE) {
            return null;
        }
        const textNode = node as Text;
        const parent = textNode.parentElement;
        if (!parent || parent.closest('.line-no') || parent.closest('.hljs-string') || parent.closest('.hljs-comment')) {
            return null;
        }
        const text = textNode.textContent ?? '';
        if (!text) {
            return null;
        }
        let offset = Math.min(range.startOffset, text.length);
        const isWordChar = (char: string) => /[A-Za-z0-9_$]/.test(char);
        if (offset > 0 && (!text[offset] || !isWordChar(text[offset])) && isWordChar(text[offset - 1])) {
            offset -= 1;
        }
        if (!isWordChar(text[offset] ?? '')) {
            return null;
        }
        let start = offset;
        while (start > 0 && isWordChar(text[start - 1])) {
            start -= 1;
        }
        let end = offset;
        while (end < text.length && isWordChar(text[end])) {
            end += 1;
        }
        const word = text.slice(start, end);
        if (!word || !/^[A-Za-z_$][\w$]*$/.test(word)) {
            return null;
        }
        return word;
    }

    // Cross-browser caret range lookup used by identifier detection.
    private getCaretRangeFromPoint(x: number, y: number): Range | null {
        const doc = document as Document & {
            caretRangeFromPoint?: (x: number, y: number) => Range | null;
            caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
        };
        if (doc.caretRangeFromPoint) {
            return doc.caretRangeFromPoint(x, y);
        }
        if (doc.caretPositionFromPoint) {
            const position = doc.caretPositionFromPoint(x, y);
            if (position) {
                const range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                range.collapse(true);
                return range;
            }
        }
        return null;
    }

    // Resolves a clicked identifier to a hint symbol using graph metadata.
    private resolveDefinitionSymbol(identifier: string, currentPath: string): SymbolNode | null {
        const normalizedCurrent = normalizePath(currentPath);
        const kinds = new Set<SymbolNode['kind']>(['function', 'method', 'class']);
        const matches = this.deps.state.getGraphNodes().filter((node) => {
            if (!node.location?.path) {
                return false;
            }
            if (!kinds.has(node.kind)) {
                return false;
            }
            return node.name === identifier;
        });
        if (matches.length === 0) {
            return null;
        }
        const sameFile = matches.find((node) => normalizePath(node.location?.path ?? '') === normalizedCurrent);
        if (sameFile) {
            return sameFile;
        }
        return matches[0];
    }

    // Navigates to a symbol definition while syncing breadcrumbs and graph selection.
    private navigateToSymbolDefinition(symbol: SymbolNode, fromPath?: string, preferredSymbolName?: string | null): void {
        const fileNode = symbol.kind === 'file' ? symbol : this.deps.getFileNodeForSymbol(symbol);
        const sourcePath = fromPath ?? this.deps.state.getCurrentSymbol()?.location?.path;
        const targetPath = fileNode?.location?.path ?? symbol.location?.path;
        if (sourcePath && targetPath) {
            const normalizedSource = normalizePath(sourcePath);
            const normalizedTarget = normalizePath(targetPath);
            if (normalizedSource !== normalizedTarget) {
                this.updateImportBreadcrumbs(normalizedSource, normalizedTarget);
            }
        }
        if (fileNode && preferredSymbolName) {
            const filePath = fileNode.location?.path ?? '';
            const candidate = this.findSymbolInFiles(preferredSymbolName, [filePath]);
            if (candidate) {
                void this.deps.highlightSymbolInFile(fileNode, candidate);
                return;
            }
        }
        if (fileNode && symbol.kind !== 'file') {
            this.deps.selectGraphNodes(fileNode, symbol);
            void this.deps.highlightSymbolInFile(fileNode, symbol);
            return;
        }
        this.deps.jumpToSymbol(symbol);
    }

    // Clears any existing import usage highlights in the reader.
    private clearImportUsageHighlights(): void {
        this.deps.codeSurface.querySelectorAll<HTMLElement>('.code-line.is-import-usage')
            .forEach((line) => line.classList.remove('is-import-usage'));
    }

    // Extracts import names from a language-specific import statement.
    private extractImportNames(lineText: string, language?: string): string[] {
        const trimmed = lineText.trim();
        if (!trimmed) {
            return [];
        }
        if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            return [];
        }
        if (language === 'python') {
            return this.extractPythonImportNames(trimmed);
        }
        if (language === 'swift') {
            return this.extractSwiftImportNames(trimmed);
        }
        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            return this.extractJsImportNames(trimmed);
        }
        return [];
    }

    // Extracts imported names from Python import statements.
    private extractPythonImportNames(lineText: string): string[] {
        if (lineText.startsWith('import ')) {
            const rest = lineText.slice('import '.length);
            return rest.split(',')
                .map((part) => part.trim())
                .map((part) => part.split(/\s+as\s+/).pop() ?? '')
                .map((part) => part.trim())
                .filter(Boolean);
        }
        if (lineText.startsWith('from ')) {
            const match = lineText.match(/^from\s+.+?\s+import\s+(.+)$/);
            if (!match) {
                return [];
            }
            const importPart = match[1];
            if (importPart.includes('*')) {
                return [];
            }
            return importPart.split(',')
                .map((part) => part.trim())
                .map((part) => part.split(/\s+as\s+/).pop() ?? '')
                .map((part) => part.trim())
                .filter(Boolean);
        }
        return [];
    }

    // Extracts imported module names from Swift import statements.
    private extractSwiftImportNames(lineText: string): string[] {
        if (!lineText.startsWith('import ')) {
            return [];
        }
        const rest = lineText.slice('import '.length).trim();
        const moduleName = rest.split(/\s+/)[0];
        return moduleName ? [moduleName] : [];
    }

    // Extracts import names from JS/TS import and require syntax.
    private extractJsImportNames(lineText: string): string[] {
        const names: string[] = [];
        const bindingMatch = lineText.match(/^import\s+(?:type\s+)?(.+?)\s+from\s+['"]/);
        if (bindingMatch) {
            names.push(...this.parseJsImportBindings(bindingMatch[1]));
        }
        const exportMatch = lineText.match(/^export\s+(?:type\s+)?(.+?)\s+from\s+['"]/);
        if (exportMatch) {
            names.push(...this.parseJsImportBindings(exportMatch[1]));
        }
        const importEqualsMatch = lineText.match(/^import\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(/);
        if (importEqualsMatch) {
            names.push(importEqualsMatch[1]);
        }
        const requireMatch = lineText.match(/^(?:const|let|var)\s+(.+?)\s*=\s*require\s*\(/);
        if (requireMatch) {
            names.push(...this.parseJsRequireBinding(requireMatch[1]));
        }
        return Array.from(new Set(names.filter(Boolean)));
    }

    // Parses binding lists in JS/TS import clauses.
    private parseJsImportBindings(binding: string): string[] {
        const names: string[] = [];
        const trimmed = binding.trim();
        if (!trimmed) {
            return names;
        }
        if (trimmed.startsWith('{')) {
            names.push(...this.parseBraceList(trimmed));
            return names;
        }
        if (trimmed.startsWith('*')) {
            const starMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
            if (starMatch) {
                names.push(starMatch[1]);
            }
            return names;
        }
        const parts = trimmed.split(',');
        if (parts.length > 0) {
            const defaultName = parts[0].trim();
            if (defaultName) {
                names.push(defaultName);
            }
        }
        if (parts.length > 1) {
            const rest = parts.slice(1).join(',').trim();
            if (rest.startsWith('{')) {
                names.push(...this.parseBraceList(rest));
            } else if (rest.startsWith('*')) {
                const starMatch = rest.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
                if (starMatch) {
                    names.push(starMatch[1]);
                }
            }
        }
        return names;
    }

    // Parses binding lists in JS/TS require assignments.
    private parseJsRequireBinding(binding: string): string[] {
        const trimmed = binding.trim();
        if (trimmed.startsWith('{')) {
            return this.parseBraceList(trimmed);
        }
        if (trimmed.startsWith('[')) {
            return [];
        }
        return trimmed ? [trimmed.split(/\s+/)[0]] : [];
    }

    // Parses brace lists into individual identifiers for imports or requires.
    private parseBraceList(segment: string): string[] {
        const content = segment.replace(/^{/, '').replace(/}.*$/, '');
        return content.split(',')
            .map((part) => part.trim())
            .map((part) => {
                if (!part) {
                    return '';
                }
                if (part.includes(' as ')) {
                    return part.split(/\s+as\s+/).pop() ?? '';
                }
                if (part.includes(':')) {
                    return part.split(':').pop() ?? '';
                }
                return part;
            })
            .map((part) => part.trim())
            .filter((part) => /^[A-Za-z_$][\w$]*$/.test(part));
    }

    // Escapes regex metacharacters to build safe identifier matchers.
    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
