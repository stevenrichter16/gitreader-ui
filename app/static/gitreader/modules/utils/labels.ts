import { getBasename } from './paths';

export interface LabelNodeLike {
    kind?: string;
    name?: string;
    location?: { path?: string };
}

export function formatNodeLabel(
    node: LabelNodeLike,
    lineLength: number,
): { label: string; fullLabel: string; path: string; kindLabel: string } {
    const path = node.location?.path ?? '';
    const fullLabel = node.name || path;
    const displayName = getDisplayName(node, fullLabel, path);
    const badge = getKindBadge(node.kind);
    const kindLabel = getKindLabel(node.kind);
    const label = wrapLabel(`[${badge}]`, displayName, lineLength);
    return { label, fullLabel, path, kindLabel };
}

export function getDisplayName(node: LabelNodeLike, fullLabel: string, path: string): string {
    if (node.kind === 'file') {
        return getBasename(path || fullLabel);
    }
    if (node.kind === 'folder') {
        return node.name || getBasename(path || fullLabel);
    }
    return fullLabel || node.name || '';
}

export function wrapLabel(prefix: string, name: string, lineLength: number): string {
    const normalized = name.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return prefix;
    }
    const maxLength = Math.max(8, lineLength);
    const prefixText = prefix ? `${prefix} ` : '';
    const firstLineLimit = Math.max(4, maxLength - prefixText.length);
    const firstPart = normalized.slice(0, firstLineLimit);
    let remaining = normalized.slice(firstPart.length).trimStart();
    let label = `${prefixText}${firstPart}`;
    if (remaining) {
        let secondPart = remaining.slice(0, maxLength);
        if (remaining.length > maxLength) {
            const trimmed = secondPart.slice(0, Math.max(0, maxLength - 3));
            secondPart = `${trimmed}...`;
        }
        label += `\n${secondPart}`;
    }
    return label;
}

export function getKindBadge(kind?: string): string {
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

export function getKindLabel(kind?: string): string {
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
