export const GET_TRACKERS = `
  query GetTrackers {
    trackers {
      nodes {
        id name icon isLoggedIn isTokenExpired authUrl
        supportsPrivateTracking supportsReadingDates supportsTrackDeletion
        scores
        statuses { value name }
      }
    }
  }
`

export const GET_ALL_TRACKER_RECORDS = `
  query GetAllTrackerRecords {
    trackers {
      nodes {
        id name icon isLoggedIn isTokenExpired authUrl
        supportsPrivateTracking supportsReadingDates supportsTrackDeletion
        scores
        statuses { value name }
        trackRecords {
          nodes {
            id trackerId remoteId title status score displayScore
            lastChapterRead totalChapters remoteUrl startDate finishDate private libraryId
            manga { id title thumbnailUrl }
          }
        }
      }
    }
  }
`

export const GET_MANGA_TRACK_RECORDS = `
  query GetMangaTrackRecords($mangaId: Int!) {
    manga(id: $mangaId) {
      trackRecords {
        nodes {
          id trackerId remoteId title status score displayScore
          lastChapterRead totalChapters remoteUrl startDate finishDate private libraryId
        }
      }
    }
  }
`

export const SEARCH_TRACKER = `
  query SearchTracker($trackerId: Int!, $query: String!) {
    searchTracker(input: { trackerId: $trackerId, query: $query }) {
      trackSearches {
        id trackerId remoteId title coverUrl summary
        publishingStatus publishingType startDate totalChapters trackingUrl
      }
    }
  }
`

export const FETCH_TRACK = `
  mutation FetchTrack($recordId: Int!) {
    fetchTrack(input: { recordId: $recordId }) {
      trackRecord {
        id trackerId remoteId title status score displayScore
        lastChapterRead totalChapters remoteUrl startDate finishDate private libraryId
      }
    }
  }
`

export const BIND_TRACK = `
  mutation BindTrack($mangaId: Int!, $trackerId: Int!, $remoteId: LongString!) {
    bindTrack(input: { mangaId: $mangaId, trackerId: $trackerId, remoteId: $remoteId }) {
      trackRecord { id trackerId remoteId }
    }
  }
`

export const TRACK_PROGRESS = `
  mutation TrackProgress($mangaId: Int!) {
    trackProgress(input: { mangaId: $mangaId }) {
      trackRecords { id trackerId lastChapterRead status }
    }
  }
`

export const UPDATE_TRACK = `
  mutation UpdateTrack($recordId: Int!, $status: Int, $score: Float, $lastChapterRead: Float, $startDate: LongString, $finishDate: LongString, $private: Boolean) {
    updateTrack(input: {
      recordId: $recordId
      status: $status
      score: $score
      lastChapterRead: $lastChapterRead
      startDate: $startDate
      finishDate: $finishDate
      private: $private
    }) {
      trackRecord { id trackerId status score displayScore lastChapterRead totalChapters remoteUrl startDate finishDate private libraryId }
    }
  }
`

export const UNLINK_TRACK = `
  mutation UnlinkTrack($trackRecordId: Int!) {
    unlinkTrack(input: { trackRecordId: $trackRecordId }) {
      trackRecord { id }
    }
  }
`

export const LOGIN_TRACKER_CREDENTIALS = `
  mutation LoginTrackerCredentials($trackerId: Int!, $username: String!, $password: String!) {
    loginTrackerCredentials(input: { trackerId: $trackerId, username: $username, password: $password }) {
      isLoggedIn
    }
  }
`

export const LOGOUT_TRACKER = `
  mutation LogoutTracker($trackerId: Int!) {
    logoutTracker(input: { trackerId: $trackerId }) {
      isLoggedIn
    }
  }
`