import type { DownloadStatus, DownloadQueueItem } from "$lib/types/api";
import {
  loadDownloadStatus, dequeueDownload, dequeueDownloads,
  reorderDownload, clearDownloads, startDownloader, stopDownloader, enqueueDownload,
  getStorageInfo,
} from "$lib/request-manager/downloads";
import { settingsState, updateSettings } from "$lib/state/settings.svelte";
import { addToast }                      from "$lib/state/notifications.svelte";
import {
  isRunning, getErrored, calcSpeed, estimateEta, estimateQueueBytes,
  type SpeedSample,
} from "$lib/components/downloads/lib/downloadQueue";
import { startAutoRetry, type AutoRetryHandle } from "$lib/components/downloads/lib/autoRetry";
import { mount, unmount }                        from "svelte";
import StorageWarningDialog                       from "$lib/components/downloads/StorageWarningDialog.svelte";

class DownloadStore {
  status:        DownloadStatus | null = $state(null);
  loading                              = $state(true);
  togglingPlay                         = $state(false);
  clearing                             = $state(false);
  dequeueing                           = $state(new Set<number>());
  selected                             = $state(new Set<number>());
  batchWorking                         = $state(false);
  pagesPerSec:   number | null         = $state(null);
  eta:           number | null         = $state(null);
  storageWarning                       = $state(false);

  private freeBytes:    number | null      = null;
  private lastSample:   SpeedSample | null = null;
  private prevQueue:    DownloadQueueItem[] = [];
  private autoRetryHnd: AutoRetryHandle | null = null;

  get queue()            { return this.status?.queue ?? []; }
  get isRunning()        { return isRunning(this.status?.state); }
  get erroredIds()       { return new Set(getErrored(this.queue).map(i => i.chapter.id)); }
  get hasErrored()       { return this.erroredIds.size > 0; }
  get toastsEnabled()    { return settingsState.settings.downloadToastsEnabled ?? true; }
  get autoRetryEnabled() { return settingsState.settings.downloadAutoRetry ?? false; }

  private applyStatus(ds: DownloadStatus) {
    this.detectTransitions(ds.queue);
    this.status = ds;
    this.updateSpeed(ds);
    this.syncFreeBytes(ds);
  }

  private updateSpeed(ds: DownloadStatus) {
    const active = ds.queue[0];
    if (!active || active.state !== "DOWNLOADING") {
      this.lastSample = null; this.pagesPerSec = null; this.eta = null;
      return;
    }
    const sample: SpeedSample = { ts: Date.now(), progress: active.progress, pages: active.chapter.pageCount ?? 0 };
    const speed = calcSpeed(this.lastSample, sample);
    this.lastSample = sample;
    if (speed !== null) { this.pagesPerSec = speed; this.eta = estimateEta(speed, ds.queue); }
  }

  private async syncFreeBytes(ds: DownloadStatus) {
    const path = settingsState.settings.serverDownloadsPath ?? "";
    if (!path) return;
    try {
      const info = await getStorageInfo(path);
      this.freeBytes     = info.freeBytes;
      this.storageWarning = estimateQueueBytes(ds.queue) > info.freeBytes * 0.95;
    } catch { }
  }

  private confirmStorageOverrun(): Promise<boolean> {
    return new Promise(resolve => {
      const target = document.createElement("div");
      document.body.appendChild(target);
      const instance = mount(StorageWarningDialog, {
        target,
        props: {
          onConfirm: () => { unmount(instance); target.remove(); resolve(true);  },
          onCancel:  () => { unmount(instance); target.remove(); resolve(false); },
        },
      });
    });
  }

  private async guardStorage(queueAfter: DownloadQueueItem[]): Promise<boolean> {
    if (this.freeBytes === null) return true;
    if (estimateQueueBytes(queueAfter) <= this.freeBytes * 0.95) return true;
    return this.confirmStorageOverrun();
  }

  detectTransitions(next: DownloadQueueItem[]) {
    if (!this.toastsEnabled) return;
    const nextMap = new Map(next.map(i => [i.chapter.id, i]));
    for (const item of this.prevQueue) {
      if (item.state !== "DOWNLOADING") continue;
      const nextItem = nextMap.get(item.chapter.id);
      const label    = item.chapter.manga
        ? `${item.chapter.manga.title} — ${item.chapter.name}`
        : item.chapter.name;
      if (!nextItem)                       addToast({ kind: "download", title: "Chapter downloaded", body: label, duration: 4000 });
      else if (nextItem.state === "ERROR") addToast({ kind: "error",    title: "Download failed",    body: label, duration: 5000 });
    }
    this.prevQueue = next.slice();
  }

