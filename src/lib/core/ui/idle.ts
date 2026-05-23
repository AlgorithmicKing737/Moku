const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'] as const;

export function mountIdleDetection(
    getTimeoutMinutes: () => number | undefined,
    onIdle: () => void,
    onActive: () => void,
): () => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let idle = false;

    const markActive = () => {
        if (!idle) return;
        idle = false;
        onActive();
    };

    const resetTimer = () => {
        if (timer) clearTimeout(timer);

        const timeoutMinutes = getTimeoutMinutes() ?? 5;
        const timeoutMs = Math.max(0, timeoutMinutes) * 60 * 1000;

        if (timeoutMs === 0) {
            markActive();
            return;
        }

        markActive();

        timer = setTimeout(() => {
            if (idle) return;
            idle = true;
            onIdle();
        }, timeoutMs);
    };

    IDLE_EVENTS.forEach((eventName) => {
        window.addEventListener(eventName, resetTimer, {passive: true});
    });

    resetTimer();

    return () => {
        if (timer) clearTimeout(timer);
        IDLE_EVENTS.forEach((eventName) => {
            window.removeEventListener(eventName, resetTimer);
        });
    };
}