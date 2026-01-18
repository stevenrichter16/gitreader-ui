import { buildGraphTooltipHtml } from './graphLabels';
import type { EdgeKind, GraphEdge, GraphLayoutMode, GraphView, SymbolNode } from '../types';

declare const cytoscape: any;

// Describes the DOM + callback surface the graph view needs to own Cytoscape rendering.
export interface GraphViewDependencies {
    // Canvas container where the Cytoscape instance will be mounted.
    container: HTMLElement;
    // Tooltip element used to show node metadata on hover.
    tooltipElement: HTMLElement;
    // Surface element used to calculate tooltip positioning bounds.
    tooltipContainer: HTMLElement;
    // Node-status element that reports current visibility/cap status.
    nodeStatusElement: HTMLElement;
    // Reveal button that unlocks more nodes when the graph is capped.
    revealButton: HTMLButtonElement;
    // Updates the canvas overlay copy for empty/error states.
    setCanvasOverlay: (message: string, visible: boolean) => void;
    // Clears any existing graph elements when no data is available.
    clearGraph: () => void;
    // Reads the currently selected node id so selection persists after re-render.
    getSelectedNodeId: () => string | null;
    // Indicates whether guided tour mode is active, used to suppress focus filtering.
    isTourActive: () => boolean;
    // Applies guided-mode visibility rules after base filters are set.
    applyGuidedFilter: () => void;
    // Recomputes label visibility after layout/zoom changes.
    updateLabelVisibility: () => void;
    // Updates the display-node map used by event resolution callbacks.
    setDisplayNodes: (nodes: SymbolNode[]) => void;
    // Formats node labels for display and tooltip metadata.
    formatLabel: (node: SymbolNode) => { label: string; fullLabel: string; path: string; kindLabel: string };
    // Receives the Cytoscape instance so app.ts can bind events + keep state.
    onGraphReady: (graph: any) => void;
}

// Captures graph filter inputs so the controller can apply consistent visibility rules.
export interface GraphViewFilters {
    // Edge kinds that should remain visible.
    edgeFilters: Set<EdgeKind>;
    // Whether external nodes should be shown.
    showExternalNodes: boolean;
}

// Represents the current graph selection/focus state for syncing with other views.
export interface GraphViewSelectionState {
    // Current focused node id used for "focus" filtering.
    focusedNodeId: string | null;
    // Current selected node id used for selection-driven UI.
    selectedNodeId: string | null;
}

// Input payload used to render or refresh a graph view.
export interface GraphRenderInput {
    // Nodes to render in the graph.
    nodes: SymbolNode[];
    // Edges to render in the graph.
    edges: GraphEdge[];
    // Current layout mode so the graph can choose render strategy.
    layoutMode: GraphLayoutMode;
}

// Controller that will own Cytoscape lifecycle once Phase 4 moves logic out of app.ts.
export class GraphViewController {
    private graph: any | null = null;
    private layoutMode: GraphLayoutMode = 'cluster';
    private edgeFilters: Set<EdgeKind> = new Set(['calls', 'imports', 'inherits', 'contains', 'blueprint']);
    private showExternalNodes = true;
    private focusedNodeId: string | null = null;
    private hoveredNodeId: string | null = null;
    private nodeCapByScope: Map<string, number> = new Map();
    private nodeCap = 300;
    private nodeCapStep = 200;
    private clusterManualLayout = false;

    // Holds dependency references so GraphViewController can orchestrate graph rendering later.
    constructor(private deps: GraphViewDependencies) {}

    // Renders the provided nodes/edges and rebuilds Cytoscape when needed.
    render(input: GraphRenderInput): void {
        this.layoutMode = input.layoutMode;
        if (input.nodes.length === 0) {
            this.deps.clearGraph();
            this.deps.setCanvasOverlay('No nodes yet. Graph data has not loaded.', true);
            return;
        }
        if (!this.graph && typeof cytoscape !== 'function') {
            this.deps.setCanvasOverlay('Graph library not loaded.', true);
            return;
        }
        this.deps.setDisplayNodes(input.nodes);
        this.deps.setCanvasOverlay('', false);
        this.ensureGraph();
        if (!this.graph) {
            return;
        }
        const selectedNodeId = this.deps.getSelectedNodeId();
        const positionCache = this.shouldUseManualClusterLayout()
            ? this.captureNodePositions()
            : null;
        const elements = this.buildGraphElements(input.nodes, input.edges, positionCache);
        this.graph.elements().remove();
        this.graph.add(elements);
        if (selectedNodeId) {
            const selected = this.graph.$id(selectedNodeId);
            if (selected) {
                selected.select();
            }
        }
        if (!this.shouldUseManualClusterLayout()) {
            this.runLayout();
        } else {
            this.deps.updateLabelVisibility();
        }
        this.applyFilters();
    }

