import { escapeHtml, normalizePath } from '../utils/strings';
import { getBreadcrumbLabel } from '../utils/paths';

export function renderImportBreadcrumbs(path: string | undefined, breadcrumbs: string[]): string {
    if (!path || breadcrumbs.length < 2) {
        return '';
    }
    const normalized = normalizePath(path);
    const currentIndex = breadcrumbs.lastIndexOf(normalized);
    if (currentIndex < 0) {
        return '';
    }
    const items = breadcrumbs.map((crumbPath, index) => {
        const label = escapeHtml(getBreadcrumbLabel(crumbPath));
        const escapedPath = escapeHtml(crumbPath);
        const isCurrent = index === currentIndex;
        const currentAttr = isCurrent ? ' aria-current="page"' : '';
        const currentClass = isCurrent ? ' is-current' : '';
        return `<button class="breadcrumb${currentClass}" data-breadcrumb-path="${escapedPath}"${currentAttr}>${label}</button>`;
    });
    return `
        <nav class="code-breadcrumbs" aria-label="Import trail">
            ${items.join('<span class="breadcrumb-sep">&gt;</span>')}
        </nav>
    `;
}
