// Minimal route metadata used by story/route label formatters in the reader/narrator flow.
export interface StoryRouteLike {
    path?: string;
    methods?: string[];
    handler_name?: string;
}

// Lightweight arc shape for TOC/route picker titles without needing full arc payloads.
export interface StoryArcLike {
    title?: string;
    route?: StoryRouteLike;
    thread?: string;
    thread_index?: number;
}

// Minimal scene info for narrator list items and "where" labels in story mode.
export interface StorySceneLike {
    role?: string;
    kind?: string;
    confidence?: string;
    name?: string;
    file_path?: string;
    line?: number;
}

// Builds the select option label shown in the route picker (used by GitReaderApp.populateRoutePicker).
export function formatArcOptionLabel(arc: StoryArcLike): string {
    const routeLabel = formatArcTitle(arc);
    const handler = arc.route?.handler_name ? ` - ${arc.route.handler_name}` : '';
    return `${routeLabel}${handler}`.trim();
}

// Derives the core route label used across TOC titles and narrator sections.
export function formatRouteLabel(arc: StoryArcLike): string {
    if (arc.title) {
        return arc.title;
    }
    const methods = arc.route?.methods?.length ? arc.route.methods.join('|') : 'ANY';
    const target = arc.route?.path || arc.route?.handler_name || 'route';
    return `${methods} ${target}`.trim();
}

// Normalizes arc thread metadata into a human label for arc titles.
export function getArcThreadLabel(arc: StoryArcLike): string {
    if (!arc.thread || arc.thread === 'main') {
        return '';
    }
    if (arc.thread === 'branch') {
        const index = arc.thread_index ?? 0;
        return `Branch ${index}`;
    }
    return arc.thread;
}

// Produces a consistent arc title for TOC and narrator (used by GitReaderApp.formatArcTitle).
export function formatArcTitle(arc: StoryArcLike): string {
    const base = arc.title || formatRouteLabel(arc);
    const threadLabel = getArcThreadLabel(arc);
    if (!threadLabel) {
        return base;
    }
    if (base.toLowerCase().includes('branch')) {
        return base;
    }
    return `${base} (${threadLabel})`;
}

// Formats a scene location for narrator lists and arc detail sections.
export function formatStorySceneLocation(scene: StorySceneLike): string {
    if (!scene.file_path) {
        return 'location unknown';
    }
    if (scene.line && scene.line > 0) {
        return `${scene.file_path}:${scene.line}`;
    }
    return scene.file_path;
}

// Builds a narrator list label for a scene, used in story arc rendering.
export function formatStorySceneLabel(
    scene: StorySceneLike,
    index: number,
    includeLocation: boolean,
    kindLabelFor: (kind: string) => string,
): string {
    const roleLabel = scene.role === 'entry' ? 'Entry' : `Step ${index + 1}`;
    const kindLabel = kindLabelFor(scene.kind ?? '');
    const confidence = scene.confidence === 'low' ? ' (low confidence)' : '';
    const base = `${roleLabel}: ${scene.name} (${kindLabel})${confidence}`;
    if (!includeLocation) {
        return base;
    }
    const location = formatStorySceneLocation(scene);
    return `${base} - ${location}`;
}
