const QUEUE_FRAGMENT = `
  state
  queue {
    progress state tries
    chapter {
      id name pageCount mangaId
      manga { id title thumbnailUrl sourceId }
    }
  }
`

export const GET_DOWNLOAD_STATUS = `
  query GetDownloadStatus {
    downloadStatus { ${QUEUE_FRAGMENT} }
  }
`

export const ENQUEUE_DOWNLOAD = `
  mutation EnqueueDownload($chapterId: Int!) {
    enqueueChapterDownload(input: { id: $chapterId }) {
      downloadStatus { ${QUEUE_FRAGMENT} }
    }
  }
`

export const ENQUEUE_CHAPTERS_DOWNLOAD = `
  mutation EnqueueChaptersDownload($chapterIds: [Int!]!) {
    enqueueChapterDownloads(input: { ids: $chapterIds }) {
      downloadStatus { state }
    }
  }
`

export const DEQUEUE_DOWNLOAD = `
  mutation DequeueDownload($chapterId: Int!) {
    dequeueChapterDownload(input: { id: $chapterId }) {
      downloadStatus { state }
    }
  }
`

export const DEQUEUE_CHAPTERS_DOWNLOAD = `
  mutation DequeueChaptersDownload($chapterIds: [Int!]!) {
    dequeueChapterDownloads(input: { ids: $chapterIds }) {
      downloadStatus { ${QUEUE_FRAGMENT} }
    }
  }
`

export const REORDER_DOWNLOAD = `
  mutation ReorderDownload($chapterId: Int!, $to: Int!) {
    reorderChapterDownload(input: { chapterId: $chapterId, to: $to }) {
      downloadStatus { ${QUEUE_FRAGMENT} }
    }
  }
`

// Lightweight version: returns only state, not the full queue, for batch reorders where the response is discarded (final poll fetches state). Avoids downloading the whole queue per call.
export const REORDER_DOWNLOAD_LIGHT = `
  mutation ReorderDownload($chapterId: Int!, $to: Int!) {
    reorderChapterDownload(input: { chapterId: $chapterId, to: $to }) {
      downloadStatus { state }
    }
  }
`

export const START_DOWNLOADER = `
  mutation StartDownloader {
    startDownloader(input: {}) {
      downloadStatus { ${QUEUE_FRAGMENT} }
    }
  }
`

export const STOP_DOWNLOADER = `
  mutation StopDownloader {
    stopDownloader(input: {}) {
      downloadStatus { ${QUEUE_FRAGMENT} }
    }
  }
`

export const CLEAR_DOWNLOADER = `
  mutation ClearDownloader {
    clearDownloader(input: {}) {
      downloadStatus { ${QUEUE_FRAGMENT} }
    }
  }
`

export const SET_DOWNLOADS_PATH = `
  mutation SetDownloadsPath($path: String!) {
    setSettings(input: { settings: { downloadsPath: $path } }) {
      settings { downloadsPath }
    }
  }
`

export const SET_LOCAL_SOURCE_PATH = `
  mutation SetLocalSourcePath($path: String!) {
    setSettings(input: { settings: { localSourcePath: $path } }) {
      settings { localSourcePath }
    }
  }
`