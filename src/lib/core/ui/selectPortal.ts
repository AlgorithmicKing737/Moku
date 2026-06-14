/**
 * position:fixed dropdown anchored to a trigger element.
 *
 * getBoundingClientRect() returns full viewport coords.
 * position:fixed is also relative to the viewport.
 * So we just divide by zoom — no sidebar/titlebar subtraction needed
 * (those subtractions are only needed in ContextMenu because its x/y come
 * from a MouseEvent which is relative to the zoomed content area, not the viewport).
 */
export function selectPortal(
  node: HTMLElement,
  trigger: HTMLElement | undefined,
): { update(t: HTMLElement | undefined): void; destroy(): void } {
  let currentTrigger = trigger

  node.style.visibility = 'hidden'

  function getZoom(): number {
    const raw = parseFloat(document.documentElement.style.zoom || '1') || 1
    return raw > 10 ? raw / 100 : raw
  }

  function position() {
    if (!currentTrigger) return

    const zoom  = getZoom()
    const r     = currentTrigger.getBoundingClientRect()

    // Convert viewport px → CSS px by dividing by zoom
    const left   = r.left   / zoom
    const top    = r.top    / zoom
    const bottom = r.bottom / zoom
    const width  = r.width  / zoom

    const vw = window.innerWidth  / zoom
    const vh = window.innerHeight / zoom

    const menuH = node.offsetHeight
    const menuW = node.offsetWidth

    const above = menuH > 0 && (vh - bottom) < menuH + 8 && top > menuH + 8

    const cssLeft = Math.min(left, vw - menuW - 4)
    const cssTop  = above ? top - menuH - 4 : bottom + 4

    node.style.left       = `${Math.max(4, cssLeft)}px`
    node.style.top        = `${cssTop}px`
    node.style.minWidth   = `${width}px`
    node.style.visibility = 'visible'
  }

  requestAnimationFrame(() => position())
  window.addEventListener('scroll', position, { capture: true, passive: true })
  window.addEventListener('resize', position, { passive: true })

  return {
    update(t) {
      currentTrigger = t
      node.style.visibility = 'hidden'
      requestAnimationFrame(() => position())
    },
    destroy() {
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
    },
  }
}