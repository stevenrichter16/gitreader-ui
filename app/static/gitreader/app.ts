import { createApiClient, type ApiClient } from './modules/data/api';
import { buildFileTreeFromNodes, countFilesInTree, renderFileTreeMarkup, type FileTreeNode, type FileTreeRow } from './modules/ui/fileTree';
import { expandFileTreeFolder, expandFileTreeForFocus, expandFileTreePath, toggleFileTreePath } from './modules/ui/fileTreeInteractions';
import { bindGraphEvents } from './modules/ui/graphEvents';
import { buildGraphTooltipHtml, formatGraphNodeLabel } from './modules/ui/graphLabels';
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
    private readerFileTreeButton: HTMLButtonElement;
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
    private fileTreeRoot: FileTreeNode | null = null;
    private fileTreeFocusPath: string | null = null;
    private readerTreeFocusPath: string | null = null;
    private fileTreeCollapsed: Set<string> = new Set();
    private fileTreeRows: FileTreeRow[] = [];
    private readerFileTreeRows: FileTreeRow[] = [];
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
    private importBreadcrumbs: string[] = [];
    private foldedSymbolIds: Set<string> = new Set();
    private currentFoldRanges: Map<string, FoldRange> = new Map();
    private currentFoldPath: string | null = null;
    private pendingSymbol: SymbolNode | null = null;
    private pendingSnippet: SymbolSnippetResponse | null = null;

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
        this.readerFileTreeButton = this.getElement('reader-file-tree') as HTMLButtonElement;
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
            snippetModeButtons: this.snippetModeButtons,
            readerFileTreeButton: this.readerFileTreeButton,
            getHighlightLanguage: (path) => this.getHighlightLanguage(path),
            isModifierClick: (event) => this.isModifierClick(event),
            setCodeStatus: (message) => this.setCodeStatus(message),
            renderFileTree: (focusPath) => this.renderFileTree(focusPath),
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
            toggleFileTreePath: (path) => this.toggleFileTreePath(path),
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
                getFileTreeRoot: () => this.fileTreeRoot,
                setFileTreeRoot: (root) => {
                    this.fileTreeRoot = root;
                },
                getFileTreeCollapsed: () => this.fileTreeCollapsed,
                setReaderFileTreeRows: (rows) => {
                    this.readerFileTreeRows = rows;
                },
            },
        });
        this.readerView = new ReaderView({
            codeSurface: this.codeSurface,
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
            this.renderFileTree(path);
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
            this.readerController.handleCodeSurfaceClick(event as MouseEvent);
        });

        this.codeSurface.addEventListener('keydown', (event) => {
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

    private refreshFileTree(): void {
        if (!this.narratorFileTree) {
            return;
        }
        this.fileTreeRoot = buildFileTreeFromNodes(this.graphNodes);
        this.renderFileTree(this.fileTreeFocusPath);
    }

    private renderFileTree(focusPath?: string | null): void {
        if (!this.narratorFileTree) {
            return;
        }
        const normalizedFocus = focusPath ? this.normalizePath(focusPath) : '';
        this.fileTreeFocusPath = normalizedFocus || null;
        if (normalizedFocus) {
            this.expandFileTreeForFocus(normalizedFocus);
        }
        const { html, rows } = renderFileTreeMarkup(
            this.fileTreeRoot,
            normalizedFocus,
            this.fileTreeCollapsed,
        );
        this.fileTreeRows = rows;
        this.narratorFileTree.innerHTML = html;
    }

    private toggleFileTreePath(path: string): void {
        toggleFileTreePath(this.fileTreeCollapsed, path);
        this.renderFileTree(this.fileTreeFocusPath);
        if (this.readerTreeFocusPath) {
            this.readerController.showFileTree(this.readerTreeFocusPath);
        }
    }

    private expandFileTreePath(path: string): void {
        expandFileTreePath(this.fileTreeCollapsed, path);
    }

    private expandFileTreeForFocus(path: string): void {
        expandFileTreeForFocus(this.fileTreeCollapsed, path, this.fileNodesByPath);
    }

    private expandFileTreeFolder(path: string): void {
        expandFileTreeFolder(this.fileTreeCollapsed, path);
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
                this.readerController.render(fileNode);
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
                this.readerController.showFileTree(folderPath);
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
                refreshEdgeHighlights: () => this.refreshEdgeHighlights(),
                updateLabelVisibility: () => this.updateLabelVisibility(),
                setHoveredNode: (nodeId) => this.setHoveredNode(nodeId),
                showGraphTooltip: (node, event) => this.showGraphTooltip(node, event),
                hideGraphTooltip: () => this.hideGraphTooltip(),
                updateTooltipPosition: (event) => this.updateTooltipPosition(event),
            },
        });
        if (didBind) {
            this.graphEventsBound = true;
        }
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
        const kindLabel = node.data('kindLabel') || node.data('kind') || 'Symbol';
        const path = node.data('path');
        this.graphTooltip.innerHTML = buildGraphTooltipHtml({
            fullLabel: String(fullLabel),
            kindLabel: String(kindLabel),
            path: path ? String(path) : undefined,
        });
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
