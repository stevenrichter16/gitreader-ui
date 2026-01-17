type NarrationMode = 'hook' | 'summary' | 'key_lines' | 'connections' | 'next';

type TocMode = 'story' | 'tree' | 'routes';

type TourMode = 'story' | 'teacher' | 'expert';

type SymbolKind = 'file' | 'folder' | 'class' | 'function' | 'method' | 'external' | 'blueprint';

type EdgeKind = 'imports' | 'calls' | 'inherits' | 'contains' | 'blueprint';

type EdgeConfidence = 'high' | 'medium' | 'low';

interface SourceLocation {
    path: string;
    start_line: number;
    end_line: number;
    start_col: number;
    end_col: number;
}

interface SymbolNode {
    id: string;
    name: string;
    kind: SymbolKind;
    summary: string;
    signature?: string;
    docstring?: string;
    location?: SourceLocation;
    module?: string;
}

interface GraphEdge {
    source: string;
    target: string;
    kind: EdgeKind;
    confidence: EdgeConfidence;
}

interface ChapterSummary {
    id: string;
    title: string;
    summary: string;
    scope?: string;
}

interface StoryRouteInfo {
    path: string;
    methods: string[];
    handler_id: string;
    handler_name: string;
    module: string;
    file_path: string;
    line: number;
}

interface StoryScene {
    id: string;
    name: string;
    kind: SymbolKind;
    file_path: string;
    line: number;
    role: string;
    confidence?: EdgeConfidence;
}

interface StoryArc {
    id: string;
    title: string;
    summary: string;
    entry_id: string;
    thread?: string;
    thread_index?: number;
    parent_id?: string | null;
    related_ids?: string[];
    route: StoryRouteInfo;
    scenes: StoryScene[];
    scene_count: number;
    calls?: {
        internal?: string[];
        external?: string[];
    };
}

interface ApiWarning {
    code: string;
    message: string;
    path: string;
    line?: number;
}

interface ApiTocResponse {
    chapters: ChapterSummary[];
    mode?: TocMode;
    stats?: Record<string, number>;
    warnings?: ApiWarning[];
}

interface ApiGraphResponse {
    nodes: SymbolNode[];
    edges: GraphEdge[];
    scope?: string;
    stats?: Record<string, number>;
    warnings?: ApiWarning[];
}

interface ApiStoryResponse {
    arcs: StoryArc[];
    stats?: Record<string, number>;
    warnings?: ApiWarning[];
}

interface SymbolSnippetResponse {
    id: string;
    name: string;
    kind: SymbolKind;
    summary?: string;
    signature?: string;
    docstring?: string;
    location: SourceLocation;
    start_line: number;
    end_line: number;
    total_lines: number;
    truncated: boolean;
    section: string;
    highlights: HighlightRange[];
    snippet: string;
    warnings?: ApiWarning[];
    stats?: Record<string, number>;
}

interface HighlightRange {
    label: string;
    start_line: number;
    end_line: number;
}

interface NarrationKeyLine {
    line: number;
    text: string;
}

interface NarrationResponse {
    mode: NarrationMode;
    symbol_id: string;
    symbol_name: string;
    hook?: string;
    summary?: string[];
    key_lines?: NarrationKeyLine[];
    connections?: string[];
    next_thread?: string;
    cached?: boolean;
    source?: string;
    model?: string;
    prompt_version?: string;
}

interface TourState {
    repo_id: string;
    ref: string | null;
    subdir: string | null;
    arc_id: string;
    mode: TourMode;
    step_index: number;
    last_node_id?: string;
    visited_node_ids?: string[];
    branch_stack?: string[];
    context_window?: Array<{ node_id: string; summary: string }>;
}

interface TourRelatedNode {
    node_id: string;
    label: string;
}

interface TourRelatedArc {
    arc_id: string;
    title: string;
}

interface TourContextLink {
    label: string;
    file_path?: string;
    line?: number;
    node_id?: string;
}

interface TourFocus {
    file_path?: string;
    start_line?: number;
    end_line?: number;
    node_id?: string;
}

interface TourStep {
    step_index: number;
    total_steps?: number;
    node_id: string;
    arc_id: string;
    arc_title?: string;
    title: string;
    hook: string;
    explanation: string[];
    why_it_matters: string;
    concept?: string;
    why_here?: string;
    remember?: string;
    next_click: string;
    pitfall?: string;
    confidence?: EdgeConfidence;
    related_nodes?: TourRelatedNode[];
    related_arcs?: TourRelatedArc[];
    context_links?: TourContextLink[];
    story_so_far?: string[];
    focus?: TourFocus;
    allowed_node_ids?: string[];
    cached?: boolean;
    source?: string;
    model?: string;
    prompt_version?: string;
}

interface TourResponse {
    state: TourState;
    step: TourStep;
    warnings?: ApiWarning[];
}

type SnippetMode = 'body' | 'full';

type GraphLayoutMode = 'cluster' | 'layer' | 'free';

interface FileTreeNode {
    name: string;
    path: string;
    isFile: boolean;
    children: Map<string, FileTreeNode>;
}

interface GraphView {
    nodes: SymbolNode[];
    edges: GraphEdge[];
    totalNodes: number;
    visibleNodes: number;
    isCapped: boolean;
}

declare const cytoscape: any;
declare const hljs: any;

class GitReaderApp {
    private tocList: HTMLElement;
    private codeSurface: HTMLElement;
    private canvasGraph: HTMLElement;
    private canvasSurface: HTMLElement;
    private canvasOverlay: HTMLElement;
    private narratorOutput: HTMLElement;
    private narratorFileTree: HTMLElement;
    private modeButtons: NodeListOf<HTMLButtonElement>;
    private layoutButtons: NodeListOf<HTMLButtonElement>;
    private tocModeButtons: NodeListOf<HTMLButtonElement>;
    private snippetModeButtons: NodeListOf<HTMLButtonElement>;
    private graphLayoutButtons: NodeListOf<HTMLButtonElement>;
    private edgeFilterButtons: NodeListOf<HTMLButtonElement>;
    private nodeFilterButtons: NodeListOf<HTMLButtonElement>;
    private graphActionButtons: NodeListOf<HTMLButtonElement>;
    private narratorToggle: HTMLButtonElement;
    private workspace: HTMLElement;
    private tocPill: HTMLElement;
    private tocSubtitle: HTMLElement;
    private graphNodeStatus: HTMLElement;
    private graphRevealButton: HTMLButtonElement;
    private graphTooltip: HTMLElement;
    private narratorPane: HTMLElement;
    private routePicker: HTMLElement;
    private routeSelect: HTMLSelectElement;
    private routeJump: HTMLButtonElement;
    private tourControls: HTMLElement;
    private tourModeSelect: HTMLSelectElement;
    private tourStartButton: HTMLButtonElement;
    private tourPrevButton: HTMLButtonElement;
    private tourNextButton: HTMLButtonElement;
    private tourEndButton: HTMLButtonElement;
    private tourStatus: HTMLElement;
    private repoForm: HTMLFormElement;
    private repoInput: HTMLInputElement;
    private localInput: HTMLInputElement;
    private refInput: HTMLInputElement;
    private subdirInput: HTMLInputElement;
    private repoParams: URLSearchParams;
    private currentMode: NarrationMode = 'hook';
    private tocMode: TocMode = 'story';
    private snippetMode: SnippetMode = 'body';
    private graphLayoutMode: GraphLayoutMode = 'cluster';
    private chapters: ChapterSummary[] = [];
    private storyArcs: StoryArc[] = [];
    private storyArcsById: Map<string, StoryArc> = new Map();
    private activeStoryArc: StoryArc | null = null;
    private tourActive = false;
    private tourState: TourState | null = null;
    private tourStep: TourStep | null = null;
    private tourMode: TourMode = 'story';
    private guidedAllowedNodeIds: Set<string> | null = null;
    private fileTreeRoot: FileTreeNode | null = null;
    private fileTreeFocusPath: string | null = null;
    private readerTreeFocusPath: string | null = null;
    private fileTreeCollapsed: Set<string> = new Set();
    private graphNodes: SymbolNode[] = [];
    private graphEdges: GraphEdge[] = [];
    private nodeById: Map<string, SymbolNode> = new Map();
    private displayNodeById: Map<string, SymbolNode> = new Map();
    private fileNodesByPath: Map<string, SymbolNode> = new Map();
    private snippetCache: Map<string, SymbolSnippetResponse> = new Map();
    private graphCache: Map<string, ApiGraphResponse> = new Map();
    private graphLoadPromises: Map<string, Promise<ApiGraphResponse>> = new Map();
    private narratorCache: Map<string, NarrationResponse> = new Map();
    private graphNodeCapByScope: Map<string, number> = new Map();
    private narratorRequestToken = 0;
    private chapterRequestToken = 0;
    private graphRequestToken = 0;
    private narratorVisible = true;
    private graphInstance: any | null = null;
    private graphEventsBound = false;
    private edgeFilters: Set<EdgeKind> = new Set(['calls', 'imports', 'inherits', 'contains', 'blueprint']);
    private showExternalNodes = true;
    private hoveredNodeId: string | null = null;
    private currentScope = 'full';
    private currentChapterId: string | null = null;
    private focusedNodeId: string | null = null;
    private currentSymbol: SymbolNode | null = null;
    private currentSnippetText = '';
    private currentSnippetStartLine = 1;
    private clusterExpanded: Set<string> = new Set();
    private tocDebounceTimer: number | null = null;
    private tocDebounceDelay = 200;
    private pendingChapterId: string | null = null;
    private graphNodeCap = 300;
    private graphNodeCapStep = 200;
    private labelZoomThreshold = 0.65;
    private labelLineLength = 18;
    private lastTapNodeId: string | null = null;
    private lastTapAt = 0;
    private doubleTapDelay = 320;
    private importModal: HTMLElement | null = null;
    private importModalMessage: HTMLElement | null = null;
    private importBreadcrumbs: string[] = [];

    constructor() {
        this.tocList = this.getElement('toc-list');
        this.codeSurface = this.getElement('code-surface');
        this.canvasGraph = this.getElement('canvas-graph');
        this.canvasSurface = this.getElement('canvas-surface');
        this.canvasOverlay = this.getElement('canvas-overlay');
        this.narratorOutput = this.getElement('narrator-output');
        this.narratorFileTree = this.getElement('narrator-file-tree');
        this.modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');
        this.layoutButtons = document.querySelectorAll<HTMLButtonElement>('.nav-btn[data-layout]');
        this.tocModeButtons = document.querySelectorAll<HTMLButtonElement>('.nav-btn[data-toc-mode]');
        this.snippetModeButtons = document.querySelectorAll<HTMLButtonElement>('[data-snippet-mode]');
        this.graphLayoutButtons = document.querySelectorAll<HTMLButtonElement>('[data-layout-action]');
        this.edgeFilterButtons = document.querySelectorAll<HTMLButtonElement>('[data-edge-filter]');
        this.nodeFilterButtons = document.querySelectorAll<HTMLButtonElement>('[data-node-filter]');
        this.graphActionButtons = document.querySelectorAll<HTMLButtonElement>('[data-graph-action]');
        this.narratorToggle = this.getElement('narrator-toggle') as HTMLButtonElement;
        this.workspace = this.getElement('workspace');
        this.tocPill = this.getElement('toc-pill');
        this.tocSubtitle = this.getElement('toc-subtitle');
        this.graphNodeStatus = this.getElement('graph-node-status');
        this.graphRevealButton = this.getElement('graph-reveal') as HTMLButtonElement;
        this.graphTooltip = this.getElement('graph-tooltip');
        this.narratorPane = this.getElement('narrator');
        this.routePicker = this.getElement('route-picker');
        this.routeSelect = this.getElement('route-select') as HTMLSelectElement;
        this.routeJump = this.getElement('route-jump') as HTMLButtonElement;
        this.tourControls = this.getElement('tour-controls');
        this.tourModeSelect = this.getElement('tour-mode') as HTMLSelectElement;
        this.tourStartButton = this.getElement('tour-start') as HTMLButtonElement;
        this.tourPrevButton = this.getElement('tour-prev') as HTMLButtonElement;
        this.tourNextButton = this.getElement('tour-next') as HTMLButtonElement;
        this.tourEndButton = this.getElement('tour-end') as HTMLButtonElement;
        this.tourStatus = this.getElement('tour-status');
        this.tourModeSelect.value = this.tourMode;
        this.graphRevealButton.disabled = true;
        this.routeSelect.disabled = true;
        this.routeJump.disabled = true;
        this.tourPrevButton.disabled = true;
        this.tourNextButton.disabled = true;
        this.tourEndButton.disabled = true;
        this.repoForm = this.getElement('repo-picker') as HTMLFormElement;
        this.repoInput = this.getElement('repo-input') as HTMLInputElement;
        this.localInput = this.getElement('local-input') as HTMLInputElement;
        this.refInput = this.getElement('ref-input') as HTMLInputElement;
        this.subdirInput = this.getElement('subdir-input') as HTMLInputElement;
        this.repoParams = this.buildRepoParams();
        this.syncRepoInputsFromParams();
    }

    init(): void {
        this.renderLoadingState();
        this.loadGraphPreferences();
        this.bindEvents();
        this.updateNarratorToggle();
        this.updateTourControls();
        this.updateSnippetModeUi();
        this.updateGraphControls();
        this.loadData().catch((error) => {
            const message = error instanceof Error ? error.message : 'Failed to load data.';
            this.renderErrorState(message);
        });
    }

