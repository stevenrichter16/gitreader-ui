import type { HighlightRange, SnippetMode, SourceLocation, StoryArc, SymbolNode, SymbolSnippetResponse, TourStep } from '../types';

declare const hljs: any;

// Reader state updates pushed back into GitReaderApp so the orchestrator stays authoritative.
export interface ReaderStateUpdate {
    currentSymbol?: SymbolNode | null;
    pendingSymbol?: SymbolNode | null;
    pendingSnippet?: SymbolSnippetResponse | null;
    readerTreeFocusPath?: string | null;
    currentSnippetText?: string;
    currentSnippetStartLine?: number;
}

// Dependencies required to render code and manage snippet mode from outside the reader module.
export interface ReaderViewDependencies {
    // Code surface element that receives the rendered reader HTML.
    codeSurface: HTMLElement;
    // Mode buttons used to reflect the current snippet mode.
    snippetModeButtons: NodeListOf<HTMLButtonElement>;
    // Escapes user-provided text before injecting into HTML.
    escapeHtml: (value: string) => string;
    // Formats file/line labels for the code header.
    formatLocation: (location?: SourceLocation, startLine?: number, endLine?: number) => string;
    // Maps file paths to highlight.js language identifiers.
    getHighlightLanguage: (path?: string) => string | undefined;
    // Returns whether highlight.js is available for syntax highlighting.
    hasHighlightSupport: () => boolean;
    // Renders import breadcrumbs for the current file path.
    renderImportBreadcrumbs: (path?: string) => string;
    // Applies guided tour focus styling after code is rendered.
    applyGuidedCodeFocus: () => void;
    // Decorates import lines for cmd/ctrl-click interactions.
    decorateImportLines: (snippet?: SymbolSnippetResponse, language?: string) => void;
    // Adds fold toggles for functions/classes after code render.
    applyFoldControls: (symbol: SymbolNode) => void;
    // Syncs reader controls to match the current view state.
    updateReaderControls: () => void;
    // Persists reader state back into GitReaderApp.
    setReaderState: (update: ReaderStateUpdate) => void;
    // Reads the current reader file-tree focus (if the reader is showing the tree).
    getReaderTreeFocusPath: () => string | null;
    // Updates the reader tree focus when switching modes.
    setReaderTreeFocusPath: (path: string | null) => void;
    // Returns the last pending symbol (used when switching modes from the file tree).
    getPendingSymbol: () => SymbolNode | null;
    // Returns the last pending snippet (used when switching modes from the file tree).
    getPendingSnippet: () => SymbolSnippetResponse | null;
    // Returns the current symbol displayed in the reader.
    getCurrentSymbol: () => SymbolNode | null;
    // Clears snippet cache when the mode changes so data reloads in the new mode.
    clearSnippetCache: () => void;
    // Loads a snippet for the current symbol after mode changes.
    loadSymbolSnippet: (symbol: SymbolNode, narrate: boolean) => Promise<void>;
    // Reports whether a story arc is active so narrator updates stay in sync.
    isActiveStoryArc: () => boolean;
    // Returns the active story arc when routes mode is active.
    getActiveStoryArc: () => StoryArc | null;
    // Re-renders the active story arc after a snippet reload.
    renderStoryArc: (arc: StoryArc) => void;
    // Reports whether a tour is active so narrator updates stay in sync.
    isTourActive: () => boolean;
    // Returns the current tour step for narrator rerendering.
    getTourStep: () => TourStep | null;
    // Re-renders the tour step after a snippet reload.
    renderTourStep: (step: TourStep) => void;
}

// Reader renderer that owns snippet mode state and generates the code card HTML.
export class ReaderView {
    private snippetMode: SnippetMode = 'body';

    constructor(private deps: ReaderViewDependencies) {}

    // Exposes the current snippet mode so GitReaderApp can choose which section to fetch.
    getSnippetMode(): SnippetMode {
        return this.snippetMode;
    }

