import {createPinchGesture} from '$lib/core/ui/touchscreen';
import type {PinchGesture} from '$lib/core/ui/touchscreen';
import {clampZoom, ZOOM_MIN, ZOOM_MAX} from './zoomHelpers';

export type {PinchGesture as PinchTracker};

/** Max zoom level allowed in single-page inspect mode (pan+zoom overlay). */
const INSPECT_ZOOM_MAX = 8;

export interface PinchTrackerOptions {
    /** Get the current reader-level zoom (longstrip scaling). */
    getZoom: () => number;
    /** Set a new reader-level zoom. */
    setZoom: (value: number) => void;
    /** Get the current inspect-mode zoom scale for single-page view. */
    getInspectScale: () => number;
    /** Set inspect-mode zoom scale. */
    setInspectScale: (value: number) => void;
    /** Reset inspect-mode pan offsets to origin. */
    resetInspectPan: () => void;
    /** Returns true when the reader is in longstrip mode. */
    isLongstrip: () => boolean;
}

/**
 * Create a pinch-gesture tracker that drives reader zoom.
 *
 * In longstrip mode pinch controls the global strip zoom level.
 * In single/double mode pinch controls the in-page inspect zoom.
 *
 * Usage — wire the returned handler methods to the container element:
 * ```svelte
 * <div
 *   onpointerdown={tracker.onPointerDown}
 *   onpointermove={tracker.onPointerMove}
 *   onpointerup={tracker.onPointerUp}
 *   onpointercancel={tracker.onPointerUp}
 * >
 * ```
 */
export function createPinchTracker(opts: PinchTrackerOptions): PinchGesture {
    let startZoom = 0;
    let startInspect = 0;

    return createPinchGesture({
        onPinch(scale) {
            if (startZoom === 0) {
                startZoom = opts.getZoom();
                startInspect = opts.getInspectScale();
            }

            if (opts.isLongstrip()) {
                opts.setZoom(clampZoom(startZoom * scale, ZOOM_MIN, ZOOM_MAX));
            } else {
                const next = Math.max(1, Math.min(INSPECT_ZOOM_MAX, startInspect * scale));
                if (next !== opts.getInspectScale()) {
                    if (next <= 1) opts.resetInspectPan();
                    opts.setInspectScale(next);
                }
            }
        },

        onPinchEnd() {
            startZoom = 0;
            startInspect = 0;
        },
    });
}
