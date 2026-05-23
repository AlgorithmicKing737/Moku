let _appliedZoom: number = -1;
let _vhRafId: number | null = null;

export function applyZoom(uiZoom: number) {
  if (uiZoom === _appliedZoom) return;
  _appliedZoom = uiZoom;
  document.documentElement.style.setProperty("--ui-zoom", String(uiZoom));
  document.documentElement.style.setProperty("--ui-scale", String(uiZoom));
  document.documentElement.style.zoom = `${uiZoom * 100}%`;
  if (_vhRafId !== null) cancelAnimationFrame(_vhRafId);
  _vhRafId = requestAnimationFrame(() => {
    _vhRafId = null;
    document.documentElement.style.setProperty("--visual-vh", `${window.innerHeight / uiZoom}px`);
  });
}

export function zoomDelta(e: KeyboardEvent, current: number): number | null {
  if (!e.ctrlKey) return null;
  if (e.key === "=" || e.key === "+") {e.preventDefault(); return Math.min(2.0, Math.round((current + 0.1) * 10) / 10);}
  if (e.key === "-") {e.preventDefault(); return Math.max(0.5, Math.round((current - 0.1) * 10) / 10);}
  if (e.key === "0") {e.preventDefault(); return 1.0;}
  return null;
}

export function mountZoomKey(getCurrent: () => number, onChange: (next: number) => void): () => void {
  const handleKey = (event: KeyboardEvent) => {
    const nextZoom = zoomDelta(event, getCurrent());
    if (nextZoom === null) return;
    onChange(nextZoom);
  };

  window.addEventListener('keydown', handleKey);

  return () => {
    window.removeEventListener('keydown', handleKey);
  };
}

export function clampZoom(z: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, z)) * 1000) / 1000;
}

export function captureZoomAnchor(
  containerEl: HTMLElement | null,
  style: string,
  out: {el: HTMLElement | null; offset: number;},
) {
  if (!containerEl || style !== "longstrip") return;
  const containerTop = containerEl.getBoundingClientRect().top;
  for (const img of containerEl.querySelectorAll<HTMLElement>("img[data-local-page]")) {
    const rect = img.getBoundingClientRect();
    if (rect.bottom > containerTop) {out.el = img; out.offset = rect.top - containerTop; return;}
  }
}

export function restoreZoomAnchor(
  containerEl: HTMLElement | null,
  out: {el: HTMLElement | null; offset: number;},
) {
  if (!out.el || !containerEl) return;
  const el = out.el;
  out.el = null;
  requestAnimationFrame(() => {
    const containerTop = containerEl!.getBoundingClientRect().top;
    containerEl!.scrollTop += (el.getBoundingClientRect().top - containerTop) - out.offset;
  });
}
