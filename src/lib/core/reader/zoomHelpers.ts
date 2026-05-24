export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4.0;
export const ZOOM_STEP = 0.1;

/**
 * Clamp a zoom value between the reader's min/max bounds.
 */
export function clampZoom(value: number, min = ZOOM_MIN, max = ZOOM_MAX): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Return the next zoom level after applying a delta, clamped to valid bounds.
 * Rounded to avoid floating point drift.
 */
export function adjustZoom(current: number, delta: number): number {
    return clampZoom(Math.round((current + delta) * 1000) / 1000);
}

/**
 * Snap to a list of named presets (0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0).
 * Returns the nearest preset value to the given zoom.
 */
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0] as const;

export function snapToPreset(value: number): number {
    return ZOOM_PRESETS.reduce((best, preset) =>
        Math.abs(preset - value) < Math.abs(best - value) ? preset : best
    );
}
