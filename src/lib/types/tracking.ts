export interface TrackerStatus {
  value: number
  name: string
}

export interface TrackRecord {
  id: number
  trackerId: number
  remoteId: string
  title: string
  status: number
  score: number
  displayScore: string
  lastChapterRead: number
  totalChapters: number
  remoteUrl: string
  startDate?: string
  finishDate?: string
  private: boolean
  libraryId?: string
  manga?: { id: number; title: string; thumbnailUrl: string; inLibrary: boolean }
}

export interface Tracker {
  id: number
  name: string
  icon: string
  isLoggedIn: boolean
  isTokenExpired: boolean
  authUrl: string
  supportsPrivateTracking: boolean
  supportsReadingDates: boolean
  supportsTrackDeletion: boolean
  scores: string[]
  statuses: TrackerStatus[]
  trackRecords?: { nodes: TrackRecord[] }
}