    private getElement(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Missing element: ${id}`);
        }
        return element;
    }

    private async loadData(): Promise<void> {
        await this.loadToc(this.tocMode);
        const defaultChapterId = this.chapters.length > 0 ? this.chapters[0].id : '';
        await this.loadChapter(defaultChapterId);
    }

    private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
        const headers = new Headers(init?.headers);
        headers.set('Accept', 'application/json');
        const response = await fetch(url, {
            ...init,
            headers,
        });
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json() as Promise<T>;
    }

    private buildRepoParams(): URLSearchParams {
        const params = new URLSearchParams(window.location.search);
        const allowed = new URLSearchParams();
        const repoValue = params.get('repo');
        const localValue = params.get('local');
        if (repoValue) {
            allowed.set('repo', repoValue);
        } else if (localValue) {
            allowed.set('local', localValue);
        }
        const refValue = params.get('ref');
        if (refValue) {
            allowed.set('ref', refValue);
        }
        const subdirValue = params.get('subdir');
        if (subdirValue) {
            allowed.set('subdir', subdirValue);
        }
        return allowed;
    }

    private buildApiUrl(path: string, extra?: Record<string, string | null | undefined>): string {
        const params = new URLSearchParams(this.repoParams.toString());
        if (extra) {
            Object.keys(extra).forEach((key) => {
                const value = extra[key];
                if (value !== undefined && value !== null && value !== '') {
                    params.set(key, value);
                }
            });
        }
        const query = params.toString();
        return query ? `${path}?${query}` : path;
    }

    private syncRepoInputsFromParams(): void {
        this.repoInput.value = this.repoParams.get('repo') ?? '';
        this.localInput.value = this.repoParams.get('local') ?? '';
        this.refInput.value = this.repoParams.get('ref') ?? '';
        this.subdirInput.value = this.repoParams.get('subdir') ?? '';
    }

    private applyRepoSelection(): void {
        const repoValue = this.repoInput.value.trim();
        const localValue = this.localInput.value.trim();
        const refValue = this.refInput.value.trim();
        const subdirValue = this.subdirInput.value.trim();
        const params = new URLSearchParams();
        if (repoValue) {
            params.set('repo', repoValue);
        } else if (localValue) {
            params.set('local', localValue);
        }
        if (refValue) {
            params.set('ref', refValue);
        }
        if (subdirValue) {
            params.set('subdir', subdirValue);
        }
        const query = params.toString();
        window.location.search = query ? `?${query}` : '';
    }

    private renderLoadingState(): void {
        this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Loading chapters</div><p class="toc-summary">Scanning repository...</p></li>';
        this.codeSurface.innerHTML = '<article class="code-card"><h3>Loading symbols...</h3><p>Fetching graph data.</p></article>';
        this.setCanvasOverlay('Preparing nodes and edges...', true);
        this.narratorOutput.innerHTML = '<p class="eyebrow">Narrator</p><h3>Loading</h3><p>Gathering the first clues.</p>';
    }

    private renderErrorState(message: string): void {
        this.tocList.innerHTML = `<li class="toc-item"><div class="toc-title">Failed to load</div><p class="toc-summary">${this.escapeHtml(message)}</p></li>`;
        this.codeSurface.innerHTML = `<article class="code-card"><h3>Unable to load</h3><p>${this.escapeHtml(message)}</p></article>`;
        this.setCanvasOverlay(message, true);
        this.narratorOutput.innerHTML = `<p class="eyebrow">Narrator</p><h3>Paused</h3><p>${this.escapeHtml(message)}</p>`;
    }

    private bindEvents(): void {
        this.tocList.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement).closest<HTMLLIElement>('.toc-item');
            if (!target) {
                return;
            }
            const chapterId = target.dataset.chapterId;
            if (chapterId) {
                if (this.tourActive) {
                    if (this.tocMode === 'routes') {
                        void this.setTocMode('routes', chapterId);
                    }
                    return;
                }
                this.scheduleChapterLoad(chapterId);
            }
        });

        this.tocModeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.tocMode as TocMode | undefined;
                if (mode) {
                    void this.setTocMode(mode);
                }
            });
        });

        this.snippetModeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.snippetMode as SnippetMode | undefined;
                if (mode) {
                    void this.setSnippetMode(mode);
                }
            });
        });

        this.graphLayoutButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const layout = button.dataset.layoutAction as GraphLayoutMode | undefined;
                if (layout) {
                    this.setGraphLayoutMode(layout);
                }
            });
        });

        this.edgeFilterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.dataset.edgeFilter as EdgeKind | undefined;
                if (filter) {
                    this.toggleEdgeFilter(filter);
                }
            });
        });

        this.nodeFilterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.dataset.nodeFilter;
                if (filter === 'external') {
                    this.showExternalNodes = !this.showExternalNodes;
                    this.updateGraphControls();
                    if (this.graphLayoutMode === 'cluster') {
                        this.refreshGraphView();
                    } else {
                        this.applyGraphFilters();
                    }
                }
            });
        });

        this.graphActionButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const action = button.dataset.graphAction;
                if (action === 'focus') {
                    this.focusOnSelected();
                } else if (action === 'reset') {
                    this.resetGraphFocus();
                } else if (action === 'reveal') {
                    this.revealMoreNodes();
                } else if (action === 'zoom-in') {
                    this.zoomGraph(1.2);
                } else if (action === 'zoom-out') {
                    this.zoomGraph(0.8);
                } else if (action === 'fit') {
                    this.fitGraph();
                }
            });
        });

        this.modeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode as NarrationMode | undefined;
                if (mode) {
                    this.setMode(mode);
                }
            });
        });

        this.tourModeSelect.addEventListener('change', () => {
            const mode = this.tourModeSelect.value as TourMode;
            this.tourMode = mode;
            if (this.tourActive) {
                void this.startTour();
            }
        });

        this.tourStartButton.addEventListener('click', () => {
            void this.startTour();
        });

        this.tourPrevButton.addEventListener('click', () => {
            void this.advanceTour('prev');
        });

        this.tourNextButton.addEventListener('click', () => {
            void this.advanceTour('next');
        });

        this.tourEndButton.addEventListener('click', () => {
            this.endTour();
        });

        this.routeSelect.addEventListener('change', () => {
            if (this.tourActive && this.tocMode !== 'routes') {
                return;
            }
            const arcId = this.routeSelect.value;
            if (!arcId) {
                return;
            }
            void this.setTocMode('routes', arcId);
        });

        this.routeJump.addEventListener('click', () => {
            if (this.tourActive && this.tocMode !== 'routes') {
                return;
            }
            const arcId = this.routeSelect.value;
            if (!arcId) {
                return;
            }
            void this.setTocMode('routes', arcId);
        });

        this.layoutButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const layout = button.dataset.layout;
                if (layout) {
                    this.setLayout(layout);
                }
            });
        });

        this.narratorToggle.addEventListener('click', () => {
            this.narratorVisible = !this.narratorVisible;
            this.narratorPane.classList.toggle('is-hidden', !this.narratorVisible);
            this.updateNarratorToggle();
            this.refreshGraphViewport();
        });

        this.codeSurface.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const breadcrumbTarget = target.closest<HTMLElement>('[data-breadcrumb-path]');
            if (breadcrumbTarget) {
                const path = breadcrumbTarget.dataset.breadcrumbPath;
                if (path) {
                    this.navigateBreadcrumb(path);
                }
                return;
            }
            const treeToggle = target.closest<HTMLElement>('[data-tree-toggle]');
            if (treeToggle) {
                const path = treeToggle.dataset.treeToggle;
                if (path) {
                    this.toggleFileTreePath(path);
                }
                return;
            }
            const actionTarget = target.closest<HTMLElement>('[data-reader-action]');
            if (actionTarget) {
                const action = actionTarget.dataset.readerAction;
                if (action === 'copy') {
                    void this.copySnippet();
                } else if (action === 'jump') {
                    this.jumpToInputLine();
                }
                return;
            }
            const importTarget = target.closest<HTMLElement>('[data-import-name]');
            if (importTarget) {
                const importName = importTarget.dataset.importName;
                if (importName) {
                    if (this.isModifierClick(event as MouseEvent)) {
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
                    if (this.isModifierClick(event as MouseEvent)) {
                        this.handleImportJump(imports[0], importLine);
                    } else {
                        this.highlightImportUsage(imports[0]);
                    }
                }
            }
        });

        this.codeSurface.addEventListener('keydown', (event) => {
            const target = event.target as HTMLElement;
            if (event.key === 'Enter' && target.matches('[data-line-input]')) {
                event.preventDefault();
                this.jumpToInputLine();
            }
        });

        this.narratorOutput.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement).closest<HTMLElement>('[data-arc-id]');
            if (!target) {
                return;
            }
            const arcId = target.dataset.arcId;
            if (arcId) {
                void this.setTocMode('routes', arcId);
            }
        });

        this.narratorOutput.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tour-node]');
            if (!target) {
                return;
            }
            const nodeId = target.dataset.tourNode;
            if (nodeId) {
                void this.advanceTour('jump', nodeId);
            }
        });

        this.narratorOutput.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tour-arc]');
            if (!target) {
                return;
            }
            const arcId = target.dataset.tourArc;
            if (arcId) {
                void this.advanceTour('branch', undefined, arcId);
            }
        });

        this.narratorOutput.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement).closest<HTMLElement>('[data-context-link]');
            if (!target) {
                return;
            }
            const nodeId = target.dataset.contextNode;
            const filePath = target.dataset.contextFile;
            const line = target.dataset.contextLine ? Number(target.dataset.contextLine) : undefined;
            this.handleContextLink(nodeId, filePath, line);
        });

        this.narratorFileTree.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tree-toggle]');
            if (!target) {
                return;
            }
            const path = target.dataset.treeToggle;
            if (path) {
                this.toggleFileTreePath(path);
            }
        });

        this.repoForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.applyRepoSelection();
        });
    }

    private scheduleChapterLoad(chapterId: string): void {
        this.pendingChapterId = chapterId;
        this.setActiveToc(chapterId);
        if (this.tocDebounceTimer !== null) {
            window.clearTimeout(this.tocDebounceTimer);
        }
        this.tocDebounceTimer = window.setTimeout(() => {
            this.tocDebounceTimer = null;
            if (this.pendingChapterId) {
                void this.loadChapter(this.pendingChapterId);
            }
        }, this.tocDebounceDelay);
    }

    private async setTocMode(mode: TocMode, targetChapterId?: string): Promise<void> {
        if (this.tocMode === mode) {
            if (targetChapterId) {
                if (this.tourActive) {
                    this.currentChapterId = targetChapterId;
                    this.setActiveToc(targetChapterId);
                    this.resetNarratorForTocMode(mode, targetChapterId);
                    this.updateTourControls();
                    return;
                }
                await this.loadChapter(targetChapterId);
                return;
            }
            if (this.tourActive) {
                this.resetNarratorForTocMode(mode);
                this.updateTourControls();
            }
            return;
        }
        this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">Loading chapters</div><p class="toc-summary">Switching TOC view...</p></li>';
        await this.loadToc(mode);
        const defaultChapterId = targetChapterId ?? (this.chapters.length > 0 ? this.chapters[0].id : '');
        if (this.tourActive) {
            this.currentChapterId = defaultChapterId;
            this.setActiveToc(defaultChapterId);
            this.resetNarratorForTocMode(mode, defaultChapterId);
            this.updateTourControls();
            return;
        }
        await this.loadChapter(defaultChapterId);
    }

    private resetNarratorForTocMode(mode: TocMode, targetChapterId?: string): void {
        if (!this.tourActive) {
            return;
        }
        if (mode === 'routes') {
            const arcId = targetChapterId || this.currentChapterId || this.routeSelect.value || '';
            const arc = arcId ? this.storyArcsById.get(arcId) : undefined;
            if (arc) {
                this.activeStoryArc = arc;
                this.renderStoryArc(arc);
                return;
            }
            this.activeStoryArc = null;
            if (arcId) {
                this.renderStoryArcMissing();
                return;
            }
            this.renderStoryArcEmpty();
            return;
        }
        this.activeStoryArc = null;
        if (mode === 'tree') {
            this.renderFileTreeNarrator();
            return;
        }
        if (this.tourStep) {
            this.renderTourStep(this.tourStep);
        }
    }

    private async loadToc(mode: TocMode): Promise<void> {
        if (mode === 'routes') {
            await this.loadRouteToc();
            return;
        }
        const tocData = await this.fetchJson<ApiTocResponse>(
            this.buildApiUrl('/gitreader/api/toc', { mode }),
        );
        this.chapters = Array.isArray(tocData.chapters) ? tocData.chapters : [];
        this.tocMode = tocData.mode ?? mode;
        this.activeStoryArc = null;
        this.updateTocModeUi();
        this.renderToc();
    }

    private async loadRouteToc(): Promise<void> {
        const storyData = await this.fetchJson<ApiStoryResponse>(
            this.buildApiUrl('/gitreader/api/story'),
        );
        this.storyArcs = Array.isArray(storyData.arcs) ? storyData.arcs : [];
        this.storyArcsById = new Map(this.storyArcs.map((arc) => [arc.id, arc]));
        this.chapters = this.storyArcs.map((arc) => this.buildArcChapter(arc));
        this.tocMode = 'routes';
        this.activeStoryArc = null;
        this.updateTocModeUi();
        this.renderToc();
        this.populateRoutePicker(this.storyArcs);
    }

    private updateTocModeUi(): void {
        this.tocModeButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.tocMode === this.tocMode);
        });
        const isStory = this.tocMode === 'story';
        const isRoutes = this.tocMode === 'routes';
        if (isRoutes) {
            this.tocPill.textContent = 'routes';
            this.tocSubtitle.textContent = 'Trace Flask routes into their primary flow.';
        } else {
            this.tocPill.textContent = isStory ? 'story' : 'file tree';
            this.tocSubtitle.textContent = isStory
                ? 'Follow the story arc of the repository.'
                : 'Browse the repository by folder.';
        }
        this.routePicker.classList.toggle('is-hidden', !isRoutes);
    }

    private buildArcChapter(arc: StoryArc): ChapterSummary {
        const handler = arc.route?.handler_name ? `Handler ${arc.route.handler_name}` : '';
        const summary = [handler, arc.summary].filter(Boolean).join(' - ') || 'Route arc';
        return {
            id: arc.id,
            title: this.formatArcTitle(arc) || handler || 'Route',
            summary,
        };
    }

    private populateRoutePicker(arcs: StoryArc[]): void {
        this.routeSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = arcs.length > 0 ? 'Select a route' : 'No routes found';
        this.routeSelect.appendChild(placeholder);
        arcs.forEach((arc) => {
            const option = document.createElement('option');
            option.value = arc.id;
            option.textContent = this.formatArcOptionLabel(arc);
            this.routeSelect.appendChild(option);
        });
        const hasRoutes = arcs.length > 0;
        this.routeSelect.disabled = !hasRoutes;
        this.routeJump.disabled = !hasRoutes;
        if (!hasRoutes) {
            this.routeSelect.value = '';
        } else if (this.currentChapterId && this.storyArcsById.has(this.currentChapterId)) {
            this.routeSelect.value = this.currentChapterId;
        }
    }

    private formatArcOptionLabel(arc: StoryArc): string {
        const routeLabel = this.formatArcTitle(arc);
        const handler = arc.route?.handler_name ? ` - ${arc.route.handler_name}` : '';
        return `${routeLabel}${handler}`.trim();
    }

    private formatRouteLabel(arc: StoryArc): string {
        if (arc.title) {
            return arc.title;
        }
        const methods = arc.route?.methods?.length ? arc.route.methods.join('|') : 'ANY';
        const target = arc.route?.path || arc.route?.handler_name || 'route';
        return `${methods} ${target}`.trim();
    }

    private renderToc(): void {
        this.tocList.innerHTML = '';
        if (this.chapters.length === 0) {
            this.tocList.innerHTML = '<li class="toc-item"><div class="toc-title">No chapters yet</div><p class="toc-summary">Scan another repository.</p></li>';
            return;
        }
        this.chapters.forEach((chapter) => {
            const item = document.createElement('li');
            item.className = 'toc-item';
            item.dataset.chapterId = chapter.id;
            if (chapter.scope) {
                item.dataset.scope = chapter.scope;
            }
            item.innerHTML = `
                <div class="toc-title">${this.escapeHtml(chapter.title)}</div>
                <p class="toc-summary">${this.escapeHtml(chapter.summary)}</p>
            `;
            this.tocList.appendChild(item);
        });
        this.applyGuidedToc();
    }

    private async loadChapter(chapterId: string): Promise<void> {
        if (this.tocMode === 'routes') {
            await this.loadStoryArc(chapterId);
            return;
        }
        if (this.tourActive) {
            return;
        }
        const requestToken = ++this.chapterRequestToken;
        this.currentChapterId = chapterId;
        this.setActiveToc(chapterId);
        this.activeStoryArc = null;
        const chapter = this.chapters.find((entry) => entry.id === chapterId);
        const scope = chapter?.scope ?? this.getScopeForChapter(chapterId);
        this.focusedNodeId = null;
        await this.loadGraphForScope(scope);
        if (requestToken !== this.chapterRequestToken) {
            return;
        }
        const nodes = this.filterNodesForChapter(chapterId);
        const edges = this.filterEdgesForNodes(nodes);
        const graphView = this.buildGraphView(nodes, edges, scope);
        const focus = this.pickFocusNode(graphView.nodes);
        this.renderGraph(graphView.nodes, graphView.edges);
        this.updateGraphNodeStatus(graphView);
        this.loadSymbolSnippet(focus).catch(() => {
            this.renderCode(focus);
            void this.updateNarrator(focus);
        });
    }

    private async loadStoryArc(arcId: string): Promise<void> {
        const requestToken = ++this.chapterRequestToken;
        this.currentChapterId = arcId;
        this.setActiveToc(arcId);
        this.activeStoryArc = null;
        if (!arcId) {
            this.renderStoryArcEmpty();
            return;
        }
        if (this.tourActive) {
            return;
        }
        let arc = this.storyArcsById.get(arcId);
        if (!arc) {
            const response = await this.fetchJson<ApiStoryResponse>(
                this.buildApiUrl('/gitreader/api/story', { id: arcId }),
            );
            arc = Array.isArray(response.arcs) ? response.arcs[0] : undefined;
        }
        if (requestToken !== this.chapterRequestToken) {
            return;
        }
        if (!arc) {
            this.renderStoryArcMissing();
            return;
        }
        this.activeStoryArc = arc;
        this.syncRoutePickerSelection(arcId);
        this.focusedNodeId = arc.entry_id;
        await this.loadGraphForScope('full');
        if (requestToken !== this.chapterRequestToken) {
            return;
        }
        const nodes = this.graphNodes;
        const edges = this.filterEdgesForNodes(nodes);
        const graphView = this.buildGraphView(nodes, edges, 'full');
        this.renderGraph(graphView.nodes, graphView.edges);
        this.updateGraphNodeStatus(graphView);
        const entryNode = this.nodeById.get(arc.entry_id) ?? this.pickFocusNode(graphView.nodes);
        if (entryNode) {
            if (this.graphInstance) {
                this.graphInstance.$('node:selected').unselect();
                const element = this.graphInstance.$id(entryNode.id);
                if (element && typeof element.select === 'function') {
                    element.select();
                }
            }
            try {
                await this.loadSymbolSnippet(entryNode, false);
            } catch {
                this.renderCode(entryNode);
            }
        }
        this.renderStoryArc(arc);
    }

    private getScopeForChapter(chapterId: string): string {
        if (chapterId && (chapterId.startsWith('group:') || chapterId.startsWith('story:'))) {
            return chapterId;
        }
        return 'full';
    }

    private async loadGraphForScope(scope: string): Promise<void> {
        if (this.currentScope === scope && this.graphNodes.length > 0) {
            return;
        }
        const requestToken = ++this.graphRequestToken;
        this.currentScope = scope;
        const cached = this.graphCache.get(scope);
        if (cached) {
            this.setGraphData(cached);
            return;
        }
        let graphPromise = this.graphLoadPromises.get(scope);
        if (!graphPromise) {
            graphPromise = this.fetchJson<ApiGraphResponse>(
                this.buildApiUrl('/gitreader/api/graph', scope && scope !== 'full' ? { scope } : undefined),
            );
            this.graphLoadPromises.set(scope, graphPromise);
        }
        const graphData = await graphPromise;
        this.graphLoadPromises.delete(scope);
        if (requestToken !== this.graphRequestToken) {
            return;
        }
        this.graphCache.set(scope, graphData);
        this.setGraphData(graphData);
    }

    private getNodeCapForScope(scope: string, totalNodes: number): number {
        let cap = this.graphNodeCapByScope.get(scope);
        if (cap === undefined) {
            cap = Math.min(this.graphNodeCap, totalNodes);
            this.graphNodeCapByScope.set(scope, cap);
        } else if (cap > totalNodes) {
            cap = totalNodes;
            this.graphNodeCapByScope.set(scope, cap);
        }
        return cap;
    }

    private buildGraphView(nodes: SymbolNode[], edges: GraphEdge[], scope: string): GraphView {
        if (this.graphLayoutMode === 'cluster') {
            return this.buildClusterView(nodes, edges);
        }
        const totalNodes = nodes.length;
        const cap = this.getNodeCapForScope(scope, totalNodes);
        if (cap >= totalNodes) {
            return {
                nodes,
                edges,
                totalNodes,
                visibleNodes: totalNodes,
                isCapped: false,
            };
        }
        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        const degree = new Map<string, number>();
        edges.forEach((edge) => {
            if (nodeMap.has(edge.source)) {
                degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
            }
            if (nodeMap.has(edge.target)) {
                degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
            }
        });
        const keepIds = new Set<string>();
        const selectedNodeId = this.getSelectedGraphNodeId();
        if (selectedNodeId && nodeMap.has(selectedNodeId)) {
            keepIds.add(selectedNodeId);
        }
        if (this.currentSymbol && nodeMap.has(this.currentSymbol.id)) {
            keepIds.add(this.currentSymbol.id);
            const fileNode = this.getFileNodeForSymbol(this.currentSymbol);
            if (fileNode && nodeMap.has(fileNode.id)) {
                keepIds.add(fileNode.id);
            }
        }
        if (this.focusedNodeId && nodeMap.has(this.focusedNodeId)) {
            keepIds.add(this.focusedNodeId);
        }
        const kindWeight: Partial<Record<SymbolKind, number>> = {
            function: 0,
            method: 1,
            class: 2,
            file: 3,
            blueprint: 4,
            external: 5,
        };
        const sorted = nodes.slice().sort((a, b) => {
            const aDegree = degree.get(a.id) ?? 0;
            const bDegree = degree.get(b.id) ?? 0;
            if (aDegree !== bDegree) {
                return bDegree - aDegree;
            }
            const aWeight = kindWeight[a.kind] ?? 10;
            const bWeight = kindWeight[b.kind] ?? 10;
            if (aWeight !== bWeight) {
                return aWeight - bWeight;
            }
            return a.name.localeCompare(b.name);
        });
        const targetSize = Math.max(cap, keepIds.size);
        const selectedNodes: SymbolNode[] = [];
        sorted.forEach((node) => {
            if (keepIds.has(node.id)) {
                selectedNodes.push(node);
            }
        });
        for (const node of sorted) {
            if (selectedNodes.length >= targetSize) {
                break;
            }
            if (keepIds.has(node.id)) {
                continue;
            }
            selectedNodes.push(node);
        }
        const selectedIds = new Set(selectedNodes.map((node) => node.id));
        const trimmedEdges = edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target));
        return {
            nodes: selectedNodes,
            edges: trimmedEdges,
            totalNodes,
            visibleNodes: selectedNodes.length,
            isCapped: totalNodes > selectedNodes.length,
        };
    }

    private buildClusterView(nodes: SymbolNode[], edges: GraphEdge[]): GraphView {
        const totalNodes = nodes.length;
        const fileNodes = nodes.filter((node) => node.kind === 'file' && node.location?.path);
        if (fileNodes.length === 0) {
            return {
                nodes,
                edges,
                totalNodes,
                visibleNodes: nodes.length,
                isCapped: false,
            };
        }
        const fileTree = this.buildFileTreeFromNodes(fileNodes);
        const pathToFileNode = new Map<string, SymbolNode>();
        const filePathById = new Map<string, string>();
        fileNodes.forEach((node) => {
            const normalized = this.normalizePath(node.location?.path || '');
            if (!normalized) {
                return;
            }
            pathToFileNode.set(normalized, node);
            filePathById.set(node.id, normalized);
        });
        const symbolsByFile = new Map<string, SymbolNode[]>();
        nodes.forEach((node) => {
            if (node.kind === 'file' || node.kind === 'external' || !node.location?.path) {
                return;
            }
            const normalized = this.normalizePath(node.location.path);
            const list = symbolsByFile.get(normalized) ?? [];
            list.push(node);
            symbolsByFile.set(normalized, list);
        });
        const visibleNodes: SymbolNode[] = [];
        const visibleNodeIds = new Set<string>();
        const visibleFileIds = new Set<string>();
        const folderEdges: GraphEdge[] = [];
        const addNode = (node: SymbolNode) => {
            if (visibleNodeIds.has(node.id)) {
                return;
            }
            visibleNodes.push(node);
            visibleNodeIds.add(node.id);
        };
        const addFolderEdge = (source: string, target: string) => {
            folderEdges.push({
                source,
                target,
                kind: 'contains',
                confidence: 'low',
            });
        };
        const visitTree = (treeNode: FileTreeNode, parentFolderId: string | null) => {
            const entries = Array.from(treeNode.children.values());
            entries.sort((a, b) => {
                if (a.isFile !== b.isFile) {
                    return a.isFile ? 1 : -1;
                }
                return a.name.localeCompare(b.name);
            });
            entries.forEach((child) => {
                if (child.isFile) {
                    const fileNode = pathToFileNode.get(child.path);
                    if (!fileNode) {
                        return;
                    }
                    addNode(fileNode);
                    visibleFileIds.add(fileNode.id);
                    if (parentFolderId) {
                        addFolderEdge(parentFolderId, fileNode.id);
                    }
                    return;
                }
                const folderId = this.getFolderClusterId(child.path);
                const fileCount = this.countFilesInTree(child);
                const folderNode: SymbolNode = {
                    id: folderId,
                    name: `(${fileCount} files) ${child.name}`,
                    kind: 'folder',
                    summary: '',
                    location: {
                        path: child.path,
                        start_line: 0,
                        end_line: 0,
                        start_col: 0,
                        end_col: 0,
                    },
                };
                addNode(folderNode);
                if (parentFolderId) {
                    addFolderEdge(parentFolderId, folderId);
                }
                if (this.clusterExpanded.has(folderId)) {
                    visitTree(child, folderId);
                }
            });
        };
        visitTree(fileTree, null);

        if (this.showExternalNodes) {
            nodes.forEach((node) => {
                if (node.kind === 'external') {
                    addNode(node);
                }
            });
        }

        visibleFileIds.forEach((fileId) => {
            if (!this.clusterExpanded.has(fileId)) {
                return;
            }
            const path = filePathById.get(fileId);
            if (!path) {
                return;
            }
            const children = symbolsByFile.get(path);
            if (!children) {
                return;
            }
            children.forEach((child) => addNode(child));
        });

        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        const edgeMap = new Map<string, GraphEdge>();
        const confidenceRank: Record<EdgeConfidence, number> = { low: 0, medium: 1, high: 2 };
        const addEdge = (source: string, target: string, kind: EdgeKind, confidence: EdgeConfidence) => {
            const key = `${source}:${target}:${kind}`;
            const existing = edgeMap.get(key);
            if (!existing) {
                edgeMap.set(key, { source, target, kind, confidence });
                return;
            }
            if (confidenceRank[confidence] > confidenceRank[existing.confidence]) {
                existing.confidence = confidence;
            }
        };
        const resolveRepresentative = (node: SymbolNode): string | null => {
            if (node.kind === 'external') {
                return this.showExternalNodes ? node.id : null;
            }
            const path = node.location?.path;
            if (!path) {
                return visibleNodeIds.has(node.id) ? node.id : null;
            }
            const normalized = this.normalizePath(path);
            const fileNode = pathToFileNode.get(normalized);
            const fileId = fileNode?.id;
            const fileVisible = Boolean(fileId && visibleNodeIds.has(fileId));
            if (node.kind === 'file') {
                if (fileVisible && fileId) {
                    return fileId;
                }
                const folderId = this.findCollapsedFolderId(normalized);
                if (folderId && visibleNodeIds.has(folderId)) {
                    return folderId;
                }
                return fileId ?? null;
            }
            if (fileVisible && fileId) {
                if (this.clusterExpanded.has(fileId) && visibleNodeIds.has(node.id)) {
                    return node.id;
                }
                return fileId;
            }
            const folderId = this.findCollapsedFolderId(normalized);
            if (folderId && visibleNodeIds.has(folderId)) {
                return folderId;
            }
            return fileId ?? null;
        };

        edges.forEach((edge) => {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) {
                return;
            }
            const sourceRep = resolveRepresentative(sourceNode);
            const targetRep = resolveRepresentative(targetNode);
            if (!sourceRep || !targetRep || sourceRep === targetRep) {
                return;
            }
            addEdge(sourceRep, targetRep, edge.kind, edge.confidence);
        });
        folderEdges.forEach((edge) => addEdge(edge.source, edge.target, edge.kind, edge.confidence));

        return {
            nodes: visibleNodes,
            edges: Array.from(edgeMap.values()),
            totalNodes,
            visibleNodes: visibleNodes.length,
            isCapped: false,
        };
    }

    private updateGraphNodeStatus(graphView: GraphView): void {
        if (graphView.totalNodes === 0) {
            this.graphNodeStatus.textContent = '';
            this.graphRevealButton.disabled = true;
            return;
        }
        if (this.tourActive) {
            this.graphNodeStatus.textContent = `Guided view: ${graphView.visibleNodes}/${graphView.totalNodes}`;
            this.graphRevealButton.disabled = true;
            this.graphRevealButton.textContent = 'Guided';
            return;
        }
        if (this.graphLayoutMode === 'cluster') {
            this.graphNodeStatus.textContent = `Cluster view: ${graphView.visibleNodes} groups from ${graphView.totalNodes}`;
            this.graphRevealButton.disabled = true;
            this.graphRevealButton.textContent = 'Show more';
            return;
        }
        if (!graphView.isCapped) {
            this.graphNodeStatus.textContent = `Showing ${graphView.visibleNodes} nodes`;
            this.graphRevealButton.disabled = true;
            this.graphRevealButton.textContent = 'Show more';
            return;
        }
        this.graphNodeStatus.textContent = `Showing ${graphView.visibleNodes} of ${graphView.totalNodes}`;
        const nextCap = Math.min(graphView.totalNodes, graphView.visibleNodes + this.graphNodeCapStep);
        this.graphRevealButton.textContent = nextCap >= graphView.totalNodes ? 'Show all' : 'Show more';
        this.graphRevealButton.disabled = false;
    }

    private revealMoreNodes(): void {
        if (!this.currentChapterId) {
            return;
        }
        const nodes = this.filterNodesForChapter(this.currentChapterId);
        const total = nodes.length;
        const cap = this.getNodeCapForScope(this.currentScope, total);
        if (cap >= total) {
            return;
        }
        const nextCap = Math.min(total, cap + this.graphNodeCapStep);
        this.graphNodeCapByScope.set(this.currentScope, nextCap);
        this.refreshGraphView();
    }

    private refreshGraphView(): void {
        if (!this.currentChapterId) {
            return;
        }
        const nodes = this.filterNodesForChapter(this.currentChapterId);
        const edges = this.filterEdgesForNodes(nodes);
        const graphView = this.buildGraphView(nodes, edges, this.currentScope);
        this.renderGraph(graphView.nodes, graphView.edges);
        this.updateGraphNodeStatus(graphView);
    }

    private setGraphData(graphData: ApiGraphResponse): void {
        this.graphNodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
        this.graphEdges = Array.isArray(graphData.edges) ? graphData.edges : [];
        this.nodeById = new Map(this.graphNodes.map((node) => [node.id, node]));
        this.fileNodesByPath = new Map();
        this.graphNodes.forEach((node) => {
            if (node.kind !== 'file' || !node.location?.path) {
                return;
            }
            this.fileNodesByPath.set(this.normalizePath(node.location.path), node);
        });
        if (this.currentScope === 'full' || this.tourActive) {
            this.refreshFileTree();
        }
    }

    private async loadSymbolSnippet(symbol: SymbolNode, shouldNarrate: boolean = true): Promise<void> {
        if (shouldNarrate) {
            this.activeStoryArc = null;
        }
        if (!this.canFetchSnippet(symbol)) {
            this.renderCode(symbol);
            if (shouldNarrate) {
                void this.updateNarrator(symbol);
            }
            return;
        }
        const section = this.getSnippetSection(symbol);
        const cacheKey = `${symbol.id}:${section}`;
        const cached = this.snippetCache.get(cacheKey);
        if (cached) {
            this.renderCode(symbol, cached);
            if (shouldNarrate) {
                void this.updateNarrator(symbol);
            }
            return;
        }
        const response = await this.fetchJson<SymbolSnippetResponse>(
            this.buildApiUrl('/gitreader/api/symbol', { id: symbol.id, section }),
        );
        this.snippetCache.set(cacheKey, response);
        this.renderCode(symbol, response);
        if (shouldNarrate) {
            void this.updateNarrator(symbol);
        }
    }

    private getSnippetSection(symbol: SymbolNode): string {
        if (this.snippetMode === 'full') {
            return 'full';
        }
        if (symbol.kind === 'function' || symbol.kind === 'method' || symbol.kind === 'class') {
            return 'body';
        }
        return 'full';
    }

    private canFetchSnippet(symbol: SymbolNode): boolean {
        if (!symbol.id) {
            return false;
        }
        if (symbol.kind === 'external' || symbol.kind === 'folder') {
            return false;
        }
        return Boolean(symbol.location && symbol.location.path);
    }

    private filterNodesForChapter(chapterId: string): SymbolNode[] {
        if (!chapterId || !chapterId.startsWith('group:')) {
            return this.graphNodes;
        }
        const group = chapterId.slice('group:'.length);
        const filtered = this.graphNodes.filter((node) => {
            const path = this.getNodePath(node);
            if (!path) {
                return false;
            }
            const normalized = path.replace(/\\/g, '/');
            if (group === 'root') {
                return normalized.indexOf('/') === -1;
            }
            return normalized.startsWith(`${group}/`);
        });
        return filtered.length > 0 ? filtered : this.graphNodes;
    }

    private filterEdgesForNodes(nodes: SymbolNode[]): GraphEdge[] {
        const allowed = new Set(nodes.map((node) => node.id));
        return this.graphEdges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target));
    }

    private pickFocusNode(nodes: SymbolNode[]): SymbolNode {
        if (nodes.length === 0) {
            return this.fallbackSymbol();
        }
        const priority: SymbolKind[] = ['function', 'method', 'class', 'file', 'folder', 'blueprint', 'external'];
        for (const kind of priority) {
            const match = nodes.find((node) => node.kind === kind);
            if (match) {
                return match;
            }
        }
        return nodes[0];
    }

    private fallbackSymbol(): SymbolNode {
        return {
            id: 'fallback',
            name: 'Repository',
            kind: 'file',
            summary: 'Select a chapter to explore symbols.',
        };
    }

    private getNodePath(node: SymbolNode): string | null {
        if (node.location && node.location.path) {
            return node.location.path;
        }
        return null;
    }

    private normalizePath(path: string): string {
        return path.replace(/\\/g, '/');
    }

    private isReaderVisible(): boolean {
        return this.workspace.dataset.layout !== 'canvas';
    }

    private getFolderClusterId(path: string): string {
        return `cluster:folder:${path}`;
    }

    private findCollapsedFolderId(path: string): string | null {
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        let current = '';
        for (const part of parts.slice(0, -1)) {
            current = current ? `${current}/${part}` : part;
            const folderId = this.getFolderClusterId(current);
            if (!this.clusterExpanded.has(folderId)) {
                return folderId;
            }
        }
        return null;
    }

    private countFilesInTree(node: FileTreeNode): number {
        if (node.isFile) {
            return 1;
        }
        let count = 0;
        node.children.forEach((child) => {
            count += this.countFilesInTree(child);
        });
        return count;
    }

    private refreshFileTree(): void {
        if (!this.narratorFileTree) {
            return;
        }
        this.fileTreeRoot = this.buildFileTreeFromNodes(this.graphNodes);
        this.renderFileTree(this.fileTreeFocusPath);
    }

    private buildFileTreeFromNodes(nodes: SymbolNode[]): FileTreeNode {
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
            const normalized = this.normalizePath(node.location.path);
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

    private renderFileTree(focusPath?: string | null): void {
        if (!this.narratorFileTree) {
            return;
        }
        const normalizedFocus = focusPath ? this.normalizePath(focusPath) : '';
        this.fileTreeFocusPath = normalizedFocus || null;
        const treeHtml = this.buildFileTreeMarkup(normalizedFocus);
        this.narratorFileTree.innerHTML = treeHtml;
    }

    private renderFileTreeNode(
        node: FileTreeNode,
        focusPath: string,
        focusParentPath: string | null,
        collapsedFocusParents: Set<string>,
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
            const isFocus = focusPath && child.path === focusPath;
            const isFocusFile = child.isFile && isFocus;
            const isFocusDir = !child.isFile && isFocus;
            const isFocusParent = !child.isFile && focusParentPath && child.path === focusParentPath;
            if (child.isFile) {
                return `
                    <li class="file-tree-item${isFocusFile ? ' is-focus' : ''}">
                        <span class="file-tree-name">${this.escapeHtml(child.name)}</span>
                    </li>
                `;
            }
            const isCollapsed = this.fileTreeCollapsed.has(child.path);
            const isCollapsedFocusParent = isCollapsed && collapsedFocusParents.has(child.path);
            const childrenHtml = this.renderFileTreeNode(
                child,
                focusPath,
                focusParentPath,
                collapsedFocusParents,
            );
            return `
                <li class="file-tree-item is-dir${isCollapsed ? ' is-collapsed' : ''}${isFocusDir || isCollapsedFocusParent ? ' is-focus' : ''}">
                    <button class="file-tree-toggle" type="button" data-tree-toggle="${this.escapeHtml(child.path)}">
                        <span class="file-tree-caret"></span>
                        <span class="file-tree-name">${this.escapeHtml(child.name)}/</span>
                    </button>
                    <div class="file-tree-children">${childrenHtml}</div>
                </li>
            `;
        });
        return `<ul class="file-tree-list">${items.join('')}</ul>`;
    }

    private buildFileTreeMarkup(focusPath?: string | null): string {
        const normalizedFocus = focusPath ? this.normalizePath(focusPath) : '';
        if (normalizedFocus) {
            this.expandFileTreeForFocus(normalizedFocus);
        }
        if (!this.fileTreeRoot || this.fileTreeRoot.children.size === 0) {
            return '<p class="file-tree-empty">No files loaded yet.</p>';
        }
        const focusParentPath = this.getParentPath(normalizedFocus);
        const collapsedFocusParents = this.getCollapsedFocusParents(normalizedFocus);
        const treeHtml = this.renderFileTreeNode(
            this.fileTreeRoot,
            normalizedFocus,
            focusParentPath,
            collapsedFocusParents,
        );
        return treeHtml || '<p class="file-tree-empty">No files loaded yet.</p>';
    }

    private toggleFileTreePath(path: string): void {
        if (this.fileTreeCollapsed.has(path)) {
            this.fileTreeCollapsed.delete(path);
        } else {
            this.fileTreeCollapsed.add(path);
        }
        this.renderFileTree(this.fileTreeFocusPath);
        if (this.readerTreeFocusPath) {
            this.renderReaderFileTree(this.readerTreeFocusPath);
        }
    }

    private expandFileTreePath(path: string): void {
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        let current = '';
        for (const part of parts.slice(0, -1)) {
            current = current ? `${current}/${part}` : part;
            if (this.fileTreeCollapsed.has(current)) {
                break;
            }
            this.fileTreeCollapsed.delete(current);
        }
    }

    private expandFileTreeForFocus(path: string): void {
        if (this.fileNodesByPath.has(path)) {
            this.expandFileTreePath(path);
            return;
        }
        this.expandFileTreeFolder(path);
    }

    private expandFileTreeFolder(path: string): void {
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        let current = '';
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            this.fileTreeCollapsed.delete(current);
        }
    }

    private getParentPath(path: string): string | null {
        if (!path) {
            return null;
        }
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        if (parts.length <= 1) {
            return null;
        }
        return parts.slice(0, -1).join('/');
    }

    private getCollapsedFocusParents(path: string): Set<string> {
        const collapsed = new Set<string>();
        if (!path) {
            return collapsed;
        }
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        let current = '';
        for (const part of parts.slice(0, -1)) {
            current = current ? `${current}/${part}` : part;
            if (this.fileTreeCollapsed.has(current)) {
                collapsed.add(current);
            }
        }
        return collapsed;
    }

    private getFileNodeForSymbol(symbol: SymbolNode): SymbolNode | null {
        const path = symbol.location?.path;
        if (!path) {
            return null;
        }
        return this.fileNodesByPath.get(this.normalizePath(path)) ?? null;
    }

    private isModifierClick(event?: MouseEvent): boolean {
        if (!event) {
            return false;
        }
        return Boolean(event.metaKey || event.ctrlKey);
    }

    private isFileNodeActive(fileNode: SymbolNode): boolean {
        if (this.currentSymbol && this.currentSymbol.kind === 'file') {
            if (this.currentSymbol.id === fileNode.id) {
                return true;
            }
            const currentPath = this.currentSymbol.location?.path;
            const filePath = fileNode.location?.path;
            if (currentPath && filePath && this.normalizePath(currentPath) === this.normalizePath(filePath)) {
                return true;
            }
        }
        if (!this.graphInstance) {
            return false;
        }
        const element = this.graphInstance.$id(fileNode.id);
        return Boolean(element && typeof element.selected === 'function' && element.selected());
    }

    private async highlightSymbolInFile(fileNode: SymbolNode, symbol: SymbolNode): Promise<void> {
        if (!this.currentSymbol || this.currentSymbol.id !== fileNode.id) {
            try {
                await this.loadSymbolSnippet(fileNode);
            } catch {
                this.renderCode(fileNode);
                void this.updateNarrator(fileNode);
            }
        }
        this.applyFocusHighlight(symbol);
    }

    private handleFileFocusClick(symbol: SymbolNode, event?: MouseEvent): boolean {
        if (!this.isModifierClick(event)) {
            return false;
        }
        if (symbol.kind !== 'function' && symbol.kind !== 'method') {
            return false;
        }
        const fileNode = this.getFileNodeForSymbol(symbol);
        if (!fileNode || !this.isFileNodeActive(fileNode)) {
            return false;
        }
        if (this.graphInstance) {
            this.graphInstance.$id(fileNode.id).select();
            this.graphInstance.$id(symbol.id).select();
        }
        void this.highlightSymbolInFile(fileNode, symbol);
        return true;
    }

    private handleClusterNodeToggle(symbol: SymbolNode, event?: MouseEvent): boolean {
        if (symbol.kind === 'folder') {
            this.toggleClusterExpansion(symbol.id);
            return true;
        }
        if (symbol.kind !== 'file') {
            return false;
        }
        if (this.isModifierClick(event)) {
            return false;
        }
        if (!symbol.location?.path) {
            return false;
        }
        if (!this.fileHasClusterChildren(symbol)) {
            return false;
        }
        this.toggleClusterExpansion(symbol.id);
        return true;
    }

    private handleClusterFolderSingleClick(symbol: SymbolNode): boolean {
        if (symbol.kind !== 'folder') {
            return false;
        }
        if (this.isReaderVisible()) {
            const folderPath = symbol.location?.path;
            if (folderPath) {
                this.renderReaderFileTree(folderPath);
                this.renderFileTree(folderPath);
                this.renderFileTreeNarrator();
            }
        }
        return true;
    }

    private toggleClusterExpansion(nodeId: string): void {
        if (this.clusterExpanded.has(nodeId)) {
            this.clusterExpanded.delete(nodeId);
        } else {
            this.clusterExpanded.add(nodeId);
        }
        this.refreshGraphView();
    }

    private fileHasClusterChildren(fileNode: SymbolNode): boolean {
        const path = fileNode.location?.path;
        if (!path) {
            return false;
        }
        const normalized = this.normalizePath(path);
        return this.graphNodes.some((node) => {
            if (node.kind === 'file' || node.kind === 'external') {
                return false;
            }
            if (!node.location?.path) {
                return false;
            }
            return this.normalizePath(node.location.path) === normalized;
        });
    }

    private applyFocusHighlight(symbol: SymbolNode): void {
        const start = symbol.location?.start_line ?? 0;
        const end = symbol.location?.end_line ?? start;
        if (!start) {
            this.setCodeStatus('Line range unavailable.');
            return;
        }
        this.clearFocusHighlights();
        let firstLine: HTMLElement | null = null;
        let found = false;
        for (let line = start; line <= end; line += 1) {
            const lineEl = this.codeSurface.querySelector<HTMLElement>(`[data-line="${line}"]`);
            if (!lineEl) {
                continue;
            }
            lineEl.classList.add('is-focus');
            if (!firstLine) {
                firstLine = lineEl;
            }
            found = true;
        }
        if (!found) {
            this.setCodeStatus('Selection outside snippet.');
            return;
        }
        this.setCodeStatus(`Highlighted ${symbol.name}.`);
        if (firstLine) {
            firstLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    private clearFocusHighlights(): void {
        this.codeSurface.querySelectorAll<HTMLElement>('.code-line.is-focus')
            .forEach((line) => line.classList.remove('is-focus'));
    }

    private setActiveToc(chapterId: string): void {
        Array.from(this.tocList.children).forEach((child) => {
            const element = child as HTMLElement;
            const isActive = element.dataset.chapterId === chapterId;
            element.classList.toggle('is-active', isActive);
        });
        if (this.tocMode === 'routes') {
            this.syncRoutePickerSelection(chapterId);
        } else {
            this.syncRoutePickerSelection('');
        }
    }

    private syncRoutePickerSelection(arcId: string): void {
        if (!this.storyArcsById.has(arcId)) {
            this.routeSelect.value = '';
            return;
        }
        this.routeSelect.value = arcId;
    }

    private formatLocation(location?: SourceLocation, startLine?: number, endLine?: number): string {
        if (!location || !location.path) {
            return 'location unknown';
        }
        if (startLine && startLine > 0) {
            const endLabel = endLine && endLine !== startLine ? `-${endLine}` : '';
            return `${location.path}:${startLine}${endLabel}`;
        }
        if (location.start_line) {
            const endLabel = location.end_line && location.end_line !== location.start_line
                ? `-${location.end_line}`
                : '';
            return `${location.path}:${location.start_line}${endLabel}`;
        }
        return location.path;
    }

    private renderCode(symbol: SymbolNode, snippet?: SymbolSnippetResponse): void {
        const summary = snippet?.summary ?? symbol.summary ?? 'No summary yet.';
        const signature = snippet?.signature ?? symbol.signature ?? 'signature pending';
        const displayRange = this.getDisplayRange(symbol, snippet);
        const locationLabel = this.formatLocation(symbol.location, displayRange.startLine, displayRange.endLine);
        const truncationLabel = snippet?.truncated ? ' (truncated)' : '';
        const language = this.getHighlightLanguage(symbol.location?.path);
        const snippetHtml = this.renderSnippetLines(snippet, language);
        const revealLabel = snippet?.section === 'body' ? 'Show body' : 'Show code';
        const codeClass = this.hasHighlightSupport() && language ? `hljs language-${language}` : '';
        const breadcrumbHtml = this.renderImportBreadcrumbs(symbol.location?.path);
        this.currentSymbol = symbol;
        this.readerTreeFocusPath = null;
        this.currentSnippetText = snippet?.snippet ?? '';
        this.currentSnippetStartLine = snippet?.start_line ?? symbol.location?.start_line ?? 1;
        this.codeSurface.innerHTML = `
            <article class="code-card">
                <div class="code-meta">
                    <span>${this.escapeHtml(symbol.kind.toUpperCase())}</span>
                    <span>${this.escapeHtml(locationLabel)}${this.escapeHtml(truncationLabel)}</span>
                </div>
                ${breadcrumbHtml}
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
                    <h3>${this.escapeHtml(symbol.name)}</h3>
                    <p>${this.escapeHtml(summary)}</p>
                </div>
                <div class="code-signature">${this.escapeHtml(signature)}</div>
                <details class="code-details" open>
                    <summary>${revealLabel}</summary>
                    <pre><code class="${codeClass}">${snippetHtml}</code></pre>
                </details>
            </article>
        `;
        this.applyGuidedCodeFocus();
        this.decorateImportLines(snippet, language);
    }

    private decorateImportLines(snippet?: SymbolSnippetResponse, language?: string): void {
        if (!snippet?.snippet || !this.currentSymbol || this.currentSymbol.kind !== 'file') {
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
                        const lineEl = this.codeSurface.querySelector<HTMLElement>(`[data-line="${lineNumber}"]`);
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
            const lineEl = this.codeSurface.querySelector<HTMLElement>(`[data-line="${lineNumber}"]`);
            if (!lineEl) {
                return;
            }
            lineEl.dataset.imports = importNames.join(',');
            this.decorateImportLine(lineEl, importNames);
        });
    }

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

    private updateImportBreadcrumbs(fromPath: string, toPath: string): void {
        const from = this.normalizePath(fromPath);
        const to = this.normalizePath(toPath);
        if (!from || !to) {
            return;
        }
        const last = this.importBreadcrumbs[this.importBreadcrumbs.length - 1];
        if (!last || last !== from) {
            this.importBreadcrumbs = [from];
        }
        if (from === to) {
            return;
        }
        if (this.importBreadcrumbs[this.importBreadcrumbs.length - 1] !== to) {
            this.importBreadcrumbs.push(to);
        }
    }

    private renderImportBreadcrumbs(path?: string): string {
        if (!path || this.importBreadcrumbs.length < 2) {
            return '';
        }
        const normalized = this.normalizePath(path);
        const currentIndex = this.importBreadcrumbs.lastIndexOf(normalized);
        if (currentIndex < 0) {
            return '';
        }
        const crumbs = [...this.importBreadcrumbs];
        const items = crumbs.map((crumbPath, index) => {
            const label = this.escapeHtml(this.getBreadcrumbLabel(crumbPath));
            const escapedPath = this.escapeHtml(crumbPath);
            const isCurrent = index === currentIndex;
            const currentAttr = isCurrent ? ' aria-current="page"' : '';
            const currentClass = isCurrent ? ' is-current' : '';
            return `<button class="breadcrumb${currentClass}" data-breadcrumb-path="${escapedPath}"${currentAttr}>${label}</button>`;
        });
        return `
            <nav class="code-breadcrumbs" aria-label="Import trail">
                ${items.join('<span class="breadcrumb-sep">&gt;</span>')}
            </nav>
        `;
    }

    private getBreadcrumbLabel(path: string): string {
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        if (parts.length <= 2) {
            return normalized;
        }
        return `.../${parts.slice(-2).join('/')}`;
    }

    private navigateBreadcrumb(path: string): void {
        const normalized = this.normalizePath(path);
        const index = this.importBreadcrumbs.lastIndexOf(normalized);
        if (index < 0) {
            this.importBreadcrumbs = [normalized];
        }
        const fileNode = this.fileNodesByPath.get(normalized);
        if (!fileNode) {
            this.setCodeStatus(`"${normalized}" is not indexed in this project.`);
            return;
        }
        this.jumpToSymbol(fileNode);
    }

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

    private isJSImportStart(trimmed: string): boolean {
        if (!trimmed) {
            return false;
        }
        if (trimmed.startsWith('import(')) {
            return false;
        }
        return /^import\b/.test(trimmed) || /^export\b/.test(trimmed);
    }

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

    private filterImportNamesForLine(lineText: string, importNames: string[]): string[] {
        if (!lineText || importNames.length === 0) {
            return [];
        }
        return importNames.filter((name) => {
            const matcher = new RegExp(`\\b${this.escapeRegex(name)}\\b`);
            return matcher.test(lineText);
        });
    }

    private highlightImportUsage(importName: string): void {
        if (!importName) {
            return;
        }
        this.clearImportUsageHighlights();
        const lines = Array.from(this.codeSurface.querySelectorAll<HTMLElement>('.code-line'));
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
            this.setCodeStatus(`No usages of ${importName} in this snippet.`);
            return;
        }
        this.setCodeStatus(`Found ${matchCount} usage${matchCount === 1 ? '' : 's'} of ${importName}.`);
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    private handleImportJump(importName: string, lineEl?: HTMLElement | null): void {
        const lineText = this.getLineTextForElement(lineEl ?? undefined);
        const language = this.getHighlightLanguage(this.currentSymbol?.location?.path);
        const currentPath = this.currentSymbol?.location?.path;
        const statement = lineEl?.dataset.importStatement ?? lineText;
        const target = this.resolveImportTarget(importName, statement, language, currentPath);
        if (target) {
            const fileNode = target.kind === 'file' ? target : this.getFileNodeForSymbol(target);
            const fromPath = this.currentSymbol?.location?.path;
            const toPath = fileNode?.location?.path ?? target.location?.path;
            if (fromPath && toPath) {
                this.updateImportBreadcrumbs(fromPath, toPath);
            }
            if (fileNode && target.kind !== 'file') {
                if (this.graphInstance) {
                    const fileElement = this.graphInstance.$id(fileNode.id);
                    const symbolElement = this.graphInstance.$id(target.id);
                    if (fileElement && !fileElement.empty()) {
                        this.graphInstance.$('node:selected').unselect();
                        fileElement.select();
                        if (symbolElement && !symbolElement.empty() && symbolElement.id() !== fileElement.id()) {
                            symbolElement.select();
                        }
                    } else if (symbolElement && !symbolElement.empty()) {
                        this.graphInstance.$('node:selected').unselect();
                        symbolElement.select();
                    }
                }
                void this.highlightSymbolInFile(fileNode, target);
                return;
            }
            this.jumpToSymbol(target);
            return;
        }
        const sourceLabel = statement ? ` from "${statement.trim()}"` : '';
        this.showImportModal(`"${importName}" is not defined in this project${sourceLabel}.`);
    }

    private getLineTextForElement(lineEl?: HTMLElement): string {
        if (!lineEl) {
            return '';
        }
        const lineNumber = Number(lineEl.dataset.line);
        if (Number.isFinite(lineNumber) && this.currentSnippetText) {
            const lines = this.currentSnippetText.replace(/\n$/, '').split('\n');
            const index = lineNumber - this.currentSnippetStartLine;
            if (index >= 0 && index < lines.length) {
                return lines[index];
            }
        }
        const textEl = lineEl.querySelector<HTMLElement>('.line-text');
        return textEl?.textContent ?? '';
    }

    private resolveImportTarget(
        importName: string,
        lineText: string,
        language?: string,
        currentPath?: string,
    ): SymbolNode | null {
        const normalizedPath = currentPath ? this.normalizePath(currentPath) : '';
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

    private parseSwiftImportModule(lineText: string): string | null {
        const trimmed = lineText.trim();
        if (!trimmed.startsWith('import ')) {
            return null;
        }
        const rest = trimmed.slice('import '.length).trim();
        const moduleName = rest.split(/\s+/)[0];
        return moduleName || null;
    }

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

    private resolvePythonModuleCandidates(modulePath: string, currentPath: string): string[] {
        if (!modulePath) {
            return [];
        }
        const normalizedCurrent = currentPath ? this.normalizePath(currentPath) : '';
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

    private resolveJsModuleCandidates(modulePath: string, currentPath: string): string[] {
        const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
        const normalizedCurrent = currentPath ? this.normalizePath(currentPath) : '';
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

    private isRelativeImport(modulePath: string): boolean {
        return modulePath.startsWith('.') || modulePath.startsWith('/');
    }

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

    private findSwiftModuleFile(moduleName: string): SymbolNode | null {
        if (!moduleName) {
            return null;
        }
        const target = `${moduleName}.swift`;
        for (const [path, node] of this.fileNodesByPath.entries()) {
            if (path.endsWith(`/${target}`) || path === target) {
                return node;
            }
        }
        return null;
    }

    private findSymbolInFiles(symbolName: string, candidates: string[]): SymbolNode | null {
        if (!symbolName || candidates.length === 0) {
            return null;
        }
        const candidateSet = new Set(candidates.map((path) => this.normalizePath(path)));
        return this.graphNodes.find((node) => {
            if (!node.location?.path || node.kind === 'external' || node.kind === 'folder') {
                return false;
            }
            if (node.name !== symbolName) {
                return false;
            }
            return candidateSet.has(this.normalizePath(node.location.path));
        }) ?? null;
    }

    private findFileByCandidates(candidates: string[]): SymbolNode | null {
        for (const candidate of candidates) {
            const normalized = this.normalizePath(candidate);
            const node = this.fileNodesByPath.get(normalized);
            if (node) {
                return node;
            }
        }
        return null;
    }

    private jumpToSymbol(symbol: SymbolNode): void {
        if (this.graphInstance) {
            const fileNode = this.getFileNodeForSymbol(symbol);
            const fileElement = fileNode ? this.graphInstance.$id(fileNode.id) : null;
            const symbolElement = this.graphInstance.$id(symbol.id);
            if (fileElement && !fileElement.empty()) {
                this.graphInstance.$('node:selected').unselect();
                fileElement.select();
                if (symbolElement && !symbolElement.empty() && symbolElement.id() !== fileElement.id()) {
                    symbolElement.select();
                }
            } else if (symbolElement && !symbolElement.empty()) {
                this.graphInstance.$('node:selected').unselect();
                symbolElement.select();
            }
        }
        this.loadSymbolSnippet(symbol).catch(() => {
            this.renderCode(symbol);
            void this.updateNarrator(symbol);
        });
    }

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

    private hideImportModal(): void {
        if (!this.importModal) {
            return;
        }
        this.importModal.classList.remove('is-visible');
        this.importModal.setAttribute('aria-hidden', 'true');
    }

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

    private clearImportUsageHighlights(): void {
        this.codeSurface.querySelectorAll<HTMLElement>('.code-line.is-import-usage')
            .forEach((line) => line.classList.remove('is-import-usage'));
    }

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

    private extractSwiftImportNames(lineText: string): string[] {
        if (!lineText.startsWith('import ')) {
            return [];
        }
        const rest = lineText.slice('import '.length).trim();
        const moduleName = rest.split(/\s+/)[0];
        return moduleName ? [moduleName] : [];
    }

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

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

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

    private renderSnippetLines(snippet?: SymbolSnippetResponse, language?: string): string {
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
            .join('\n');
    }

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

    private renderGraph(nodes: SymbolNode[], edges: GraphEdge[]): void {
        if (nodes.length === 0) {
            this.clearGraph();
            this.setCanvasOverlay('No nodes yet. Graph data has not loaded.', true);
            return;
        }
        if (!this.graphInstance && typeof cytoscape !== 'function') {
            this.setCanvasOverlay('Graph library not loaded.', true);
            return;
        }
        this.displayNodeById = new Map(nodes.map((node) => [node.id, node]));
        this.setCanvasOverlay('', false);
        this.ensureGraph();
        const selectedNodeId = this.getSelectedGraphNodeId();
        const elements = this.buildGraphElements(nodes, edges);
        this.graphInstance.elements().remove();
        this.graphInstance.add(elements);
        if (selectedNodeId) {
            const selected = this.graphInstance.$id(selectedNodeId);
            if (selected) {
                selected.select();
            }
        }
        this.runGraphLayout();
        this.applyGraphFilters();
    }

    private ensureGraph(): void {
        if (this.graphInstance) {
            return;
        }
        this.graphInstance = cytoscape({
            container: this.canvasGraph,
            elements: [],
            style: this.getGraphStyles(),
            layout: { name: 'cose', animate: false, fit: true, padding: 24 },
            minZoom: 0.2,
            maxZoom: 2.5,
            wheelSensitivity: 0.2,
        });
        this.bindGraphEvents();
    }

    private clearGraph(): void {
        if (this.graphInstance) {
            this.graphInstance.elements().remove();
        }
        this.hideGraphTooltip();
    }

    private bindGraphEvents(): void {
        if (this.graphEventsBound || !this.graphInstance) {
            return;
        }
        this.graphInstance.on('tap', 'node', (event: { target: { id: () => string; select: () => void }; originalEvent?: MouseEvent }) => {
            const nodeId = event.target.id();
            const node = this.displayNodeById.get(nodeId) ?? this.nodeById.get(nodeId);
            if (!node) {
                return;
            }
            const now = Date.now();
            const isDoubleTap = this.lastTapNodeId === nodeId && (now - this.lastTapAt) < this.doubleTapDelay;
            this.lastTapNodeId = nodeId;
            this.lastTapAt = now;
            if (this.tourActive) {
                if (!this.isGuidedNodeAllowed(nodeId)) {
                    this.flashGuidedMessage('Follow the guide to unlock this step.');
                    return;
                }
                void this.advanceTour('jump', nodeId);
                return;
            }
            if (this.graphLayoutMode === 'cluster' && isDoubleTap && this.handleClusterNodeToggle(node, event.originalEvent)) {
                return;
            }
            if (this.graphLayoutMode === 'cluster' && this.handleClusterFolderSingleClick(node)) {
                event.target.select();
                return;
            }
            if (this.handleFileFocusClick(node, event.originalEvent)) {
                return;
            }
            event.target.select();
            this.loadSymbolSnippet(node).catch(() => {
                this.renderCode(node);
                void this.updateNarrator(node);
            });
        });
        this.graphInstance.on('select', 'node', () => {
            this.refreshEdgeHighlights();
            this.updateLabelVisibility();
        });
        this.graphInstance.on('unselect', 'node', () => {
            this.refreshEdgeHighlights();
            this.updateLabelVisibility();
        });
        this.graphInstance.on('mouseover', 'node', (event: any) => {
            const nodeId = event.target.id();
            event.target.addClass('is-hovered');
            this.setHoveredNode(nodeId);
            this.showGraphTooltip(event.target, event);
            this.updateLabelVisibility();
        });
        this.graphInstance.on('mouseout', 'node', (event: any) => {
            event.target.removeClass('is-hovered');
            this.setHoveredNode(null);
            this.hideGraphTooltip();
            this.updateLabelVisibility();
        });
        this.graphInstance.on('mousemove', 'node', (event: any) => {
            this.updateTooltipPosition(event);
        });
        this.graphInstance.on('zoom', () => {
            this.updateLabelVisibility();
        });
        this.graphEventsBound = true;
    }

    private buildGraphElements(nodes: SymbolNode[], edges: GraphEdge[]): Array<{ data: Record<string, unknown> }> {
        const nodeElements = nodes.map((node) => {
            const labelData = this.formatNodeLabel(node);
            return {
                data: {
                    id: node.id,
                    label: labelData.label,
                    fullLabel: labelData.fullLabel,
                    kindLabel: labelData.kindLabel,
                    kind: node.kind,
                    summary: node.summary || '',
                    path: labelData.path,
                    labelVisible: 'true',
                },
            };
        });
        const edgeElements = edges.map((edge, index) => ({
            data: {
                id: `edge:${edge.source}:${edge.target}:${edge.kind}:${index}`,
                source: edge.source,
                target: edge.target,
                kind: edge.kind,
                confidence: edge.confidence,
            },
        }));
        return [...nodeElements, ...edgeElements];
    }

    private formatNodeLabel(node: SymbolNode): { label: string; fullLabel: string; path: string; kindLabel: string } {
        const path = node.location?.path ?? '';
        const fullLabel = node.name || path;
        const displayName = this.getDisplayName(node, fullLabel, path);
        const badge = this.getKindBadge(node.kind);
        const kindLabel = this.getKindLabel(node.kind);
        const label = this.wrapLabel(`[${badge}]`, displayName);
        return { label, fullLabel, path, kindLabel };
    }

    private getDisplayName(node: SymbolNode, fullLabel: string, path: string): string {
        if (node.kind === 'file') {
            return this.getBasename(path || fullLabel);
        }
        if (node.kind === 'folder') {
            return node.name || this.getBasename(path || fullLabel);
        }
        return fullLabel || node.name;
    }

    private getBasename(value: string): string {
        const normalized = value.replace(/\\/g, '/');
        const parts = normalized.split('/');
        return parts.length > 0 ? parts[parts.length - 1] : value;
    }

    private wrapLabel(prefix: string, name: string): string {
        const normalized = name.replace(/\s+/g, ' ').trim();
        if (!normalized) {
            return prefix;
        }
        const lineLength = Math.max(8, this.labelLineLength);
        const prefixText = prefix ? `${prefix} ` : '';
        const firstLineLimit = Math.max(4, lineLength - prefixText.length);
        const firstPart = normalized.slice(0, firstLineLimit);
        let remaining = normalized.slice(firstPart.length).trimStart();
        let label = `${prefixText}${firstPart}`;
        if (remaining) {
            let secondPart = remaining.slice(0, lineLength);
            if (remaining.length > lineLength) {
                const trimmed = secondPart.slice(0, Math.max(0, lineLength - 3));
                secondPart = `${trimmed}...`;
            }
            label += `\n${secondPart}`;
        }
        return label;
    }

    private getKindBadge(kind: SymbolKind): string {
        switch (kind) {
            case 'file':
                return 'F';
            case 'folder':
                return 'dir';
            case 'class':
                return 'C';
            case 'function':
                return 'fn';
            case 'method':
                return 'm';
            case 'blueprint':
                return 'bp';
            case 'external':
                return 'ext';
            default:
                return 'id';
        }
    }

    private getKindLabel(kind: SymbolKind): string {
        switch (kind) {
            case 'file':
                return 'File';
            case 'folder':
                return 'Folder';
            case 'class':
                return 'Class';
            case 'function':
                return 'Function';
            case 'method':
                return 'Method';
            case 'blueprint':
                return 'Blueprint';
            case 'external':
                return 'External';
            default:
                return 'Symbol';
        }
    }

    private getGraphStyles(): Array<Record<string, object>> {
        return [
            {
                selector: 'node',
                style: {
                    'background-color': '#e9dfcf',
                    'label': 'data(label)',
                    'font-size': '12px',
                    'font-family': 'Space Grotesk, sans-serif',
                    'text-wrap': 'wrap',
                    'text-max-width': '120px',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'color': '#1e1914',
                    'border-width': 1,
                    'border-color': '#d2c2ad',
                    'padding': '10px',
                    'shape': 'round-rectangle',
                },
            },
            {
                selector: 'node[labelVisible = "false"]',
                style: {
                    'text-opacity': 0,
                    'text-background-opacity': 0,
                },
            },
            {
                selector: 'node[kind = "file"]',
                style: { 'background-color': '#f0dcc1' },
            },
            {
                selector: 'node[kind = "folder"]',
                style: { 'background-color': '#f5e6d6', 'border-style': 'dashed' },
            },
            {
                selector: 'node[kind = "class"]',
                style: { 'background-color': '#d9e8f0' },
            },
            {
                selector: 'node[kind = "function"]',
                style: { 'background-color': '#e3f0d9' },
            },
            {
                selector: 'node[kind = "method"]',
                style: { 'background-color': '#f0e3d9' },
            },
            {
                selector: 'node[kind = "blueprint"]',
                style: { 'background-color': '#d9efe7' },
            },
            {
                selector: 'node[kind = "external"]',
                style: { 'background-color': '#efe0f0', 'border-style': 'dashed' },
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 2,
                    'border-color': '#237a78',
                    'shadow-blur': 18,
                    'shadow-color': '#237a78',
                    'shadow-opacity': 0.5,
                    'shadow-offset-x': 0,
                    'shadow-offset-y': 0,
                },
            },
            {
                selector: 'node.is-hovered',
                style: {
                    'text-opacity': 1,
                    'text-background-opacity': 1,
                    'shadow-blur': 16,
                    'shadow-color': '#237a78',
                    'shadow-opacity': 0.45,
                    'z-index': 10,
                },
            },
            {
                selector: 'node.is-guided-focus',
                style: {
                    'border-width': 3,
                    'border-color': '#c75c2a',
                    'shadow-blur': 22,
                    'shadow-color': '#c75c2a',
                    'shadow-opacity': 0.6,
                    'z-index': 12,
                },
            },
            {
                selector: 'node.is-guided-hidden',
                style: {
                    'opacity': 0,
                    'text-opacity': 0,
                },
            },
            {
                selector: 'edge',
                style: {
                    'line-color': '#bcae9c',
                    'width': 1,
                    'curve-style': 'unbundled-bezier',
                    'control-point-distances': 40,
                    'control-point-weights': 0.5,
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#bcae9c',
                    'opacity': 0.2,
                },
            },
            {
                selector: 'edge.is-active',
                style: {
                    'opacity': 0.75,
                    'width': 2,
                },
            },
            {
                selector: 'edge[kind = "calls"]',
                style: { 'line-color': '#237a78', 'target-arrow-color': '#237a78' },
            },
            {
                selector: 'edge[kind = "imports"]',
                style: { 'line-color': '#d07838', 'target-arrow-color': '#d07838' },
            },
            {
                selector: 'edge[kind = "inherits"]',
                style: { 'line-color': '#7d6ba6', 'target-arrow-color': '#7d6ba6' },
            },
            {
                selector: 'edge[kind = "contains"]',
                style: { 'line-color': '#5c4d3c', 'target-arrow-color': '#5c4d3c' },
            },
            {
                selector: 'edge[kind = "blueprint"]',
                style: { 'line-color': '#2a9d8f', 'target-arrow-color': '#2a9d8f' },
            },
            {
                selector: 'edge[confidence = "low"]',
                style: { 'line-style': 'dashed', 'opacity': 0.15 },
            },
            {
                selector: 'edge.is-guided-hidden',
                style: { 'opacity': 0 },
            },
        ];
    }

    private refreshEdgeHighlights(): void {
        if (!this.graphInstance) {
            return;
        }
        const cy = this.graphInstance;
        cy.edges().removeClass('is-active');
        const selectedNodes = cy.$('node:selected');
        selectedNodes.forEach((node: any) => {
            node.connectedEdges().addClass('is-active');
        });
        if (this.hoveredNodeId) {
            const hovered = cy.getElementById(this.hoveredNodeId);
            if (hovered && !hovered.empty()) {
                hovered.connectedEdges().addClass('is-active');
            }
        }
    }

    private updateLabelVisibility(): void {
        if (!this.graphInstance) {
            return;
        }
        const zoom = this.graphInstance.zoom();
        const showAll = zoom >= this.labelZoomThreshold;
        const guidedAllowed = this.tourActive && this.guidedAllowedNodeIds ? this.guidedAllowedNodeIds : null;
        this.graphInstance.nodes().forEach((node: any) => {
            const shouldShow = showAll
                || node.selected()
                || node.hasClass('is-hovered')
                || (guidedAllowed ? guidedAllowed.has(node.id()) : false);
            node.data('labelVisible', shouldShow ? 'true' : 'false');
        });
    }

    private setHoveredNode(nodeId: string | null): void {
        this.hoveredNodeId = nodeId;
        this.refreshEdgeHighlights();
    }

    private showGraphTooltip(node: any, event: any): void {
        if (!this.graphTooltip) {
            return;
        }
        const fullLabel = node.data('fullLabel') || node.data('label');
        const kindLabel = node.data('kindLabel') || node.data('kind');
        const path = node.data('path');
        const details = path ? `${kindLabel} - ${path}` : kindLabel;
        this.graphTooltip.innerHTML = `
            <div class="tooltip-title">${this.escapeHtml(String(fullLabel))}</div>
            <div class="tooltip-meta">${this.escapeHtml(String(details))}</div>
        `;
        this.graphTooltip.setAttribute('aria-hidden', 'false');
        this.graphTooltip.classList.add('is-visible');
        this.updateTooltipPosition(event);
    }

    private hideGraphTooltip(): void {
        if (!this.graphTooltip) {
            return;
        }
        this.graphTooltip.classList.remove('is-visible');
        this.graphTooltip.setAttribute('aria-hidden', 'true');
    }

    private updateTooltipPosition(event: any): void {
        if (!this.graphTooltip || !this.canvasSurface) {
            return;
        }
        const rendered = event.renderedPosition || event.position;
        if (!rendered) {
            return;
        }
        const offset = 12;
        const surfaceRect = this.canvasSurface.getBoundingClientRect();
        const x = Math.min(surfaceRect.width - 20, Math.max(0, rendered.x + offset));
        const y = Math.min(surfaceRect.height - 20, Math.max(0, rendered.y + offset));
        this.graphTooltip.style.transform = `translate(${x}px, ${y}px)`;
    }

    private runGraphLayout(): void {
        if (!this.graphInstance) {
            return;
        }
        const layout = this.graphInstance.layout(this.getLayoutOptions());
        layout.run();
        this.updateLabelVisibility();
    }

    private async updateNarrator(symbol: SymbolNode): Promise<void> {
        if (symbol.kind === 'folder') {
            this.renderFileTreeNarrator();
            return;
        }
        const mode = this.currentMode;
        const section = this.getSnippetSection(symbol);
        const cacheKey = `${symbol.id}:${mode}:${section}`;
        const cached = this.narratorCache.get(cacheKey);
        if (cached) {
            this.renderNarration(symbol, cached);
            return;
        }
        const requestToken = ++this.narratorRequestToken;
        this.renderNarratorLoading(symbol);
        try {
            const response = await this.fetchJson<NarrationResponse>(this.buildApiUrl('/gitreader/api/narrate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: symbol.id,
                    mode,
                    section,
                }),
            });
            if (requestToken !== this.narratorRequestToken) {
                return;
            }
            if (!response || (response as unknown as { error?: object }).error) {
                throw new Error('Narrator unavailable.');
            }
            this.narratorCache.set(cacheKey, response);
            this.renderNarration(symbol, response);
        } catch (error) {
            if (requestToken !== this.narratorRequestToken) {
                return;
            }
            const message = error instanceof Error ? error.message : 'Narrator unavailable.';
            this.renderNarratorError(symbol, message);
        }
    }

    private renderNarratorLoading(symbol: SymbolNode): void {
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">Narrator</p>
            <h3>Listening to ${this.escapeHtml(symbol.name)}</h3>
            <p>Drafting the next beat in the story.</p>
        `;
    }

