import {initRequestManager} from '$lib/request-manager';
import {initPlatformService} from '$lib/platform-service';
import {appState} from '$lib/state/app.svelte';
import {configureAuth, probeServer} from '$lib/core/auth';
import {initHistoryState} from '$lib/state/history.svelte';
import {initSettingsState, settingsState, updateSettings} from '$lib/state/settings.svelte';

const SAVED_URL_KEY = 'moku_server_url';
const SAVED_AUTH_KEY = 'moku_auth_config';

interface SavedAuth {
  mode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN';
  user?: string;
  pass?: string;
}

function normalizeAuthMode(mode: string): 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN' {
  return mode === 'BASIC_AUTH' ? 'BASIC_AUTH' : mode === 'UI_LOGIN' || mode === 'SIMPLE_LOGIN' ? 'UI_LOGIN' : 'NONE';
}

function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

function isCapacitor(): boolean {
  return 'Capacitor' in window;
}

function loadSavedServerUrl(): string {
  return localStorage.getItem(SAVED_URL_KEY) ?? 'http://127.0.0.1:4567';
}

function loadSavedAuth(): SavedAuth {
  try {
    return JSON.parse(localStorage.getItem(SAVED_AUTH_KEY) ?? 'null') ?? {mode: 'NONE'};
  } catch {
    return {mode: 'NONE'};
  }
}

async function resolvePlatformAdapter() {
  if (isTauri()) {
    const {TauriAdapter} = await import('$lib/platform-adapters/tauri');
    return new TauriAdapter();
  }
  if (isCapacitor()) {
    const {CapacitorAdapter} = await import('$lib/platform-adapters/capacitor');
    return new CapacitorAdapter();
  }
  const {WebAdapter} = await import('$lib/platform-adapters/web');
  return new WebAdapter();
}

async function resolveServerAdapter() {
  const {SuwayomiAdapter} = await import('$lib/server-adapters/suwayomi');
  return new SuwayomiAdapter();
}

async function boot() {
  try {
    const [serverAdapter, platformAdapter] = await Promise.all([
      resolveServerAdapter(),
      resolvePlatformAdapter(),
    ]);

    await platformAdapter.init();

    initRequestManager(serverAdapter);
    initPlatformService(platformAdapter);

    await Promise.all([
      initSettingsState(),
      initHistoryState(),
    ]);

    appState.platform = isTauri() ? 'tauri' : isCapacitor() ? 'capacitor' : 'web';
    appState.version = await platformAdapter.getVersion();

    const legacyAuth = loadSavedAuth();
    const savedUrl = settingsState.serverUrl || loadSavedServerUrl();
    const savedAuth: SavedAuth = {
      mode: normalizeAuthMode(settingsState.serverAuthMode || legacyAuth.mode),
      user: settingsState.serverAuthUser || legacyAuth.user,
      pass: settingsState.serverAuthPass || legacyAuth.pass,
    };

    updateSettings({
      serverUrl: savedUrl,
      serverAuthMode: savedAuth.mode,
      serverAuthUser: savedAuth.user ?? '',
      serverAuthPass: savedAuth.pass ?? '',
    });

    appState.serverUrl = savedUrl;
    appState.authMode = savedAuth.mode;

    configureAuth(savedUrl, savedAuth.mode, savedAuth.user, savedAuth.pass);
    await serverAdapter.connect({baseUrl: savedUrl});

    const probe = await probeServer();

    if (probe === 'auth_required') {
      appState.status = 'auth';
      return;
    }

    if (probe === 'unreachable') {
      appState.error = `Could not reach server at ${savedUrl}`;
      appState.status = 'error';
      return;
    }

    appState.authenticated = true;
    appState.status = 'ready';
  } catch (e) {
    appState.error = String(e);
    appState.status = 'error';
  }
}

boot();