const DEFAULT_URL = 'http://127.0.0.1:4567'

interface AuthConfig {
  baseUrl:  string
  mode:     'NONE' | 'BASIC_AUTH' | 'UI_LOGIN'
  user?:    string
  pass?:    string
}

let config: AuthConfig = { baseUrl: DEFAULT_URL, mode: 'NONE' }

let accessToken:  string | null = null
let refreshToken: string | null = null

export function configureAuth(
  baseUrl: string,
  mode: 'NONE' | 'BASIC_AUTH' | 'UI_LOGIN',
  user?: string,
  pass?: string,
): void {
  config = { baseUrl: baseUrl.replace(/\/$/, ''), mode, user, pass }
  accessToken  = null
  refreshToken = null
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

async function gqlRaw(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${config.baseUrl}/api/graphql`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

export async function probeServer(): Promise<'ok' | 'auth_required' | 'unreachable'> {
  try {
    const res = await fetch(`${config.baseUrl}/api/graphql`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ query: '{ aboutServer { name } }' }),
    })
    if (res.status === 401 || res.status === 403) return 'auth_required'
    if (!res.ok) return 'unreachable'
    const json = await res.json()
    const isAuthError = json.errors?.some((e: { message: string }) =>
      /unauthorized|unauthenticated/i.test(e.message)
    )
    return isAuthError ? 'auth_required' : 'ok'
  } catch {
    return 'unreachable'
  }
}

export async function loginBasic(user: string, pass: string): Promise<void> {
  config.user = user
  config.pass = pass
  config.mode = 'BASIC_AUTH'
  const probe = await probeServer()
  if (probe !== 'ok') throw new Error('Invalid credentials')
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

export async function loginUI(user: string, pass: string): Promise<void> {
  const data = await gqlRaw(LOGIN_MUTATION, { username: user, password: pass }) as {
    login: { accessToken: string; refreshToken: string }
  }
  accessToken  = data.login.accessToken
  refreshToken = data.login.refreshToken
  config.mode  = 'UI_LOGIN'
  config.user  = user
}

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false
  try {
    const data = await gqlRaw(REFRESH_MUTATION, { refreshToken }) as {
      refreshToken: { accessToken: string }
    }
    accessToken = data.refreshToken.accessToken
    return true
  } catch {
    return false
  }
}