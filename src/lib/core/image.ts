import {fetchAuthenticated, getAuthMode, getServerBase} from '$lib/core/auth';

function isAbsoluteUrl(value: string): boolean {
    return /^https?:\/\//.test(value);
}

export function resolveImageUrl(path: string | null | undefined): string | undefined {
    if (!path) return undefined;
    if (isAbsoluteUrl(path)) return path;

    const normalizedBase = getServerBase().replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}

export async function loadImageObjectUrl(path: string, signal?: AbortSignal): Promise<string> {
    const resolved = resolveImageUrl(path);
    if (!resolved) throw new Error('Image URL is missing');

    if (getAuthMode() === 'NONE') {
        return resolved;
    }

    const response = await fetchAuthenticated(resolved, {}, signal);
    if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
    }

    return URL.createObjectURL(await response.blob());
}