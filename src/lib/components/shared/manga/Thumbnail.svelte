<script lang="ts">
  import { settingsState } from "$lib/state/settings.svelte";
  import { getBlobUrl }    from "$lib/core/cache/imageCache";

  let {
    src,
    alt        = "",
    class: cls = "",
    loading    = "lazy",
    decoding   = "async",
    priority   = 0,
    onerror    = undefined,
    ...rest
  }: {
    src:       string | null | undefined;
    alt?:      string;
    class?:    string;
    loading?:  string;
    decoding?: string;
    priority?: number;
    onerror?:  ((e: Event) => void) | undefined;
    [key: string]: any;
  } = $props();

  function getServerUrl(): string {
    const url = settingsState.settings.serverUrl;
    return typeof url === "string" && url.trim() ? url.replace(/\/$/, "") : "http://127.0.0.1:4567";
  }

  function plainThumbUrl(path: string | null | undefined): string {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${getServerUrl()}${path}`;
  }

  const isAuth = $derived((settingsState.settings.serverAuthMode ?? "NONE") !== "NONE");

  let blobUrl = $state("");
  let reqId   = 0;

  $effect(() => {
    const _src      = src;
    const _priority = priority;
    const _isAuth   = isAuth;

    if (!_isAuth || !_src) { blobUrl = ""; return; }

    const id      = ++reqId;
    const bareUrl = _src.startsWith("http") ? _src : `${getServerUrl()}${_src}`;
    getBlobUrl(bareUrl, _priority)
      .then(u  => { if (id === reqId) blobUrl = u; })
      .catch(() => { if (id === reqId) blobUrl = ""; });
  });

  const plainUrl  = $derived(plainThumbUrl(src));
  const resolved  = $derived(isAuth ? (blobUrl || plainUrl) || undefined : plainUrl || undefined);
</script>

<img src={resolved} {alt} class={cls} {loading} {decoding} {onerror} {...rest} />