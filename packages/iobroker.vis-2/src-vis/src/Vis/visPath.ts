export function getCurrentPath(): { view: string; path: string[] } {
    const path = window.location.hash
        .replace(/^#/, '')
        .split('/')
        .map(p => decodeURIComponent(p));
    return {
        view: path.shift(),
        path,
    };
}

export function buildPath(view: string, path: string | string[]): string {
    if (path && typeof path === 'string') {
        if (path.includes('/')) {
            path = path.split('/');
        } else {
            path = [path];
        }
    }

    if (path && typeof path === 'object' && path.length) {
        return `#${encodeURIComponent(view)}/${path.map(p => encodeURIComponent(p)).join('/')}`;
    }

    return `#${encodeURIComponent(view)}`;
}