  async poll() {
    try {
      const ds = await loadDownloadStatus();
      if (ds) this.applyStatus(ds);
    } catch { } finally {
      this.loading = false;
    }
  }

  async enqueue(chapterId: number): Promise<boolean> {
    const projected = [...this.queue, { chapter: { id: chapterId, pageCount: 0 }, progress: 0, state: "QUEUED" } as DownloadQueueItem];
    if (!(await this.guardStorage(projected))) return false;
    try { await enqueueDownload(String(chapterId)); await this.poll(); } catch { }
    return true;
  }

  toggleToasts() {
    const next = !this.toastsEnabled;
    updateSettings({ downloadToastsEnabled: next });
    addToast({ kind: "info", title: next ? "Notifications enabled" : "Notifications muted", duration: 2500 });
  }

  toggleAutoRetry() {
    if (this.autoRetryEnabled) {
      this.autoRetryHnd?.stop();
      this.autoRetryHnd = null;
      updateSettings({ downloadAutoRetry: false });
      addToast({ kind: "info", title: "Auto-retry disabled", duration: 2500 });
    } else {
      updateSettings({ downloadAutoRetry: true });
      this.autoRetryHnd = startAutoRetry(
        () => this.queue,
        () => this.isRunning,
        () => this.retryAllErrored(),
      );
      addToast({ kind: "info", title: "Auto-retry enabled", duration: 3000 });
    }
  }

  async togglePlay() {
    if (this.togglingPlay) return;
    this.togglingPlay = true;
    const wasRunning = this.isRunning;
    if (this.status) this.status = { ...this.status, state: wasRunning ? "STOPPED" : "STARTED" };
    try {
      const ds = wasRunning ? await stopDownloader() : await startDownloader();
      if (ds) this.applyStatus(ds); else await this.poll();
    } catch { await this.poll(); }
    finally { this.togglingPlay = false; }
  }

  async clear() {
    if (this.clearing) return;
    this.clearing = true;
    this.selected = new Set();
    if (this.status) this.status = { ...this.status, queue: [] };
    try {
      await clearDownloads();
      addToast({ kind: "info", title: "Queue cleared", duration: 2500 });
    } catch { await this.poll(); }
    finally { this.clearing = false; }
  }

  async dequeue(chapterId: number) {
    if (this.dequeueing.has(chapterId)) return;
    this.dequeueing = new Set(this.dequeueing).add(chapterId);
    if (this.status) this.status = { ...this.status, queue: this.queue.filter(i => i.chapter.id !== chapterId) };
    const next = new Set(this.selected); next.delete(chapterId); this.selected = next;
    try { await dequeueDownload(String(chapterId)); await this.poll(); }
    catch { await this.poll(); }
    finally { const s = new Set(this.dequeueing); s.delete(chapterId); this.dequeueing = s; }
  }

