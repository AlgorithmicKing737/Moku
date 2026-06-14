export function selectPortal(
  node: HTMLElement,
  trigger: HTMLElement | undefined,
): { update(t: HTMLElement | undefined): void; destroy(): void } {
  let currentTrigger = trigger

  node.style.position   = 'fixed'
  node.style.visibility = 'hidden'
  node.style.zIndex     = '99999'
  document.body.appendChild(node)

  function getZoom(): number {
    const raw = parseFloat(document.documentElement.style.zoom || '1') || 1
    return raw > 10 ? raw / 100 : raw
  }

  function position() {
    if (!currentTrigger) return

    const zoom = getZoom()
    const r    = currentTrigger.getBoundingClientRect()
    const vw   = window.innerWidth
    const vh   = window.innerHeight

    const menuH = node.offsetHeight
    const menuW = node.offsetWidth

    const above   = menuH > 0 && (vh - r.bottom) < menuH + 8 && r.top > menuH + 8
    const cssLeft = Math.max(4, r.left + menuW > vw ? r.right - menuW : r.left) / zoom
    const cssTop  = (above ? r.top - menuH - 4 : r.bottom + 4) / zoom

    node.style.left       = `${cssLeft}px`
    node.style.top        = `${cssTop}px`
    node.style.minWidth   = `${r.width / zoom}px`
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
      if (document.body.contains(node)) node.remove()
    },
  }
}