    // Updates the layout mode and reruns layout when graph data is already present.
    setLayout(mode: GraphLayoutMode): void {
        this.layoutMode = mode;
        if (mode !== 'cluster') {
            this.clusterManualLayout = false;
        }
        this.runLayout();
    }

    // Enables or disables manual cluster layout so child organization remains stable across refreshes.
    setClusterManualLayout(enabled: boolean): void {
        this.clusterManualLayout = enabled;
    }

    // Updates edge/node filters wholesale when app state restores or resets.
    setFilters(filters: GraphViewFilters): void {
        this.edgeFilters = new Set(filters.edgeFilters);
        this.showExternalNodes = filters.showExternalNodes;
        this.applyFilters();
    }

    // Syncs focused node state from the orchestrator, then reapplies filters.
    setSelection(state: GraphViewSelectionState): void {
        this.focusedNodeId = state.focusedNodeId;
        this.applyFilters();
    }

    // Returns the current edge/node filter state so UI controls can reflect it.
    getFilterState(): GraphViewFilters {
        return {
            edgeFilters: this.edgeFilters,
            showExternalNodes: this.showExternalNodes,
        };
    }

    // Exposes the focused node id so app-level capping can keep it visible.
    getFocusedNodeId(): string | null {
        return this.focusedNodeId;
    }

    // Updates the focused node id without applying filters immediately.
    setFocusedNodeId(nodeId: string | null): void {
        this.focusedNodeId = nodeId;
    }

    // Returns a stable cap for a scope so repeated renders keep consistent node limits.
    getNodeCapForScope(scope: string, totalNodes: number): number {
        let cap = this.nodeCapByScope.get(scope);
        if (cap === undefined) {
            cap = Math.min(this.nodeCap, totalNodes);
            this.nodeCapByScope.set(scope, cap);
        } else if (cap > totalNodes) {
            cap = totalNodes;
            this.nodeCapByScope.set(scope, cap);
        }
        return cap;
    }

    // Increases the cap for a scope and returns whether a refresh is needed.
    revealMoreNodes(scope: string, totalNodes: number): boolean {
        const cap = this.getNodeCapForScope(scope, totalNodes);
        if (cap >= totalNodes) {
            return false;
        }
        const nextCap = Math.min(totalNodes, cap + this.nodeCapStep);
        this.nodeCapByScope.set(scope, nextCap);
        return true;
    }

    // Updates the node status label and reveal button to match current cap state.
    updateNodeStatus(graphView: GraphView): void {
        if (graphView.totalNodes === 0) {
            this.deps.nodeStatusElement.textContent = '';
            this.deps.revealButton.disabled = true;
            return;
        }
        if (this.deps.isTourActive()) {
            this.deps.nodeStatusElement.textContent = `Guided view: ${graphView.visibleNodes}/${graphView.totalNodes}`;
            this.deps.revealButton.disabled = true;
            this.deps.revealButton.textContent = 'Guided';
            return;
        }
        if (this.layoutMode === 'cluster') {
            this.deps.nodeStatusElement.textContent = `Cluster view: ${graphView.visibleNodes} groups from ${graphView.totalNodes}`;
            this.deps.revealButton.disabled = true;
            this.deps.revealButton.textContent = 'Show more';
            return;
        }
        if (!graphView.isCapped) {
            this.deps.nodeStatusElement.textContent = `Showing ${graphView.visibleNodes} nodes`;
            this.deps.revealButton.disabled = true;
            this.deps.revealButton.textContent = 'Show more';
            return;
        }
        this.deps.nodeStatusElement.textContent = `Showing ${graphView.visibleNodes} of ${graphView.totalNodes}`;
        const nextCap = Math.min(graphView.totalNodes, graphView.visibleNodes + this.nodeCapStep);
        this.deps.revealButton.textContent = nextCap >= graphView.totalNodes ? 'Show all' : 'Show more';
        this.deps.revealButton.disabled = false;
    }

    // Toggles an edge filter and reapplies visibility rules on the canvas.
    toggleEdgeFilter(filter: EdgeKind): void {
        if (this.edgeFilters.has(filter)) {
            this.edgeFilters.delete(filter);
        } else {
            this.edgeFilters.add(filter);
        }
        this.applyFilters();
    }

