<script lang="ts">
  import { settings } from "$lib/state/settings.svelte";
  import { getBlobUrl } from "$lib/core/cache/imageCache";
  import { platformService } from "$lib/platform-service/index";

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
    src:       string;
    alt?:      string;
    class?:    string;
    loading?:  string;
    decoding?: string;
    priority?: number;
    onerror?:  ((e: Event) => void) | undefined;
    [key: string]: any;
  } = $props();

  const isAuth = $derived((settings.serverAuthMode ?? "NONE") !== "NONE");

  let blobUrl = $state("");
  let reqId   = 0;

  $effect(() => {
    const _src      = src;
    const _priority = priority;
    const _isAuth   = isAuth;

    if (!_isAuth || !_src) { blobUrl = ""; return; }

    const id     = ++reqId;
    const bareUrl = _src.startsWith("http") ? _src : `${platformService.getServerUrl()}${_src}`;
    getBlobUrl(bareUrl, _priority)
      .then(u  => { if (id === reqId) blobUrl = u; })
      .catch(() => { if (id === reqId) blobUrl = ""; });
  });

  const resolved = $derived(
    isAuth
      ? (blobUrl || undefined)
      : (src ? platformService.plainThumbUrl(src) : undefined)
  );
</script>

<img src={resolved} {alt} class={cls} {loading} {decoding} {onerror} {...rest} />