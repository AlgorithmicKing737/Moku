const DEFAULT_URL = 'http://127.0.0.1:4567'
const SKEW_MS     = 60_000 * 2

interface AuthConfig {
  baseUrl: string
  mode:    'NONE' | 'BASIC_AUTH' | 'UI_LOGIN'
  user?:   string
  pass?:   string
}

export interface UiAuthDebugStatus {
  mode:               'NONE' | 'BASIC_AUTH' | 'UI_LOGIN'
  hasSession:         boolean
  accessExpiresAt:    number | null
  accessExpiresInMs:  number | null
  shouldRefreshSoon:  boolean
  refreshInFlight:    boolean
  skewMs:             number
}

let config: AuthConfig = { baseUrl: DEFAULT_URL, mode: 'NONE' }

let accessToken:     string | null = null
let refreshToken:    string | null = null
let accessExpiresAt: number | null = null
let refreshInFlight                = false

function parseExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch { return null }
}

export const authSession = {
  clearTokens() {
    accessToken     = null
    refreshToken    = null
    accessExpiresAt = null
  },
}

export function getUIAccessToken(): string | null { return accessToken }

export function getUiAuthDebugStatus(): UiAuthDebugStatus {
  const now               = Date.now()
  const accessExpiresInMs = accessExpiresAt !== null ? accessExpiresAt - now : null
  return {
    mode:              config.mode,
    hasSession:        accessToken !== null,
    accessExpiresAt,
    accessExpiresInMs,
    shouldRefreshSoon: accessExpiresInMs !== null && accessExpiresInMs < SKEW_MS,
    refreshInFlight,
    skewMs:            SKEW_MS,
  }
}

export function configureAuth(
  baseUrl: string,
  mode:    'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  user?:   string,
  pass?:   string,
): void {
  config      = { baseUrl: baseUrl.replace(/\/$/, ''), mode, user, pass }
  accessToken     = null
  refreshToken    = null
  accessExpiresAt = null
}

export function authHeaders(): Record<string, string> {
  if (config.mode === 'BASIC_AUTH' && config.user && config.pass) {
    return { Authorization: 'Basic ' + btoa(`${config.user}:${config.pass}`) }
  }
  if (config.mode === 'UI_LOGIN' && accessToken) {
    return { Authorization: `Bearer ${accessToken}` }
  }
  return {}
}

async function gql<T>(query: string, variables?: Record<string, unknown>, bare = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!bare) Object.assign(headers, authHeaders())
  const res = await fetch(`${config.baseUrl}/api/graphql`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data as T
}

export async function probeServer(): Promise<'ok' | 'auth_required' | 'unreachable'> {
  try {
    const res = await fetch(`${config.baseUrl}/api/graphql`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ query: '{ settings { authMode } }' }),
    })
    if (res.status === 401 || res.status === 403) return 'auth_required'
    if (!res.ok) return 'unreachable'
    const json = await res.json()
    const isAuthError = json.errors?.some((e: { message: string }) =>
      /unauthorized|unauthenticated/i.test(e.message)
    )
    return isAuthError ? 'auth_required' : 'ok'
  } catch { return 'unreachable' }
}

const LOGIN_MUTATION = `
  mutation Login($username: String!, $password: String!) {
    login(input: { username: $username, password: $password }) {
      accessToken refreshToken
    }
  }
`

const REFRESH_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(input: { refreshToken: $refreshToken }) {
      accessToken
    }
  }
`

export async function loginBasic(user: string, pass: string): Promise<void> {
  const prev = { user: config.user, pass: config.pass, mode: config.mode }
  config.user = user
  config.pass = pass
  config.mode = 'BASIC_AUTH'
  const probe = await probeServer()
  if (probe !== 'ok') {
    config.user = prev.user
    config.pass = prev.pass
    config.mode = prev.mode as typeof config.mode
    throw new Error('Invalid credentials')
  }
}

export async function loginUI(user: string, pass: string): Promise<void> {
  const data = await gql<{ login: { accessToken: string; refreshToken: string } }>(
    LOGIN_MUTATION, { username: user, password: pass }, true
  )
  accessToken     = data.login.accessToken
  refreshToken    = data.login.refreshToken
  accessExpiresAt = parseExpiry(accessToken)
  config.mode     = 'UI_LOGIN'
  config.user     = user
}

export async function refreshUiAccessToken(force = false): Promise<string | null> {
  if (config.mode !== 'UI_LOGIN') return null
  if (!refreshToken) return null
  const now = Date.now()
  if (!force && accessExpiresAt !== null && accessExpiresAt - now > SKEW_MS) return accessToken
  if (refreshInFlight) return accessToken
  refreshInFlight = true
  try {
    const data = await gql<{ refreshToken: { accessToken: string } }>(
      REFRESH_MUTATION, { refreshToken }
    )
    accessToken     = data.refreshToken.accessToken
    accessExpiresAt = parseExpiry(accessToken)
    return accessToken
  } catch {
    return null
  } finally {
    refreshInFlight = false
  }
}