    private renderNarratorError(symbol: SymbolNode, message: string): void {
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">Narrator</p>
            <h3>Unable to narrate ${this.escapeHtml(symbol.name)}</h3>
            <p>${this.escapeHtml(message)}</p>
        `;
    }

    private renderNarration(symbol: SymbolNode, narration: NarrationResponse): void {
        const formatted = this.formatNarration(symbol, narration, this.currentMode);
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">${formatted.eyebrow}</p>
            <h3>${formatted.title}</h3>
            ${formatted.body}
        `;
    }

    private formatNarration(
        symbol: SymbolNode,
        narration: NarrationResponse,
        mode: NarrationMode,
    ): { eyebrow: string; title: string; body: string } {
        const name = this.escapeHtml(symbol.name);
        if (mode === 'summary') {
            const items = (narration.summary ?? []).map((item) => this.escapeHtml(item));
            const body = items.length > 0
                ? `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
                : `<p>No summary yet for ${name}.</p>`;
            return {
                eyebrow: 'What it does',
                title: `A clear role for ${name}`,
                body,
            };
        }
        if (mode === 'key_lines') {
            const lines = narration.key_lines ?? [];
            const body = lines.length > 0
                ? `<ul>${lines.map((line) => {
                    const label = `Line ${line.line}: ${line.text}`;
                    return `<li>${this.escapeHtml(label)}</li>`;
                }).join('')}</ul>`
                : `<p>No key lines captured yet.</p>`;
            return {
                eyebrow: 'Key lines',
                title: `Lines to watch in ${name}`,
                body,
            };
        }
        if (mode === 'connections') {
            const items = (narration.connections ?? []).map((item) => this.escapeHtml(item));
            const body = items.length > 0
                ? `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
                : `<p>Connections are still being mapped.</p>`;
            return {
                eyebrow: 'Connections',
                title: `How ${name} links`,
                body,
            };
        }
        if (mode === 'next') {
            const thread = narration.next_thread ? this.escapeHtml(narration.next_thread) : 'No next thread yet.';
            return {
                eyebrow: 'Next thread',
                title: 'Where to go next',
                body: `<p>${thread}</p>`,
            };
        }
        const hook = narration.hook ? this.escapeHtml(narration.hook) : `A quiet setup around ${name}.`;
        return {
            eyebrow: 'Hook',
            title: `The quiet setup behind ${name}`,
            body: `<p>${hook}</p>`,
        };
    }

