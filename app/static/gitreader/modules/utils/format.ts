export interface LocationLike {
    path?: string;
    start_line?: number;
    end_line?: number;
}

export function formatLocation(location?: LocationLike, startLine?: number, endLine?: number): string {
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