    // Toggles external-node visibility and returns the new state.
    toggleExternalNodes(): boolean {
        this.showExternalNodes = !this.showExternalNodes;
        return this.showExternalNodes;
    }

    // Applies edge/node filters, guided filters, and focus trimming in one pass.
    applyFilters(): void {
        if (!this.graph) {
            return;
        }
        const cy = this.graph;
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
        this.deps.applyGuidedFilter();
        this.applyFocus();
        this.refreshEdgeHighlights();
        this.deps.updateLabelVisibility();
    }

    // Updates the hovered node state so edge highlights track cursor focus.
    setHoveredNode(nodeId: string | null): void {
        this.hoveredNodeId = nodeId;
        this.refreshEdgeHighlights();
    }

    // Refreshes edge emphasis based on selected and hovered nodes.
    refreshEdgeHighlights(): void {
        if (!this.graph) {
            return;
        }
        const cy = this.graph;
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

    // Shows the hover tooltip with label metadata for the active node.
    showTooltip(node: any, event: any): void {
        const fullLabel = node.data('fullLabel') || node.data('label');
        const kindLabel = node.data('kindLabel') || node.data('kind') || 'Symbol';
        const path = node.data('path');
        this.deps.tooltipElement.innerHTML = buildGraphTooltipHtml({
            fullLabel: String(fullLabel),
            kindLabel: String(kindLabel),
            path: path ? String(path) : undefined,
        });
        this.deps.tooltipElement.setAttribute('aria-hidden', 'false');
        this.deps.tooltipElement.classList.add('is-visible');
        this.updateTooltipPosition(event);
    }

    // Hides the hover tooltip when the pointer leaves the node.
    hideTooltip(): void {
        this.deps.tooltipElement.classList.remove('is-visible');
        this.deps.tooltipElement.setAttribute('aria-hidden', 'true');
    }

    // Repositions the tooltip to follow the cursor within the canvas bounds.
    updateTooltipPosition(event: any): void {
        const rendered = event.renderedPosition || event.position;
        if (!rendered) {
            return;
        }
        const offset = 12;
        const surfaceRect = this.deps.tooltipContainer.getBoundingClientRect();
        const x = Math.min(surfaceRect.width - 20, Math.max(0, rendered.x + offset));
        const y = Math.min(surfaceRect.height - 20, Math.max(0, rendered.y + offset));
        this.deps.tooltipElement.style.transform = `translate(${x}px, ${y}px)`;
    }

    // Focuses the graph around the currently selected node, if any.
    focusOnSelected(): void {
        if (!this.graph) {
            return;
        }
        const selected = this.graph.$('node:selected');
        if (!selected || selected.length === 0) {
            this.flashCanvasMessage('Select a node to focus.');
            return;
        }
        this.focusedNodeId = selected[0].id();
        this.applyFilters();
    }

    // Clears the focused node and restores the default visibility rules.
    resetFocus(): void {
        this.focusedNodeId = null;
        this.applyFilters();
    }

    // Creates the Cytoscape instance once and informs the app for event binding.
    private ensureGraph(): void {
        if (this.graph) {
            return;
        }
        if (typeof cytoscape !== 'function') {
            return;
        }
        this.graph = cytoscape({
            container: this.deps.container,
            elements: [],
            style: this.getGraphStyles(),
            layout: { name: 'cose', animate: false, fit: true, padding: 24 },
            minZoom: 0.2,
            maxZoom: 2.5,
            wheelSensitivity: 0.2,
            selectionType: 'additive',
        });
        if (typeof this.graph.selectionType === 'function') {
            this.graph.selectionType('additive');
        }
        this.deps.onGraphReady(this.graph);
    }

    // Applies focus trimming to the current graph to isolate a focused node.
    private applyFocus(): void {
        if (!this.graph || !this.focusedNodeId || this.deps.isTourActive()) {
            return;
        }
        const node = this.graph.getElementById(this.focusedNodeId);
        if (!node || node.empty() || node.hidden()) {
            this.focusedNodeId = null;
            return;
        }
        const visible = this.graph.elements(':visible');
        const focusElements = node.closedNeighborhood().intersection(visible);
        visible.not(focusElements).hide();
        this.graph.fit(focusElements, 40);
    }

    // Flashes a short overlay message to guide focus interactions.
    private flashCanvasMessage(message: string): void {
        this.deps.setCanvasOverlay(message, true);
        window.setTimeout(() => this.deps.setCanvasOverlay('', false), 1200);
    }

    // Re-runs the current layout mode on the active graph instance.
    runLayout(): void {
        if (!this.graph) {
            return;
        }
        if (this.shouldUseManualClusterLayout()) {
            this.deps.updateLabelVisibility();
            return;
        }
        const layout = this.graph.layout(this.getLayoutOptions());
        layout.run();
        this.deps.updateLabelVisibility();
    }

    // Zooms the canvas around its center so focus stays predictable.
    zoom(factor: number): void {
        if (!this.graph) {
            return;
        }
        const current = this.graph.zoom();
        const next = Math.min(2.5, Math.max(0.2, current * factor));
        const rect = this.deps.container.getBoundingClientRect();
        this.graph.zoom({
            level: next,
            renderedPosition: {
                x: rect.width / 2,
                y: rect.height / 2,
            },
        });
        this.deps.updateLabelVisibility();
    }

    // Fits all visible graph elements within the viewport.
    fit(): void {
        if (!this.graph) {
            return;
        }
        this.graph.fit(undefined, 40);
        this.deps.updateLabelVisibility();
    }

    // Chooses layout options based on the current layout mode.
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
        if (this.layoutMode === 'layer') {
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
        if (this.layoutMode === 'free') {
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

    // Builds Cytoscape element data for nodes and edges using shared label formatting.
    private buildGraphElements(
        nodes: SymbolNode[],
        edges: GraphEdge[],
        positionCache: Map<string, { x: number; y: number }> | null,
    ): Array<{ data: Record<string, unknown>; position?: { x: number; y: number } }> {
        const useManualLayout = this.shouldUseManualClusterLayout() && positionCache;
        const parentByChild = new Map<string, string>();
        const childrenByParent = new Map<string, string[]>();
        if (useManualLayout) {
            edges.forEach((edge) => {
                if (edge.kind !== 'contains') {
                    return;
                }
                parentByChild.set(edge.target, edge.source);
                const siblings = childrenByParent.get(edge.source) ?? [];
                siblings.push(edge.target);
                childrenByParent.set(edge.source, siblings);
            });
        }
        const nodeElements = nodes.map((node) => {
            const labelData = this.deps.formatLabel(node);
            const element: { data: Record<string, unknown>; position?: { x: number; y: number } } = {
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
            if (useManualLayout) {
                const cached = positionCache.get(node.id);
                const fallback = cached ? null : this.getManualFallbackPosition(node.id, parentByChild, childrenByParent, positionCache);
                const position = cached ?? fallback;
                if (position) {
                    element.position = position;
                }
            }
            return element;
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

    // Captures the current node positions so manual cluster layout can preserve them across refreshes.
    private captureNodePositions(): Map<string, { x: number; y: number }> {
        const positions = new Map<string, { x: number; y: number }>();
        if (!this.graph) {
            return positions;
        }
        this.graph.nodes().forEach((node: any) => {
            const position = node.position();
            positions.set(node.id(), { x: position.x, y: position.y });
        });
        return positions;
    }

    // Computes a fallback position near the parent when a new node appears in manual layout.
    private getManualFallbackPosition(
        nodeId: string,
        parentByChild: Map<string, string>,
        childrenByParent: Map<string, string[]>,
        positionCache: Map<string, { x: number; y: number }>,
    ): { x: number; y: number } | null {
        const parentId = parentByChild.get(nodeId);
        if (!parentId) {
            return null;
        }
        const parentPosition = positionCache.get(parentId);
        if (!parentPosition) {
            return null;
        }
        const siblings = childrenByParent.get(parentId) ?? [];
        const index = Math.max(0, siblings.indexOf(nodeId));
        const radius = this.getManualChildSpacing();
        const angle = (2 * Math.PI * index) / Math.max(1, siblings.length);
        return {
            x: parentPosition.x + radius * Math.cos(angle),
            y: parentPosition.y + radius * Math.sin(angle),
        };
    }

    // Returns true when cluster layout should stay manual to preserve user-arranged positions.
    private shouldUseManualClusterLayout(): boolean {
        return this.layoutMode === 'cluster' && this.clusterManualLayout;
    }

    // Provides the default spacing for placing new children near their parent in manual mode.
    private getManualChildSpacing(): number {
        return 120;
    }

    // Supplies the Cytoscape stylesheet that defines node/edge appearance and state styling.
    private getGraphStyles(): Array<{ selector: string; style: Record<string, unknown> }> {
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
}