    private renderStoryArc(arc: StoryArc): void {
        const formatted = this.formatStoryArc(arc, this.currentMode);
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">${formatted.eyebrow}</p>
            <h3>${formatted.title}</h3>
            ${formatted.body}
        `;
    }

    private renderStoryArcEmpty(): void {
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">Routes</p>
            <h3>No route selected</h3>
            <p>Pick a route to see its primary flow.</p>
        `;
    }

    private renderStoryArcMissing(): void {
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">Routes</p>
            <h3>Route not found</h3>
            <p>Choose another route to continue.</p>
        `;
    }

    private renderFileTreeNarrator(): void {
        const fileCount = this.fileNodesByPath.size;
        const countLabel = fileCount > 0 ? `${fileCount} files indexed.` : 'No files indexed yet.';
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">File tree</p>
            <h3>Browse the repository layout</h3>
            <p>Expand folders in the tree to explore the structure. ${this.escapeHtml(countLabel)}</p>
        `;
    }

    private renderReaderFileTree(focusPath: string): void {
        const normalized = this.normalizePath(focusPath);
        if (!this.fileTreeRoot) {
            this.fileTreeRoot = this.buildFileTreeFromNodes(this.graphNodes);
        }
        this.readerTreeFocusPath = normalized || null;
        this.currentSymbol = null;
        this.currentSnippetText = '';
        this.currentSnippetStartLine = 1;
        const treeHtml = this.buildFileTreeMarkup(normalized);
        this.codeSurface.innerHTML = `
            <article class="code-card">
                <div class="code-meta">
                    <span>FOLDER</span>
                    <span>${this.escapeHtml(normalized || 'Repository')}</span>
                </div>
                <div class="code-actions">
                    <span class="code-status">Folder contents</span>
                </div>
                <div class="file-tree">${treeHtml}</div>
            </article>
        `;
    }

