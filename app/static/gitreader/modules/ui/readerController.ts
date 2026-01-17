import type { SnippetMode, SymbolNode, SymbolSnippetResponse } from '../types';
import type { ReaderInteractions } from './readerInteractions';
import type { ReaderView } from './reader';

// Dependencies required to assemble the reader facade used by the app orchestrator.
export interface ReaderControllerDependencies {
    // Reader renderer that handles snippet HTML and mode switching.
    readerView: ReaderView;
    // Reader interaction layer that owns click/keyboard behavior and navigation.
    readerInteractions: ReaderInteractions;
}

// Minimal API surface that GitReaderApp uses to drive the reader UI.
export class ReaderController {
    constructor(private deps: ReaderControllerDependencies) {}

    // Renders a symbol/snippet pair into the reader; called after snippet fetches.
    render(symbol: SymbolNode, snippet?: SymbolSnippetResponse): void {
        this.deps.readerView.renderCode(symbol, snippet);
    }

    // Shows the reader file tree for a given path; used by file tree and cluster navigation.
    showFileTree(path: string): void {
        this.deps.readerInteractions.renderReaderFileTree(path);
    }

    // Switches snippet mode (body/full) and triggers reloads as needed.
    setSnippetMode(mode: SnippetMode): Promise<void> {
        return this.deps.readerView.setSnippetMode(mode);
    }

    // Handles reader click events, including copy/jump/import/definition actions.
    handleCodeSurfaceClick(event: MouseEvent): void {
        this.deps.readerInteractions.handleCodeSurfaceClick(event);
    }

    // Handles reader keydown events, including the line-jump input enter key.
    handleCodeSurfaceKeydown(event: KeyboardEvent): void {
        this.deps.readerInteractions.handleCodeSurfaceKeydown(event);
    }
}
