import { store, updateSettings } from "@store/state.svelte";

export type AuthMode = "NONE" | "BASIC_AUTH" | "UI_LOGIN";

export class AuthRequiredError extends Error {
  constructor(msg = "Authentication required") {
    super(msg);
    this.name = "AuthRequiredError";
  }
}

const TOKEN_KEY = "moku_access_token";
const UI_SESSION_KEY = "moku_ui_auth_session";
const TOKEN_REFRESH_SKEW_MS = 30_000;
const AUTH_DEBUG = Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

interface StoredAccessToken {
  base: string;
  token: string;
}

interface StoredUiAuthSession {
  base: string;
  accessToken: string;
  refreshToken?: string;
  clientMutationId?: string;
  accessExpiresAt?: number | null;
  refreshExpiresAt?: number | null;
}

interface JwtSettings {
  jwtAudience?: string | null;
  jwtRefreshExpiry?: string | null;
  jwtTokenExpiry?: string | null;
}

export interface UiAuthDebugStatus {
  mode: AuthMode;
  serverBase: string;
  hasSession: boolean;
  hasRefreshToken: boolean;
  accessExpiresAt: number | null;
  refreshExpiresAt: number | null;
  accessExpiresInMs: number | null;
  refreshExpiresInMs: number | null;
  shouldRefreshSoon: boolean;
  refreshInFlight: boolean;
  skewMs: number;
}

let _accessToken: string | null = null;
let _accessTokenBase: string | null = null;
let _uiSession: StoredUiAuthSession | null = null;
let _refreshPromise: Promise<string | null> | null = null;
let _jwtSettingsBase: string | null = null;
let _jwtSettings: JwtSettings | null = null;
let _jwtSettingsFetchedAt = 0;

function authDebug(event: string, fields?: Record<string, unknown>) {
  if (!AUTH_DEBUG) return;
  if (fields) {
    console.debug(`[auth] ${event}`, fields);
    return;
  }
  console.debug(`[auth] ${event}`);
}

function parseIsoDuration(duration: string): number | null {
  try {
    const match = duration.match(
      /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/
    );
    if (!match) return null;
    const [, years, months, days, hours, minutes, seconds] = match;
    let ms = 0;
    if (years) ms += parseInt(years) * 365.25 * 24 * 60 * 60 * 1000;
    if (months) ms += parseInt(months) * 30.44 * 24 * 60 * 60 * 1000;
    if (days) ms += parseInt(days) * 24 * 60 * 60 * 1000;
    if (hours) ms += parseInt(hours) * 60 * 60 * 1000;
    if (minutes) ms += parseInt(minutes) * 60 * 1000;
    if (seconds) ms += parseFloat(seconds) * 1000;
    return ms;
  } catch {
    return null;
  }
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = atob(padded);
    const json = JSON.parse(decoded) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpired(expiresAt?: number | null, skewMs = TOKEN_REFRESH_SKEW_MS): boolean {
  if (!expiresAt || !Number.isFinite(expiresAt)) return false;
  return Date.now() >= expiresAt - skewMs;
}

function withExpiryFromSettings(
  accessToken: string,
  jwt: JwtSettings | null,
): Pick<StoredUiAuthSession, "accessExpiresAt" | "refreshExpiresAt"> {
  const now = Date.now();
  const accessExpiresAt =
    decodeJwtExpiryMs(accessToken)
    ?? (typeof jwt?.jwtTokenExpiry === "string" ? now + (parseIsoDuration(jwt.jwtTokenExpiry) ?? 0) : null);
  const refreshExpiresAt =
    typeof jwt?.jwtRefreshExpiry === "string" ? now + (parseIsoDuration(jwt.jwtRefreshExpiry) ?? 0) : null;
  return { accessExpiresAt, refreshExpiresAt };
}

async function fetchJwtSettings(base: string): Promise<JwtSettings | null> {
  const res = await fetchAuthenticated(
    `${base}/api/graphql`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: gqlBody(
        `query GetJWTSettings {
           settings {
             jwtAudience
             jwtRefreshExpiry
             jwtTokenExpiry
           }
         }`,
      ),
    },
    timeoutSignal(5000),
  );

  if (!res.ok) {
    authDebug("JWT settings fetch failed", { status: res.status });
    return null;
  }

  const json = await res.json();
  if (json?.errors?.length) {
    authDebug("JWT settings query error", { errors: json.errors });
    return null;
  }

  const settings = json?.data?.settings;
  if (!settings || typeof settings !== "object") {
    authDebug("JWT settings missing or invalid", { settings });
    return null;
  }

  authDebug("JWT settings fetched", {
    hasAudience: !!settings.jwtAudience,
    tokenExpiry: settings.jwtTokenExpiry,
    refreshExpiry: settings.jwtRefreshExpiry,
  });

  return {
    jwtAudience: typeof settings.jwtAudience === "string" ? settings.jwtAudience : null,
    jwtRefreshExpiry: typeof settings.jwtRefreshExpiry === "string" ? settings.jwtRefreshExpiry : null,
    jwtTokenExpiry: typeof settings.jwtTokenExpiry === "string" ? settings.jwtTokenExpiry : null,
  };
}

