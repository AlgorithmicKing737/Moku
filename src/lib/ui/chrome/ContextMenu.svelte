<script lang="ts">
  export interface MenuItem {
    label: string
    icon?: any
    onClick: () => void
    danger?: boolean
    disabled?: boolean
    separator?: never
    children?: MenuEntry[]
  }

  export interface MenuSeparator {
    separator: true
  }

  export type MenuEntry = MenuItem | MenuSeparator

  interface Props {
    x: number
    y: number
    items: MenuEntry[]
    onClose: () => void
  }

  let { x, y, items, onClose }: Props = $props()

  let focused = $state(-1)
  let el = $state<HTMLDivElement | undefined>(undefined)
  let measured = $state(false)
  let pos = $state({ left: 0, top: 0 })
  let subOpen = $state(-1)
  let subEls = $state<(HTMLDivElement | null)[]>([])

  const actionable = $derived(
    items
      .map((_, index) => index)
      .filter((index) => !('separator' in items[index]) && !(items[index] as MenuItem).disabled)
  )

  $effect(() => {
    if (actionable.length && focused === -1) focused = actionable[0]
  })

  function getZoom(): number {
    const raw = parseFloat(document.documentElement.style.zoom || '1') || 1
    return raw > 10 ? raw / 100 : raw
  }

  $effect(() => {
    if (!el) return

    const zoom = getZoom()
    const style = getComputedStyle(document.documentElement)
    const sidebarWidth = parseFloat(style.getPropertyValue('--sidebar-width')) || 52
    const titlebarHeight = parseFloat(style.getPropertyValue('--titlebar-height')) || 36
    const viewportWidth = window.innerWidth / zoom
    const viewportHeight = window.innerHeight / zoom
    const screenX = x / zoom - sidebarWidth / zoom
    const screenY = y / zoom - titlebarHeight / zoom
    const menuWidth = el.offsetWidth
    const menuHeight = el.offsetHeight

    pos = {
      left: Math.max(4, screenX + menuWidth > viewportWidth ? screenX - menuWidth : screenX),
      top: Math.max(4, screenY + menuHeight > viewportHeight ? screenY - menuHeight : screenY),
    }

    measured = true
  })

  $effect(() => {
    if (subOpen < 0) return

    const submenu = subEls[subOpen]
    if (!submenu) return

    requestAnimationFrame(() => {
      const zoom = getZoom()
      const viewportWidth = window.innerWidth / zoom
      const rect = submenu.getBoundingClientRect()
      if (rect.right / zoom > viewportWidth) submenu.classList.add('sub-flip')
      else submenu.classList.remove('sub-flip')
    })
  })

  function handlePointerOutside(target: EventTarget | null) {
    const inMain = el?.contains(target as Node)
    const inSubmenu = subOpen >= 0 && subEls[subOpen]?.contains(target as Node)

    if (!inMain && !inSubmenu) onClose()
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (subOpen >= 0) subOpen = -1
      else onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const current = actionable.indexOf(focused)
      focused = actionable[(current + 1) % actionable.length] ?? actionable[0]
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const current = actionable.indexOf(focused)
      focused = actionable[(current - 1 + actionable.length) % actionable.length] ?? actionable[0]
      return
    }

    if (event.key === 'ArrowRight' && focused >= 0) {
      const item = items[focused] as MenuItem
      if (item.children?.length) subOpen = focused
      return
    }

    if (event.key === 'ArrowLeft') {
      subOpen = -1
      return
    }

    if (event.key === 'Enter' && focused >= 0) {
      event.preventDefault()
      const item = items[focused] as MenuItem
      if (item.children?.length) {
        subOpen = focused
        return
      }

      if (!item.disabled) {
        item.onClick()
        onClose()
      }
    }
  }

  $effect(() => {
    const onMouseDown = (event: MouseEvent) => handlePointerOutside(event.target)
    const onTouchStart = (event: TouchEvent) => handlePointerOutside(event.target)

    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('touchstart', onTouchStart, true)
    document.addEventListener('keydown', onKey, true)

    return () => {
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('touchstart', onTouchStart, true)
      document.removeEventListener('keydown', onKey, true)
    }
  })
