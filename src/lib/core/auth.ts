export type AuthMode = 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN'

export class AuthRequiredError extends Error {
  constructor(msg = 'Authentication required') {
    super(msg)
    this.name = 'AuthRequiredError'
  }
}

const TOKEN_KEY         = 'moku_access_token'
const UI_SESSION_KEY    = 'moku_ui_auth_session'
const REFRESH_SKEW_MS   = 30_000

interface StoredToken {
  base: string
  token: string
}

interface UiSession {
  base:              string
  accessToken:       string
  refreshToken?:     string
  clientMutationId?: string
  accessExpiresAt?:  number | null
  refreshExpiresAt?: number | null
}

interface JwtSettings {
  jwtAudience?:     string | null
  jwtRefreshExpiry?: string | null
  jwtTokenExpiry?:   string | null
}

let _session:             UiSession | null = null
let _accessToken:         string | null    = null
let _accessTokenBase:     string | null    = null
let _refreshPromise:      Promise<string | null> | null = null
let _jwtSettings:         JwtSettings | null = null
let _jwtSettingsBase:     string | null    = null
let _jwtSettingsFetchedAt = 0

let _serverBase = 'http://127.0.0.1:4567'
let _authMode:   AuthMode = 'NONE'
let _basicUser   = ''
let _basicPass   = ''

export function configureAuth(base: string, mode: AuthMode, user = '', pass = '') {
  _serverBase  = base.replace(/\/$/, '')
  _authMode    = mode
  _basicUser   = user
  _basicPass   = pass
}

export function getServerBase(): string {
  return _serverBase
}

export function getAuthMode(): AuthMode {
  return _authMode
}

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

function gqlBody(query: string, variables?: Record<string, unknown>): string {
  return JSON.stringify({ query, variables })
}

function basicHeader(user: string, pass: string): Record<string, string> {
  return { Authorization: 'Basic ' + btoa(`${user}:${pass}`) }
}

function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

function parseIsoDuration(d: string): number | null {
  const m = d.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/)
  if (!m) return null
  let ms = 0
  if (m[1]) ms += +m[1] * 365.25 * 86400000
  if (m[2]) ms += +m[2] * 30.44  * 86400000
  if (m[3]) ms += +m[3] * 86400000
  if (m[4]) ms += +m[4] * 3600000
  if (m[5]) ms += +m[5] * 60000
  if (m[6]) ms += parseFloat(m[6]) * 1000
  return ms
}

function decodeJwtExpiry(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const pad  = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(pad.padEnd(pad.length + ((4 - pad.length % 4) % 4), '='))) as { exp?: number }
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch { return null }
}

function isExpired(at?: number | null, skew = REFRESH_SKEW_MS): boolean {
  if (!at || !Number.isFinite(at)) return false
  return Date.now() >= at - skew
}

function readStoredSession(): UiSession | null {
  try { return JSON.parse(sessionStorage.getItem(UI_SESSION_KEY) ?? 'null') } catch { return null }
}

function readStoredToken(): StoredToken | null {
  try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null') } catch { return null }
}

