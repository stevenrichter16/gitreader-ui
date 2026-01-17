import type { FileTreeView } from './fileTreeView';

// Dependencies required to keep the narrator file tree in sync with shared tree state.
export interface FileTreeControllerDependencies {
    // Shared file tree view that owns collapse/focus state and generates HTML.
    fileTreeView: FileTreeView;
    // Narrator-side container where the file tree markup is rendered.
    narratorContainer: HTMLElement;
}

// Orchestrates file tree rendering so app code doesn't touch DOM details directly.
export class FileTreeController {
    // Captures the view + container so GitReaderApp can call refresh/render as needed.
    constructor(private deps: FileTreeControllerDependencies) {}

    // Re-renders the narrator file tree using the existing focus path.
    refresh(): void {
        const { html } = this.deps.fileTreeView.renderNarratorTree();
        this.deps.narratorContainer.innerHTML = html;
    }

    // Renders the narrator file tree for an explicit focus path, used after selections.
    render(focusPath?: string | null): void {
        const { html } = this.deps.fileTreeView.renderNarratorTree(focusPath);
        this.deps.narratorContainer.innerHTML = html;
    }
}
