import { buildApiUrl } from '../utils/url';

// Lightweight API client contract used by GitReaderApp to load TOC, graphs, and narration.
export interface ApiClient {
    // Builds a repo-scoped API URL so all requests include repo/ref/subdir context.
    buildUrl(path: string, extra?: Record<string, string | null | undefined>): string;
    // Fetches JSON from a repo-scoped API endpoint with optional query overrides and init.
    fetchJson<T>(path: string, extra?: Record<string, string | null | undefined>, init?: RequestInit): Promise<T>;
}

// Creates a per-page API client from the resolved repo params (called in GitReaderApp.constructor).
export function createApiClient(repoParams: URLSearchParams): ApiClient {
    // Captures repo params into a URL builder for all subsequent requests.
    const buildUrl = (path: string, extra?: Record<string, string | null | undefined>): string => (
        buildApiUrl(repoParams, path, extra)
    );

    // Performs the actual JSON request, used by GitReaderApp for TOC/graph/story loading.
    const fetchJson = async <T>(
        path: string,
        extra?: Record<string, string | null | undefined>,
        init?: RequestInit,
    ): Promise<T> => {
        const url = buildUrl(path, extra);
        const headers = new Headers(init?.headers);
        headers.set('Accept', 'application/json');
        const response = await fetch(url, {
            ...init,
            headers,
        });
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json() as Promise<T>;
    };

    return { buildUrl, fetchJson };
}