    private formatStoryArc(arc: StoryArc, mode: NarrationMode): { eyebrow: string; title: string; body: string } {
        const routeLabel = this.escapeHtml(this.formatArcTitle(arc));
        const scenes = Array.isArray(arc.scenes) ? arc.scenes : [];
        if (mode === 'summary') {
            const entryNode = this.nodeById.get(arc.entry_id);
            const summaryText = arc.summary ? this.escapeHtml(arc.summary) : '';
            const metaItems = this.buildArcMetaItems(arc, entryNode);
            const metaList = metaItems.length > 0
                ? `<ul>${metaItems.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>`
                : '';
            const items = scenes.map((scene, index) => {
                const label = this.formatStorySceneLabel(scene, index, true);
                return `<li>${this.escapeHtml(label)}</li>`;
            });
            const flowLabel = scenes.length > 1 ? 'Flow steps' : 'Flow steps (entry only)';
            const flowList = items.length > 0
                ? `<p>${flowLabel}</p><ol>${items.join('')}</ol>`
                : '<p>No internal calls detected yet.</p>';
            const body = `
                ${summaryText ? `<p>${summaryText}</p>` : ''}
                ${metaList}
                ${flowList}
            `;
            return {
                eyebrow: 'What it does',
                title: `Primary flow for ${routeLabel}`,
                body,
            };
        }
        if (mode === 'key_lines') {
            const items = scenes.map((scene) => {
                const location = this.formatStorySceneLocation(scene);
                const label = `${scene.name} - ${location}`;
                return `<li>${this.escapeHtml(label)}</li>`;
            });
            const body = items.length > 0
                ? `<ul>${items.join('')}</ul>`
                : '<p>No locations captured yet.</p>';
            return {
                eyebrow: 'Key lines',
                title: `Entry points for ${routeLabel}`,
                body,
            };
        }
        if (mode === 'connections') {
            const connectionItems = this.buildArcConnectionItems(arc, scenes);
            const body = connectionItems.length > 0
                ? `<ul>${connectionItems.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>`
                : '<p>Connections are still being mapped.</p>';
            return {
                eyebrow: 'Connections',
                title: `Files touched by ${routeLabel}`,
                body,
            };
        }
        if (mode === 'next') {
            const related = arc.related_ids ?? [];
            if (related.length > 0) {
                const buttons = related.map((arcId) => {
                    const target = this.storyArcsById.get(arcId);
                    const label = target ? this.formatArcTitle(target) : arcId;
                    return `<button class="ghost-btn arc-jump" data-arc-id="${this.escapeHtml(arcId)}">${this.escapeHtml(label)}</button>`;
                });
                return {
                    eyebrow: 'Next thread',
                    title: 'Where to go next',
                    body: `<p>Jump to a related thread.</p><div class="arc-jump-list">${buttons.join('')}</div>`,
                };
            }
            const last = scenes[scenes.length - 1];
            const location = last ? this.formatStorySceneLocation(last) : '';
            const label = last
                ? `Continue at ${last.name}${location ? ` (${location})` : ''}.`
                : 'No next thread yet.';
            return {
                eyebrow: 'Next thread',
                title: 'Where to go next',
                body: `<p>${this.escapeHtml(label)}</p>`,
            };
        }
        const handler = arc.route?.handler_name ? `Handler ${arc.route.handler_name}.` : '';
        const summary = arc.summary ? arc.summary : `Route ${this.formatRouteLabel(arc)} begins the journey.`;
        const hook = `${summary}${handler ? ` ${handler}` : ''}`.trim();
        return {
            eyebrow: 'Route',
            title: routeLabel,
            body: `<p>${this.escapeHtml(hook)}</p>`,
        };
    }

