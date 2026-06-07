export const GET_ABOUT_SERVER = `
  query GetAboutServer {
    aboutServer {
      name version buildType buildTime github discord
    }
  }
`

export const GET_ABOUT_WEBUI = `
  query GetAboutWebUI {
    aboutWebUI {
      channel tag updateTimestamp
    }
  }
`

export const CHECK_FOR_SERVER_UPDATES = `
  query CheckForServerUpdates {
    checkForServerUpdates {
      channel tag url
    }
  }
`

export const GET_META = `
  query GetMeta($key: String!) {
    meta(key: $key) {
      key value
    }
  }
`

export const GET_METAS = `
  query GetMetas {
    metas {
      nodes { key value }
    }
  }
`

export const SET_SOCKS_PROXY = `
  mutation SetSocksProxy(
    $socksProxyEnabled: Boolean!
    $socksProxyHost: String!
    $socksProxyPort: String!
    $socksProxyVersion: Int!
    $socksProxyUsername: String!
    $socksProxyPassword: String!
  ) {
    setSettings(input: { settings: {
      socksProxyEnabled: $socksProxyEnabled
      socksProxyHost: $socksProxyHost
      socksProxyPort: $socksProxyPort
      socksProxyVersion: $socksProxyVersion
      socksProxyUsername: $socksProxyUsername
      socksProxyPassword: $socksProxyPassword
    }}) {
      settings { socksProxyEnabled socksProxyHost socksProxyPort }
    }
  }
`

export const RESTORE_BACKUP = `
  mutation RestoreBackup($backup: Upload!) {
    restoreBackup(input: { backup: $backup }) {
      id status { mangaProgress state totalManga }
    }
  }
`

export const VALIDATE_BACKUP = `
  query ValidateBackup($backup: Upload!) {
    validateBackup(input: { backup: $backup }) {
      missingSources { id name } missingTrackers { name }
    }
  }
`

export const CREATE_BACKUP = `
  mutation CreateBackup {
    createBackup(input: {}) { url }
  }
`

export const SET_FLARE_SOLVERR = `
  mutation SetFlareSolverr(
    $flareSolverrEnabled: Boolean!
    $flareSolverrUrl: String!
    $flareSolverrTimeout: Int!
    $flareSolverrSessionName: String!
    $flareSolverrSessionTtl: Int!
    $flareSolverrAsResponseFallback: Boolean!
  ) {
    setSettings(input: { settings: {
      flareSolverrEnabled: $flareSolverrEnabled
      flareSolverrUrl: $flareSolverrUrl
      flareSolverrTimeout: $flareSolverrTimeout
      flareSolverrSessionName: $flareSolverrSessionName
      flareSolverrSessionTtl: $flareSolverrSessionTtl
      flareSolverrAsResponseFallback: $flareSolverrAsResponseFallback
    }}) {
      settings { flareSolverrEnabled flareSolverrUrl }
    }
  }
`