export const GET_EXTENSIONS = `
  query GetExtensions {
    extensions {
      nodes {
        apkName pkgName name lang versionName versionCodeLong
        isInstalled isObsolete hasUpdate iconUrl
        apkUrl jarUrl contentWarning
        extensionStore { indexUrl }
      }
    }
  }
`

export const GET_SOURCES = `
  query GetSources {
    sources {
      nodes {
        id name lang displayName iconUrl isNsfw
        isConfigurable supportsLatest
        extension { pkgName }
      }
    }
  }
`

export const GET_SOURCE_SETTINGS = `
  query GetSourceSettings($id: LongString!) {
    source(id: $id) {
      id
      displayName
      preferences {
        ... on CheckBoxPreference {
          type: __typename
          CheckBoxTitle: title
          CheckBoxSummary: summary
          CheckBoxDefault: default
          CheckBoxCurrentValue: currentValue
          key
        }
        ... on SwitchPreference {
          type: __typename
          SwitchPreferenceTitle: title
          SwitchPreferenceSummary: summary
          SwitchPreferenceDefault: default
          SwitchPreferenceCurrentValue: currentValue
          key
        }
        ... on ListPreference {
          type: __typename
          ListPreferenceTitle: title
          ListPreferenceSummary: summary
          ListPreferenceDefault: default
          ListPreferenceCurrentValue: currentValue
          entries
          entryValues
          key
        }
        ... on EditTextPreference {
          type: __typename
          EditTextPreferenceTitle: title
          EditTextPreferenceSummary: summary
          EditTextPreferenceDefault: default
          EditTextPreferenceCurrentValue: currentValue
          dialogTitle
          dialogMessage
          key
        }
        ... on MultiSelectListPreference {
          type: __typename
          MultiSelectListPreferenceTitle: title
          MultiSelectListPreferenceSummary: summary
          MultiSelectListPreferenceDefault: default
          MultiSelectListPreferenceCurrentValue: currentValue
          entries
          entryValues
          key
        }
      }
    }
  }
`

export const GET_SETTINGS = `
  query GetSettings {
    settings { extensionRepos }
  }
`

export const GET_SERVER_SECURITY = `
  query GetServerSecurity {
    settings {
      authMode authUsername
      socksProxyEnabled socksProxyHost socksProxyPort socksProxyVersion socksProxyUsername
      flareSolverrEnabled flareSolverrUrl flareSolverrTimeout
      flareSolverrSessionName flareSolverrSessionTtl flareSolverrAsResponseFallback
    }
  }
`

export const FETCH_EXTENSIONS = `
  mutation FetchExtensions {
    fetchExtensions(input: {}) {
      extensions {
        apkName pkgName name lang versionName
        isInstalled isObsolete hasUpdate iconUrl
      }
    }
  }
`

export const UPDATE_EXTENSION = `
  mutation UpdateExtension($id: String!, $install: Boolean, $uninstall: Boolean, $update: Boolean) {
    updateExtension(input: { id: $id, patch: { install: $install, uninstall: $uninstall, update: $update } }) {
      extension { apkName pkgName name isInstalled hasUpdate }
    }
  }
`

export const UPDATE_EXTENSIONS = `
  mutation UpdateExtensions($ids: [String!]!, $install: Boolean, $uninstall: Boolean, $update: Boolean) {
    updateExtensions(input: { ids: $ids, patch: { install: $install, uninstall: $uninstall, update: $update } }) {
      extensions { apkName pkgName name isInstalled hasUpdate }
    }
  }
`

export const INSTALL_EXTERNAL_EXTENSION = `
  mutation InstallExternalExtension($url: String!) {
    installExternalExtension(input: { extensionUrl: $url }) {
      extension { apkName pkgName name isInstalled }
    }
  }
`

export const UPDATE_SOURCE_PREFERENCE = `
  mutation UpdateSourcePreference($source: LongString!, $change: SourcePreferenceChangeInput!) {
    updateSourcePreference(input: { source: $source, change: $change }) {
      source { id displayName }
    }
  }
`

export const SET_SOURCE_META = `
  mutation SetSourceMeta($sourceId: LongString!, $key: String!, $value: String!) {
    setSourceMeta(input: { meta: { sourceId: $sourceId, key: $key, value: $value } }) {
      meta { key value }
    }
  }
`

export const DELETE_SOURCE_META = `
  mutation DeleteSourceMeta($sourceId: LongString!, $key: String!) {
    deleteSourceMeta(input: { sourceId: $sourceId, key: $key }) {
      meta { key value }
    }
  }
`

export const SET_EXTENSION_REPOS = `
  mutation SetExtensionRepos($repos: [String!]!) {
    setSettings(input: { settings: { extensionRepos: $repos } }) {
      settings { extensionRepos }
    }
  }
`

export const SET_SERVER_AUTH = `
  mutation SetServerAuth($authMode: AuthMode!, $authUsername: String!, $authPassword: String!) {
    setSettings(input: { settings: { authMode: $authMode, authUsername: $authUsername, authPassword: $authPassword } }) {
      settings { authMode authUsername }
    }
  }
`

export const CLEAR_CACHED_IMAGES = `
  mutation ClearCachedImages($cachedPages: Boolean, $cachedThumbnails: Boolean, $downloadedThumbnails: Boolean) {
    clearCachedImages(input: {
      cachedPages: $cachedPages
      cachedThumbnails: $cachedThumbnails
      downloadedThumbnails: $downloadedThumbnails
    }) {
      cachedPages cachedThumbnails downloadedThumbnails
    }
  }
`

export const RESET_SETTINGS = `
  mutation ResetSettings {
    resetSettings(input: {}) {
      settings { extensionRepos }
    }
  }
`