</script>

<div bind:this={el} class="menu" role="menu" tabindex="-1" style={`left:${pos.left}px;top:${pos.top}px;visibility:${measured ? 'visible' : 'hidden'}`} oncontextmenu={(event) => event.preventDefault()}>
  {#each items as item, index (index)}
    {#if 'separator' in item}
      <div class="sep"></div>
    {:else}
      {@const menuItem = item as MenuItem}
      {@const hasSubmenu = !!menuItem.children?.length}
      <div class="item-wrap">
        <button
          class="item"
          class:danger={menuItem.danger}
          class:disabled={menuItem.disabled}
          class:focused={focused === index}
          class:has-sub={hasSubmenu}
          disabled={menuItem.disabled}
          onclick={() => {
            if (menuItem.disabled) return
            if (hasSubmenu) {
              subOpen = subOpen === index ? -1 : index
              return
            }
            menuItem.onClick()
            onClose()
          }}
          onmouseenter={() => {
            if (menuItem.disabled) return
            focused = index
            subOpen = hasSubmenu ? index : -1
          }}
          onmouseleave={() => {
            focused = -1
          }}
        >
          <span class="icon" class:icon-danger={menuItem.danger}>
            {#if menuItem.icon}
              <menuItem.icon size={13} weight="light" />
            {/if}
          </span>
          <span class="label">{menuItem.label}</span>
          {#if hasSubmenu}
            <span class="sub-arrow">›</span>
          {/if}
        </button>

        {#if hasSubmenu && subOpen === index}
          <div bind:this={subEls[index]} class="menu submenu" role="menu" tabindex="-1" onmouseenter={() => { subOpen = index }}>
            {#each menuItem.children as child, childIndex (childIndex)}
              {#if 'separator' in child}
                <div class="sep"></div>
              {:else}
                {@const childItem = child as MenuItem}
                <button class="item" class:danger={childItem.danger} class:disabled={childItem.disabled} disabled={childItem.disabled} onclick={() => {
                  if (childItem.disabled) return
                  childItem.onClick()
                  onClose()
                }}>
                  <span class="icon" class:icon-danger={childItem.danger}>
                    {#if childItem.icon}
                      <childItem.icon size={13} weight="light" />
                    {/if}
                  </span>
                  <span class="label">{childItem.label}</span>
                </button>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/each}
</div>

<style>
  .menu {
    position: fixed;
    z-index: 200;
    min-width: 190px;
    border: 1px solid var(--border-base);
    border-radius: var(--radius-lg);
    background: var(--bg-raised);
    padding: var(--sp-1);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.35), 0 16px 40px rgba(0, 0, 0, 0.25);
    animation: scaleIn 0.1s ease both;
    transform-origin: top left;
  }

  .item-wrap {
    position: relative;
  }

  .submenu {
    position: absolute;
    left: 100%;
    top: 0;
    z-index: 201;
    animation: scaleIn 0.08s ease both;
    transform-origin: top left;
  }

  :global(.submenu.sub-flip) {
    left: auto;
    right: 100%;
    transform-origin: top right;
  }

  .item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    width: 100%;
    padding: 5px var(--sp-2);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    text-align: left;
    background: none;
    border: none;
    outline: none;
    transition: background var(--t-fast), color var(--t-fast);
  }

  .item:hover:not(.disabled),
  .item.focused:not(.disabled) {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  .item.danger {
    color: var(--color-error);
  }

  .item.danger:hover:not(.disabled),
  .item.danger.focused:not(.disabled) {
    background: var(--color-error-bg);
  }

  .item.disabled {
    opacity: 0.3;
    cursor: default;
    pointer-events: none;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: var(--text-faint);
    border-radius: var(--radius-sm);
  }

  .icon-danger {
    color: var(--color-error);
    opacity: 0.7;
  }

  .label {
    flex: 1;
    line-height: 1.3;
  }

  .sub-arrow {
    font-size: 14px;
    color: var(--text-faint);
    line-height: 1;
    margin-left: auto;
    padding-left: var(--sp-1);
  }

  .sep {
    height: 1px;
    background: var(--border-dim);
    margin: 3px var(--sp-1);
  }
</style>