  async dequeueSelected() {
    if (this.batchWorking || !this.selected.size) return;
    this.batchWorking = true;
    const ids   = [...this.selected];
    const idSet = new Set(ids);
    this.selected = new Set();
    if (this.status) this.status = { ...this.status, queue: this.queue.filter(i => !idSet.has(i.chapter.id)) };
    try {
      await dequeueDownloads(ids.map(String));
      addToast({ kind: "info", title: `Removed ${ids.length} download${ids.length !== 1 ? "s" : ""}`, duration: 2500 });
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async retryOne(chapterId: number) {
    if (this.dequeueing.has(chapterId)) return;
    this.dequeueing = new Set(this.dequeueing).add(chapterId);
    try {
      await dequeueDownload(String(chapterId));
      const projected = this.queue.filter(i => i.chapter.id !== chapterId);
      if (!(await this.guardStorage(projected))) { await this.poll(); return; }
      await enqueueDownload(String(chapterId));
      await this.poll();
    } catch { await this.poll(); }
    finally { const s = new Set(this.dequeueing); s.delete(chapterId); this.dequeueing = s; }
  }

  async retryAllErrored() {
    if (this.batchWorking || !this.hasErrored) return;
    this.batchWorking = true;
    const ids = [...this.erroredIds];
    try {
      await dequeueDownloads(ids.map(String));
      const projected = this.queue.filter(i => !this.erroredIds.has(i.chapter.id));
      if (!(await this.guardStorage(projected))) { await this.poll(); return; }
      for (const id of ids) await enqueueDownload(String(id));
      addToast({ kind: "info", title: `Retrying ${ids.length} failed download${ids.length !== 1 ? "s" : ""}`, duration: 3000 });
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async retrySelected() {
    if (this.batchWorking || !this.selected.size) return;
    this.batchWorking = true;
    const ids     = [...this.selected].filter(id => this.erroredIds.has(id));
    this.selected = new Set();
    try {
      if (ids.length) {
        await dequeueDownloads(ids.map(String));
        const projected = this.queue.filter(i => !new Set(ids).has(i.chapter.id));
        if (!(await this.guardStorage(projected))) { await this.poll(); return; }
        for (const id of ids) await enqueueDownload(String(id));
        addToast({ kind: "info", title: `Retrying ${ids.length} failed download${ids.length !== 1 ? "s" : ""}`, duration: 3000 });
      }
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async reorder(chapterId: number, direction: "up" | "down") {
    const idx = this.queue.findIndex(i => i.chapter.id === chapterId);
    if (idx === -1) return;
    const to = direction === "up" ? idx - 1 : idx + 1;
    if (to < 0 || to >= this.queue.length) return;
    const newQueue = [...this.queue];
    [newQueue[idx], newQueue[to]] = [newQueue[to], newQueue[idx]];
    if (this.status) this.status = { ...this.status, queue: newQueue };
    try {
      const ds = await reorderDownload(chapterId, to);
      if (ds) this.applyStatus(ds); else await this.poll();
    } catch { await this.poll(); }
  }

  async reorderSelected(direction: "up" | "down", step: number = 1) {
    if (this.batchWorking || !this.selected.size) return;
    this.batchWorking = true;
    const queue           = [...this.queue];
    const selectedIndices = queue
      .map((item, i) => ({ id: item.chapter.id, i }))
      .filter(({ id }) => this.selected.has(id))
      .map(({ i }) => i)
      .sort((a, b) => direction === "up" ? a - b : b - a);

    if (direction === "up"   && selectedIndices[0] === 0)                { this.batchWorking = false; return; }
    if (direction === "down" && selectedIndices[0] === queue.length - 1) { this.batchWorking = false; return; }

    const newQueue = [...queue];
    for (const idx of selectedIndices) {
      const to = direction === "up" ? Math.max(0, idx - step) : Math.min(newQueue.length - 1, idx + step);
      [newQueue[idx], newQueue[to]] = [newQueue[to], newQueue[idx]];
    }
    if (this.status) this.status = { ...this.status, queue: newQueue };
    try {
      for (const idx of selectedIndices) {
        const to = direction === "up" ? Math.max(0, idx - step) : Math.min(queue.length - 1, idx + step);
        await reorderDownload(queue[idx].chapter.id, to);
      }
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async reorderToEdge(chapterId: number, edge: "top" | "bottom") {
    const idx   = this.queue.findIndex(i => i.chapter.id === chapterId);
    if (idx === -1) return;
    const first = this.isRunning ? 1 : 0;
    const last  = this.queue.length - 1;
    const to    = edge === "top" ? first : last;
    if (idx === to) return;
    const newQueue = [...this.queue];
    newQueue.splice(idx, 1);
    newQueue.splice(to, 0, this.queue[idx]);
    if (this.status) this.status = { ...this.status, queue: newQueue };
    try {
      const ds = await reorderDownload(chapterId, to);
      if (ds) this.applyStatus(ds); else await this.poll();
    } catch { await this.poll(); }
  }

  async reorderSelectedToEdge(edge: "top" | "bottom") {
    if (this.batchWorking || !this.selected.size) return;
    this.batchWorking = true;
    const first    = this.isRunning ? 1 : 0;
    const active   = this.queue.slice(0, first);
    const moveable = this.queue.slice(first);
    const pinned   = moveable.filter(i => this.selected.has(i.chapter.id));
    const rest     = moveable.filter(i => !this.selected.has(i.chapter.id));
    const newQueue = edge === "top" ? [...active, ...pinned, ...rest] : [...active, ...rest, ...pinned];
    if (this.status) this.status = { ...this.status, queue: newQueue };
    const last = this.queue.length - 1;
    try {
      if (edge === "top") {
        for (let i = 0; i < pinned.length; i++)
          await reorderDownload(pinned[i].chapter.id, first + i);
      } else {
        for (let i = 0; i < pinned.length; i++)
          await reorderDownload(pinned[i].chapter.id, last - (pinned.length - 1 - i));
      }
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async moveSeries(items: DownloadQueueItem[], direction: "up" | "down") {
    if (this.batchWorking || !items.length) return;
    const targetMangaId = items[0]?.chapter.manga?.id ?? 0;
    const groupOrder: number[] = [];
    for (const item of this.queue) {
      const mId = item.chapter.manga?.id ?? 0;
      if (!groupOrder.includes(mId)) groupOrder.push(mId);
    }
    const gIdx = groupOrder.indexOf(targetMangaId);
    if (gIdx === -1) return;
    const targetIdx = direction === "up" ? gIdx - 1 : gIdx + 1;
    if (targetIdx < 0 || targetIdx >= groupOrder.length) return;

    this.batchWorking = true;
    [groupOrder[gIdx], groupOrder[targetIdx]] = [groupOrder[targetIdx], groupOrder[gIdx]];

    const map = new Map<number, DownloadQueueItem[]>();
    for (const item of this.queue) {
      const mId = item.chapter.manga?.id ?? 0;
      if (!map.has(mId)) map.set(mId, []);
      map.get(mId)!.push(item);
    }

    const first = this.isRunning ? 1 : 0;
    const active = this.queue.slice(0, first);
    const reorderedMoveable: DownloadQueueItem[] = [];
    for (const mId of groupOrder) {
      const groupItems = map.get(mId) ?? [];
      for (const item of groupItems) {
        if (first === 1 && item.chapter.id === active[0]?.chapter.id) continue;
        reorderedMoveable.push(item);
      }
    }
    const newQueue = [...active, ...reorderedMoveable];
    if (this.status) this.status = { ...this.status, queue: newQueue };
    try {
      for (let i = 0; i < reorderedMoveable.length; i++) {
        await reorderDownload(reorderedMoveable[i].chapter.id, first + i);
      }
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async moveSeriesToTop(items: DownloadQueueItem[]) {
    if (this.batchWorking || !items.length) return;
    this.batchWorking = true;
    const seriesIdSet = new Set(items.map(i => i.chapter.id));
    const first  = this.isRunning ? 1 : 0;
    const active = this.queue.slice(0, first);
    const moveable = this.queue.slice(first);
    const seriesItems = moveable.filter(i => seriesIdSet.has(i.chapter.id));
    const rest        = moveable.filter(i => !seriesIdSet.has(i.chapter.id));
    const newQueue    = [...active, ...seriesItems, ...rest];
    if (this.status) this.status = { ...this.status, queue: newQueue };
    try {
      for (let i = 0; i < seriesItems.length; i++) {
        await reorderDownload(seriesItems[i].chapter.id, first + i);
      }
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async moveSeriesToBottom(items: DownloadQueueItem[]) {
    if (this.batchWorking || !items.length) return;
    this.batchWorking = true;
    const seriesIdSet = new Set(items.map(i => i.chapter.id));
    const first  = this.isRunning ? 1 : 0;
    const active = this.queue.slice(0, first);
    const moveable = this.queue.slice(first);
    const seriesItems = moveable.filter(i => seriesIdSet.has(i.chapter.id));
    const rest        = moveable.filter(i => !seriesIdSet.has(i.chapter.id));
    const newQueue    = [...active, ...rest, ...seriesItems];
    if (this.status) this.status = { ...this.status, queue: newQueue };
    const last = this.queue.length - 1;
    try {
      for (let i = 0; i < seriesItems.length; i++) {
        await reorderDownload(seriesItems[i].chapter.id, last - (seriesItems.length - 1 - i));
      }
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  async reverseSeriesOrder(items: DownloadQueueItem[]) {
    if (this.batchWorking || items.length <= 1) return;
    this.batchWorking = true;
    const seriesIdSet = new Set(items.map(i => i.chapter.id));
    const seriesIndices = this.queue
      .map((item, i) => ({ id: item.chapter.id, i }))
      .filter(({ id }) => seriesIdSet.has(id))
      .map(({ i }) => i);

    const reversedItems = items.slice().reverse();
    const newQueue = [...this.queue];
    for (let k = 0; k < seriesIndices.length; k++) {
      newQueue[seriesIndices[k]] = reversedItems[k];
    }
    if (this.status) this.status = { ...this.status, queue: newQueue };
    try {
      for (let k = 0; k < seriesIndices.length; k++) {
        await reorderDownload(reversedItems[k].chapter.id, seriesIndices[k]);
      }
      await this.poll();
    } catch { await this.poll(); }
    finally { this.batchWorking = false; }
  }

  selectOnly(chapterId: number)   { this.selected = new Set([chapterId]); }
  toggleSelect(chapterId: number) {
    const next = new Set(this.selected);
    next.has(chapterId) ? next.delete(chapterId) : next.add(chapterId);
    this.selected = next;
  }
  selectRange(fromId: number, toId: number) {
    const ids = this.queue.map(i => i.chapter.id);
    const a = ids.indexOf(fromId), b = ids.indexOf(toId);
    if (a === -1 || b === -1) return;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const next = new Set(this.selected);
    for (let i = lo; i <= hi; i++) next.add(ids[i]);
    this.selected = next;
  }
  selectAll()      { this.selected = new Set(this.queue.map(i => i.chapter.id)); }
  clearSelection() { this.selected = new Set(); }
}

export const downloadStore = new DownloadStore();