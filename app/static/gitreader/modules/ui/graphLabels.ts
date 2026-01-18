import { formatNodeLabel } from '../utils/labels';
import { escapeHtml } from '../utils/strings';

// Minimal shape for graph nodes so label formatting stays decoupled from full SymbolNode.
export interface GraphLabelNode {
    kind?: string;
    name?: string;
    location?: { path?: string };
    childCount?: number;
}

// Output payload stored in Cytoscape node data and reused by tooltip rendering.
export interface GraphLabelData {
    label: string;
    fullLabel: string;
    path: string;
    kindLabel: string;
}

// Input data needed to render the hover tooltip shown in the canvas.
export interface GraphTooltipData {
    fullLabel: string;
    kindLabel: string;
    path?: string;
}

// Formats graph node labels for buildGraphElements in GitReaderApp, keeping label logic centralized.
export function formatGraphNodeLabel(node: GraphLabelNode, lineLength: number): GraphLabelData {
    return formatNodeLabel(node, lineLength);
}

// Renders the tooltip HTML used by GitReaderApp.showGraphTooltip when hovering canvas nodes.
export function buildGraphTooltipHtml(data: GraphTooltipData): string {
    const details = data.path ? `${data.kindLabel} - ${data.path}` : data.kindLabel;
    return `
        <div class="tooltip-title">${escapeHtml(String(data.fullLabel))}</div>
        <div class="tooltip-meta">${escapeHtml(String(details))}</div>
    `;
}
