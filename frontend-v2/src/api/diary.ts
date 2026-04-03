/**
 * api/diary.ts — Types + API functions for Diary module
 */
import apiClient from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityTag =
  | ''
  | 'relax'
  | 'party'
  | 'work'
  | 'mushroom'
  | 'hike'
  | 'family'

export interface DiaryFolder {
  id: string
  name: string
  startDate: string
  endDate: string
  activityTag?: ActivityTag | null
  createdAt: string
  stats?: { entries: number; photos: number }
}

export interface DiaryEntry {
  id: string
  folderId: string
  date: string
  content: string
  galleryPhotoIds: string[]
  createdAt: string
}

export interface Reservation {
  id: string
  from: string
  to: string
  purpose?: string
  userId: string
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export const diaryApi = {
  getFolders: (): Promise<DiaryFolder[]> =>
    apiClient.get<DiaryFolder[]>('/diary/folders').then(r => r.data),

  createFolder: (data: {
    name: string
    startDate: string
    endDate: string
    activityTag?: string | null
  }): Promise<DiaryFolder> =>
    apiClient.post<DiaryFolder>('/diary/folders', data).then(r => r.data),

  renameFolder: (id: string, name: string): Promise<DiaryFolder> =>
    apiClient.patch<DiaryFolder>(`/diary/folders/${id}`, { name }).then(r => r.data),

  deleteFolder: (id: string): Promise<void> =>
    apiClient.delete(`/diary/folders/${id}`).then(() => undefined),

  // ─── Entries ──────────────────────────────────────────────────────────────

  getEntries: (folderId: string): Promise<DiaryEntry[]> =>
    apiClient.get<DiaryEntry[]>(`/diary/entries?folderId=${folderId}`).then(r => r.data),

  createEntry: (data: {
    folderId: string
    date: string
    content: string
    galleryPhotoIds: string[]
  }): Promise<DiaryEntry> =>
    apiClient.post<DiaryEntry>('/diary/entries', data).then(r => r.data),

  updateEntry: (
    id: string,
    data: { content: string; galleryPhotoIds: string[] },
  ): Promise<DiaryEntry> =>
    apiClient.put<DiaryEntry>(`/diary/entries/${id}`, data).then(r => r.data),

  deleteEntry: (id: string): Promise<void> =>
    apiClient.delete(`/diary/entries/${id}`).then(() => undefined),

  // ─── Reservations (for create-folder picker) ──────────────────────────────

  getReservations: (): Promise<Reservation[]> =>
    apiClient.get<{ reservations: Reservation[] }>('/reservations').then(r => r.data.reservations),
}