export const uiAuth = {
  getSession(): UiSession | null {
    if (_session?.base === _serverBase) return _session
    const stored = readStoredSession()
    if (!stored || stored.base !== _serverBase) {
      sessionStorage.removeItem(UI_SESSION_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      _session = _accessToken = _accessTokenBase = null
      return null
    }
    _session = stored
    _accessToken = stored.accessToken
    _accessTokenBase = stored.base
    return _session
  },

  setSession(session: Omit<UiSession, 'base'>) {
    _session = { ...session, base: _serverBase }
    _accessToken = session.accessToken
    _accessTokenBase = _serverBase
    sessionStorage.setItem(UI_SESSION_KEY, JSON.stringify(_session))
    sessionStorage.removeItem(TOKEN_KEY)
  },

  getToken(): string | null {
    const s = uiAuth.getSession()
    if (!s || isExpired(s.accessExpiresAt, 0)) return null
    if (_accessToken && _accessTokenBase === _serverBase) return _accessToken
    const stored = readStoredToken()
    if (!stored || stored.base !== _serverBase) {
      sessionStorage.removeItem(TOKEN_KEY)
      _accessToken = _accessTokenBase = null
      return null
    }
    _accessToken = stored.token
    _accessTokenBase = stored.base
    return _accessToken
  },

  setToken(t: string) {
    const existing = uiAuth.getSession()
    if (existing?.refreshToken) {
      uiAuth.setSession({ ...existing, accessToken: t, ...expiryFromJwt(t, _jwtSettings) })
      return
    }
    _accessToken = t
    _accessTokenBase = _serverBase
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ base: _serverBase, token: t }))
  },

  setLoginSession(
    payload: { accessToken: string; refreshToken: string; clientMutationId?: string },
    jwt: JwtSettings | null,
  ) {
    uiAuth.setSession({
      accessToken:       payload.accessToken,
      refreshToken:      payload.refreshToken,
      clientMutationId:  payload.clientMutationId,
      ...expiryFromJwt(payload.accessToken, jwt),
    })
  },

  updateAccessToken(
    payload: { accessToken: string; clientMutationId?: string },
    jwt: JwtSettings | null,
  ) {
    const s = uiAuth.getSession()
    if (!s) return
    uiAuth.setSession({
      ...s,
      accessToken:      payload.accessToken,
      clientMutationId: payload.clientMutationId ?? s.clientMutationId,
      ...expiryFromJwt(payload.accessToken, jwt),
    })
  },

  clearToken() {
    _session = _accessToken = _accessTokenBase = null
    sessionStorage.removeItem(UI_SESSION_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  },
}

function expiryFromJwt(token: string, jwt: JwtSettings | null) {
  const now = Date.now()
  return {
    accessExpiresAt:  decodeJwtExpiry(token) ?? (jwt?.jwtTokenExpiry ? now + (parseIsoDuration(jwt.jwtTokenExpiry) ?? 0) : null),
    refreshExpiresAt: jwt?.jwtRefreshExpiry ? now + (parseIsoDuration(jwt.jwtRefreshExpiry) ?? 0) : null,
  }
}

async function fetchJwtSettings(): Promise<JwtSettings | null> {
  try {
    const res = await fetchAuthenticated(`${_serverBase}/api/graphql`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    gqlBody(`query { settings { jwtAudience jwtRefreshExpiry jwtTokenExpiry } }`),
    }, timeoutSignal(5000))
    if (!res.ok) return null
    const json = await res.json()
    const s = json?.data?.settings
    if (!s) return null
    return {
      jwtAudience:     s.jwtAudience     ?? null,
      jwtRefreshExpiry: s.jwtRefreshExpiry ?? null,
      jwtTokenExpiry:   s.jwtTokenExpiry   ?? null,
    }
  } catch { return null }
}

async function getJwtSettings(force = false): Promise<JwtSettings | null> {
  const fresh = Date.now() - _jwtSettingsFetchedAt < 60_000
  if (!force && _jwtSettingsBase === _serverBase && _jwtSettings && fresh) return _jwtSettings
  _jwtSettings = await fetchJwtSettings()
  _jwtSettingsBase = _serverBase
  _jwtSettingsFetchedAt = Date.now()
  return _jwtSettings
}