    private formatStorySceneLabel(scene: StoryScene, index: number, includeLocation: boolean): string {
        const roleLabel = scene.role === 'entry' ? 'Entry' : `Step ${index + 1}`;
        const kindLabel = this.getKindLabel(scene.kind);
        const confidence = scene.confidence === 'low' ? ' (low confidence)' : '';
        const base = `${roleLabel}: ${scene.name} (${kindLabel})${confidence}`;
        if (!includeLocation) {
            return base;
        }
        const location = this.formatStorySceneLocation(scene);
        return `${base} - ${location}`;
    }

    private formatStorySceneLocation(scene: StoryScene): string {
        if (!scene.file_path) {
            return 'location unknown';
        }
        if (scene.line && scene.line > 0) {
            return `${scene.file_path}:${scene.line}`;
        }
        return scene.file_path;
    }

    private buildArcMetaItems(arc: StoryArc, entryNode?: SymbolNode): string[] {
        const items: string[] = [];
        const threadLabel = this.getArcThreadLabel(arc);
        if (threadLabel) {
            items.push(`Thread: ${threadLabel}`);
        }
        const methods = arc.route?.methods?.length ? arc.route.methods.join('|') : 'ANY';
        const path = arc.route?.path ? arc.route.path : '';
        const routeLabel = path ? `${methods} ${path}`.trim() : methods;
        if (routeLabel) {
            items.push(`Route: ${routeLabel}`);
        }
        if (arc.route?.handler_name) {
            items.push(`Handler: ${arc.route.handler_name}`);
        }
        if (arc.route?.module) {
            items.push(`Module: ${arc.route.module}`);
        }
        if (arc.route?.file_path) {
            const line = arc.route.line ? `:${arc.route.line}` : '';
            items.push(`Defined in: ${arc.route.file_path}${line}`);
        }
        if (entryNode?.signature) {
            items.push(`Signature: ${entryNode.signature}`);
        }
        if (entryNode?.summary) {
            items.push(`Docstring: ${entryNode.summary}`);
        }
        const steps = arc.scene_count || 0;
        items.push(`Steps detected: ${steps}`);
        const internalCalls = arc.calls?.internal ?? [];
        if (internalCalls.length > 0) {
            items.push(`Internal calls: ${internalCalls.slice(0, 4).join(', ')}`);
        }
        const externalCalls = arc.calls?.external ?? [];
        if (externalCalls.length > 0) {
            items.push(`External calls: ${externalCalls.slice(0, 4).join(', ')}`);
        }
        return items;
    }

