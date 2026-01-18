import { createApiClient, type ApiClient } from './modules/data/api';
import { buildFileTreeFromNodes, countFilesInTree, type FileTreeNode } from './modules/ui/fileTree';
import { FileTreeController } from './modules/ui/fileTreeController';
import { bindFileTreeEvents } from './modules/ui/fileTreeEvents';
import { bindGraphEvents } from './modules/ui/graphEvents';
import { formatGraphNodeLabel } from './modules/ui/graphLabels';
import { GraphContextMenu, type GraphContextMenuAction } from './modules/ui/graphContextMenu';
import { GraphViewController } from './modules/ui/graphView';
import { FileTreeView, fileTreeViewDefaults } from './modules/ui/fileTreeView';
import { ReaderController } from './modules/ui/readerController';
import { ReaderView, type ReaderStateUpdate } from './modules/ui/reader';
import { ReaderInteractions } from './modules/ui/readerInteractions';
import {
    buildFileTreeNarratorHtml,
    buildNarrationHtml,
    buildNarratorErrorHtml,
    buildNarratorLoadingHtml,
    buildStoryArcEmptyHtml,
    buildStoryArcHtml,
    buildStoryArcMissingHtml,
} from './modules/ui/narratorView';
import { getElement } from './modules/utils/dom';
import { formatLocation as formatLocationUtil } from './modules/utils/format';
import { getDisplayName as getDisplayNameUtil, getKindBadge as getKindBadgeUtil, getKindLabel as getKindLabelUtil, wrapLabel as wrapLabelUtil } from './modules/utils/labels';
import { getBasename as getBasenameUtil } from './modules/utils/paths';
import { hasHighlightSupport } from './modules/utils/highlight';
import {
    formatArcOptionLabel as formatArcOptionLabelUtil,
    formatArcTitle as formatArcTitleUtil,
    formatRouteLabel as formatRouteLabelUtil,
    getArcThreadLabel as getArcThreadLabelUtil,
} from './modules/utils/story';
import { escapeHtml, normalizePath } from './modules/utils/strings';
import { buildRepoParams as buildRepoParamsUtil } from './modules/utils/url';
import type {
    ApiGraphResponse,
    ApiStoryResponse,
    ApiTocResponse,
    ChapterSummary,
    EdgeConfidence,
    EdgeKind,
    FoldRange,
    GraphEdge,
    GraphLayoutMode,
    GraphView,
    NarrationMode,
    NarrationResponse,
    SnippetMode,
    StoryArc,
    SymbolKind,
    SymbolNode,
    SymbolSnippetResponse,
    TocMode,
    TourMode,
    TourResponse,
    TourStep,
    TourState,
} from './modules/types';

// Tracks the last "organize children: circle" action so we can draw and adjust the selection ring.
interface OrganizedCircleState {
    parentId: string;
    childIds: string[];
    radius: number;
}

class GitReaderApp {
    private tocList: HTMLElement;
    private codeSurface: HTMLElement;
    private codePane: HTMLElement;
    private canvasGraph: HTMLElement;
    private canvasSurface: HTMLElement;
    private canvasOverlay: HTMLElement;
    private canvasPane: HTMLElement;
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
    private workspaceSplitter: HTMLElement;
    private tocPill: HTMLElement;
    private tocSubtitle: HTMLElement;
    private graphNodeStatus: HTMLElement;
    private graphRevealButton: HTMLButtonElement;
    private graphTooltip: HTMLElement;
    private organizedCircleOverlay: HTMLDivElement;
    private organizedCircleButton: HTMLButtonElement;
    private narratorPane: HTMLElement;
    private readerFileTreeButton: HTMLButtonElement;
    private readerMeta: HTMLElement;
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
    private api: ApiClient;
    private currentMode: NarrationMode = 'hook';
    private tocMode: TocMode = 'story';
    private fileTreeView: FileTreeView;
    private fileTreeController: FileTreeController;
    private graphView: GraphViewController;
    private graphContextMenu: GraphContextMenu;
    private readerView: ReaderView;
    private readerInteractions: ReaderInteractions;
    private readerController: ReaderController;
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
    private readerTreeFocusPath: string | null = null;
    private graphNodes: SymbolNode[] = [];
    private graphEdges: GraphEdge[] = [];
    private nodeById: Map<string, SymbolNode> = new Map();
    private displayNodeById: Map<string, SymbolNode> = new Map();
    private fileNodesByPath: Map<string, SymbolNode> = new Map();
    private snippetCache: Map<string, SymbolSnippetResponse> = new Map();
    private graphCache: Map<string, ApiGraphResponse> = new Map();
    private graphLoadPromises: Map<string, Promise<ApiGraphResponse>> = new Map();
    private narratorCache: Map<string, NarrationResponse> = new Map();
    private narratorRequestToken = 0;
    private chapterRequestToken = 0;
    private graphRequestToken = 0;
    private narratorVisible = true;
    private graphInstance: any | null = null;
    private graphEventsBound = false;
    private currentScope = 'full';
    private currentChapterId: string | null = null;
    private currentSymbol: SymbolNode | null = null;
    private currentSnippetText = '';
    private currentSnippetStartLine = 1;
    private clusterExpanded: Set<string> = new Set();
    private clusterAutoExpanded: Set<string> = new Set();
    private clusterFocusPath: string | null = null;
    private classExpanded: Set<string> = new Set();
    private tocDebounceTimer: number | null = null;
    private tocDebounceDelay = 200;
    private pendingChapterId: string | null = null;
    private labelZoomThreshold = 0.65;
    private labelLineLength = 18;
    private lastTapNodeId: string | null = null;
    private lastTapAt = 0;
    private doubleTapDelay = 320;
    private siblingSelectKeyActive = false;
    private organizedCircleState: OrganizedCircleState | null = null;
    private organizedCircleDragActive = false;
    private organizedCircleDragPointerId: number | null = null;
    private organizedCircleDismissStart: { x: number; y: number } | null = null;
    private organizedCircleDismissPointerId: number | null = null;
    private organizedCircleDismissMoved = false;
    private importBreadcrumbs: string[] = [];
    private foldedSymbolIds: Set<string> = new Set();
    private currentFoldRanges: Map<string, FoldRange> = new Map();
    private currentFoldPath: string | null = null;
    private pendingSymbol: SymbolNode | null = null;
    private pendingSnippet: SymbolSnippetResponse | null = null;
    private labelVisibilityRaf: number | null = null;
    private lastLabelZoomBucket: boolean | null = null;
    private lastForcedLabelIds: Set<string> = new Set();

