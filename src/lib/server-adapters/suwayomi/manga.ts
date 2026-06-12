export const GET_LIBRARY = `
  query GetLibrary {
    mangas(condition: { inLibrary: true }) {
      nodes {
        id title thumbnailUrl inLibrary downloadCount unreadCount bookmarkCount
        description status author artist genre
        inLibraryAt lastFetchedAt chaptersLastFetchedAt thumbnailUrlLastFetched
        source { id name displayName }
        chapters { totalCount }
        latestFetchedChapter { id uploadDate }
        latestUploadedChapter { id uploadDate }
        lastReadChapter { id chapterNumber }
        firstUnreadChapter { id chapterNumber }
      }
    }
  }
`

export const GET_MANGA = `
  query GetManga($id: Int!) {
    manga(id: $id) {
      id title description thumbnailUrl status author artist genre inLibrary realUrl
      inLibraryAt lastFetchedAt thumbnailUrlLastFetched updateStrategy
      source { id name displayName }
      lastReadChapter { id chapterNumber lastPageRead }
      firstUnreadChapter { id chapterNumber }
      highestNumberedChapter { id chapterNumber }
    }
  }
`

export const GET_CATEGORIES = `
  query GetCategories {
    categories {
      nodes {
        id name order default includeInUpdate includeInDownload
        mangas {
          nodes { id title thumbnailUrl inLibrary downloadCount unreadCount }
        }
      }
    }
  }
`

export const LIBRARY_UPDATE_STATUS = `
  query LibraryUpdateStatus {
    libraryUpdateStatus {
      jobsInfo {
        isRunning finishedJobs totalJobs skippedMangasCount skippedCategoriesCount
      }
      mangaUpdates {
        status
        manga { id title thumbnailUrl unreadCount }
      }
    }
    lastUpdateTimestamp { timestamp }
  }
`

export const MANGAS_BY_GENRE = `
  query MangasByGenre($filter: MangaFilterInput, $first: Int, $offset: Int) {
    mangas(filter: $filter, first: $first, offset: $offset) {
      nodes {
        id title thumbnailUrl inLibrary genre status
        source { id displayName }
      }
      pageInfo { hasNextPage }
      totalCount
    }
  }
`

export const GET_DOWNLOADS_PATH = `
  query GetDownloadsPath {
    settings { downloadsPath localSourcePath }
  }
`

export const POLL_RESTORE_STATUS = `
  query PollRestoreStatus($id: String!) {
    restoreStatus(id: $id) { mangaProgress state totalManga }
  }
`

export const FETCH_MANGA = `
  mutation FetchManga($id: Int!) {
    fetchManga(input: { id: $id }) {
      manga {
        id title description thumbnailUrl status author artist genre inLibrary realUrl
        source { id name displayName }
      }
    }
  }
`

export const UPDATE_MANGA = `
  mutation UpdateManga($id: Int!, $inLibrary: Boolean) {
    updateManga(input: { id: $id, patch: { inLibrary: $inLibrary } }) {
      manga { id inLibrary }
    }
  }
`

export const UPDATE_MANGAS = `
  mutation UpdateMangas($ids: [Int!]!, $inLibrary: Boolean) {
    updateMangas(input: { ids: $ids, patch: { inLibrary: $inLibrary } }) {
      mangas { id inLibrary }
    }
  }
`

export const UPDATE_MANGA_CATEGORIES = `
  mutation UpdateMangaCategories($mangaId: Int!, $addTo: [Int!]!, $removeFrom: [Int!]!) {
    updateMangaCategories(input: { id: $mangaId, patch: { addToCategories: $addTo, removeFromCategories: $removeFrom } }) {
      manga { id }
    }
  }
`

export const UPDATE_MANGAS_CATEGORIES = `
  mutation UpdateMangasCategories($ids: [Int!]!, $addTo: [Int!]!, $removeFrom: [Int!]!) {
    updateMangasCategories(input: { ids: $ids, patch: { addToCategories: $addTo, removeFromCategories: $removeFrom } }) {
      mangas { id }
    }
  }
`

export const CREATE_CATEGORY = `
  mutation CreateCategory($name: String!) {
    createCategory(input: { name: $name }) {
      category { id name order default includeInUpdate includeInDownload }
    }
  }
`

export const UPDATE_CATEGORY = `
  mutation UpdateCategory($id: Int!, $name: String, $includeInUpdate: IncludeOrExclude, $includeInDownload: IncludeOrExclude) {
    updateCategory(input: { id: $id, patch: { name: $name, includeInUpdate: $includeInUpdate, includeInDownload: $includeInDownload } }) {
      category { id name order includeInUpdate includeInDownload }
    }
  }
`

export const DELETE_CATEGORY = `
  mutation DeleteCategory($id: Int!) {
    deleteCategory(input: { categoryId: $id }) {
      category { id }
    }
  }
`

export const UPDATE_CATEGORY_ORDER = `
  mutation UpdateCategoryOrder($id: Int!, $position: Int!) {
    updateCategoryOrder(input: { id: $id, position: $position }) {
      categories { id name order default includeInUpdate includeInDownload }
    }
  }
`

export const UPDATE_CATEGORY_MANGA = `
  mutation UpdateCategoryManga($categoryId: Int!) {
    updateCategoryManga(input: { categoryId: $categoryId }) {
      updateStatus { jobsInfo { isRunning finishedJobs totalJobs } }
    }
  }
`

export const UPDATE_LIBRARY = `
  mutation UpdateLibrary {
    updateLibrary(input: {}) {
      updateStatus { jobsInfo { isRunning finishedJobs totalJobs } }
    }
  }
`

export const UPDATE_LIBRARY_MANGA = `
  mutation UpdateLibraryManga($mangaId: Int!) {
    updateLibraryManga(input: { mangaId: $mangaId }) {
      updateStatus { jobsInfo { isRunning finishedJobs totalJobs } }
    }
  }
`

export const UPDATE_STOP = `
  mutation UpdateStop {
    updateStop(input: {}) {
      updateStatus { jobsInfo { isRunning finishedJobs totalJobs } }
    }
  }
`

export const SET_MANGA_META = `
  mutation SetMangaMeta($mangaId: Int!, $key: String!, $value: String!) {
    setMangaMeta(input: { meta: { mangaId: $mangaId, key: $key, value: $value } }) {
      meta { key value }
    }
  }
`

export const DELETE_MANGA_META = `
  mutation DeleteMangaMeta($mangaId: Int!, $key: String!) {
    deleteMangaMeta(input: { mangaId: $mangaId, key: $key }) {
      meta { key value }
    }
  }
`

export const CREATE_BACKUP = `
  mutation CreateBackup {
    createBackup(input: {}) { url }
  }
`

export const RESTORE_BACKUP = `
  mutation RestoreBackup($backup: Upload!) {
    restoreBackup(input: { backup: $backup }) {
      id
      status { mangaProgress state totalManga }
    }
  }
`

export const VALIDATE_BACKUP = `
  query ValidateBackup($backup: Upload!) {
    validateBackup(input: { backup: $backup }) {
      missingSources { id name }
      missingTrackers { name }
    }
  }
`

export const FETCH_SOURCE_MANGA = `
  mutation FetchSourceManga($source: LongString!, $type: FetchSourceMangaType!, $page: Int!, $query: String, $filters: [FilterChangeInput!]) {
    fetchSourceManga(input: { source: $source, type: $type, page: $page, query: $query, filters: $filters }) {
      mangas { id title thumbnailUrl inLibrary }
      hasNextPage
    }
  }
`