    private buildArcConnectionItems(arc: StoryArc, scenes: StoryScene[]): string[] {
        const items: string[] = [];
        const internalCalls = arc.calls?.internal ?? [];
        if (internalCalls.length > 0) {
            items.push(`Internal calls: ${internalCalls.slice(0, 5).join(', ')}`);
        }
        const externalCalls = arc.calls?.external ?? [];
        if (externalCalls.length > 0) {
            items.push(`External calls: ${externalCalls.slice(0, 5).join(', ')}`);
        }
        const related = arc.related_ids ?? [];
        if (related.length > 0) {
            const labels = related.map((arcId) => {
                const target = this.storyArcsById.get(arcId);
                return target ? this.formatArcTitle(target) : arcId;
            });
            items.push(`Related threads: ${labels.join(', ')}`);
        }
        const paths = scenes
            .map((scene) => scene.file_path)
            .filter((path): path is string => Boolean(path));
        const unique = Array.from(new Set(paths));
        if (unique.length > 0) {
            items.push(`Files: ${unique.slice(0, 6).join(', ')}`);
        }
        return items;
    }

    private getArcThreadLabel(arc: StoryArc): string {
        if (!arc.thread || arc.thread === 'main') {
            return '';
        }
        if (arc.thread === 'branch') {
            const index = arc.thread_index ?? 0;
            return `Branch ${index}`;
        }
        return arc.thread;
    }

    private formatArcTitle(arc: StoryArc): string {
        const base = arc.title || this.formatRouteLabel(arc);
        const threadLabel = this.getArcThreadLabel(arc);
        if (!threadLabel) {
            return base;
        }
        if (base.toLowerCase().includes('branch')) {
            return base;
        }
        return `${base} (${threadLabel})`;
    }

