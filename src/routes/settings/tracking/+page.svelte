<script lang="ts">
  import { onMount } from 'svelte'
  import { trackingState } from '$lib/state/tracking.svelte'
  import {
    loadTrackers,
    loginTrackerOAuth,
    loginTrackerCredentials,
    logoutTracker,
    syncTracking,
  } from '$lib/request-manager/tracking'
  import type { Tracker } from '$lib/types'

  let oauthTrackerId = $state<number | null>(null)
  let oauthCallback = $state('')
  let credsTrackerId = $state<number | null>(null)
  let credsUsername = $state('')
  let credsPassword = $state('')

  async function refreshTrackers() {
    try {
      await loadTrackers()
    } catch (error) {
      trackingState.error = error instanceof Error ? error.message : String(error)
    }
  }

  async function reconnectOAuth() {
    if (!oauthTrackerId || !oauthCallback.trim()) return
    await loginTrackerOAuth(oauthTrackerId, oauthCallback.trim())
    oauthTrackerId = null
    oauthCallback = ''
  }

  async function connectCredentials() {
    if (!credsTrackerId || !credsUsername.trim() || !credsPassword.trim()) return
    await loginTrackerCredentials(credsTrackerId, credsUsername.trim(), credsPassword)
    credsTrackerId = null
    credsUsername = ''
    credsPassword = ''
  }

  async function disconnectTracker(trackerId: number) {
    await logoutTracker(trackerId)
  }

  async function syncAllTrackers() {
    trackingState.syncing = true
    try {
      const mangaIds: number[] = []

      for (const tracker of trackingState.trackers) {
        for (const record of tracker.trackRecords?.nodes ?? []) {
          const mangaId = record.manga?.id
          if (mangaId && !mangaIds.includes(mangaId)) {
            mangaIds.push(mangaId)
          }
        }
      }

      for (const mangaId of mangaIds) {
        await syncTracking(String(mangaId))
      }
    } finally {
      trackingState.syncing = false
    }
  }

  function openOAuth(tracker: Tracker) {
    if (tracker.authUrl) window.open(tracker.authUrl, '_blank', 'noopener')
    oauthTrackerId = tracker.id
    oauthCallback = ''
    credsTrackerId = null
  }

  function openCredentials(tracker: Tracker) {
    credsTrackerId = tracker.id
    credsUsername = ''
    credsPassword = ''
    oauthTrackerId = null
  }

  onMount(() => {
    void refreshTrackers()
  })
</script>

<svelte:head>
  <title>Settings - Tracking</title>
</svelte:head>

<section class="settings-page">
  <header class="settings-page-header">
    <p class="settings-kicker">Tracking</p>
    <h2>Tracker connections</h2>
    <p>Connect trackers and sync progress back to your library.</p>
  </header>

  <div class="settings-card">
    <div class="settings-row">
      <div>
        <div class="settings-label">Connected trackers</div>
        <div class="settings-desc">{trackingState.loading ? 'Loading…' : `${trackingState.trackers.length} trackers found`}</div>
      </div>
      <button class="settings-button" type="button" onclick={() => void refreshTrackers()}>Refresh</button>
    </div>

    {#each trackingState.trackers as tracker (tracker.id)}
      <div class="settings-row settings-tracker-row">
        <div>
          <div class="settings-label">{tracker.name}</div>
          <div class="settings-desc">{tracker.isLoggedIn ? 'Connected' : 'Not connected'}{tracker.isTokenExpired ? ' · token expired' : ''}</div>
        </div>
        <div class="settings-tracker-actions">
          {#if tracker.isLoggedIn}
            <button class="settings-button" type="button" onclick={() => void disconnectTracker(tracker.id)}>Disconnect</button>
          {:else}
            <button class="settings-button" type="button" onclick={() => tracker.authUrl ? openOAuth(tracker) : openCredentials(tracker)}>{tracker.authUrl ? 'Open login' : 'Connect'}</button>
          {/if}
        </div>
      </div>

      {#if oauthTrackerId === tracker.id}
        <div class="settings-row settings-row-stack">
          <div>
            <div class="settings-label">OAuth callback URL</div>
            <div class="settings-desc">Paste the callback URL after authorizing in the browser.</div>
          </div>
          <input class="settings-input settings-input-wide" spellcheck="false" placeholder="https://…#access_token=…" bind:value={oauthCallback} />
          <div class="settings-inline-control">
            <button class="settings-button" type="button" onclick={() => void reconnectOAuth()}>Connect</button>
            <button class="settings-button" type="button" onclick={() => { oauthTrackerId = null; oauthCallback = ''; }}>Cancel</button>
          </div>
        </div>
      {/if}

      {#if credsTrackerId === tracker.id}
        <div class="settings-row settings-row-stack">
          <div>
            <div class="settings-label">Tracker login</div>
            <div class="settings-desc">Use a username and password to connect.</div>
          </div>
          <div class="settings-grid-2">
            <input class="settings-input settings-input-wide" placeholder="Username" bind:value={credsUsername} />
            <input class="settings-input settings-input-wide" type="password" placeholder="Password" bind:value={credsPassword} />
          </div>
          <div class="settings-inline-control">
            <button class="settings-button" type="button" onclick={() => void connectCredentials()}>Connect</button>
            <button class="settings-button" type="button" onclick={() => { credsTrackerId = null; credsUsername = ''; credsPassword = ''; }}>Cancel</button>
          </div>
        </div>
      {/if}
    {/each}

    <div class="settings-row">
      <div>
        <div class="settings-label">Sync back now</div>
        <div class="settings-desc">Apply tracker progress to all linked manga in your library.</div>
      </div>
      <button class="settings-button" type="button" onclick={() => void syncAllTrackers()} disabled={trackingState.syncing}>Sync all</button>
    </div>
  </div>
</section>

<style>
  :global(.settings-tracker-row) {
    border-top: 1px solid var(--border-dim);
  }

  :global(.settings-tracker-actions) {
    display: flex;
    gap: var(--sp-3);
    flex-wrap: wrap;
    justify-content: flex-end;
  }
</style>