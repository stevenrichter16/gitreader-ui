import { formatArcTitle, formatRouteLabel, formatStorySceneLabel, formatStorySceneLocation } from '../utils/story';
import { escapeHtml } from '../utils/strings';

// Narration modes supported by the narrator pills.
export type NarrationMode = 'hook' | 'summary' | 'key_lines' | 'connections' | 'next';

// Minimal narration payload used to build narrator HTML.
export interface NarrationResponseLike {
    summary?: string[];
    key_lines?: Array<{ line: number; text: string }>;
    connections?: string[];
    next_thread?: string;
    hook?: string;
}

// Shared format used by narrator/story rendering so callers can keep layout consistent.
export interface NarratorSection {
    eyebrow: string;
    title: string;
    body: string;
}

// Minimal entry node info used for story arc meta items in the narrator.
export interface ArcEntryNodeLike {
    signature?: string;
    summary?: string;
}

// Minimal route metadata used to format arc summaries and labels.
export interface StoryRouteView {
    path?: string;
    methods?: string[];
    handler_name?: string;
    module?: string;
    file_path?: string;
    line?: number;
}

// Minimal scene info used for arc lists in the narrator.
export interface StorySceneView {
    name?: string;
    kind?: string;
    role?: string;
    confidence?: string;
    file_path?: string;
    line?: number;
}

// Minimal arc payload required to render narrator output in route mode.
export interface StoryArcView {
    id?: string;
    title?: string;
    summary?: string;
    entry_id?: string;
    route?: StoryRouteView;
    scenes?: StorySceneView[];
    scene_count?: number;
    calls?: {
        internal?: string[];
        external?: string[];
    };
    related_ids?: string[];
    thread?: string;
    thread_index?: number;
}

// Render context for story arcs so GitReaderApp can inject lookups and labels.
export interface StoryArcRenderContext {
    arc: StoryArcView;
    mode: NarrationMode;
    entryNode?: ArcEntryNodeLike;
    resolveArcLabel: (arcId: string) => string | null;
    kindLabelFor: (kind: string) => string;
}

// Builds the narrator loading HTML while API narration is pending.
export function buildNarratorLoadingHtml(symbolName: string): string {
    return `
        <p class="eyebrow">Narrator</p>
        <h3>Listening to ${escapeHtml(symbolName)}</h3>
        <p>Drafting the next beat in the story.</p>
    `;
}

// Builds the narrator error HTML when narration fails or is unavailable.
export function buildNarratorErrorHtml(symbolName: string, message: string): string {
    return `
        <p class="eyebrow">Narrator</p>
        <h3>Unable to narrate ${escapeHtml(symbolName)}</h3>
        <p>${escapeHtml(message)}</p>
    `;
}

// Builds the HTML for symbol narration based on the active narrator mode.
export function buildNarrationHtml(
    symbolName: string,
    narration: NarrationResponseLike,
    mode: NarrationMode,
): string {
    const formatted = formatNarration(symbolName, narration, mode);
    return `
        <p class="eyebrow">${formatted.eyebrow}</p>
        <h3>${formatted.title}</h3>
        ${formatted.body}
    `;
}

// Formats a narrator section for the current pill so renderers can share layout.
export function formatNarration(
    symbolName: string,
    narration: NarrationResponseLike,
    mode: NarrationMode,
): NarratorSection {
    const name = escapeHtml(symbolName);
    if (mode === 'summary') {
        const items = (narration.summary ?? []).map((item) => escapeHtml(item));
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
                return `<li>${escapeHtml(label)}</li>`;
            }).join('')}</ul>`
            : '<p>No key lines captured yet.</p>';
        return {
            eyebrow: 'Key lines',
            title: `Lines to watch in ${name}`,
            body,
        };
    }
    if (mode === 'connections') {
        const items = (narration.connections ?? []).map((item) => escapeHtml(item));
        const body = items.length > 0
            ? `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
            : '<p>Connections are still being mapped.</p>';
        return {
            eyebrow: 'Connections',
            title: `How ${name} links`,
            body,
        };
    }
    if (mode === 'next') {
        const thread = narration.next_thread ? escapeHtml(narration.next_thread) : 'No next thread yet.';
        return {
            eyebrow: 'Next thread',
            title: 'Where to go next',
            body: `<p>${thread}</p>`,
        };
    }
    const hook = narration.hook ? escapeHtml(narration.hook) : `A quiet setup around ${name}.`;
    return {
        eyebrow: 'Hook',
        title: `The quiet setup behind ${name}`,
        body: `<p>${hook}</p>`,
    };
}

