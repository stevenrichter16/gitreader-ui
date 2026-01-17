export function buildRepoParams(search: string): URLSearchParams {
    const params = new URLSearchParams(search);
    const allowed = new URLSearchParams();
    const repoValue = params.get('repo');
    const localValue = params.get('local');
    if (repoValue) {
        allowed.set('repo', repoValue);
    } else if (localValue) {
        allowed.set('local', localValue);
    }
    const refValue = params.get('ref');
    if (refValue) {
        allowed.set('ref', refValue);
    }
    const subdirValue = params.get('subdir');
    if (subdirValue) {
        allowed.set('subdir', subdirValue);
    }
    return allowed;
}

export function buildApiUrl(
    baseParams: URLSearchParams,
    path: string,
    extra?: Record<string, string | null | undefined>,
): string {
    const params = new URLSearchParams(baseParams.toString());
    if (extra) {
        Object.keys(extra).forEach((key) => {
            const value = extra[key];
            if (value !== undefined && value !== null && value !== '') {
                params.set(key, value);
            }
        });
    }
    const query = params.toString();
    return query ? `${path}?${query}` : path;
}