async function getJwtSettings(force = false): Promise<JwtSettings | null> {
  const base = getServerBase();
  const freshEnough = Date.now() - _jwtSettingsFetchedAt < 60_000;
  if (!force && _jwtSettingsBase === base && _jwtSettings && freshEnough) return _jwtSettings;

  const jwt = await fetchJwtSettings(base);
  _jwtSettingsBase = base;
  _jwtSettings = jwt;
  _jwtSettingsFetchedAt = Date.now();
  return jwt;
}

export const uiAuth = {
  getSession: () => {
    const base = getServerBase();
    if (_uiSession && _uiSession.base === base) return _uiSession;

    const stored = readStoredSession();
    if (!stored) return null;
    if (stored.base !== base) {
      sessionStorage.removeItem(UI_SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      _uiSession = null;
      _accessToken = null;
      _accessTokenBase = null;
      return null;
    }

    _uiSession = stored;
    _accessToken = stored.accessToken;
    _accessTokenBase = stored.base;
    return _uiSession;
  },
  setSession: (session: Omit<StoredUiAuthSession, "base">) => {
    const base = getServerBase();
    _uiSession = { ...session, base };
    _accessToken = session.accessToken;
    _accessTokenBase = base;
    sessionStorage.setItem(UI_SESSION_KEY, JSON.stringify(_uiSession));
    sessionStorage.removeItem(TOKEN_KEY);
  },
  getToken: () => {
    const session = uiAuth.getSession();
    if (!session) return null;

    if (isExpired(session.accessExpiresAt, 0)) return null;

    const base = getServerBase();
    if (_accessToken && _accessTokenBase === base) return _accessToken;
    const stored = readStoredToken();
    if (!stored) return null;
    if (stored.base !== base) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(UI_SESSION_KEY);
      _accessToken = null;
      _accessTokenBase = null;
      _uiSession = null;
      return null;
    }
    _accessToken = stored.token;
    _accessTokenBase = stored.base;
    return _accessToken;
  },
  setToken: (t: string) => {
    const existing = uiAuth.getSession();
    if (existing?.refreshToken) {
      uiAuth.setSession({
        ...existing,
        accessToken: t,
        ...withExpiryFromSettings(t, _jwtSettings),
      });
      return;
    }
    const base = getServerBase();
    _accessToken = t;
    _accessTokenBase = base;
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ base, token: t }));
  },
  setLoginSession: (payload: { accessToken: string; refreshToken: string; clientMutationId?: string }, jwt: JwtSettings | null) => {
    uiAuth.setSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      clientMutationId: payload.clientMutationId,
      ...withExpiryFromSettings(payload.accessToken, jwt),
    });
  },
  updateAccessToken: (payload: { accessToken: string; clientMutationId?: string }, jwt: JwtSettings | null) => {
    const existing = uiAuth.getSession();
    if (!existing?.refreshToken) {
      uiAuth.setToken(payload.accessToken);
      return;
    }
    uiAuth.setSession({
      ...existing,
      accessToken: payload.accessToken,
      clientMutationId: payload.clientMutationId ?? existing.clientMutationId,
      ...withExpiryFromSettings(payload.accessToken, jwt),
      refreshToken: existing.refreshToken,
    });
  },
  clearToken: () => {
    _accessToken = null;
    _accessTokenBase = null;
    _uiSession = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(UI_SESSION_KEY);
  },
};

