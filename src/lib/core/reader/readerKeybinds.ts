import {matchesKeybind, toggleFullscreen} from '$lib/core/keybinds/keybindEngine';
import type {Keybinds} from '$lib/core/keybinds/defaultBinds';

export interface ReaderKeyActions {
    /** Navigate one step forward (respects RTL). */
    goNext: () => void;
    /** Navigate one step backward (respects RTL). */
    goPrev: () => void;
    /** Jump to a specific 0-based page index. */
    goToPage: (index: number) => void;
    /** Return the 0-based index of the last page. */
    lastPage: () => number;
    /** Close the reader and return to the series page. */
    exitReader: () => void;
    /** Jump to the next chapter. */
    chapterNext: () => void;
    /** Jump to the previous chapter. */
    chapterPrev: () => void;
    /** Adjust reader zoom by delta (positive = zoom in, negative = zoom out). */
    adjustZoom: (delta: number) => void;
    /** Reset zoom to 1.0. */
    resetZoom: () => void;
    /** Cycle through available page display modes. */
    cycleMode: () => void;
    /** Toggle between LTR and RTL reading direction. */
    toggleDirection: () => void;
    /** Open the settings panel or navigate to /settings. */
    openSettings: () => void;
    /** Toggle the bookmark on the current chapter/page. */
    toggleBookmark: () => void;
    /** Toggle auto-scroll in longstrip mode. */
    toggleAutoScroll: () => void;
    /** Return the current keybind configuration. */
    getKeybinds: () => Keybinds;
}

const CTRL_ZOOM_STEP = 0.1;

/**
 * Create a keydown event handler for the reader with the given action callbacks.
 * Suitable for use as `svelte:window onkeydown={handler}` in the reader page.
 */
export function createReaderKeyHandler(
    actions: ReaderKeyActions,
): (event: KeyboardEvent) => void {
    return function onKey(event: KeyboardEvent) {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        // Ctrl +/-/0 zoom shortcuts (standard browser-style overrides)
        if (event.ctrlKey) {
            if (event.key === '=' || event.key === '+') {
                event.preventDefault();
                actions.adjustZoom(CTRL_ZOOM_STEP);
                return;
            }
            if (event.key === '-') {
                event.preventDefault();
                actions.adjustZoom(-CTRL_ZOOM_STEP);
                return;
            }
            if (event.key === '0') {
                event.preventDefault();
                actions.resetZoom();
                return;
            }
        }

        const kb = actions.getKeybinds();

        if (matchesKeybind(event, kb.exitReader)) {
            event.preventDefault();
            actions.exitReader();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            actions.exitReader();
        } else if (matchesKeybind(event, kb.turnPageRight)) {
            event.preventDefault();
            actions.goNext();
        } else if (matchesKeybind(event, kb.turnPageLeft)) {
            event.preventDefault();
            actions.goPrev();
        } else if (matchesKeybind(event, kb.firstPage)) {
            event.preventDefault();
            actions.goToPage(0);
        } else if (matchesKeybind(event, kb.lastPage)) {
            event.preventDefault();
            actions.goToPage(actions.lastPage());
        } else if (matchesKeybind(event, kb.turnChapterRight)) {
            event.preventDefault();
            actions.chapterNext();
        } else if (matchesKeybind(event, kb.turnChapterLeft)) {
            event.preventDefault();
            actions.chapterPrev();
        } else if (matchesKeybind(event, kb.togglePageStyle)) {
            event.preventDefault();
            actions.cycleMode();
        } else if (matchesKeybind(event, kb.toggleReadingDirection)) {
            event.preventDefault();
            actions.toggleDirection();
        } else if (matchesKeybind(event, kb.toggleFullscreen)) {
            event.preventDefault();
            void toggleFullscreen();
        } else if (matchesKeybind(event, kb.openSettings)) {
            event.preventDefault();
            actions.openSettings();
        } else if (matchesKeybind(event, kb.toggleBookmark)) {
            event.preventDefault();
            actions.toggleBookmark();
        } else if (matchesKeybind(event, kb.toggleAutoScroll)) {
            event.preventDefault();
            actions.toggleAutoScroll();
        }
    };
}