    constructor() {
        this.tocList = this.getElement('toc-list');
        this.codeSurface = this.getElement('code-surface');
        this.codePane = this.getElement('code-view');
        this.canvasGraph = this.getElement('canvas-graph');
        this.canvasSurface = this.getElement('canvas-surface');
        this.canvasOverlay = this.getElement('canvas-overlay');
        this.canvasPane = this.getElement('graph-canvas');
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
        this.workspaceSplitter = this.getElement('workspace-splitter');
        this.tocPill = this.getElement('toc-pill');
        this.tocSubtitle = this.getElement('toc-subtitle');
        this.graphNodeStatus = this.getElement('graph-node-status');
        this.graphRevealButton = this.getElement('graph-reveal') as HTMLButtonElement;
        this.graphTooltip = this.getElement('graph-tooltip');
        this.initializeOrganizedCircleOverlay();
        this.narratorPane = this.getElement('narrator');
        this.readerFileTreeButton = this.getElement('reader-file-tree') as HTMLButtonElement;
        this.readerMeta = this.getElement('reader-meta');
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
        this.api = createApiClient(this.repoParams);
        this.fileTreeView = new FileTreeView(fileTreeViewDefaults);
        this.fileTreeController = new FileTreeController({
            fileTreeView: this.fileTreeView,
            narratorContainer: this.narratorFileTree,
        });
        this.graphView = new GraphViewController({
            container: this.canvasGraph,
            tooltipElement: this.graphTooltip,
            tooltipContainer: this.canvasSurface,
            nodeStatusElement: this.graphNodeStatus,
            revealButton: this.graphRevealButton,
            setCanvasOverlay: (message, visible) => this.setCanvasOverlay(message, visible),
            clearGraph: () => this.clearGraph(),
            getSelectedNodeId: () => this.getSelectedGraphNodeId(),
            isTourActive: () => this.tourActive,
            applyGuidedFilter: () => this.applyGuidedGraphFilter(),
            updateLabelVisibility: () => this.updateLabelVisibility(),
            setDisplayNodes: (nodes) => {
                this.displayNodeById = new Map(nodes.map((node) => [node.id, node]));
            },
            formatLabel: (node) => this.formatNodeLabel(node),
            onGraphReady: (graph) => {
                this.graphInstance = graph;
                this.bindGraphEvents();
            },
        });
        this.graphContextMenu = new GraphContextMenu({ container: document.body });
        const setReaderState = (update: ReaderStateUpdate): void => {
            if (Object.prototype.hasOwnProperty.call(update, 'currentSymbol')) {
                this.currentSymbol = update.currentSymbol ?? null;
            }
            if (Object.prototype.hasOwnProperty.call(update, 'pendingSymbol')) {
                this.pendingSymbol = update.pendingSymbol ?? null;
            }
            if (Object.prototype.hasOwnProperty.call(update, 'pendingSnippet')) {
                this.pendingSnippet = update.pendingSnippet ?? null;
            }
            if (Object.prototype.hasOwnProperty.call(update, 'readerTreeFocusPath')) {
                this.readerTreeFocusPath = update.readerTreeFocusPath ?? null;
            }
            if (Object.prototype.hasOwnProperty.call(update, 'currentSnippetText')) {
                this.currentSnippetText = update.currentSnippetText ?? '';
            }
            if (Object.prototype.hasOwnProperty.call(update, 'currentSnippetStartLine')) {
                this.currentSnippetStartLine = update.currentSnippetStartLine ?? 1;
            }
        };
        this.readerInteractions = new ReaderInteractions({
            codeSurface: this.codeSurface,
            readerMeta: this.readerMeta,
            snippetModeButtons: this.snippetModeButtons,
            readerFileTreeButton: this.readerFileTreeButton,
            getHighlightLanguage: (path) => this.getHighlightLanguage(path),
            isModifierClick: (event) => this.isModifierClick(event),
            setCodeStatus: (message) => this.setCodeStatus(message),
            renderFileTree: (focusPath) => this.fileTreeController.render(focusPath),
            updateSnippetModeUi: () => this.readerView.updateSnippetModeUi(),
            jumpToSymbol: (symbol) => this.jumpToSymbol(symbol),
            highlightSymbolInFile: (fileNode, symbol) => this.highlightSymbolInFile(fileNode, symbol),
            getFileNodeForSymbol: (symbol) => this.getFileNodeForSymbol(symbol),
            selectGraphNodes: (fileNode, symbol) => {
                if (!this.graphInstance) {
                    return;
                }
                if (!fileNode) {
                    return;
                }
                const fileElement = this.graphInstance.$id(fileNode.id);
                const symbolElement = symbol ? this.graphInstance.$id(symbol.id) : null;
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
            },
            copySnippet: () => this.copySnippet(),
            jumpToInputLine: () => this.jumpToInputLine(),
            fileTreeView: this.fileTreeView,
            state: {
                getCurrentSymbol: () => this.currentSymbol,
                getCurrentSnippetText: () => this.currentSnippetText,
                getCurrentSnippetStartLine: () => this.currentSnippetStartLine,
                getReaderTreeFocusPath: () => this.readerTreeFocusPath,
                setReaderState,
                getImportBreadcrumbs: () => this.importBreadcrumbs,
                setImportBreadcrumbs: (breadcrumbs) => {
                    this.importBreadcrumbs = breadcrumbs;
                },
                getFoldedSymbolIds: () => this.foldedSymbolIds,
                getCurrentFoldRanges: () => this.currentFoldRanges,
                setCurrentFoldRanges: (ranges) => {
                    this.currentFoldRanges = ranges;
                },
                setCurrentFoldPath: (path) => {
                    this.currentFoldPath = path;
                },
                getGraphNodes: () => this.graphNodes,
                getFileNodesByPath: () => this.fileNodesByPath,
            },
        });
        this.readerView = new ReaderView({
            codeSurface: this.codeSurface,
            readerMeta: this.readerMeta,
            snippetModeButtons: this.snippetModeButtons,
            escapeHtml: (value) => this.escapeHtml(value),
            formatLocation: (location, startLine, endLine) => this.formatLocation(location, startLine, endLine),
            getHighlightLanguage: (path) => this.getHighlightLanguage(path),
            hasHighlightSupport: () => this.hasHighlightSupport(),
            renderImportBreadcrumbs: (path) => this.readerInteractions.renderImportBreadcrumbs(path),
            applyGuidedCodeFocus: () => this.applyGuidedCodeFocus(),
            decorateImportLines: (snippet, language) => this.readerInteractions.decorateImportLines(snippet, language),
            applyFoldControls: (symbol) => this.readerInteractions.applyFoldControls(symbol),
            updateReaderControls: () => this.readerInteractions.updateReaderControls(),
            setReaderState,
            getReaderTreeFocusPath: () => this.readerTreeFocusPath,
            setReaderTreeFocusPath: (path) => {
                this.readerTreeFocusPath = path;
            },
            getPendingSymbol: () => this.pendingSymbol,
            getPendingSnippet: () => this.pendingSnippet,
            getCurrentSymbol: () => this.currentSymbol,
            clearSnippetCache: () => {
                this.snippetCache.clear();
            },
            loadSymbolSnippet: (symbol, narrate) => this.loadSymbolSnippet(symbol, narrate),
            isActiveStoryArc: () => Boolean(this.activeStoryArc),
            getActiveStoryArc: () => this.activeStoryArc,
            renderStoryArc: (arc) => this.renderStoryArc(arc),
            isTourActive: () => this.tourActive,
            getTourStep: () => this.tourStep,
            renderTourStep: (step) => this.renderTourStep(step),
        });
        this.readerController = new ReaderController({
            readerView: this.readerView,
            readerInteractions: this.readerInteractions,
        });
        this.syncRepoInputsFromParams();
    }

    init(): void {
        this.renderLoadingState();
        this.loadGraphPreferences();
        this.bindEvents();
        this.updateNarratorToggle();
        this.updateTourControls();
        this.readerView.updateSnippetModeUi();
        this.updateGraphControls();
        this.loadData().catch((error) => {
            const message = error instanceof Error ? error.message : 'Failed to load data.';
            this.renderErrorState(message);
        });
    }

    private getElement(id: string): HTMLElement {
        return getElement(id);
    }

    private async loadData(): Promise<void> {
        await this.loadToc(this.tocMode);
        const defaultChapterId = this.chapters.length > 0 ? this.chapters[0].id : '';
        await this.loadChapter(defaultChapterId);
    }

    private buildRepoParams(): URLSearchParams {
        return buildRepoParamsUtil(window.location.search);
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
        this.readerMeta.innerHTML = '';
        this.codeSurface.innerHTML = '<article class="code-card"><h3>Loading symbols...</h3><p>Fetching graph data.</p></article>';
        this.setCanvasOverlay('Preparing nodes and edges...', true);
        this.narratorOutput.innerHTML = '<p class="eyebrow">Narrator</p><h3>Loading</h3><p>Gathering the first clues.</p>';
    }

