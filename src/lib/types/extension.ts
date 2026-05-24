export interface Source {
  id:              string
  name:            string
  lang:            string
  displayName:     string
  iconUrl:         string
  isNsfw:          boolean
  isConfigurable:  boolean
  supportsLatest:  boolean
}

export interface Extension {
  id:          string
  apkName:     string
  pkgName:     string
  name:        string
  lang:        string
  versionName: string
  isInstalled: boolean
  isObsolete:  boolean
  hasUpdate:   boolean
  iconUrl:     string
}