    // Renders the reader code card for a symbol/snippet and updates reader state.
    renderCode(symbol: SymbolNode, snippet?: SymbolSnippetResponse): void {
        const summary = snippet?.summary ?? symbol.summary ?? 'No summary yet.';
        const signature = snippet?.signature ?? symbol.signature ?? 'signature pending';
        const displayRange = this.getDisplayRange(symbol, snippet);
        const locationLabel = this.deps.formatLocation(symbol.location, displayRange.startLine, displayRange.endLine);
        const truncationLabel = snippet?.truncated ? ' (truncated)' : '';
        const language = this.deps.getHighlightLanguage(symbol.location?.path);
        const snippetHtml = this.renderSnippetLines(snippet, language);
        const revealLabel = snippet?.section === 'body' ? 'Show body' : 'Show code';
        const codeClass = this.deps.hasHighlightSupport() && language ? `hljs language-${language}` : '';
        const breadcrumbHtml = this.deps.renderImportBreadcrumbs(symbol.location?.path);
        this.deps.setReaderState({
            currentSymbol: symbol,
            pendingSymbol: symbol,
            pendingSnippet: snippet ?? null,
            readerTreeFocusPath: null,
            currentSnippetText: snippet?.snippet ?? '',
            currentSnippetStartLine: snippet?.start_line ?? symbol.location?.start_line ?? 1,
        });
        const header = this.renderSnippetHeader({
            symbol,
            locationLabel,
            truncationLabel,
            breadcrumbHtml,
            summary,
            signature,
        });
        const footer = this.renderSnippetFooter({
            revealLabel,
            codeClass,
            snippetHtml,
        });
        this.deps.codeSurface.innerHTML = `
            <article class="code-card">
                ${header}
                ${footer}
            </article>
        `;
        this.deps.applyGuidedCodeFocus();
        this.deps.decorateImportLines(snippet, language);
        this.deps.applyFoldControls(symbol);
        this.deps.updateReaderControls();
    }

    // Renders the snippet header section (meta, breadcrumbs, actions, summary).
    renderSnippetHeader(params: {
        symbol: SymbolNode;
        locationLabel: string;
        truncationLabel: string;
        breadcrumbHtml: string;
        summary: string;
        signature: string;
    }): string {
        return `
            <div class="code-meta">
                <span>${this.deps.escapeHtml(params.symbol.kind.toUpperCase())}</span>
                <span>${this.deps.escapeHtml(params.locationLabel)}${this.deps.escapeHtml(params.truncationLabel)}</span>
            </div>
            ${params.breadcrumbHtml}
            <div class="code-actions">
                <button class="ghost-btn" data-reader-action="copy">Copy snippet</button>
                <div class="jump-control">
                    <label for="line-jump">Line</label>
                    <input id="line-jump" type="number" min="1" placeholder="Line" data-line-input>
                    <button class="ghost-btn" data-reader-action="jump">Go</button>
                </div>
                <span class="code-status" data-code-status></span>
            </div>
            <div>
                <h3>${this.deps.escapeHtml(params.symbol.name)}</h3>
                <p>${this.deps.escapeHtml(params.summary)}</p>
            </div>
            <div class="code-signature">${this.deps.escapeHtml(params.signature)}</div>
        `;
    }

    // Renders the snippet body footer (details + highlighted code).
    renderSnippetFooter(params: {
        revealLabel: string;
        codeClass: string;
        snippetHtml: string;
    }): string {
        return `
            <details class="code-details" open>
                <summary>${params.revealLabel}</summary>
                <pre><code class="${params.codeClass}">${params.snippetHtml}</code></pre>
            </details>
        `;
    }

