/**
 * api/gallery.ts — Types + API functions for Gallery module
 */
import apiClient from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GalleryFolder {
  id: string
  name: string
  photoCount: number
  coverPhotoUrl?: string | null
  createdAt: string
}

export interface GalleryPhoto {
  id: string
  src: string
  thumb?: string | null
  description?: string | null
  uploadedBy?: string
  folderId: string
  createdAt: string
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export const galleryApi = {
  getFolders: (): Promise<GalleryFolder[]> =>
    apiClient.get<GalleryFolder[]>('/gallery/folders').then(r => r.data),

  createFolder: (name: string): Promise<GalleryFolder> =>
    apiClient.post<GalleryFolder>('/gallery/folders', { name }).then(r => r.data),

  renameFolder: (id: string, name: string): Promise<GalleryFolder> =>
    apiClient.patch<GalleryFolder>(`/gallery/folders/${id}`, { name }).then(r => r.data),

  deleteFolder: (id: string): Promise<void> =>
    apiClient.delete(`/gallery/folders/${id}`).then(() => undefined),

  // ─── Photos ─────────────────────────────────────────────────────────────────

  getPhotos: (folderId: string): Promise<GalleryPhoto[]> =>
    apiClient.get<GalleryPhoto[]>(`/gallery/photos?folderId=${folderId}`).then(r => r.data),

  getPhotosByIds: (ids: string[]): Promise<GalleryPhoto[]> =>
    apiClient.get<GalleryPhoto[]>(`/gallery/photos?ids=${ids.join(',')}`).then(r => r.data),

  uploadPhotos: (folderId: string, files: File[]): Promise<GalleryPhoto[]> => {
    const fd = new FormData()
    fd.append('folderId', folderId)
    for (const f of files) fd.append('photos', f)
    return apiClient
      .post<GalleryPhoto[]>('/gallery/photos', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },

  updatePhoto: (id: string, description: string): Promise<GalleryPhoto> =>
    apiClient.patch<GalleryPhoto>(`/gallery/photos/${id}`, { description }).then(r => r.data),

  deletePhoto: (id: string): Promise<void> =>
    apiClient.delete(`/gallery/photos/${id}`).then(() => undefined),

  deletePhotos: (photoIds: string[]): Promise<void> =>
    apiClient.delete('/gallery/photos', { data: { photoIds } }).then(() => undefined),
}