    private setMode(mode: NarrationMode): void {
        this.currentMode = mode;
        this.modeButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.mode === mode);
        });
        if (this.tourActive) {
            if (this.tocMode === 'routes') {
                if (this.activeStoryArc) {
                    this.renderStoryArc(this.activeStoryArc);
                } else {
                    this.renderStoryArcEmpty();
                }
                return;
            }
            if (this.tocMode === 'tree') {
                this.renderFileTreeNarrator();
                return;
            }
            if (this.tourStep) {
                this.renderTourStep(this.tourStep);
                return;
            }
        }
        if (this.activeStoryArc) {
            this.renderStoryArc(this.activeStoryArc);
            return;
        }
        const chapterId = this.getActiveChapterId();
        const nodes = this.filterNodesForChapter(chapterId ?? '');
        const selected = this.getSelectedGraphNode();
        const focus = selected && selected.kind !== 'folder'
            ? selected
            : (this.currentSymbol ?? this.pickFocusNode(nodes));
        void this.updateNarrator(focus);
    }

    private setLayout(layout: string): void {
        this.workspace.dataset.layout = layout;
        this.layoutButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.layout === layout);
        });
        this.refreshGraphViewport();
    }

    private getActiveChapterId(): string | null {
        const active = this.tocList.querySelector('.toc-item.is-active') as HTMLElement | null;
        if (!active) {
            return null;
        }
        return active.dataset.chapterId ?? null;
    }

    private getSelectedGraphNodeId(): string | null {
        if (!this.graphInstance) {
            return null;
        }
        const selected = this.graphInstance.$('node:selected');
        if (!selected || selected.length === 0) {
            return null;
        }
        return selected[0].id();
    }

    private getSelectedGraphNode(): SymbolNode | null {
        const nodeId = this.getSelectedGraphNodeId();
        if (!nodeId) {
            return null;
        }
        return this.displayNodeById.get(nodeId) ?? this.nodeById.get(nodeId) ?? null;
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private updateNarratorToggle(): void {
        this.narratorToggle.classList.toggle('is-active', this.narratorVisible);
        this.narratorToggle.setAttribute('aria-pressed', String(this.narratorVisible));
        this.narratorToggle.textContent = this.narratorVisible ? 'Narrator' : 'Narrator Off';
    }

    private updateTourControls(): void {
        document.body.classList.toggle('is-guided', this.tourActive);
        this.tourControls.classList.toggle('is-active', this.tourActive);
        this.tourStartButton.disabled = this.tourActive;
        this.tourPrevButton.disabled = !this.tourActive;
        this.tourNextButton.disabled = !this.tourActive;
        this.tourEndButton.disabled = !this.tourActive;
        const hasRoutes = this.storyArcs.length > 0;
        if (this.tourActive) {
            const allowRoutePicker = this.tocMode === 'routes';
            this.routeSelect.disabled = !allowRoutePicker || !hasRoutes;
            this.routeJump.disabled = !allowRoutePicker || !hasRoutes;
        } else {
            this.routeSelect.disabled = !hasRoutes;
            this.routeJump.disabled = !hasRoutes;
        }
        if (this.tourState && this.tourStep) {
            const total = this.tourStep.total_steps ?? 0;
            const label = total > 0
                ? `Step ${this.tourState.step_index + 1} of ${total}`
                : `Step ${this.tourState.step_index + 1}`;
            this.tourStatus.textContent = label;
        } else {
            this.tourStatus.textContent = '';
        }
        this.applyGuidedState();
    }

    private async startTour(): Promise<void> {
        const arcId = this.getActiveTourArcId();
        try {
            const response = await this.fetchJson<TourResponse>(this.buildApiUrl('/gitreader/api/tour/start'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: this.tourMode,
                    arc_id: arcId || undefined,
                }),
            });
            this.tourActive = true;
            this.tourState = response.state;
            this.tourStep = response.step;
            this.renderTourStep(response.step);
            this.updateTourControls();
            await this.syncTourFocus(response.step);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to start tour.';
            this.renderTourError(message);
        }
    }

    private async advanceTour(action: 'next' | 'prev' | 'jump' | 'branch', nodeId?: string, arcId?: string): Promise<void> {
        if (!this.tourState) {
            return;
        }
        try {
            const response = await this.fetchJson<TourResponse>(this.buildApiUrl('/gitreader/api/tour/step'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    state: this.tourState,
                    action,
                    target_node_id: nodeId,
                    target_arc_id: arcId,
                }),
            });
            this.tourState = response.state;
            this.tourStep = response.step;
            this.renderTourStep(response.step);
            this.updateTourControls();
            await this.syncTourFocus(response.step);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to advance tour.';
            this.renderTourError(message);
        }
    }

    private endTour(): void {
        this.tourActive = false;
        this.tourState = null;
        this.tourStep = null;
        this.guidedAllowedNodeIds = null;
        this.updateTourControls();
        if (this.activeStoryArc) {
            this.renderStoryArc(this.activeStoryArc);
            return;
        }
        if (this.currentSymbol) {
            void this.updateNarrator(this.currentSymbol);
            return;
        }
        this.renderStoryArcEmpty();
    }

    private getActiveTourArcId(): string | null {
        if (this.activeStoryArc?.id) {
            return this.activeStoryArc.id;
        }
        if (this.tocMode === 'routes' && this.currentChapterId) {
            return this.currentChapterId;
        }
        if (this.routeSelect.value) {
            return this.routeSelect.value;
        }
        return null;
    }

    private async syncTourFocus(step: TourStep): Promise<void> {
        if (!step) {
            return;
        }
        await this.loadGraphForScope('full');
        const focus = step.focus;
        const nodeId = step.node_id || focus?.node_id;
        const node = nodeId ? this.nodeById.get(nodeId) ?? null : null;
        const focusPath = focus?.file_path ? this.normalizePath(focus.file_path) : '';
        const fileNode = focusPath ? this.fileNodesByPath.get(focusPath) ?? null : null;
        const targetNode = node || fileNode;
        if (!targetNode) {
            return;
        }
        if (this.tourActive && (!this.graphInstance || this.graphInstance.$id(targetNode.id).empty())) {
            const nodes = this.graphNodes;
            const edges = this.filterEdgesForNodes(nodes);
            const graphView: GraphView = {
                nodes,
                edges,
                totalNodes: nodes.length,
                visibleNodes: nodes.length,
                isCapped: false,
            };
            this.renderGraph(graphView.nodes, graphView.edges);
            this.updateGraphNodeStatus(graphView);
        }
        if (this.graphInstance) {
            this.graphInstance.$('node:selected').unselect();
            const element = this.graphInstance.$id(targetNode.id);
            if (element && typeof element.select === 'function') {
                element.select();
            }
        }
        try {
            await this.loadSymbolSnippet(targetNode, false);
        } catch {
            this.renderCode(targetNode);
        }
        if (focus?.start_line) {
            this.jumpToLine(focus.start_line);
        }
    }

    private handleContextLink(nodeId?: string, filePath?: string, line?: number): void {
        if (nodeId) {
            if (this.tourActive) {
                if (!this.isGuidedNodeAllowed(nodeId)) {
                    this.flashGuidedMessage('Follow the guide to unlock this step.');
                    return;
                }
                void this.advanceTour('jump', nodeId);
                return;
            }
            const node = this.nodeById.get(nodeId);
            if (node) {
                void this.loadSymbolSnippet(node, false).catch(() => {
                    this.renderCode(node);
                }).then(() => {
                    if (line) {
                        this.jumpToLine(line);
                    }
                });
            }
            return;
        }

        if (!filePath) {
            return;
        }
        const normalized = this.normalizePath(filePath);
        const fileNode = this.fileNodesByPath.get(normalized) ?? null;
        if (fileNode) {
            void this.loadSymbolSnippet(fileNode, false).catch(() => {
                this.renderCode(fileNode);
            }).then(() => {
                if (line) {
                    this.jumpToLine(line);
                }
            });
            return;
        }
        if (line && this.currentSymbol?.location?.path && this.normalizePath(this.currentSymbol.location.path) === normalized) {
            this.jumpToLine(line);
        }
    }

    private flashGuidedMessage(message: string): void {
        this.setCanvasOverlay(message, true);
        window.setTimeout(() => this.setCanvasOverlay('', false), 1400);
    }

    private isGuidedNodeAllowed(nodeId: string): boolean {
        if (!this.tourActive || !this.guidedAllowedNodeIds) {
            return true;
        }
        return this.guidedAllowedNodeIds.has(nodeId);
    }

    private renderTourStep(step: TourStep): void {
        const explanation = (step.explanation ?? []).map((item) => `<li>${this.escapeHtml(item)}</li>`).join('');
        const relatedNodes = step.related_nodes ?? [];
        const relatedNodeButtons = relatedNodes.map((item) => (
            `<button class="ghost-btn arc-jump" data-tour-node="${this.escapeHtml(item.node_id)}">${this.escapeHtml(item.label)}</button>`
        ));
        const relatedArcs = step.related_arcs ?? [];
        const relatedArcButtons = relatedArcs.map((item) => (
            `<button class="ghost-btn arc-jump" data-tour-arc="${this.escapeHtml(item.arc_id)}">${this.escapeHtml(item.title)}</button>`
        ));
        const concept = step.concept ? `<p><strong>Concept:</strong> ${this.escapeHtml(step.concept)}</p>` : '';
        const whyHere = step.why_here ? `<p><strong>Why here:</strong> ${this.escapeHtml(step.why_here)}</p>` : '';
        const remember = step.remember ? `<p><strong>Remember:</strong> ${this.escapeHtml(step.remember)}</p>` : '';
        const focus = step.focus?.file_path ? (() => {
            const start = step.focus?.start_line;
            const end = step.focus?.end_line;
            const range = start ? `${start}${end && end !== start ? `-${end}` : ''}` : '';
            return `<p class="tour-focus">Focus: ${this.escapeHtml(step.focus.file_path)}${range ? `:${range}` : ''}</p>`;
        })() : '';
        const pitfall = step.pitfall ? `<p class="tour-pitfall">${this.escapeHtml(step.pitfall)}</p>` : '';
        const contextLinks = step.context_links ?? [];
        const contextButtons = contextLinks.map((link) => {
            const attrs = [
                'data-context-link',
                link.node_id ? `data-context-node="${this.escapeHtml(link.node_id)}"` : '',
                link.file_path ? `data-context-file="${this.escapeHtml(link.file_path)}"` : '',
                typeof link.line === 'number' ? `data-context-line="${link.line}"` : '',
            ].filter(Boolean).join(' ');
            return `<button class="ghost-btn context-link" ${attrs}>${this.escapeHtml(link.label)}</button>`;
        });
        const storySoFarItems = (step.story_so_far ?? []).map((item) => `<li>${this.escapeHtml(item)}</li>`).join('');
        const storySoFar = storySoFarItems
            ? `<div class="tour-story"><p class="eyebrow">Story so far</p><ul>${storySoFarItems}</ul></div>`
            : '';
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">Tour: ${this.escapeHtml(this.tourMode)}</p>
            <h3>${this.escapeHtml(step.title)}</h3>
            <p>${this.escapeHtml(step.hook)}</p>
            ${focus}
            ${concept}
            ${whyHere}
            ${remember}
            ${explanation ? `<ul>${explanation}</ul>` : ''}
            <p><strong>Why it matters:</strong> ${this.escapeHtml(step.why_it_matters)}</p>
            <p><strong>Next:</strong> ${this.escapeHtml(step.next_click)}</p>
            ${pitfall}
            ${contextButtons.length > 0 ? `<div class="context-link-list">${contextButtons.join('')}</div>` : ''}
            ${storySoFar}
            ${relatedNodeButtons.length > 0 || relatedArcButtons.length > 0 ? `
                <div class="arc-jump-list">
                    ${relatedNodeButtons.join('')}
                    ${relatedArcButtons.join('')}
                </div>
            ` : ''}
        `;
    }

    private renderTourError(message: string): void {
        this.narratorOutput.innerHTML = `
            <p class="eyebrow">Tour</p>
            <h3>Tour unavailable</h3>
            <p>${this.escapeHtml(message)}</p>
        `;
    }

    private applyGuidedState(): void {
        if (!this.tourActive || !this.tourStep) {
            this.guidedAllowedNodeIds = null;
            this.applyGuidedToc();
            this.applyGuidedCodeFocus();
            this.applyGraphFilters();
            this.renderFileTree(null);
            return;
        }
        const allowed = new Set(this.tourStep.allowed_node_ids ?? []);
        const focusPath = this.tourStep.focus?.file_path;
        if (focusPath) {
            const normalized = this.normalizePath(focusPath);
            const fileNode = this.fileNodesByPath.get(normalized);
            if (fileNode) {
                allowed.add(fileNode.id);
            }
        }
        this.guidedAllowedNodeIds = allowed.size > 0 ? allowed : null;
        this.applyGuidedToc();
        this.applyGraphFilters();
        this.applyGuidedCodeFocus();
        this.renderFileTree(this.tourStep.focus?.file_path ?? null);
    }

    private applyGuidedToc(): void {
        const items = Array.from(this.tocList.querySelectorAll<HTMLElement>('.toc-item'));
        if (!this.tourActive || !this.tourStep || this.tocMode !== 'story') {
            items.forEach((item) => item.classList.remove('is-guided-hidden'));
            return;
        }
        items.forEach((item) => {
            const isActive = item.dataset.chapterId === this.currentChapterId;
            item.classList.toggle('is-guided-hidden', !isActive);
        });
    }

    private applyGuidedGraphFilter(): void {
        if (!this.graphInstance) {
            return;
        }
        const cy = this.graphInstance;
        cy.elements().removeClass('is-guided-hidden');
        cy.nodes().removeClass('is-guided-focus');
        if (!this.tourActive || !this.guidedAllowedNodeIds || !this.tourStep) {
            return;
        }
        const allowed = this.guidedAllowedNodeIds;
        cy.nodes().forEach((node: any) => {
            const isAllowed = allowed.has(node.id());
            node.toggleClass('is-guided-hidden', !isAllowed);
            node.toggleClass('is-guided-focus', node.id() === this.tourStep?.node_id);
        });
        cy.edges().forEach((edge: any) => {
            const sourceId = edge.data('source');
            const targetId = edge.data('target');
            const isAllowed = allowed.has(sourceId) && allowed.has(targetId);
            edge.toggleClass('is-guided-hidden', !isAllowed);
        });
        cy.elements('.is-guided-hidden').hide();
    }

    private applyGuidedCodeFocus(): void {
        const lines = Array.from(this.codeSurface.querySelectorAll<HTMLElement>('.code-line'));
        lines.forEach((line) => line.classList.remove('is-guided-dim', 'is-guided-focus'));
        if (!this.tourActive || !this.tourStep?.focus) {
            return;
        }
        const focus = this.tourStep.focus;
        if (!focus?.start_line) {
            return;
        }
        if (focus.file_path && this.currentSymbol?.location?.path) {
            const currentPath = this.normalizePath(this.currentSymbol.location.path);
            const focusPath = this.normalizePath(focus.file_path);
            if (currentPath !== focusPath) {
                return;
            }
        }
        const start = focus.start_line;
        const end = focus.end_line && focus.end_line >= start ? focus.end_line : start;
        lines.forEach((line) => {
            const lineNumber = Number(line.dataset.line);
            if (!Number.isFinite(lineNumber)) {
                return;
            }
            if (lineNumber >= start && lineNumber <= end) {
                line.classList.add('is-guided-focus');
            } else {
                line.classList.add('is-guided-dim');
            }
        });
    }

    private setCanvasOverlay(message: string, visible: boolean): void {
        this.canvasOverlay.textContent = message;
        this.canvasOverlay.classList.toggle('is-visible', visible);
    }

    private refreshGraphViewport(): void {
        if (!this.graphInstance) {
            return;
        }
        this.graphInstance.resize();
        this.graphInstance.fit();
        this.updateLabelVisibility();
    }

    private hasHighlightSupport(): boolean {
        return typeof hljs !== 'undefined' && typeof hljs.highlight === 'function';
    }

    private highlightSnippet(body: string, language?: string): string {
        if (!this.hasHighlightSupport()) {
            return this.escapeHtml(body);
        }
        if (language && hljs.getLanguage && hljs.getLanguage(language)) {
            return hljs.highlight(body, { language }).value;
        }
        return hljs.highlightAuto(body).value;
    }

    private getHighlightLanguage(path?: string): string | undefined {
        if (!path) {
            return undefined;
        }
        const lower = path.toLowerCase();
        if (lower.endsWith('.py')) {
            return 'python';
        }
        if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
            return 'javascript';
        }
        if (lower.endsWith('.ts')) {
            return 'typescript';
        }
        if (lower.endsWith('.tsx')) {
            return 'tsx';
        }
        if (lower.endsWith('.swift')) {
            return 'swift';
        }
        return undefined;
    }

    private async setSnippetMode(mode: SnippetMode): Promise<void> {
        if (this.snippetMode === mode) {
            return;
        }
        this.snippetMode = mode;
        this.snippetCache.clear();
        this.updateSnippetModeUi();
        if (this.currentSymbol) {
            const narrate = !this.activeStoryArc && !this.tourActive;
            await this.loadSymbolSnippet(this.currentSymbol, narrate);
            if (this.activeStoryArc) {
                this.renderStoryArc(this.activeStoryArc);
            } else if (this.tourActive && this.tourStep) {
                this.renderTourStep(this.tourStep);
            }
        }
    }

    private updateSnippetModeUi(): void {
        this.snippetModeButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.snippetMode === this.snippetMode);
        });
    }

    private copySnippet(): void {
        const text = this.currentSnippetText;
        if (!text) {
            this.setCodeStatus('Nothing to copy.');
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => this.setCodeStatus('Snippet copied.'))
                .catch(() => this.setCodeStatus('Copy failed.'));
            return;
        }
        this.setCodeStatus('Copy not supported.');
    }

    private jumpToInputLine(): void {
        const input = this.codeSurface.querySelector<HTMLInputElement>('[data-line-input]');
        if (!input) {
            return;
        }
        const value = Number(input.value);
        if (!Number.isFinite(value) || value <= 0) {
            this.setCodeStatus('Enter a valid line number.');
            return;
        }
        this.jumpToLine(value);
    }

    private jumpToLine(line: number): void {
        const lineEl = this.codeSurface.querySelector<HTMLElement>(`[data-line="${line}"]`);
        if (!lineEl) {
            this.setCodeStatus('Line not in snippet.');
            return;
        }
        this.setCodeStatus('');
        lineEl.classList.add('is-jump');
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => lineEl.classList.remove('is-jump'), 1200);
    }

    private setCodeStatus(message: string): void {
        const status = this.codeSurface.querySelector<HTMLElement>('[data-code-status]');
        if (status) {
            status.textContent = message;
        }
    }

    private loadGraphPreferences(): void {
        const storedLayout = window.localStorage.getItem('gitreader.graphLayoutMode') as GraphLayoutMode | null;
        if (storedLayout && ['cluster', 'layer', 'free'].includes(storedLayout)) {
            this.graphLayoutMode = storedLayout;
        }
    }

    private setGraphLayoutMode(mode: GraphLayoutMode): void {
        if (this.graphLayoutMode === mode) {
            return;
        }
        const wasCluster = this.graphLayoutMode === 'cluster';
        this.graphLayoutMode = mode;
        window.localStorage.setItem('gitreader.graphLayoutMode', mode);
        this.updateGraphControls();
        if (wasCluster || mode === 'cluster') {
            this.refreshGraphView();
            return;
        }
        this.runGraphLayout();
    }

    private toggleEdgeFilter(filter: EdgeKind): void {
        if (this.edgeFilters.has(filter)) {
            this.edgeFilters.delete(filter);
        } else {
            this.edgeFilters.add(filter);
        }
        this.updateGraphControls();
        this.applyGraphFilters();
    }

    private applyGraphFilters(): void {
        if (!this.graphInstance) {
            return;
        }
        const cy = this.graphInstance;
        cy.elements().show();
        if (!this.showExternalNodes) {
            cy.nodes().filter('[kind = "external"]').hide();
        }
        cy.edges().forEach((edge: { data: (key: string) => EdgeKind; hide: () => void }) => {
            if (!this.edgeFilters.has(edge.data('kind'))) {
                edge.hide();
            }
        });
        cy.edges().forEach((edge: any) => {
            if (edge.source().hidden() || edge.target().hidden()) {
                edge.hide();
            }
        });
        this.applyGuidedGraphFilter();
        this.applyFocus();
        this.refreshEdgeHighlights();
        this.updateLabelVisibility();
    }

    private focusOnSelected(): void {
        if (!this.graphInstance) {
            return;
        }
        const selected = this.graphInstance.$('node:selected');
        if (!selected || selected.length === 0) {
            this.setCanvasOverlay('Select a node to focus.', true);
            window.setTimeout(() => this.setCanvasOverlay('', false), 1200);
            return;
        }
        this.focusedNodeId = selected[0].id();
        this.applyGraphFilters();
    }

    private resetGraphFocus(): void {
        this.focusedNodeId = null;
        this.applyGraphFilters();
        this.refreshGraphViewport();
    }

    private applyFocus(): void {
        if (!this.graphInstance || !this.focusedNodeId || this.tourActive) {
            return;
        }
        const cy = this.graphInstance;
        const node = cy.getElementById(this.focusedNodeId);
        if (!node || node.empty() || node.hidden()) {
            this.focusedNodeId = null;
            return;
        }
        const visible = cy.elements(':visible');
        const focusElements = node.closedNeighborhood().intersection(visible);
        visible.not(focusElements).hide();
        cy.fit(focusElements, 40);
    }

    private zoomGraph(factor: number): void {
        if (!this.graphInstance) {
            return;
        }
        const current = this.graphInstance.zoom();
        const next = Math.min(2.5, Math.max(0.2, current * factor));
        const rect = this.canvasGraph.getBoundingClientRect();
        this.graphInstance.zoom({
            level: next,
            renderedPosition: {
                x: rect.width / 2,
                y: rect.height / 2,
            },
        });
        this.updateLabelVisibility();
    }

    private fitGraph(): void {
        if (!this.graphInstance) {
            return;
        }
        this.graphInstance.fit(undefined, 40);
        this.updateLabelVisibility();
    }

    private updateGraphControls(): void {
        this.graphLayoutButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.layoutAction === this.graphLayoutMode);
        });
        this.edgeFilterButtons.forEach((button) => {
            const filter = button.dataset.edgeFilter as EdgeKind | undefined;
            if (!filter) {
                return;
            }
            button.classList.toggle('is-active', this.edgeFilters.has(filter));
        });
        this.nodeFilterButtons.forEach((button) => {
            if (button.dataset.nodeFilter === 'external') {
                button.classList.toggle('is-active', this.showExternalNodes);
            }
        });
    }

    private getLayoutOptions(): {
        name: string;
        animate: boolean;
        fit: boolean;
        padding: number;
        directed?: boolean;
        spacingFactor?: number;
        avoidOverlap?: boolean;
        avoidOverlapPadding?: number;
        nodeDimensionsIncludeLabels?: boolean;
    } {
        if (this.graphLayoutMode === 'layer') {
            return {
                name: 'breadthfirst',
                animate: false,
                fit: true,
                padding: 36,
                directed: true,
                spacingFactor: 1.35,
                avoidOverlap: true,
                avoidOverlapPadding: 24,
                nodeDimensionsIncludeLabels: true,
            };
        }
        if (this.graphLayoutMode === 'free') {
            return {
                name: 'preset',
                animate: false,
                fit: true,
                padding: 24,
            };
        }
        return {
            name: 'cose',
            animate: false,
            fit: true,
            padding: 24,
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new GitReaderApp();
    app.init();
});