export async function fetchAuthenticated(
  url: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<Response> {
  const baseHeaders = { ...(init.headers as Record<string, string> ?? {}) }

  if (_authMode === 'BASIC_AUTH') {
    return fetch(url, {
      ...init, signal, credentials: 'omit',
      headers: { ...baseHeaders, ...(_basicUser && _basicPass ? basicHeader(_basicUser, _basicPass) : {}) },
    })
  }

  if (_authMode === 'UI_LOGIN') {
    const token = await getUIAccessToken()
    if (!token) throw new AuthRequiredError()

    let res = await fetch(url, {
      ...init, signal, credentials: 'omit',
      headers: { ...baseHeaders, ...bearerHeader(token) },
    })

    if (res.status !== 401) return res

    const refreshed = await refreshUiAccessToken(true)
    if (!refreshed) return res

    return fetch(url, {
      ...init, signal, credentials: 'omit',
      headers: { ...baseHeaders, ...bearerHeader(refreshed) },
    })
  }

  return fetch(url, { ...init, signal, credentials: 'omit' })
}

export async function getUIAccessToken(forceRefresh = false): Promise<string | null> {
  const s = uiAuth.getSession()
  if (!s) return null
  if (forceRefresh || isExpired(s.accessExpiresAt)) return refreshUiAccessToken(true)
  return s.accessToken
}

export async function refreshUiAccessToken(force = false): Promise<string | null> {
  const s = uiAuth.getSession()
  if (!s) return null
  if (!s.refreshToken) {
    if (force && isExpired(s.accessExpiresAt, 0)) return null
    return s.accessToken
  }
  if (!force && !isExpired(s.accessExpiresAt)) return s.accessToken
  if (isExpired(s.refreshExpiresAt)) { uiAuth.clearToken(); return null }
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    const jwt = await getJwtSettings().catch(() => null)
    const res = await fetch(`${_serverBase}/api/graphql`, {
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: gqlBody(
        `mutation RefreshToken($refreshToken: String!, $clientMutationId: String) {
           refreshToken(input: { refreshToken: $refreshToken, clientMutationId: $clientMutationId }) {
             accessToken clientMutationId
           }
         }`,
        { refreshToken: s.refreshToken, clientMutationId: s.clientMutationId },
      ),
      signal: timeoutSignal(5000),
    })
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) { uiAuth.clearToken(); return null }
      throw new Error(`Token refresh failed (${res.status})`)
    }
    const json = await res.json()
    const refreshed = json?.data?.refreshToken
    const next: string | undefined = refreshed?.accessToken
    if (!next) { uiAuth.clearToken(); return null }
    uiAuth.updateAccessToken({ accessToken: next, clientMutationId: refreshed?.clientMutationId }, jwt)
    return next
  })().finally(() => { _refreshPromise = null })

  return _refreshPromise
}

export async function loginUI(user: string, pass: string): Promise<void> {
  const res = await fetch(`${_serverBase}/api/graphql`, {
    method: 'POST', credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: gqlBody(
      `mutation Login($username: String!, $password: String!) {
         login(input: { username: $username, password: $password }) {
           accessToken refreshToken clientMutationId
         }
       }`,
      { username: user, password: pass },
    ),
    signal: timeoutSignal(8000),
  })
  if (!res.ok) throw new Error(`Login request failed (${res.status})`)
  const json    = await res.json()
  const payload = json?.data?.login
  if (!payload?.accessToken || !payload?.refreshToken) {
    throw new Error(json?.errors?.[0]?.message ?? 'Login failed')
  }
  const jwt = await getJwtSettings(true).catch(() => null)
  uiAuth.setLoginSession({
    accessToken:      payload.accessToken,
    refreshToken:     payload.refreshToken,
    clientMutationId: typeof payload.clientMutationId === 'string' ? payload.clientMutationId : undefined,
  }, jwt)
  _authMode  = 'UI_LOGIN'
  _basicUser = user
  _basicPass = ''
}

export async function loginBasic(user: string, pass: string): Promise<void> {
  const res = await fetch(`${_serverBase}/api/graphql`, {
    method: 'POST', credentials: 'omit',
    headers: { 'Content-Type': 'application/json', ...basicHeader(user, pass) },
    body: gqlBody('{ __typename }'),
    signal: timeoutSignal(5000),
  })
  if (!res.ok) throw new Error(`Authentication failed (${res.status})`)
  _authMode  = 'BASIC_AUTH'
  _basicUser = user
  _basicPass = pass
}

export async function logout(): Promise<void> {
  uiAuth.clearToken()
  _authMode  = 'NONE'
  _basicUser = ''
  _basicPass = ''
}

export async function probeServer(): Promise<'ok' | 'auth_required' | 'unreachable'> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (_authMode === 'BASIC_AUTH' && _basicUser && _basicPass) {
      Object.assign(headers, basicHeader(_basicUser, _basicPass))
    } else if (_authMode === 'UI_LOGIN') {
      const token = await getUIAccessToken()
      if (!token) return 'auth_required'
      Object.assign(headers, bearerHeader(token))
    }
    const res = await fetch(`${_serverBase}/api/graphql`, {
      method: 'POST', credentials: 'omit', headers,
      body: gqlBody('{ __typename }'),
      signal: timeoutSignal(5000),
    })
    if (res.ok) return 'ok'
    if (res.status === 401) return 'auth_required'
    return 'unreachable'
  } catch { return 'unreachable' }
}