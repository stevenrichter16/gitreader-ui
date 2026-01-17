// Shared tap state used to detect double-taps across graph event callbacks.
export interface GraphEventState {
    // Reads the last tapped node id so double-tap detection matches current graph state.
    getLastTapNodeId(): string | null;
    // Updates the last tapped node id when a tap event is processed.
    setLastTapNodeId(nodeId: string | null): void;
    // Reads the timestamp of the last tap for double-tap timing.
    getLastTapAt(): number;
    // Updates the timestamp after handling a tap event.
    setLastTapAt(timestamp: number): void;
    // Max gap (ms) for a tap to count as a double tap.
    doubleTapDelay: number;
}

// Callback surface for graph interactions; GitReaderApp wires these to its methods.
export interface GraphEventHandlers {
    // Resolves a graph node id into the app's symbol node (display or backing node).
    resolveNode(nodeId: string): any | null;
    // Returns current layout mode so the event flow can react to cluster behavior.
    getGraphLayoutMode(): string;
    // Indicates whether guided tour mode is active at the time of the event.
    isTourActive(): boolean;
    // Guards tour navigation so only allowed nodes can be opened during the tour.
    isGuidedNodeAllowed(nodeId: string): boolean;
    // Communicates guided-mode constraints to the user when a node is locked.
    flashGuidedMessage(message: string): void;
    // Jumps the tour to a specific node when the user clicks during a guided flow.
    advanceTour(action: 'jump', nodeId: string): void | Promise<void>;
    // Expands/collapses cluster folders on double click in cluster layout.
    handleClusterNodeToggle(node: any, event?: MouseEvent): boolean;
    // Shows the folder file system when a cluster folder is single-clicked.
    handleClusterFolderSingleClick(node: any): boolean;
    // Handles cmd/ctrl-click file focus within the graph canvas.
    handleFileFocusClick(node: any, event?: MouseEvent): boolean;
    // Loads the snippet for a node so the reader view stays in sync with graph selection.
    loadSymbolSnippet(node: any): Promise<void>;
    // Renders the selected node as code when snippet loading fails.
    renderCode(node: any): void;
    // Updates the narrator panel for the selected node after a click.
    updateNarrator(node: any): void;
    // Refreshes edge emphasis when selection state changes.
    refreshEdgeHighlights(): void;
    // Recalculates label visibility to match zoom, hover, and selection states.
    updateLabelVisibility(): void;
    // Tracks hover state for edge highlighting and tooltip behavior.
    setHoveredNode(nodeId: string | null): void;
    // Shows the hover tooltip when the pointer enters a node.
    showGraphTooltip(node: any, event: any): void;
    // Hides the hover tooltip when the pointer leaves a node.
    hideGraphTooltip(): void;
    // Repositions the tooltip as the pointer moves over the node.
    updateTooltipPosition(event: any): void;
}

// Configuration container for binding all Cytoscape graph events in one place.
export interface GraphEventBindings {
    // Cytoscape instance to receive event handlers.
    graph: any;
    // Current binding state so we don't double-register events.
    isBound: boolean;
    // Tap state for double-click detection.
    state: GraphEventState;
    // App callbacks used by event handlers to drive UI updates.
    handlers: GraphEventHandlers;
}

// Registers Cytoscape node/zoom/hover events and returns true if bindings were added.
export function bindGraphEvents(bindings: GraphEventBindings): boolean {
    const { graph, isBound, state, handlers } = bindings;
    if (isBound || !graph) {
        return false;
    }
    graph.on('tap', 'node', (event: { target: { id: () => string; select: () => void }; originalEvent?: MouseEvent }) => {
        const nodeId = event.target.id();
        const node = handlers.resolveNode(nodeId);
        if (!node) {
            return;
        }
        const now = Date.now();
        const isDoubleTap = state.getLastTapNodeId() === nodeId && (now - state.getLastTapAt()) < state.doubleTapDelay;
        state.setLastTapNodeId(nodeId);
        state.setLastTapAt(now);
        if (handlers.isTourActive()) {
            if (!handlers.isGuidedNodeAllowed(nodeId)) {
                handlers.flashGuidedMessage('Follow the guide to unlock this step.');
                return;
            }
            void handlers.advanceTour('jump', nodeId);
            return;
        }
        if (handlers.getGraphLayoutMode() === 'cluster'
            && isDoubleTap
            && handlers.handleClusterNodeToggle(node, event.originalEvent)) {
            return;
        }
        if (handlers.getGraphLayoutMode() === 'cluster'
            && handlers.handleClusterFolderSingleClick(node)) {
            event.target.select();
            return;
        }
        if (handlers.handleFileFocusClick(node, event.originalEvent)) {
            return;
        }
        event.target.select();
        handlers.loadSymbolSnippet(node).catch(() => {
            handlers.renderCode(node);
            handlers.updateNarrator(node);
        });
    });
    graph.on('select', 'node', () => {
        handlers.refreshEdgeHighlights();
        handlers.updateLabelVisibility();
    });
    graph.on('unselect', 'node', () => {
        handlers.refreshEdgeHighlights();
        handlers.updateLabelVisibility();
    });
    graph.on('mouseover', 'node', (event: any) => {
        const nodeId = event.target.id();
        event.target.addClass('is-hovered');
        handlers.setHoveredNode(nodeId);
        handlers.showGraphTooltip(event.target, event);
        handlers.updateLabelVisibility();
    });
    graph.on('mouseout', 'node', (event: any) => {
        event.target.removeClass('is-hovered');
        handlers.setHoveredNode(null);
        handlers.hideGraphTooltip();
        handlers.updateLabelVisibility();
    });
    graph.on('mousemove', 'node', (event: any) => {
        handlers.updateTooltipPosition(event);
    });
    graph.on('zoom', () => {
        handlers.updateLabelVisibility();
    });
    return true;
}