    private renderErrorState(message: string): void {
        this.tocList.innerHTML = `<li class="toc-item"><div class="toc-title">Failed to load</div><p class="toc-summary">${this.escapeHtml(message)}</p></li>`;
        this.readerMeta.innerHTML = '';
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
                    void this.readerController.setSnippetMode(mode);
                }
            });
        });

        this.readerFileTreeButton.addEventListener('click', () => {
            const path = this.currentSymbol?.location?.path ?? this.readerTreeFocusPath;
            if (!path) {
                return;
            }
            this.readerController.showFileTree(path);
            this.fileTreeController.render(path);
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
                    this.graphView.toggleEdgeFilter(filter);
                    this.updateGraphControls();
                }
            });
        });

        this.nodeFilterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.dataset.nodeFilter;
                if (filter === 'external') {
                    this.graphView.toggleExternalNodes();
                    this.updateGraphControls();
                    if (this.graphLayoutMode === 'cluster') {
                        this.refreshGraphView();
                    } else {
                        this.graphView.applyFilters({ forceVisibility: true });
                    }
                }
            });
        });

        this.graphActionButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const action = button.dataset.graphAction;
                if (action === 'focus') {
                    this.graphView.focusOnSelected();
                } else if (action === 'reset') {
                    this.graphView.resetFocus();
                    this.refreshGraphViewport();
                } else if (action === 'reveal') {
                    if (!this.currentChapterId) {
                        return;
                    }
                    const nodes = this.filterNodesForChapter(this.currentChapterId);
                    if (this.graphView.revealMoreNodes(this.currentScope, nodes.length)) {
                        this.refreshGraphView();
                    }
                } else if (action === 'zoom-in') {
                    this.graphView.zoom(1.2);
                } else if (action === 'zoom-out') {
                    this.graphView.zoom(0.8);
                } else if (action === 'fit') {
                    this.graphView.fit();
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

        document.addEventListener('keydown', (event) => {
            if (this.isEditableTarget(event.target)) {
                return;
            }
            if (event.key === 's' || event.key === 'S') {
                this.siblingSelectKeyActive = true;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.key === 's' || event.key === 'S') {
                this.siblingSelectKeyActive = false;
            }
        });

        window.addEventListener('blur', () => {
            this.siblingSelectKeyActive = false;
        });

        this.codeSurface.addEventListener('click', (event) => {
            this.readerController.handleCodeSurfaceClick(event as MouseEvent);
        });

        this.codeSurface.addEventListener('keydown', (event) => {
            this.readerController.handleCodeSurfaceKeydown(event as KeyboardEvent);
        });

        this.readerMeta.addEventListener('click', (event) => {
            this.readerController.handleCodeSurfaceClick(event as MouseEvent);
        });

        this.readerMeta.addEventListener('keydown', (event) => {
            this.readerController.handleCodeSurfaceKeydown(event as KeyboardEvent);
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

        bindFileTreeEvents(this.narratorFileTree, {
            onToggle: (path) => this.toggleFileTreePath(path),
            onSelectFile: (path) => this.handleFileTreeFileSelection(path),
        });
        bindFileTreeEvents(this.codeSurface, {
            onToggle: (path) => this.toggleFileTreePath(path),
            onSelectFile: (path) => this.handleFileTreeFileSelection(path),
        });

        this.repoForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.applyRepoSelection();
        });

        this.bindWorkspaceResize();
    }

    private bindWorkspaceResize(): void {
        const minPaneWidth = 320;

        this.workspaceSplitter.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }
            if (this.workspace.dataset.layout !== 'both') {
                return;
            }

            event.preventDefault();

            const splitterRect = this.workspaceSplitter.getBoundingClientRect();
            const codeRect = this.codePane.getBoundingClientRect();
            const canvasRect = this.canvasPane.getBoundingClientRect();
            const totalWidth = codeRect.width + canvasRect.width + splitterRect.width;
            const maxReaderWidth = Math.max(minPaneWidth, totalWidth - splitterRect.width - minPaneWidth);
            const startX = event.clientX;
            const startReaderWidth = codeRect.width;

            const updateSplitterAria = (value: number) => {
                this.workspaceSplitter.setAttribute('aria-valuemin', String(minPaneWidth));
                this.workspaceSplitter.setAttribute('aria-valuemax', String(Math.round(maxReaderWidth)));
                this.workspaceSplitter.setAttribute('aria-valuenow', String(Math.round(value)));
            };

            updateSplitterAria(startReaderWidth);

            const handleMove = (moveEvent: PointerEvent) => {
                if (moveEvent.pointerId !== event.pointerId) {
                    return;
                }
                const delta = moveEvent.clientX - startX;
                const nextWidth = Math.min(
                    maxReaderWidth,
                    Math.max(minPaneWidth, startReaderWidth + delta),
                );
                this.workspace.style.setProperty('--reader-width', `${nextWidth}px`);
                updateSplitterAria(nextWidth);
            };

            const stopResize = (endEvent: PointerEvent) => {
                if (endEvent.pointerId !== event.pointerId) {
                    return;
                }
                this.workspaceSplitter.releasePointerCapture(event.pointerId);
                this.workspaceSplitter.removeEventListener('pointermove', handleMove);
                this.workspaceSplitter.removeEventListener('pointerup', stopResize);
                this.workspaceSplitter.removeEventListener('pointercancel', stopResize);
                document.body.classList.remove('is-resizing');
                if (this.graphInstance) {
                    this.graphInstance.resize();
                    this.updateLabelVisibility();
                }
            };

            document.body.classList.add('is-resizing');
            this.workspaceSplitter.setPointerCapture(event.pointerId);
            this.workspaceSplitter.addEventListener('pointermove', handleMove);
            this.workspaceSplitter.addEventListener('pointerup', stopResize);
            this.workspaceSplitter.addEventListener('pointercancel', stopResize);
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
        const tocData = await this.api.fetchJson<ApiTocResponse>(
            '/gitreader/api/toc',
            { mode },
        );
        this.chapters = Array.isArray(tocData.chapters) ? tocData.chapters : [];
        this.tocMode = tocData.mode ?? mode;
        this.activeStoryArc = null;
        this.updateTocModeUi();
        this.renderToc();
    }

    private async loadRouteToc(): Promise<void> {
        const storyData = await this.api.fetchJson<ApiStoryResponse>('/gitreader/api/story');
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
        return formatArcOptionLabelUtil(arc);
    }

    private formatRouteLabel(arc: StoryArc): string {
        return formatRouteLabelUtil(arc);
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
        this.graphView.setFocusedNodeId(null);
        await this.loadGraphForScope(scope);
        if (requestToken !== this.chapterRequestToken) {
            return;
        }
        const nodes = this.filterNodesForChapter(chapterId);
        const edges = this.filterEdgesForNodes(nodes);
        const graphView = this.buildGraphView(nodes, edges, scope);
        const focus = this.pickFocusNode(graphView.nodes);
        this.resetLabelVisibilityCache();
        this.graphView.render({
            nodes: graphView.nodes,
            edges: graphView.edges,
            layoutMode: this.graphLayoutMode,
        });
        this.graphView.updateNodeStatus(graphView);
        this.loadSymbolSnippet(focus).catch(() => {
                this.readerController.render(focus);
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
            const response = await this.api.fetchJson<ApiStoryResponse>(
                '/gitreader/api/story',
                { id: arcId },
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
        this.graphView.setFocusedNodeId(arc.entry_id);
        await this.loadGraphForScope('full');
        if (requestToken !== this.chapterRequestToken) {
            return;
        }
        const nodes = this.graphNodes;
        const edges = this.filterEdgesForNodes(nodes);
        const graphView = this.buildGraphView(nodes, edges, 'full');
        this.resetLabelVisibilityCache();
        this.graphView.render({
            nodes: graphView.nodes,
            edges: graphView.edges,
            layoutMode: this.graphLayoutMode,
        });
        this.graphView.updateNodeStatus(graphView);
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
                this.readerController.render(entryNode);
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
            graphPromise = this.api.fetchJson<ApiGraphResponse>(
                '/gitreader/api/graph',
                scope && scope !== 'full' ? { scope } : undefined,
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

    private buildGraphView(nodes: SymbolNode[], edges: GraphEdge[], scope: string): GraphView {
        if (this.graphLayoutMode === 'cluster') {
            return this.buildClusterView(nodes, edges);
        }
        const totalNodes = nodes.length;
        const cap = this.graphView.getNodeCapForScope(scope, totalNodes);
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
        const focusedNodeId = this.graphView.getFocusedNodeId();
        if (focusedNodeId && nodeMap.has(focusedNodeId)) {
            keepIds.add(focusedNodeId);
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
        const fileTree = buildFileTreeFromNodes(fileNodes);
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
        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        // Tracks direct file children using "contains" edges so file expansion stops at one level.
        const directChildrenByFile = new Map<string, SymbolNode[]>();
        const directChildIdsByFile = new Map<string, Set<string>>();
        // Tracks direct class children (methods) using "contains" edges for class expansion.
        const directChildrenByClass = new Map<string, SymbolNode[]>();
        const directChildIdsByClass = new Map<string, Set<string>>();
        edges.forEach((edge) => {
            if (edge.kind !== 'contains') {
                return;
            }
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) {
                return;
            }
            if (sourceNode.kind === 'file') {
                if (targetNode.kind === 'file' || targetNode.kind === 'external') {
                    return;
                }
                const existing = directChildrenByFile.get(sourceNode.id) ?? [];
                const existingIds = directChildIdsByFile.get(sourceNode.id) ?? new Set<string>();
                if (existingIds.has(targetNode.id)) {
                    return;
                }
                existing.push(targetNode);
                existingIds.add(targetNode.id);
                directChildrenByFile.set(sourceNode.id, existing);
                directChildIdsByFile.set(sourceNode.id, existingIds);
                return;
            }
            if (sourceNode.kind === 'class' && targetNode.kind === 'method') {
                const existing = directChildrenByClass.get(sourceNode.id) ?? [];
                const existingIds = directChildIdsByClass.get(sourceNode.id) ?? new Set<string>();
                if (existingIds.has(targetNode.id)) {
                    return;
                }
                existing.push(targetNode);
                existingIds.add(targetNode.id);
                directChildrenByClass.set(sourceNode.id, existing);
                directChildIdsByClass.set(sourceNode.id, existingIds);
            }
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
            let entries = Array.from(treeNode.children.values());
            const currentPath = treeNode.path;
            if (currentPath) {
                const currentFolderId = this.getFolderClusterId(currentPath);
                const isUserExpanded = this.clusterExpanded.has(currentFolderId);
                const isAutoExpanded = this.clusterAutoExpanded.has(currentFolderId);
                const isFocusFolder = this.clusterFocusPath === currentPath;
                if (isAutoExpanded && !isUserExpanded && !isFocusFolder) {
                    const focusChildName = this.getClusterFocusChildName(currentPath);
                    if (focusChildName) {
                        entries = entries.filter((entry) => entry.name === focusChildName);
                    }
                }
            }
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
                const fileCount = countFilesInTree(child);
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
                if (this.isClusterFolderExpanded(folderId)) {
                    visitTree(child, folderId);
                }
            });
        };
        visitTree(fileTree, null);

        const { showExternalNodes } = this.graphView.getFilterState();
        if (showExternalNodes) {
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
            const children = directChildrenByFile.get(fileId);
            if (!children || children.length === 0) {
                return;
            }
            children.forEach((child) => addNode(child));
        });
        // Expand class nodes to show methods only when the class itself is expanded.
        visibleNodes.forEach((node) => {
            if (node.kind !== 'class') {
                return;
            }
            if (!this.classExpanded.has(node.id)) {
                return;
            }
            const children = directChildrenByClass.get(node.id);
            if (!children || children.length === 0) {
                return;
            }
            children.forEach((child) => addNode(child));
        });
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
                return showExternalNodes ? node.id : null;
            }
            const path = node.location?.path;
            if (!path) {
                return visibleNodeIds.has(node.id) ? node.id : null;
            }
            const normalized = this.normalizePath(path);
            if (this.clusterFocusPath && !this.isPathWithinFocus(normalized)) {
                const divergencePath = this.getClusterFocusDivergencePath(normalized);
                if (divergencePath) {
                    const divergenceId = this.getFolderClusterId(divergencePath);
                    if (visibleNodeIds.has(divergenceId)) {
                        return divergenceId;
                    }
                }
            }
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

    private refreshGraphView(): void {
        if (!this.currentChapterId) {
            return;
        }
        const nodes = this.filterNodesForChapter(this.currentChapterId);
        const edges = this.filterEdgesForNodes(nodes);
        const graphView = this.buildGraphView(nodes, edges, this.currentScope);
        this.resetLabelVisibilityCache();
        this.graphView.render({
            nodes: graphView.nodes,
            edges: graphView.edges,
            layoutMode: this.graphLayoutMode,
        });
        this.graphView.updateNodeStatus(graphView);
        this.updateOrganizedCircleOverlay();
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
        this.fileTreeView.setNodes(this.graphNodes, this.fileNodesByPath);
        if (this.currentScope === 'full' || this.tourActive) {
            this.fileTreeController.refresh();
        }
    }

    private async loadSymbolSnippet(symbol: SymbolNode, shouldNarrate: boolean = true): Promise<void> {
        if (shouldNarrate) {
            this.activeStoryArc = null;
        }
        if (!this.canFetchSnippet(symbol)) {
        this.readerController.render(symbol);
            if (shouldNarrate) {
                void this.updateNarrator(symbol);
            }
            return;
        }
        const section = this.getSnippetSection(symbol);
        const cacheKey = `${symbol.id}:${section}`;
        const cached = this.snippetCache.get(cacheKey);
        if (cached) {
            this.readerController.render(symbol, cached);
            if (shouldNarrate) {
                void this.updateNarrator(symbol);
            }
            return;
        }
        const response = await this.api.fetchJson<SymbolSnippetResponse>(
            '/gitreader/api/symbol',
            { id: symbol.id, section },
        );
        this.snippetCache.set(cacheKey, response);
        this.pendingSymbol = symbol;
        this.pendingSnippet = response;
        this.readerController.render(symbol, response);
        if (shouldNarrate) {
            void this.updateNarrator(symbol);
        }
    }

    private getSnippetSection(symbol: SymbolNode): string {
        if (this.readerView.getSnippetMode() === 'full') {
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
        return normalizePath(path);
    }

    private isReaderVisible(): boolean {
        return this.workspace.dataset.layout !== 'canvas';
    }

    private getFolderClusterId(path: string): string {
        return `cluster:folder:${path}`;
    }

    // Checks whether a folder is expanded either by user action or auto-focus.
    private isClusterFolderExpanded(folderId: string): boolean {
        return this.clusterExpanded.has(folderId) || this.clusterAutoExpanded.has(folderId);
    }

    private findCollapsedFolderId(path: string): string | null {
        const normalized = this.normalizePath(path);
        const parts = normalized.split('/').filter(Boolean);
        let current = '';
        for (const part of parts.slice(0, -1)) {
            current = current ? `${current}/${part}` : part;
            const folderId = this.getFolderClusterId(current);
            if (!this.isClusterFolderExpanded(folderId)) {
                return folderId;
            }
        }
        return null;
    }

    private toggleFileTreePath(path: string): void {
        this.fileTreeView.toggle(path);
        this.fileTreeController.render(this.fileTreeView.getNarratorFocusPath());
        if (this.readerTreeFocusPath) {
            this.readerController.showFileTree(this.readerTreeFocusPath);
        }
    }

    // Loads a file from the file tree into the reader while keeping graph selection in sync.
    private handleFileTreeFileSelection(path: string): void {
        const normalized = this.normalizePath(path);
        const fileNode = this.fileNodesByPath.get(normalized);
        if (!fileNode) {
            this.setCodeStatus('File not found in graph.');
            return;
        }
        const folderPath = normalized.split('/').slice(0, -1).join('/');
        this.setClusterFocusPath(folderPath);
        if (this.graphLayoutMode === 'cluster') {
            this.refreshGraphView();
        }
        if (this.graphInstance) {
            this.graphInstance.$('node:selected').unselect();
            const fileElement = this.graphInstance.$id(fileNode.id);
            if (fileElement && !fileElement.empty()) {
                fileElement.select();
            }
        }
        this.loadSymbolSnippet(fileNode, false).catch(() => {
            this.readerController.render(fileNode);
        });
        this.fileTreeController.render(normalized);
    }

    // Marks a folder path for auto-expansion while remembering the focused folder scope.
    private setClusterFocusPath(path: string): void {
        const normalized = this.normalizePath(path);
        this.clusterFocusPath = normalized || null;
        this.clusterAutoExpanded.clear();
        if (!normalized) {
            return;
        }
        const parts = normalized.split('/').filter(Boolean);
        let current = '';
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            const folderId = this.getFolderClusterId(current);
            if (!this.clusterExpanded.has(folderId)) {
                this.clusterAutoExpanded.add(folderId);
            }
        }
    }

    // Checks whether a node path is inside the focused folder subtree.
    private isPathWithinFocus(path: string): boolean {
        if (!this.clusterFocusPath) {
            return false;
        }
        const normalized = this.normalizePath(path);
        if (normalized === this.clusterFocusPath) {
            return true;
        }
        return normalized.startsWith(`${this.clusterFocusPath}/`);
    }

    // Returns the immediate focus child name for a folder so auto-expansion reveals only that branch.
    private getClusterFocusChildName(parentPath: string): string | null {
        if (!this.clusterFocusPath) {
            return null;
        }
        const normalizedParent = this.normalizePath(parentPath);
        const focusParts = this.clusterFocusPath.split('/').filter(Boolean);
        const parentParts = normalizedParent.split('/').filter(Boolean);
        if (parentParts.length >= focusParts.length) {
            return null;
        }
        for (let index = 0; index < parentParts.length; index += 1) {
            if (parentParts[index] !== focusParts[index]) {
                return null;
            }
        }
        return focusParts[parentParts.length] ?? null;
    }

    // Finds the closest shared ancestor between the focus path and a non-focus node path.
    private getClusterFocusDivergencePath(path: string): string | null {
        if (!this.clusterFocusPath) {
            return null;
        }
        const focusParts = this.clusterFocusPath.split('/').filter(Boolean);
        const targetParts = this.normalizePath(path).split('/').filter(Boolean);
        const common: string[] = [];
        const max = Math.min(focusParts.length, targetParts.length);
        for (let index = 0; index < max; index += 1) {
            if (focusParts[index] !== targetParts[index]) {
                break;
            }
            common.push(focusParts[index]);
        }
        if (common.length === 0) {
            return null;
        }
        return common.join('/');
    }

    private getFileNodeForSymbol(symbol: SymbolNode): SymbolNode | null {
        const path = symbol.location?.path;
        if (!path) {
            return null;
        }
        return this.fileNodesByPath.get(this.normalizePath(path)) ?? null;
    }

    // Detects cmd/ctrl clicks so graph interactions can support multi-select behavior.
    private isModifierClick(event?: MouseEvent | PointerEvent | KeyboardEvent | Event): boolean {
        if (!event) {
            return false;
        }
        const anyEvent = event as { metaKey?: boolean; ctrlKey?: boolean; getModifierState?: (key: string) => boolean };
        if (typeof anyEvent.getModifierState === 'function') {
            if (anyEvent.getModifierState('Meta') || anyEvent.getModifierState('Control')) {
                return true;
            }
        }
        return Boolean(anyEvent.metaKey || anyEvent.ctrlKey);
    }

    // Detects shift-clicks so folder selections can bulk-highlight descendants.
    private isShiftClick(event?: MouseEvent | PointerEvent | KeyboardEvent | Event): boolean {
        if (!event) {
            return false;
        }
        const anyEvent = event as { shiftKey?: boolean; getModifierState?: (key: string) => boolean };
        if (typeof anyEvent.getModifierState === 'function') {
            if (anyEvent.getModifierState('Shift')) {
                return true;
            }
        }
        return Boolean(anyEvent.shiftKey);
    }

    // Detects the "s+click" chord so sibling selection can short-circuit normal click behavior.
    private isSiblingSelectClick(event?: MouseEvent | PointerEvent | KeyboardEvent | Event): boolean {
        if (!this.siblingSelectKeyActive) {
            return false;
        }
        if (!event) {
            return true;
        }
        if (this.isShiftClick(event) || this.isModifierClick(event)) {
            return false;
        }
        return true;
    }

    // Returns true when the event target is an editable surface that should ignore graph hotkeys.
    private isEditableTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) {
            return false;
        }
        if (target.isContentEditable) {
            return true;
        }
        const tag = target.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select';
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
                this.readerController.render(fileNode);
                void this.updateNarrator(fileNode);
            }
        }
        this.applyFocusHighlight(symbol);
    }

    private handleFileFocusClick(symbol: SymbolNode, event?: MouseEvent): boolean {
        if (symbol.kind !== 'function' && symbol.kind !== 'method') {
            return false;
        }
        const fileNode = this.getFileNodeForSymbol(symbol);
        if (!fileNode || !this.isFileNodeActive(fileNode)) {
            return false;
        }
        if (this.graphInstance) {
            this.graphInstance.$('node:selected').unselect();
            this.graphInstance.$id(fileNode.id).select();
            this.graphInstance.$id(symbol.id).select();
        }
        void this.highlightSymbolInFile(fileNode, symbol);
        return true;
    }

    // Selects visible descendants of a folder node so groups can be moved together.
    private handleShiftFolderSelection(symbol: SymbolNode): boolean {
        if (this.graphLayoutMode !== 'cluster') {
            return false;
        }
        if (symbol.kind !== 'folder') {
            return false;
        }
        if (!this.graphInstance) {
            return false;
        }
        const folderElement = this.graphInstance.$id(symbol.id);
        if (!folderElement || folderElement.empty()) {
            return false;
        }
        const folderPath = folderElement.data('path') || symbol.location?.path;
        if (!folderPath) {
            this.graphInstance.$('node:selected').unselect();
            this.graphView.refreshEdgeHighlights();
            this.updateLabelVisibility();
            return true;
        }
        const normalizedFolderPath = this.normalizePath(String(folderPath));
        const prefix = normalizedFolderPath ? `${normalizedFolderPath}/` : '';
        const visibleNodes = this.graphInstance.nodes(':visible');
        const nodesToSelect = visibleNodes.filter((node: any) => {
            const nodePath = node.data('path');
            if (!nodePath) {
                return false;
            }
            const normalizedNodePath = this.normalizePath(String(nodePath));
            return Boolean(prefix && normalizedNodePath.startsWith(prefix));
        });
        this.graphInstance.$('node:selected').unselect();
        nodesToSelect.select();
        this.graphView.refreshEdgeHighlights();
        this.updateLabelVisibility();
        return true;
    }

    // Replaces selection with visible class nodes that belong to a file node element.
    private handleFileClassSelection(node: any): boolean {
        if (!this.graphInstance) {
            return false;
        }
        if (!node || typeof node.data !== 'function') {
            return false;
        }
        if (node.data('kind') !== 'file') {
            return false;
        }
        const filePath = node.data('path');
        if (!filePath) {
            return false;
        }
        const normalizedFilePath = this.normalizePath(String(filePath));
        const visibleSymbols = this.graphInstance.nodes(':visible').filter((element: any) => {
            const kind = element.data('kind');
            if (kind !== 'class' && kind !== 'function') {
                return false;
            }
            const symbolPath = element.data('path');
            if (!symbolPath) {
                return false;
            }
            return this.normalizePath(String(symbolPath)) === normalizedFilePath;
        });
        if (!visibleSymbols || visibleSymbols.empty()) {
            return false;
        }
        this.graphInstance.$('node:selected').unselect();
        if (typeof node.unselect === 'function') {
            node.unselect();
        }
        visibleSymbols.select();
        return true;
    }

    // Replaces selection with visible method nodes when a class is expanded and shift-clicked.
    private handleShiftClassSelection(symbol: SymbolNode): boolean {
        if (this.graphLayoutMode !== 'cluster') {
            return false;
        }
        if (!symbol || symbol.kind !== 'class') {
            return false;
        }
        if (!this.classExpanded.has(symbol.id)) {
            return false;
        }
        if (!this.graphInstance) {
            return false;
        }
        const methodIds = this.graphEdges
            .filter((edge) => edge.kind === 'contains' && edge.source === symbol.id)
            .map((edge) => edge.target)
            .filter((targetId) => this.nodeById.get(targetId)?.kind === 'method');
        if (methodIds.length === 0) {
            return false;
        }
        const methodIdSet = new Set(methodIds);
        const visibleMethods = this.graphInstance.nodes(':visible').filter((element: any) => {
            if (element.data('kind') !== 'method') {
                return false;
            }
            return methodIdSet.has(element.id());
        });
        if (!visibleMethods || visibleMethods.empty()) {
            return false;
        }
        this.graphInstance.$('node:selected').unselect();
        visibleMethods.select();
        return true;
    }

    // Selects visible siblings that share the same parent when the user s-clicks a node.
    private handleSiblingSelection(symbol: SymbolNode): boolean {
        if (!this.graphInstance || !symbol?.id) {
            return false;
        }
        const parentElement = this.resolveVisibleParent(symbol);
        if (!parentElement) {
            return true;
        }
        const siblings = this.getVisibleSiblingNodes(parentElement.id(), symbol.id);
        this.graphInstance.$('node:selected').unselect();
        if (siblings && !siblings.empty()) {
            siblings.select();
        }
        this.graphView.refreshEdgeHighlights();
        this.updateLabelVisibility();
        return true;
    }

    // Collects visible sibling nodes by following contains edges from a shared parent id.
    private getVisibleSiblingNodes(parentId: string, excludeId: string): any {
        if (!this.graphInstance) {
            return null;
        }
        const edges = this.graphInstance.edges().filter((edge: any) => (
            edge.data('kind') === 'contains' && edge.data('source') === parentId
        ));
        return edges
            .targets()
            .filter(':visible')
            .filter((node: any) => node.id() !== excludeId);
    }

    // Hides the graph context menu when the user clicks elsewhere.
    private hideGraphContextMenu(): void {
        this.graphContextMenu.hide();
    }

    // Opens the graph context menu for the given node and click event.
    private openGraphContextMenu(symbol: SymbolNode, event: any): void {
        if (!symbol?.id) {
            return;
        }
        if (this.tourActive && !this.isGuidedNodeAllowed(symbol.id)) {
            this.flashGuidedMessage('Follow the guide to unlock this step.');
            return;
        }
        const anchor = this.getContextMenuAnchor(event);
        const actions = this.buildGraphContextMenuActions(symbol);
        if (actions.length === 0) {
            this.graphContextMenu.hide();
            return;
        }
        this.graphContextMenu.show({
            x: anchor.x,
            y: anchor.y,
            title: symbol.name || symbol.id,
            actions,
        });
    }

    // Computes the screen-space anchor for the context menu.
    private getContextMenuAnchor(event: any): { x: number; y: number } {
        const originalEvent = event?.originalEvent as MouseEvent | undefined;
        if (originalEvent) {
            return { x: originalEvent.clientX, y: originalEvent.clientY };
        }
        const rendered = event?.renderedPosition;
        if (rendered && this.canvasGraph) {
            const rect = this.canvasGraph.getBoundingClientRect();
            return { x: rect.left + rendered.x, y: rect.top + rendered.y };
        }
        return { x: 0, y: 0 };
    }

    // Builds the action list for the graph context menu based on node relationships.
    private buildGraphContextMenuActions(symbol: SymbolNode): GraphContextMenuAction[] {
        const actions: GraphContextMenuAction[] = [];
        const hasParent = Boolean(this.resolveVisibleParent(symbol));
        const hasChildren = Boolean(this.getVisibleChildren(symbol));
        const expansionState = this.getChildExpansionState(symbol);
        const canOpenChildren = this.graphLayoutMode === 'cluster'
            && expansionState.hasChildren
            && !expansionState.isExpanded;
        const canCloseChildren = this.graphLayoutMode === 'cluster'
            && expansionState.hasChildren
            && expansionState.isExpanded;
        actions.push({
            id: 'select-parent',
            label: 'Select Parent',
            disabled: !hasParent,
            onSelect: () => {
                this.selectParent(symbol);
            },
        });
        actions.push({
            id: 'select-children',
            label: 'Select Children',
            disabled: !hasChildren,
            onSelect: () => {
                this.selectChildren(symbol);
            },
        });
        actions.push({
            id: 'open-children',
            label: 'Open Children',
            disabled: !canOpenChildren,
            onSelect: () => {
                this.openChildren(symbol);
            },
        });
        actions.push({
            id: 'close-children',
            label: 'Close Children',
            disabled: !canCloseChildren,
            onSelect: () => {
                this.closeChildren(symbol);
            },
        });
        actions.push({
            id: 'organize-children-circle',
            label: 'Organize Children: Circle',
            disabled: !hasChildren,
            onSelect: () => {
                this.organizeChildren(symbol, 'circle');
            },
        });
        actions.push({
            id: 'organize-children-grid',
            label: 'Organize Children: Grid',
            disabled: !hasChildren,
            onSelect: () => {
                this.organizeChildren(symbol, 'grid');
            },
        });
        return actions;
    }

    // Reports whether a node has expandable children and whether they're currently expanded so the context menu can enable Open/Close.
    private getChildExpansionState(symbol: SymbolNode): { hasChildren: boolean; isExpanded: boolean } {
        if (!symbol?.id) {
            return { hasChildren: false, isExpanded: false };
        }
        if (symbol.kind === 'folder') {
            return {
                hasChildren: this.folderHasClusterChildren(symbol),
                isExpanded: this.isClusterFolderExpanded(symbol.id),
            };
        }
        if (symbol.kind === 'file') {
            return {
                hasChildren: this.fileHasClusterChildren(symbol),
                isExpanded: this.clusterExpanded.has(symbol.id),
            };
        }
        if (symbol.kind === 'class') {
            return {
                hasChildren: this.classHasClusterChildren(symbol),
                isExpanded: this.classExpanded.has(symbol.id),
            };
        }
        return { hasChildren: false, isExpanded: false };
    }

    // Expands a node's immediate children in cluster view when the context menu requests "Open Children".
    private openChildren(symbol: SymbolNode): void {
        if (this.graphLayoutMode !== 'cluster' || !symbol?.id) {
            return;
        }
        let changed = false;
        if (symbol.kind === 'folder') {
            if (this.folderHasClusterChildren(symbol) && !this.isClusterFolderExpanded(symbol.id)) {
                this.clusterExpanded.add(symbol.id);
                changed = true;
            }
        } else if (symbol.kind === 'file') {
            if (this.fileHasClusterChildren(symbol) && !this.clusterExpanded.has(symbol.id)) {
                this.clusterExpanded.add(symbol.id);
                changed = true;
            }
        } else if (symbol.kind === 'class') {
            if (this.classHasClusterChildren(symbol) && !this.classExpanded.has(symbol.id)) {
                this.classExpanded.add(symbol.id);
                changed = true;
            }
        }
        if (changed) {
            this.refreshGraphView();
        }
    }

    // Collapses a node's immediate children in cluster view when the context menu requests "Close Children".
    private closeChildren(symbol: SymbolNode): void {
        if (this.graphLayoutMode !== 'cluster' || !symbol?.id) {
            return;
        }
        let changed = false;
        if (symbol.kind === 'folder') {
            if (this.isClusterFolderExpanded(symbol.id)) {
                this.clusterExpanded.delete(symbol.id);
                this.clusterAutoExpanded.delete(symbol.id);
                changed = true;
            }
        } else if (symbol.kind === 'file') {
            if (this.clusterExpanded.has(symbol.id)) {
                this.clusterExpanded.delete(symbol.id);
                changed = true;
            }
        } else if (symbol.kind === 'class') {
            if (this.classExpanded.has(symbol.id)) {
                this.classExpanded.delete(symbol.id);
                changed = true;
            }
        }
        if (changed) {
            this.refreshGraphView();
        }
    }

    // Resolves a visible parent node element for the provided symbol.
    private resolveVisibleParent(symbol: SymbolNode): any | null {
        if (!this.graphInstance) {
            return null;
        }
        const parentId = this.getParentNodeId(symbol);
        if (!parentId) {
            return null;
        }
        const parentElement = this.graphInstance.$id(parentId);
        if (!parentElement || parentElement.empty() || parentElement.hidden()) {
            return null;
        }
        return parentElement;
    }

    // Selects the parent node and centers the canvas on it.
    private selectParent(symbol: SymbolNode): void {
        if (!this.graphInstance) {
            return;
        }
        const parentElement = this.resolveVisibleParent(symbol);
        if (!parentElement) {
            this.flashGuidedMessage('No parent available in the current view.');
            return;
        }
        this.graphInstance.$('node:selected').unselect();
        parentElement.select();
        this.graphView.refreshEdgeHighlights();
        this.updateLabelVisibility();
        if (typeof this.graphInstance.center === 'function') {
            this.graphInstance.center(parentElement);
        }
    }

    // Selects visible children for the given symbol based on contains edges or folder paths.
    private selectChildren(symbol: SymbolNode): void {
        if (!this.graphInstance) {
            return;
        }
        const children = this.getVisibleChildren(symbol);
        if (!children || children.empty()) {
            this.flashGuidedMessage('No visible children to select.');
            return;
        }
        this.graphInstance.$('node:selected').unselect();
        children.select();
        this.graphView.refreshEdgeHighlights();
        this.updateLabelVisibility();
    }

    // Organizes visible children around their parent using the chosen layout style.
    private organizeChildren(symbol: SymbolNode, layout: 'circle' | 'grid'): void {
        if (!this.graphInstance) {
            return;
        }
        if (this.graphLayoutMode === 'cluster') {
            this.graphView.setClusterManualLayout(true);
        }
        const parentElement = this.graphInstance.$id(symbol.id);
        const children = this.getVisibleChildren(symbol);
        if (!parentElement || parentElement.empty() || !children || children.empty()) {
            return;
        }
        this.clearOrganizedCircleOverlay();
        const center = parentElement.position();
        const count = children.length;
        if (layout === 'circle') {
            const radius = Math.max(80, 28 * count);
            const childIds: string[] = [];
            children.forEach((child: any, index: number) => {
                childIds.push(child.id());
                const angle = (2 * Math.PI * index) / Math.max(1, count);
                child.position({
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle),
                });
            });
            this.setOrganizedCircleState(parentElement.id(), childIds, radius);
            return;
        }
        const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
        const spacing = 80;
        const rows = Math.ceil(count / columns);
        const startX = center.x - ((columns - 1) * spacing) / 2;
        const startY = center.y - ((rows - 1) * spacing) / 2;
        children.forEach((child: any, index: number) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            child.position({
                x: startX + col * spacing,
                y: startY + row * spacing,
            });
        });
    }

    // Builds the overlay UI that lets users tighten an organized circle of children.
    private initializeOrganizedCircleOverlay(): void {
        this.organizedCircleOverlay = document.createElement('div');
        this.organizedCircleOverlay.className = 'graph-orbit';
        this.organizedCircleOverlay.setAttribute('aria-hidden', 'true');

        this.organizedCircleButton = document.createElement('button');
        this.organizedCircleButton.type = 'button';
        this.organizedCircleButton.className = 'graph-orbit__button';
        this.organizedCircleButton.textContent = '<->';
        this.organizedCircleButton.setAttribute('aria-label', 'Drag to move children inward or outward');
        this.organizedCircleButton.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.handleOrganizedCircleDragStart(event);
        });

        this.organizedCircleOverlay.appendChild(this.organizedCircleButton);
        this.canvasSurface.appendChild(this.organizedCircleOverlay);

        this.canvasSurface.addEventListener('pointerdown', (event) => {
            this.handleOrganizedCircleDismissStart(event);
        });
        window.addEventListener('pointermove', (event) => {
            this.handleOrganizedCircleDragMove(event);
            this.handleOrganizedCircleDismissMove(event);
        });
        window.addEventListener('pointerup', (event) => {
            this.handleOrganizedCircleDragEnd(event);
            this.handleOrganizedCircleDismissEnd(event);
        });
        window.addEventListener('pointercancel', (event) => {
            this.handleOrganizedCircleDragEnd(event);
            this.handleOrganizedCircleDismissEnd(event);
        });
    }

    // Stores the last organized circle state so we can re-render its overlay on zoom or pan.
    private setOrganizedCircleState(parentId: string, childIds: string[], radius: number): void {
        if (!parentId || childIds.length === 0) {
            this.clearOrganizedCircleOverlay();
            return;
        }
        this.organizedCircleState = {
            parentId,
            childIds,
            radius,
        };
        this.updateOrganizedCircleOverlay();
    }

    // Clears the organized circle overlay when it is no longer relevant.
    private clearOrganizedCircleOverlay(): void {
        this.organizedCircleState = null;
        if (!this.organizedCircleOverlay) {
            return;
        }
        this.organizedCircleOverlay.classList.remove('is-visible');
        this.organizedCircleOverlay.setAttribute('aria-hidden', 'true');
    }

    // Repositions the organized circle overlay to stay centered on the parent and sized to the child radius.
    private updateOrganizedCircleOverlay(): void {
        if (!this.organizedCircleState || !this.graphInstance || this.graphLayoutMode !== 'cluster') {
            this.clearOrganizedCircleOverlay();
            return;
        }
        const parentElement = this.graphInstance.$id(this.organizedCircleState.parentId);
        if (!parentElement || parentElement.empty() || parentElement.hidden()) {
            this.clearOrganizedCircleOverlay();
            return;
        }
        const children = this.getOrganizedChildrenElements(this.organizedCircleState);
        if (!children || children.empty()) {
            this.clearOrganizedCircleOverlay();
            return;
        }
        const zoom = this.graphInstance.zoom();
        const center = parentElement.position();
        const renderedCenter = this.getRenderedPoint(center);
        const ringPadding = this.getOrganizedCirclePadding();
        const renderedRadius = Math.max(24, (this.organizedCircleState.radius + ringPadding) * zoom);
        const surfaceRect = this.canvasSurface.getBoundingClientRect();
        const graphRect = this.canvasGraph.getBoundingClientRect();
        const offsetX = graphRect.left - surfaceRect.left;
        const offsetY = graphRect.top - surfaceRect.top;
        this.organizedCircleOverlay.style.left = `${offsetX + renderedCenter.x - renderedRadius}px`;
        this.organizedCircleOverlay.style.top = `${offsetY + renderedCenter.y - renderedRadius}px`;
        this.organizedCircleOverlay.style.width = `${renderedRadius * 2}px`;
        this.organizedCircleOverlay.style.height = `${renderedRadius * 2}px`;
        this.organizedCircleOverlay.classList.add('is-visible');
        this.organizedCircleOverlay.setAttribute('aria-hidden', 'false');
        this.organizedCircleButton.disabled = this.organizedCircleState.radius <= this.getOrganizedCircleMinRadius();
    }

    // Moves the organized children closer to their parent by shrinking the circle radius.
    private nudgeOrganizedChildrenInward(): void {
        if (!this.graphInstance || !this.organizedCircleState) {
            return;
        }
        const parentElement = this.graphInstance.$id(this.organizedCircleState.parentId);
        const children = this.getOrganizedChildrenElements(this.organizedCircleState);
        if (!parentElement || parentElement.empty() || !children || children.empty()) {
            this.clearOrganizedCircleOverlay();
            return;
        }
        const center = parentElement.position();
        const minRadius = this.getOrganizedCircleMinRadius();
        const nextRadius = Math.max(minRadius, this.organizedCircleState.radius * 0.82);
        this.graphInstance.batch(() => {
            this.positionChildrenOnCircle(children, center, nextRadius);
        });
        this.organizedCircleState.radius = nextRadius;
        this.updateOrganizedCircleOverlay();
    }

    // Begins dragging the orbit handle so pointer movement can resize the circle.
    private handleOrganizedCircleDragStart(event: PointerEvent): void {
        if (!this.organizedCircleState) {
            return;
        }
        this.organizedCircleDragActive = true;
        this.organizedCircleDragPointerId = event.pointerId;
        if (typeof this.organizedCircleButton.setPointerCapture === 'function') {
            this.organizedCircleButton.setPointerCapture(event.pointerId);
        }
        this.updateOrganizedCircleRadiusFromPointer(event);
    }

    // Updates the organized circle radius while dragging the handle.
    private handleOrganizedCircleDragMove(event: PointerEvent): void {
        if (!this.organizedCircleDragActive) {
            return;
        }
        if (this.organizedCircleDragPointerId !== null && event.pointerId !== this.organizedCircleDragPointerId) {
            return;
        }
        this.updateOrganizedCircleRadiusFromPointer(event);
    }

    // Ends the drag interaction and releases the pointer capture when finished.
    private handleOrganizedCircleDragEnd(event: PointerEvent): void {
        if (!this.organizedCircleDragActive) {
            return;
        }
        if (this.organizedCircleDragPointerId !== null && event.pointerId !== this.organizedCircleDragPointerId) {
            return;
        }
        this.organizedCircleDragActive = false;
        this.organizedCircleDragPointerId = null;
        if (typeof this.organizedCircleButton.releasePointerCapture === 'function') {
            this.organizedCircleButton.releasePointerCapture(event.pointerId);
        }
    }

    // Begins tracking a pointerdown so a simple click can dismiss the orbit without affecting drags.
    private handleOrganizedCircleDismissStart(event: PointerEvent): void {
        if (!this.organizedCircleState || this.organizedCircleDragActive) {
            return;
        }
        if (event.target === this.organizedCircleButton) {
            return;
        }
        if (event.target instanceof Node && this.organizedCircleOverlay.contains(event.target)) {
            return;
        }
        this.organizedCircleDismissStart = { x: event.clientX, y: event.clientY };
        this.organizedCircleDismissPointerId = event.pointerId;
        this.organizedCircleDismissMoved = false;
    }

    // Tracks pointer movement to distinguish drags from simple clicks when dismissing the orbit.
    private handleOrganizedCircleDismissMove(event: PointerEvent): void {
        if (!this.organizedCircleDismissStart) {
            return;
        }
        if (this.organizedCircleDismissPointerId !== null && event.pointerId !== this.organizedCircleDismissPointerId) {
            return;
        }
        if (this.organizedCircleDragActive) {
            this.resetOrganizedCircleDismissTracking();
            return;
        }
        const dx = event.clientX - this.organizedCircleDismissStart.x;
        const dy = event.clientY - this.organizedCircleDismissStart.y;
        if (Math.hypot(dx, dy) > this.getOrganizedCircleDismissThreshold()) {
            this.organizedCircleDismissMoved = true;
        }
    }

    // Clears the orbit only when the user clicks without dragging on the canvas.
    private handleOrganizedCircleDismissEnd(event: PointerEvent): void {
        if (!this.organizedCircleDismissStart) {
            return;
        }
        if (this.organizedCircleDismissPointerId !== null && event.pointerId !== this.organizedCircleDismissPointerId) {
            return;
        }
        const shouldDismiss = !this.organizedCircleDismissMoved && !this.organizedCircleDragActive;
        this.resetOrganizedCircleDismissTracking();
        if (shouldDismiss) {
            this.clearOrganizedCircleOverlay();
        }
    }

    // Resets tracking data used for click-to-dismiss detection.
    private resetOrganizedCircleDismissTracking(): void {
        this.organizedCircleDismissStart = null;
        this.organizedCircleDismissPointerId = null;
        this.organizedCircleDismissMoved = false;
    }

    // Computes a new radius from pointer distance and reapplies the circular layout.
    private updateOrganizedCircleRadiusFromPointer(event: PointerEvent): void {
        if (!this.graphInstance || !this.organizedCircleState) {
            return;
        }
        const parentElement = this.graphInstance.$id(this.organizedCircleState.parentId);
        const children = this.getOrganizedChildrenElements(this.organizedCircleState);
        if (!parentElement || parentElement.empty() || !children || children.empty()) {
            this.clearOrganizedCircleOverlay();
            return;
        }
        const graphRect = this.canvasGraph.getBoundingClientRect();
        const pointerX = event.clientX - graphRect.left;
        const pointerY = event.clientY - graphRect.top;
        const zoom = this.graphInstance.zoom();
        const center = parentElement.position();
        const renderedCenter = this.getRenderedPoint(center);
        const distance = Math.hypot(pointerX - renderedCenter.x, pointerY - renderedCenter.y);
        const ringPadding = this.getOrganizedCirclePadding();
        const minRadius = this.getOrganizedCircleMinRadius();
        const nextRadius = Math.max(minRadius, (distance / zoom) - ringPadding);
        this.graphInstance.batch(() => {
            this.positionChildrenOnCircle(children, center, nextRadius);
        });
        this.organizedCircleState.radius = nextRadius;
        this.updateOrganizedCircleOverlay();
    }

    // Positions the provided child nodes around the parent at a fixed radius.
    private positionChildrenOnCircle(children: any, center: { x: number; y: number }, radius: number): void {
        children.forEach((child: any) => {
            const position = child.position();
            const angle = Math.atan2(position.y - center.y, position.x - center.x);
            child.position({
                x: center.x + radius * Math.cos(angle),
                y: center.y + radius * Math.sin(angle),
            });
        });
    }

    // Returns the ring padding applied around organized children for the orbit overlay.
    private getOrganizedCirclePadding(): number {
        return 32;
    }

    // Returns the pixel distance threshold used to treat a pointer interaction as a drag.
    private getOrganizedCircleDismissThreshold(): number {
        return 6;
    }

    // Returns the smallest radius allowed when tightening the orbit around a parent.
    private getOrganizedCircleMinRadius(): number {
        return 56;
    }

    // Resolves the visible child node elements for the active organized circle state.
    private getOrganizedChildrenElements(state: OrganizedCircleState): any {
        if (!this.graphInstance) {
            return null;
        }
        const visibleIds = state.childIds.filter((childId) => {
            const element = this.graphInstance.$id(childId);
            return element && !element.empty() && !element.hidden();
        });
        if (visibleIds.length === 0) {
            return null;
        }
        const visibleIdSet = new Set(visibleIds);
        return this.graphInstance.nodes(':visible').filter((element: any) => visibleIdSet.has(element.id()));
    }

    // Converts a model-space point into rendered pixel coordinates in the graph container.
    private getRenderedPoint(position: { x: number; y: number }): { x: number; y: number } {
        if (!this.graphInstance) {
            return { x: 0, y: 0 };
        }
        const zoom = this.graphInstance.zoom();
        const pan = this.graphInstance.pan();
        return {
            x: position.x * zoom + pan.x,
            y: position.y * zoom + pan.y,
        };
    }

    // Finds the parent node id for the provided symbol based on contains edges or folder paths.
    private getParentNodeId(symbol: SymbolNode): string | null {
        if (!symbol?.id) {
            return null;
        }
        if (symbol.kind === 'method') {
            const edge = this.graphEdges.find((item) => (
                item.kind === 'contains'
                && item.target === symbol.id
                && this.nodeById.get(item.source)?.kind === 'class'
            ));
            return edge?.source ?? null;
        }
        if (symbol.kind === 'class' || symbol.kind === 'function') {
            const edge = this.graphEdges.find((item) => (
                item.kind === 'contains'
                && item.target === symbol.id
                && this.nodeById.get(item.source)?.kind === 'file'
            ));
            return edge?.source ?? null;
        }
        if (symbol.kind === 'file' || symbol.kind === 'folder') {
            const path = symbol.location?.path;
            if (!path) {
                return null;
            }
            const normalized = this.normalizePath(path);
            const parts = normalized.split('/').filter(Boolean);
            if (parts.length <= 1) {
                return null;
            }
            const parentPath = parts.slice(0, -1).join('/');
            return this.getFolderClusterId(parentPath);
        }
        return null;
    }

    // Collects visible child node elements based on the symbol's kind.
    private getVisibleChildren(symbol: SymbolNode): any | null {
        if (!this.graphInstance || !symbol?.id) {
            return null;
        }
        const visibleNodes = this.graphInstance.nodes(':visible');
        if (symbol.kind === 'file') {
            const childIds = this.graphEdges
                .filter((edge) => edge.kind === 'contains' && edge.source === symbol.id)
                .map((edge) => edge.target)
                .filter((target) => {
                    const kind = this.nodeById.get(target)?.kind;
                    return kind === 'class' || kind === 'function';
                });
            if (childIds.length === 0) {
                return null;
            }
            const childIdSet = new Set(childIds);
            return visibleNodes.filter((node: any) => childIdSet.has(node.id()));
        }
        if (symbol.kind === 'class') {
            const childIds = this.graphEdges
                .filter((edge) => edge.kind === 'contains' && edge.source === symbol.id)
                .map((edge) => edge.target)
                .filter((target) => this.nodeById.get(target)?.kind === 'method');
            if (childIds.length === 0) {
                return null;
            }
            const childIdSet = new Set(childIds);
            return visibleNodes.filter((node: any) => childIdSet.has(node.id()));
        }
        if (symbol.kind === 'folder') {
            const path = symbol.location?.path;
            if (!path) {
                return null;
            }
            const normalized = this.normalizePath(path);
            const prefix = normalized ? `${normalized}/` : '';
            if (!prefix) {
                return null;
            }
            return visibleNodes.filter((node: any) => {
                const nodePath = node.data('path');
                if (!nodePath) {
                    return false;
                }
                const normalizedNodePath = this.normalizePath(String(nodePath));
                return normalizedNodePath.startsWith(prefix);
            });
        }
        return null;
    }

    private handleClusterNodeToggle(symbol: SymbolNode, event?: MouseEvent): boolean {
        if (symbol.kind === 'folder') {
            this.toggleClusterExpansion(symbol.id);
            return true;
        }
        if (symbol.kind === 'class') {
            if (this.isModifierClick(event)) {
                return false;
            }
            if (!this.classHasClusterChildren(symbol)) {
                return false;
            }
            this.toggleClassExpansion(symbol.id);
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
                this.readerController.showFileTree(folderPath);
                this.fileTreeController.render(folderPath);
                this.renderFileTreeNarrator();
            }
        }
        return true;
    }

    private toggleClusterExpansion(nodeId: string): void {
        if (this.clusterExpanded.has(nodeId) || this.clusterAutoExpanded.has(nodeId)) {
            this.clusterExpanded.delete(nodeId);
            this.clusterAutoExpanded.delete(nodeId);
        } else {
            this.clusterExpanded.add(nodeId);
        }
        this.refreshGraphView();
    }

    // Toggles class expansion so double-click reveals method nodes for that class.
    private toggleClassExpansion(nodeId: string): void {
        if (this.classExpanded.has(nodeId)) {
            this.classExpanded.delete(nodeId);
        } else {
            this.classExpanded.add(nodeId);
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

    // Checks whether a cluster folder represents at least one file descendant so Open/Close actions only appear when meaningful.
    private folderHasClusterChildren(folderNode: SymbolNode): boolean {
        const path = folderNode.location?.path;
        if (!path) {
            return false;
        }
        const normalized = this.normalizePath(path);
        if (!normalized) {
            return false;
        }
        const prefix = `${normalized}/`;
        return this.graphNodes.some((node) => {
            if (!node.location?.path) {
                return false;
            }
            return this.normalizePath(node.location.path).startsWith(prefix);
        });
    }

    // Checks whether a class node has method children so it can be expanded.
    private classHasClusterChildren(classNode: SymbolNode): boolean {
        if (!classNode.id) {
            return false;
        }
        return this.graphEdges.some((edge) => {
            if (edge.kind !== 'contains' || edge.source !== classNode.id) {
                return false;
            }
            const target = this.nodeById.get(edge.target);
            return target?.kind === 'method';
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
        return formatLocationUtil(location, startLine, endLine);
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
            this.readerController.render(symbol);
            void this.updateNarrator(symbol);
        });
    }

    private clearGraph(): void {
        if (this.graphInstance) {
            this.graphInstance.elements().remove();
        }
        this.graphView.hideTooltip();
    }

    private bindGraphEvents(): void {
        if (!this.graphInstance) {
            return;
        }
        const didBind = bindGraphEvents({
            graph: this.graphInstance,
            isBound: this.graphEventsBound,
            state: {
                getLastTapNodeId: () => this.lastTapNodeId,
                setLastTapNodeId: (nodeId) => {
                    this.lastTapNodeId = nodeId;
                },
                getLastTapAt: () => this.lastTapAt,
                setLastTapAt: (timestamp) => {
                    this.lastTapAt = timestamp;
                },
                doubleTapDelay: this.doubleTapDelay,
            },
            handlers: {
                resolveNode: (nodeId) => this.displayNodeById.get(nodeId) ?? this.nodeById.get(nodeId) ?? null,
                getGraphLayoutMode: () => this.graphLayoutMode,
                isTourActive: () => this.tourActive,
                isGuidedNodeAllowed: (nodeId) => this.isGuidedNodeAllowed(nodeId),
                flashGuidedMessage: (message) => this.flashGuidedMessage(message),
                advanceTour: (action, nodeId) => this.advanceTour(action, nodeId),
                handleClusterNodeToggle: (node, event) => this.handleClusterNodeToggle(node, event),
                handleClusterFolderSingleClick: (node) => this.handleClusterFolderSingleClick(node),
                handleFileFocusClick: (node, event) => this.handleFileFocusClick(node, event),
                loadSymbolSnippet: (node) => this.loadSymbolSnippet(node),
                renderCode: (node) => this.readerController.render(node),
                updateNarrator: (node) => this.updateNarrator(node),
                isModifierClick: (event) => this.isModifierClick(event),
                isShiftClick: (event) => this.isShiftClick(event),
                isSiblingSelectClick: (event) => this.isSiblingSelectClick(event),
                handleShiftFolderSelection: (node) => this.handleShiftFolderSelection(node),
                handleFileClassSelection: (node) => this.handleFileClassSelection(node),
                handleShiftClassSelection: (node) => this.handleShiftClassSelection(node),
                handleSiblingSelection: (node) => this.handleSiblingSelection(node),
                openGraphContextMenu: (node, event) => this.openGraphContextMenu(node, event),
                hideGraphContextMenu: () => this.hideGraphContextMenu(),
                refreshEdgeHighlights: () => this.graphView.refreshEdgeHighlights(),
                updateLabelVisibility: () => this.updateLabelVisibility(),
                setHoveredNode: (nodeId) => this.graphView.setHoveredNode(nodeId),
                showGraphTooltip: (node, event) => this.graphView.showTooltip(node, event),
                hideGraphTooltip: () => this.graphView.hideTooltip(),
                updateTooltipPosition: (event) => this.graphView.updateTooltipPosition(event),
                updateOrganizedCircleOverlay: () => this.updateOrganizedCircleOverlay(),
            },
        });
        if (didBind) {
            this.graphEventsBound = true;
        }
    }

    private formatNodeLabel(node: SymbolNode): { label: string; fullLabel: string; path: string; kindLabel: string } {
        return formatGraphNodeLabel(node, this.labelLineLength);
    }

    private getDisplayName(node: SymbolNode, fullLabel: string, path: string): string {
        return getDisplayNameUtil(node, fullLabel, path);
    }

    private getBasename(value: string): string {
        return getBasenameUtil(value);
    }

    private wrapLabel(prefix: string, name: string): string {
        return wrapLabelUtil(prefix, name, this.labelLineLength);
    }

    private getKindBadge(kind: SymbolKind | string): string {
        return getKindBadgeUtil(kind);
    }

    private getKindLabel(kind: SymbolKind | string): string {
        return getKindLabelUtil(kind);
    }

    private updateLabelVisibility(): void {
        if (!this.graphInstance) {
            return;
        }
        if (this.labelVisibilityRaf !== null) {
            return;
        }
        this.labelVisibilityRaf = window.requestAnimationFrame(() => {
            this.labelVisibilityRaf = null;
            this.updateLabelVisibilityNow();
        });
    }

    private updateLabelVisibilityNow(): void {
        if (!this.graphInstance) {
            return;
        }
        const zoom = this.graphInstance.zoom();
        const showAll = zoom >= this.labelZoomThreshold;
        const guidedAllowed = this.tourActive && this.guidedAllowedNodeIds ? this.guidedAllowedNodeIds : null;
        if (showAll) {
            if (this.lastLabelZoomBucket === true) {
                return;
            }
            this.graphInstance.nodes().forEach((node: any) => {
                node.data('labelVisible', 'true');
            });
            this.lastLabelZoomBucket = true;
            this.lastForcedLabelIds.clear();
            return;
        }

        const forcedIds = new Set<string>();
        this.graphInstance.$('node:selected').forEach((node: any) => {
            forcedIds.add(node.id());
        });
        this.graphInstance.$('node.is-hovered').forEach((node: any) => {
            forcedIds.add(node.id());
        });
        if (guidedAllowed) {
            guidedAllowed.forEach((id) => forcedIds.add(id));
        }

        if (this.lastLabelZoomBucket !== false) {
            this.graphInstance.nodes().forEach((node: any) => {
                node.data('labelVisible', 'false');
            });
        }

        this.lastForcedLabelIds.forEach((id) => {
            if (!forcedIds.has(id)) {
                const node = this.graphInstance?.$id(id);
                if (node && !node.empty()) {
                    node.data('labelVisible', 'false');
                }
            }
        });

        forcedIds.forEach((id) => {
            if (!this.lastForcedLabelIds.has(id)) {
                const node = this.graphInstance?.$id(id);
                if (node && !node.empty()) {
                    node.data('labelVisible', 'true');
                }
            }
        });

        this.lastLabelZoomBucket = false;
        this.lastForcedLabelIds = forcedIds;
    }

    private resetLabelVisibilityCache(): void {
        this.lastLabelZoomBucket = null;
        this.lastForcedLabelIds.clear();
        if (this.labelVisibilityRaf !== null) {
            window.cancelAnimationFrame(this.labelVisibilityRaf);
            this.labelVisibilityRaf = null;
        }
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
            const response = await this.api.fetchJson<NarrationResponse>('/gitreader/api/narrate', undefined, {
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
        this.narratorOutput.innerHTML = buildNarratorLoadingHtml(symbol.name);
    }

    private renderNarratorError(symbol: SymbolNode, message: string): void {
        this.narratorOutput.innerHTML = buildNarratorErrorHtml(symbol.name, message);
    }

    private renderNarration(symbol: SymbolNode, narration: NarrationResponse): void {
        this.narratorOutput.innerHTML = buildNarrationHtml(symbol.name, narration, this.currentMode);
    }

    private renderStoryArc(arc: StoryArc): void {
        const entryNode = this.nodeById.get(arc.entry_id);
        this.narratorOutput.innerHTML = buildStoryArcHtml({
            arc,
            mode: this.currentMode,
            entryNode: entryNode ?? undefined,
            resolveArcLabel: (arcId) => {
                const target = this.storyArcsById.get(arcId);
                return target ? this.formatArcTitle(target) : null;
            },
            kindLabelFor: (kind) => this.getKindLabel(kind),
        });
    }

    private renderStoryArcEmpty(): void {
        this.narratorOutput.innerHTML = buildStoryArcEmptyHtml();
    }

    private renderStoryArcMissing(): void {
        this.narratorOutput.innerHTML = buildStoryArcMissingHtml();
    }

    private renderFileTreeNarrator(): void {
        this.narratorOutput.innerHTML = buildFileTreeNarratorHtml(this.fileNodesByPath.size);
    }

    private getArcThreadLabel(arc: StoryArc): string {
        return getArcThreadLabelUtil(arc);
    }

    private formatArcTitle(arc: StoryArc): string {
        return formatArcTitleUtil(arc);
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
        return escapeHtml(value);
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
            const response = await this.api.fetchJson<TourResponse>('/gitreader/api/tour/start', undefined, {
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
            const response = await this.api.fetchJson<TourResponse>('/gitreader/api/tour/step', undefined, {
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
            this.resetLabelVisibilityCache();
            this.graphView.render({
                nodes: graphView.nodes,
                edges: graphView.edges,
                layoutMode: this.graphLayoutMode,
            });
            this.graphView.updateNodeStatus(graphView);
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
            this.readerController.render(targetNode);
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
                    this.readerController.render(node);
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
                this.readerController.render(fileNode);
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
            this.graphView.applyFilters({ forceVisibility: true });
            this.fileTreeController.render(null);
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
        this.graphView.applyFilters({ forceVisibility: true });
        this.applyGuidedCodeFocus();
        this.fileTreeController.render(this.tourStep.focus?.file_path ?? null);
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
        return hasHighlightSupport();
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
        const input = this.readerMeta.querySelector<HTMLInputElement>('[data-line-input]')
            ?? this.codeSurface.querySelector<HTMLInputElement>('[data-line-input]');
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
        const status = this.readerMeta.querySelector<HTMLElement>('[data-code-status]')
            ?? this.codeSurface.querySelector<HTMLElement>('[data-code-status]');
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
        if (mode !== 'cluster') {
            this.graphView.setClusterManualLayout(false);
        }
        if (mode !== 'cluster') {
            this.clearOrganizedCircleOverlay();
        }
        if (wasCluster || mode === 'cluster') {
            this.refreshGraphView();
            return;
        }
        this.graphView.setLayout(mode);
    }

    private updateGraphControls(): void {
        const { edgeFilters, showExternalNodes } = this.graphView.getFilterState();
        this.graphLayoutButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.layoutAction === this.graphLayoutMode);
        });
        this.edgeFilterButtons.forEach((button) => {
            const filter = button.dataset.edgeFilter as EdgeKind | undefined;
            if (!filter) {
                return;
            }
            button.classList.toggle('is-active', edgeFilters.has(filter));
        });
        this.nodeFilterButtons.forEach((button) => {
            if (button.dataset.nodeFilter === 'external') {
                button.classList.toggle('is-active', showExternalNodes);
            }
        });
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const app = new GitReaderApp();
    app.init();
    (window as any).graphApp = app;
});