// Builds the narrator HTML for route-focused story arcs.
export function buildStoryArcHtml(context: StoryArcRenderContext): string {
    const formatted = formatStoryArc(context);
    return `
        <p class="eyebrow">${formatted.eyebrow}</p>
        <h3>${formatted.title}</h3>
        ${formatted.body}
    `;
}

// Builds the narrator HTML when no route is selected in routes mode.
export function buildStoryArcEmptyHtml(): string {
    return `
        <p class="eyebrow">Routes</p>
        <h3>No route selected</h3>
        <p>Pick a route to see its primary flow.</p>
    `;
}

// Builds the narrator HTML when a route id cannot be found.
export function buildStoryArcMissingHtml(): string {
    return `
        <p class="eyebrow">Routes</p>
        <h3>Route not found</h3>
        <p>Choose another route to continue.</p>
    `;
}

// Builds the narrator HTML for the file tree mode header.
export function buildFileTreeNarratorHtml(fileCount: number): string {
    const countLabel = fileCount > 0 ? `${fileCount} files indexed.` : 'No files indexed yet.';
    return `
        <p class="eyebrow">File tree</p>
        <h3>Browse the repository layout</h3>
        <p>Expand folders in the tree to explore the structure. ${escapeHtml(countLabel)}</p>
    `;
}

// Formats the story arc body based on the active narrator pill.
export function formatStoryArc(context: StoryArcRenderContext): NarratorSection {
    const { arc, mode, entryNode, resolveArcLabel, kindLabelFor } = context;
    const routeLabel = escapeHtml(formatArcTitle(arc));
    const scenes = Array.isArray(arc.scenes) ? arc.scenes : [];
    if (mode === 'summary') {
        const summaryText = arc.summary ? escapeHtml(arc.summary) : '';
        const metaItems = buildArcMetaItems(arc, entryNode);
        const metaList = metaItems.length > 0
            ? `<ul>${metaItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
            : '';
        const items = scenes.map((scene, index) => {
            const label = formatStorySceneLabel(scene, index, true, kindLabelFor);
            return `<li>${escapeHtml(label)}</li>`;
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
            const location = formatStorySceneLocation(scene);
            const label = `${scene.name} - ${location}`;
            return `<li>${escapeHtml(label)}</li>`;
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
        const connectionItems = buildArcConnectionItems(arc, scenes, resolveArcLabel);
        const body = connectionItems.length > 0
            ? `<ul>${connectionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
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
                const label = resolveArcLabel(arcId) ?? arcId;
                return `<button class="ghost-btn arc-jump" data-arc-id="${escapeHtml(arcId)}">${escapeHtml(label)}</button>`;
            });
            return {
                eyebrow: 'Next thread',
                title: 'Where to go next',
                body: `<p>Jump to a related thread.</p><div class="arc-jump-list">${buttons.join('')}</div>`,
            };
        }
        const last = scenes[scenes.length - 1];
        const location = last ? formatStorySceneLocation(last) : '';
        const label = last
            ? `Continue at ${last.name}${location ? ` (${location})` : ''}.`
            : 'No next thread yet.';
        return {
            eyebrow: 'Next thread',
            title: 'Where to go next',
            body: `<p>${escapeHtml(label)}</p>`,
        };
    }
    const handler = arc.route?.handler_name ? `Handler ${arc.route.handler_name}.` : '';
    const summary = arc.summary ? arc.summary : `Route ${formatRouteLabel(arc)} begins the journey.`;
    const hook = `${summary}${handler ? ` ${handler}` : ''}`.trim();
    return {
        eyebrow: 'Route',
        title: routeLabel,
        body: `<p>${escapeHtml(hook)}</p>`,
    };
}

// Builds the meta list shown in story summaries (route info, signatures, counts).
function buildArcMetaItems(arc: StoryArcView, entryNode?: ArcEntryNodeLike): string[] {
    const items: string[] = [];
    let threadLabel = '';
    if (arc.thread && arc.thread !== 'main') {
        if (arc.thread === 'branch') {
            threadLabel = `Branch ${arc.thread_index ?? 0}`;
        } else {
            threadLabel = arc.thread;
        }
    }
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

// Builds the connection list for the "Connections" narrator pill in routes mode.
function buildArcConnectionItems(
    arc: StoryArcView,
    scenes: StorySceneView[],
    resolveArcLabel: (arcId: string) => string | null,
): string[] {
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
        const labels = related.map((arcId) => resolveArcLabel(arcId) ?? arcId);
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
