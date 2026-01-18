// Provides a lightweight context menu UI for graph node actions.
export interface GraphContextMenuAction {
    // Stable id for tracking which action was chosen.
    id: string;
    // Visible label shown to the user.
    label: string;
    // Handler invoked when the action is selected.
    onSelect: () => void;
    // When true, the action is shown but disabled.
    disabled?: boolean;
}

// Input payload used to render and position the context menu.
export interface GraphContextMenuOptions {
    // Screen-space x coordinate for the menu anchor.
    x: number;
    // Screen-space y coordinate for the menu anchor.
    y: number;
    // Optional heading shown above the action list.
    title?: string;
    // Actions to render in the menu.
    actions: GraphContextMenuAction[];
}

// Construction dependencies needed to mount and manage the menu DOM.
export interface GraphContextMenuDependencies {
    // DOM container for the menu, typically document.body.
    container: HTMLElement;
}

// UI controller that renders and manages the graph node context menu.
export class GraphContextMenu {
    private menuElement: HTMLDivElement;
    private titleElement: HTMLDivElement;
    private listElement: HTMLUListElement;
    private visible = false;

    // Creates the menu DOM and wires global dismiss handlers.
    constructor(private deps: GraphContextMenuDependencies) {
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'graph-context-menu';
        this.menuElement.setAttribute('role', 'menu');
        this.menuElement.setAttribute('aria-hidden', 'true');

        this.titleElement = document.createElement('div');
        this.titleElement.className = 'graph-context-menu__title';
        this.menuElement.appendChild(this.titleElement);

        this.listElement = document.createElement('ul');
        this.listElement.className = 'graph-context-menu__list';
        this.menuElement.appendChild(this.listElement);

        this.menuElement.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        this.deps.container.appendChild(this.menuElement);
        document.addEventListener('pointerdown', this.handleGlobalPointerDown);
        document.addEventListener('keydown', this.handleGlobalKeydown);
    }

    // Returns whether the menu is currently visible.
    isOpen(): boolean {
        return this.visible;
    }

    // Renders the menu actions and positions the menu at the given coordinates.
    show(options: GraphContextMenuOptions): void {
        const actions = options.actions.filter((action) => action && action.label);
        if (actions.length === 0) {
            this.hide();
            return;
        }
        this.titleElement.textContent = options.title ?? '';
        this.titleElement.classList.toggle('is-hidden', !options.title);
        this.listElement.innerHTML = '';
        actions.forEach((action) => {
            const item = document.createElement('li');
            item.className = 'graph-context-menu__item';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'graph-context-menu__button';
            button.textContent = action.label;
            button.disabled = Boolean(action.disabled);
            if (action.disabled) {
                button.classList.add('is-disabled');
            }
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (action.disabled) {
                    return;
                }
                this.hide();
                action.onSelect();
            });
            item.appendChild(button);
            this.listElement.appendChild(item);
        });

        this.menuElement.classList.add('is-visible');
        this.menuElement.setAttribute('aria-hidden', 'false');
        this.visible = true;

        this.positionMenu(options.x, options.y);
    }

    // Hides the menu and resets its visibility state.
    hide(): void {
        if (!this.visible) {
            return;
        }
        this.menuElement.classList.remove('is-visible');
        this.menuElement.setAttribute('aria-hidden', 'true');
        this.visible = false;
    }

    // Positions the menu while keeping it within the viewport.
    private positionMenu(x: number, y: number): void {
        const padding = 12;
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        const rect = this.menuElement.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - padding;
        const maxY = window.innerHeight - rect.height - padding;
        const clampedX = Math.max(padding, Math.min(x, maxX));
        const clampedY = Math.max(padding, Math.min(y, maxY));
        this.menuElement.style.left = `${clampedX}px`;
        this.menuElement.style.top = `${clampedY}px`;
    }

    // Closes the menu when clicking outside its bounds.
    private handleGlobalPointerDown = (event: PointerEvent): void => {
        if (!this.visible) {
            return;
        }
        if (event.target instanceof Node && this.menuElement.contains(event.target)) {
            return;
        }
        this.hide();
    };

    // Closes the menu when the user presses Escape.
    private handleGlobalKeydown = (event: KeyboardEvent): void => {
        if (!this.visible) {
            return;
        }
        if (event.key === 'Escape') {
            this.hide();
        }
    };
}
