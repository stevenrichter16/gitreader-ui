import { normalizePath } from './strings';

export function getBasename(value: string): string {
    const normalized = normalizePath(value);
    const parts = normalized.split('/');
    return parts.length > 0 ? parts[parts.length - 1] : value;
}

export function getParentPath(path: string): string | null {
    if (!path) {
        return null;
    }
    const normalized = normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length <= 1) {
        return null;
    }
    return parts.slice(0, -1).join('/');
}

export function getBreadcrumbLabel(path: string): string {
    const normalized = normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length <= 2) {
        return normalized;
    }
    return `.../${parts.slice(-2).join('/')}`;
}
