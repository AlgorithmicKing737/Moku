import {error} from '@sveltejs/kit';
import type {PageLoad} from './$types';
import {getAdapter} from '$lib/request-manager';
import {seriesState} from '$lib/state/series.svelte';
import {readerState} from '$lib/state/reader.svelte';

export const load: PageLoad = async ({params}) => {
    const mangaId = params.mangaId;

    if (!mangaId) {
        throw error(400, 'Missing manga id');
    }

    try {
        seriesState.loading = true;
        seriesState.error = null;
        seriesState.chaptersLoading = true;
        seriesState.chaptersError = null;

        const adapter = getAdapter();
        const [manga, chapters] = await Promise.all([
            adapter.getManga(mangaId),
            adapter.getChapters(mangaId),
        ]);

        seriesState.current = manga;
        seriesState.chapters = chapters;

        readerState.manga = manga;
        readerState.chapters = chapters;

        return {
            manga,
            chapters,
            mangaId,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        seriesState.error = message;
        seriesState.chaptersError = message;

        throw error(500, message);
    } finally {
        seriesState.loading = false;
        seriesState.chaptersLoading = false;
    }
};