    // Converts a snippet response into HTML line spans with highlight markers.
    renderSnippetLines(snippet?: SymbolSnippetResponse, language?: string): string {
        const rawBody = snippet?.snippet ?? '';
        const body = rawBody.trim().length > 0 ? rawBody : '# body not loaded yet';
        const startLine = snippet?.start_line ?? 1;
        const highlightSet = this.buildHighlightSet(snippet?.highlights ?? []);
        const rendered = this.highlightSnippet(body, language);
        const lines = rendered.replace(/\n$/, '').split('\n');
        return lines
            .map((line, index) => {
                const lineNumber = startLine + index;
                const isHighlighted = highlightSet.has(lineNumber);
                const classes = isHighlighted ? 'code-line is-highlight' : 'code-line';
                return `<span class="${classes}" data-line="${lineNumber}"><span class="line-no">${lineNumber}</span><span class="line-text">${line}</span></span>`;
            })
            .join('');
    }

    // Applies highlight.js (if available) or falls back to escaped text.
    highlightSnippet(body: string, language?: string): string {
        if (!this.deps.hasHighlightSupport()) {
            return this.deps.escapeHtml(body);
        }
        if (language && hljs.getLanguage && hljs.getLanguage(language)) {
            return hljs.highlight(body, { language }).value;
        }
        return hljs.highlightAuto(body).value;
    }

    // Handles snippet mode switching and triggers re-fetch when needed.
    async setSnippetMode(mode: SnippetMode): Promise<void> {
        if (this.snippetMode === mode && !this.deps.getReaderTreeFocusPath()) {
            return;
        }
        this.snippetMode = mode;
        this.deps.clearSnippetCache();
        this.updateSnippetModeUi();
        if (this.deps.getReaderTreeFocusPath()) {
            this.deps.setReaderTreeFocusPath(null);
            const pendingSymbol = this.deps.getPendingSymbol();
            if (pendingSymbol) {
                this.renderCode(pendingSymbol, this.deps.getPendingSnippet() ?? undefined);
                return;
            }
        }
        const currentSymbol = this.deps.getCurrentSymbol();
        if (currentSymbol) {
            const narrate = !this.deps.isActiveStoryArc() && !this.deps.isTourActive();
            await this.deps.loadSymbolSnippet(currentSymbol, narrate);
            const activeArc = this.deps.getActiveStoryArc();
            if (activeArc) {
                this.deps.renderStoryArc(activeArc);
            } else if (this.deps.isTourActive()) {
                const step = this.deps.getTourStep();
                if (step) {
                    this.deps.renderTourStep(step);
                }
            }
        }
    }

    // Syncs the snippet mode UI buttons with the active mode.
    updateSnippetModeUi(): void {
        this.deps.snippetModeButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.snippetMode === this.snippetMode);
        });
    }

    // Converts highlight ranges into a lookup set for efficient line marking.
    private buildHighlightSet(highlights: HighlightRange[]): Set<number> {
        const highlightSet = new Set<number>();
        highlights.forEach((range) => {
            const start = Math.min(range.start_line, range.end_line);
            const end = Math.max(range.start_line, range.end_line);
            for (let line = start; line <= end; line += 1) {
                highlightSet.add(line);
            }
        });
        return highlightSet;
    }

    // Computes the snippet display range so the header line label stays accurate.
    private getDisplayRange(
        symbol: SymbolNode,
        snippet?: SymbolSnippetResponse,
    ): { startLine?: number; endLine?: number } {
        if (snippet?.section === 'body' && snippet.start_line) {
            return { startLine: snippet.start_line, endLine: snippet.end_line };
        }
        if ((symbol.kind === 'function' || symbol.kind === 'method' || symbol.kind === 'class') && symbol.location?.start_line) {
            return {
                startLine: symbol.location.start_line,
                endLine: symbol.location.end_line || snippet?.end_line || symbol.location.start_line,
            };
        }
        if (snippet?.start_line) {
            return { startLine: snippet.start_line, endLine: snippet.end_line };
        }
        if (symbol.location?.start_line) {
            return { startLine: symbol.location.start_line, endLine: symbol.location.end_line };
        }
        return {};
    }
}
