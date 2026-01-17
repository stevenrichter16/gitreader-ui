// Narrator pill modes used by GitReaderApp/narratorView to select which narration section renders.
export type NarrationMode = 'hook' | 'summary' | 'key_lines' | 'connections' | 'next';

// TOC view modes that drive the left panel and determine which data source loads.
export type TocMode = 'story' | 'tree' | 'routes';

// Guided tour tone/strategy selected by the user and sent to the backend.
export type TourMode = 'story' | 'teacher' | 'expert';

// Canonical symbol kinds used for graph rendering, filters, and reader behavior.
export type SymbolKind = 'file' | 'folder' | 'class' | 'function' | 'method' | 'external' | 'blueprint';

// Relationship types used by the graph to color edges and power filters.
export type EdgeKind = 'imports' | 'calls' | 'inherits' | 'contains' | 'blueprint';

// Confidence flags from analysis used to style edges and hint uncertainty.
export type EdgeConfidence = 'high' | 'medium' | 'low';

// Source span shared across snippets and symbol metadata for reader navigation.
export interface SourceLocation {
    path: string;
    start_line: number;
    end_line: number;
    start_col: number;
    end_col: number;
}

// Primary graph node payload used by canvas rendering and reader selection.
export interface SymbolNode {
    id: string;
    name: string;
    kind: SymbolKind;
    summary: string;
    signature?: string;
    docstring?: string;
    location?: SourceLocation;
    module?: string;
}

// Derived foldable region metadata used by the reader fold UI.
export interface FoldRange {
    id: string;
    name: string;
    kind: SymbolKind;
    start: number;
    end: number;
}

// Graph edge payload used to render relationships in the canvas.
export interface GraphEdge {
    source: string;
    target: string;
    kind: EdgeKind;
    confidence: EdgeConfidence;
}

// TOC entry used to render the left panel list of chapters/scopes.
export interface ChapterSummary {
    id: string;
    title: string;
    summary: string;
    scope?: string;
}

// Route metadata embedded in story arcs to label and contextualize flows.
export interface StoryRouteInfo {
    path: string;
    methods: string[];
    handler_id: string;
    handler_name: string;
    module: string;
    file_path: string;
    line: number;
}

// Single step in a story arc used to narrate flow order and entry points.
export interface StoryScene {
    id: string;
    name: string;
    kind: SymbolKind;
    file_path: string;
    line: number;
    role: string;
    confidence?: EdgeConfidence;
}

// Full story arc payload used by routes mode and narrator rendering.
export interface StoryArc {
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

// Backend warnings surfaced to the UI for partial parses or skipped files.
export interface ApiWarning {
    code: string;
    message: string;
    path: string;
    line?: number;
}

// TOC API response consumed by loadToc to populate chapters.
export interface ApiTocResponse {
    chapters: ChapterSummary[];
    mode?: TocMode;
    stats?: Record<string, number>;
    warnings?: ApiWarning[];
}

// Graph API response consumed by loadGraphForScope and cached for reuse.
export interface ApiGraphResponse {
    nodes: SymbolNode[];
    edges: GraphEdge[];
    scope?: string;
    stats?: Record<string, number>;
    warnings?: ApiWarning[];
}

// Story arcs API response used for routes mode and arc lookup.
export interface ApiStoryResponse {
    arcs: StoryArc[];
    stats?: Record<string, number>;
    warnings?: ApiWarning[];
}

// Snippet highlight ranges used by the reader to mark important lines.
export interface HighlightRange {
    label: string;
    start_line: number;
    end_line: number;
}

// Snippet payload used by the reader to render code and highlights.
export interface SymbolSnippetResponse {
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

// Narrator key-line entry used in the "Key lines" pill.
export interface NarrationKeyLine {
    line: number;
    text: string;
}

// Narrator API response used by narratorView to render prose and lists.
export interface NarrationResponse {
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

// Persisted tour state passed back to the backend on each step.
export interface TourState {
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

// Related node metadata used for optional tour detours in the narrator.
export interface TourRelatedNode {
    node_id: string;
    label: string;
}

// Related arc metadata used to jump between narrative threads.
export interface TourRelatedArc {
    arc_id: string;
    title: string;
}

// Inline context links used by the tour narrator to jump to files or nodes.
export interface TourContextLink {
    label: string;
    file_path?: string;
    line?: number;
    node_id?: string;
}

// Focus target for a tour step, used to sync reader/canvas highlights.
export interface TourFocus {
    file_path?: string;
    start_line?: number;
    end_line?: number;
    node_id?: string;
}

// Single tour step payload used to render the narrator and guide the UI focus.
export interface TourStep {
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

// Tour API response used by start/advance tour actions.
export interface TourResponse {
    state: TourState;
    step: TourStep;
    warnings?: ApiWarning[];
}

// Reader mode toggle that decides whether to show full file or symbol body.
export type SnippetMode = 'body' | 'full';

// Canvas layout modes used by graph controls and persisted preferences.
export type GraphLayoutMode = 'cluster' | 'layer' | 'free';

// Derived graph view returned by filtering/capping logic before rendering.
export interface GraphView {
    nodes: SymbolNode[];
    edges: GraphEdge[];
    totalNodes: number;
    visibleNodes: number;
    isCapped: boolean;
}
