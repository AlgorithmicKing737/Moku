export function eventToKeybind(e: KeyboardEvent): string {
  if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return "";
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  if (e.metaKey) parts.push("meta");
  parts.push(e.key);
  return parts.join("+");
}

export function matchesKeybind(e: KeyboardEvent, bind: string): boolean {
  return eventToKeybind(e) === bind;
}

export function initKeybindEngine(): () => void {
  // Global matching is event-driven via handleGlobalKeydown in the app shell.
  // This hook makes boot ordering explicit and reserves a dedicated setup point.
  return () => {};
}

export async function toggleFullscreen(): Promise<void> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;

  try {
    const {getCurrentWindow} = await import('@tauri-apps/api/window');
    const currentWindow = getCurrentWindow();
    await currentWindow.setFullscreen(!await currentWindow.isFullscreen());
  } catch (error) {
    console.warn('toggleFullscreen unavailable:', error);
  }
}
