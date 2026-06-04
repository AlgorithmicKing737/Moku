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