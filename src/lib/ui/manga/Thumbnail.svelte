<script lang="ts">
  import { getAuthMode } from '$lib/core/auth'
  import { loadImageObjectUrl, resolveImageUrl } from '$lib/core/image'

  interface Props {
    src: string | null | undefined
    alt?: string
    class?: string
    loading?: 'lazy' | 'eager'
    decoding?: 'sync' | 'async' | 'auto'
    draggable?: boolean
  }

  let {
    src,
    alt = '',
    class: className = '',
    loading = 'lazy',
    decoding = 'async',
    draggable = false,
  }: Props = $props()

  let objectUrl = $state<string | null>(null)
  let failed = $state(false)

  const resolvedSrc = $derived(objectUrl ?? resolveImageUrl(src) ?? '')

  $effect(() => {
    const source = src
    failed = false

    if (!source || getAuthMode() === 'NONE') {
      if (objectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
      objectUrl = null
      return
    }

    let active = true
    const controller = new AbortController()
    const previousUrl = objectUrl

    void loadImageObjectUrl(source, controller.signal)
      .then((nextUrl) => {
        if (!active) {
          if (nextUrl.startsWith('blob:')) URL.revokeObjectURL(nextUrl)
          return
        }

        if (previousUrl?.startsWith('blob:') && previousUrl !== nextUrl) {
          URL.revokeObjectURL(previousUrl)
        }

        objectUrl = nextUrl
      })
      .catch(() => {
        if (!active) return
        objectUrl = null
        failed = true
      })

    return () => {
      active = false
      controller.abort()
      if (objectUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  })
</script>

{#if resolvedSrc && !failed}
  <img src={resolvedSrc} {alt} class={className} {loading} {decoding} {draggable} onerror={() => { failed = true }} />
{:else}
  <div class={`placeholder ${className}`.trim()} aria-label={alt || 'Thumbnail unavailable'} role="img">
    <span>no cover</span>
  </div>
{/if}

<style>
  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(160deg, color-mix(in srgb, var(--accent-muted) 60%, transparent), transparent 55%),
      linear-gradient(180deg, var(--bg-raised), var(--bg-overlay));
    color: var(--text-faint);
  }

  .placeholder span {
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    letter-spacing: var(--tracking-wider);
    text-transform: uppercase;
  }
</style>