export const authSession = {
  clearTokens() {
    _refreshPromise = null;
    _jwtSettings = null;
    _jwtSettingsBase = null;
    _jwtSettingsFetchedAt = 0;
    uiAuth.clearToken();
  },
  hasSession(): boolean {
    const mode = store.settings.serverAuthMode ?? "NONE";
    if (mode === "UI_LOGIN") return uiAuth.getSession() !== null;
    return true;
  },
};

function getServerBase(): string {
  const url = store.settings.serverUrl;
  return typeof url === "string" && url.trim() ? url.replace(/\/$/, "") : "http://127.0.0.1:4567";
}

function readStoredToken(): StoredAccessToken | null {
  const session = readStoredSession();
  if (session) return { base: session.base, token: session.accessToken };

  const raw = sessionStorage.getItem(TOKEN_KEY);
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.base === "string" && typeof parsed?.token === "string")
        return { base: parsed.base, token: parsed.token };
    } catch {}

    const migrated = { base: getServerBase(), token: raw.trim() };
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return null;
}

function readStoredSession(): StoredUiAuthSession | null {
  const raw = sessionStorage.getItem(UI_SESSION_KEY);
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.base === "string" && typeof parsed?.accessToken === "string") {
        return {
          base: parsed.base,
          accessToken: parsed.accessToken,
          refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : undefined,
          clientMutationId: typeof parsed.clientMutationId === "string" ? parsed.clientMutationId : undefined,
          accessExpiresAt: typeof parsed.accessExpiresAt === "number" ? parsed.accessExpiresAt : null,
          refreshExpiresAt: typeof parsed.refreshExpiresAt === "number" ? parsed.refreshExpiresAt : null,
        };
      }
    } catch {}
  }

  const legacy = sessionStorage.getItem(TOKEN_KEY);
  if (!legacy?.trim()) return null;

  try {
    const parsed = JSON.parse(legacy);
    if (typeof parsed?.base === "string" && typeof parsed?.token === "string") {
      const migrated: StoredUiAuthSession = { base: parsed.base, accessToken: parsed.token };
      sessionStorage.setItem(UI_SESSION_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}

  const migrated: StoredUiAuthSession = { base: getServerBase(), accessToken: legacy.trim() };
  sessionStorage.setItem(UI_SESSION_KEY, JSON.stringify(migrated));
  return migrated;
}

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function basicHeader(user: string, pass: string): Record<string, string> {
  return { Authorization: `Basic ${btoa(`${user}:${pass}`)}` };
}

function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function gqlBody(query: string, variables?: Record<string, unknown>): string {
  return JSON.stringify({ query, ...(variables ? { variables } : {}) });
}

export async function fetchAuthenticated(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
  skipped = false,
): Promise<Response> {
  const mode        = store.settings.serverAuthMode ?? "NONE";
  const baseHeaders = (init.headers ?? {}) as Record<string, string>;

  if (mode === "BASIC_AUTH") {
    const user = store.settings.serverAuthUser?.trim() ?? "";
    const pass = store.settings.serverAuthPass?.trim() ?? "";
    return fetch(url, {
      ...init, signal, credentials: "omit",
      headers: { ...baseHeaders, ...(user && pass ? basicHeader(user, pass) : {}) },
    });
  }

  if (mode === "UI_LOGIN") {
    const token = await getUIAccessToken();
    if (!token) {
      if (skipped) return fetch(url, { ...init, signal, credentials: "omit", headers: baseHeaders });
      throw new AuthRequiredError();
    }

    let res = await fetch(url, {
      ...init, signal, credentials: "omit",
      headers: { ...baseHeaders, ...bearerHeader(token) },
    });

    if (res.status !== 401 || skipped) return res;

    const refreshed = await refreshUiAccessToken(true);
    if (!refreshed) return res;

    res = await fetch(url, {
      ...init, signal, credentials: "omit",
      headers: { ...baseHeaders, ...bearerHeader(refreshed) },
    });
    return res;
  }

  return fetch(url, { ...init, signal, credentials: "omit" });
}

export async function getUIAccessToken(forceRefresh = false): Promise<string | null> {
  const session = uiAuth.getSession();
  if (!session) return null;
  if (forceRefresh || isExpired(session.accessExpiresAt)) {
    return refreshUiAccessToken(true);
  }
  return session.accessToken;
}

export async function refreshUiAccessToken(force = false): Promise<string | null> {
  const session = uiAuth.getSession();
  if (!session) return null;
  if (!session.refreshToken) {
    if (force && isExpired(session.accessExpiresAt, 0)) return null;
    return session.accessToken;
  }

  if (!force && !isExpired(session.accessExpiresAt)) return session.accessToken;
  if (isExpired(session.refreshExpiresAt)) {
    authDebug("refresh skipped: refresh token expired", {
      force,
      refreshExpiresAt: session.refreshExpiresAt ?? null,
    });
    uiAuth.clearToken();
    return null;
  }

  if (_refreshPromise) {
    authDebug("refresh joined existing request");
    return _refreshPromise;
  }

  authDebug("refresh start", {
    force,
    accessExpiresAt: session.accessExpiresAt ?? null,
    refreshExpiresAt: session.refreshExpiresAt ?? null,
  });

  _refreshPromise = (async () => {
    const base = getServerBase();
    const jwt = await getJwtSettings().catch(() => null);

    const res = await fetch(`${base}/api/graphql`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: gqlBody(
        `mutation RefreshToken($refreshToken: String!, $clientMutationId: String) {
           refreshToken(input: { refreshToken: $refreshToken, clientMutationId: $clientMutationId }) {
             accessToken
             clientMutationId
           }
         }`,
        { refreshToken: session.refreshToken, clientMutationId: session.clientMutationId ?? undefined },
      ),
      signal: timeoutSignal(5000),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        authDebug("refresh rejected by server", { status: res.status });
        uiAuth.clearToken();
        return null;
      }
      authDebug("refresh failed with HTTP error", { status: res.status });
      throw new Error(`Token refresh failed (${res.status})`);
    }

    const json = await res.json();
    const refreshed = json?.data?.refreshToken;
    const nextAccessToken: string | undefined = refreshed?.accessToken;
    if (!nextAccessToken) {
      const msg = json?.errors?.[0]?.message;
      if (msg && /unauthorized|unauthenticated|forbidden/i.test(msg)) {
        authDebug("refresh rejected by GraphQL error", { message: msg });
        uiAuth.clearToken();
        return null;
      }
      authDebug("refresh returned no access token", { message: msg ?? null });
      throw new Error(msg ?? "Token refresh failed");
    }

    uiAuth.updateAccessToken(
      {
        accessToken: nextAccessToken,
        clientMutationId: typeof refreshed?.clientMutationId === "string"
          ? refreshed.clientMutationId
          : session.clientMutationId,
      },
      jwt,
    );
    authDebug("refresh success", {
      nextAccessExpiresAt: uiAuth.getSession()?.accessExpiresAt ?? null,
    });
    return nextAccessToken;
  })()
    .catch((e: unknown) => {
      authDebug("refresh threw error", {
        message: e instanceof Error ? e.message : String(e),
      });
      throw e;
    })
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

export function getUiAuthDebugStatus(now = Date.now()): UiAuthDebugStatus {
  const session = uiAuth.getSession();
  const accessExpiresAt = session?.accessExpiresAt ?? null;
  const refreshExpiresAt = session?.refreshExpiresAt ?? null;

  return {
    mode: (store.settings.serverAuthMode ?? "NONE") as AuthMode,
    serverBase: getServerBase(),
    hasSession: !!session,
    hasRefreshToken: !!session?.refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
    accessExpiresInMs: accessExpiresAt ? accessExpiresAt - now : null,
    refreshExpiresInMs: refreshExpiresAt ? refreshExpiresAt - now : null,
    shouldRefreshSoon: isExpired(accessExpiresAt),
    refreshInFlight: _refreshPromise !== null,
    skewMs: TOKEN_REFRESH_SKEW_MS,
  };
}

export async function loginUI(user: string, pass: string): Promise<void> {
  const res = await fetch(`${getServerBase()}/api/graphql`, {
    method: "POST", credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: gqlBody(
      `mutation Login($username: String!, $password: String!) {
         login(input: { username: $username, password: $password }) {
           accessToken
           refreshToken
           clientMutationId
         }
       }`,
      { username: user, password: pass },
    ),
    signal: timeoutSignal(8000),
  });
  if (!res.ok) throw new Error(`Login request failed (${res.status})`);
  const json = await res.json();
  const payload = json?.data?.login;
  const accessToken: string | undefined = payload?.accessToken;
  const refreshToken: string | undefined = payload?.refreshToken;
  if (!accessToken || !refreshToken) throw new Error(json?.errors?.[0]?.message ?? "Login failed");

  authDebug("login success", { user });

  const preliminarySession = {
    accessToken,
    refreshToken,
    clientMutationId: typeof payload?.clientMutationId === "string" ? payload.clientMutationId : undefined,
  };

  uiAuth.setLoginSession(preliminarySession, null);
  updateSettings({ serverAuthMode: "UI_LOGIN", serverAuthUser: user, serverAuthPass: "" });

  const jwt = await getJwtSettings(true).catch(() => null);
  uiAuth.setLoginSession(preliminarySession, jwt);
}

export async function loginBasic(user: string, pass: string): Promise<void> {
  const res = await fetch(`${getServerBase()}/api/graphql`, {
    method: "POST", credentials: "omit",
    headers: { "Content-Type": "application/json", ...basicHeader(user, pass) },
    body: gqlBody("{ __typename }"),
    signal: timeoutSignal(5000),
  });
  if (!res.ok) throw new Error(`Authentication failed (${res.status})`);
  updateSettings({ serverAuthMode: "BASIC_AUTH", serverAuthUser: user, serverAuthPass: pass });
}

export async function logout(): Promise<void> {
  uiAuth.clearToken();
  updateSettings({ serverAuthPass: "", serverAuthMode: "NONE" });
}

export async function probeServer(): Promise<"ok" | "auth_required" | "unreachable"> {
  const base = getServerBase();
  const mode = store.settings.serverAuthMode ?? "NONE";
  const s    = store.settings;
  const token = mode === "UI_LOGIN" ? await getUIAccessToken() : null;

  if (mode === "UI_LOGIN" && !token) return "auth_required";

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (mode === "BASIC_AUTH") {
      const user = s.serverAuthUser?.trim() ?? "";
      const pass = s.serverAuthPass?.trim() ?? "";
      if (user && pass) Object.assign(headers, basicHeader(user, pass));
    } else if (mode === "UI_LOGIN" && token) {
      Object.assign(headers, bearerHeader(token));
    }

    const res = await fetch(`${base}/api/graphql`, {
      method: "POST", credentials: "omit", headers,
      body: gqlBody("{ __typename }"),
      signal: timeoutSignal(5000),
    });

    if (res.ok) return "ok";
    if (res.status === 401) return "auth_required";
    return "unreachable";
  } catch {
    return "unreachable";
  }
}