// Describes the callback surface for file tree UI events so app code can react consistently.
export interface FileTreeEventHandlers {
    // Toggles a folder path in the shared file tree when a caret is clicked.
    onToggle: (path: string) => void;
    // Navigates to a file path when a file row is clicked in the tree.
    onSelectFile: (path: string) => void;
}

const boundContainers = new WeakSet<HTMLElement>();

// Wires delegated click handling for file-tree toggles on a container element.
export function bindFileTreeEvents(container: HTMLElement | null, handlers: FileTreeEventHandlers): void {
    if (!container || boundContainers.has(container)) {
        return;
    }
    boundContainers.add(container);
    container.addEventListener('click', (event) => {
        const toggleTarget = (event.target as HTMLElement).closest<HTMLElement>('[data-tree-toggle]');
        if (toggleTarget) {
            const path = toggleTarget.dataset.treeToggle;
            if (path) {
                handlers.onToggle(path);
            }
            return;
        }
        const fileTarget = (event.target as HTMLElement).closest<HTMLElement>('[data-tree-file]');
        if (!fileTarget) {
            return;
        }
        const filePath = fileTarget.dataset.treeFile;
        if (!filePath) {
            return;
        }
        handlers.onSelectFile(filePath);
    });
}
