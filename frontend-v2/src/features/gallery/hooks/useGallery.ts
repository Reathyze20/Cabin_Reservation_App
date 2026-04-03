/**
 * useGallery.ts — TanStack Query hooks pro Gallery module
 * Upload fotek přes multipart/form-data mutation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { galleryApi } from '@/api/gallery'
import { showToast } from '@/lib/toast'

export const GALLERY_FOLDERS_KEY = ['gallery-folders'] as const

export function photosKey(folderId: string) {
  return ['gallery-photos', folderId] as const
}

export function photosByIdsKey(ids: string[]) {
  return ['gallery-photos-ids', ids.join(',')] as const
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useGalleryFolders() {
  return useQuery({
    queryKey: GALLERY_FOLDERS_KEY,
    queryFn: galleryApi.getFolders,
    staleTime: 30_000,
  })
}

export function useGalleryPhotos(folderId: string | null) {
  return useQuery({
    queryKey: photosKey(folderId ?? ''),
    queryFn: () => galleryApi.getPhotos(folderId!),
    enabled: !!folderId,
    staleTime: 30_000,
  })
}

export function usePhotosByIds(ids: string[]) {
  return useQuery({
    queryKey: photosByIdsKey(ids),
    queryFn: () => galleryApi.getPhotosByIds(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  })
}

// ─── Folder mutations ─────────────────────────────────────────────────────────

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => galleryApi.createFolder(name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: GALLERY_FOLDERS_KEY }),
    onError: () => showToast('Chyba při vytváření alba.', 'error'),
  })
}

export function useRenameFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => galleryApi.renameFolder(id, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: GALLERY_FOLDERS_KEY }),
    onError: () => showToast('Chyba při přejmenování alba.', 'error'),
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => galleryApi.deleteFolder(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: GALLERY_FOLDERS_KEY }),
    onError: () => showToast('Chyba při mazání alba.', 'error'),
  })
}

// ─── Photo mutations ──────────────────────────────────────────────────────────

export function useUploadPhotos(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (files: File[]) => galleryApi.uploadPhotos(folderId, files),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: photosKey(folderId) })
      void qc.invalidateQueries({ queryKey: GALLERY_FOLDERS_KEY })
    },
    onError: () => showToast('Chyba při nahrávání fotek.', 'error'),
  })
}

export function useUpdatePhoto(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, description }: { id: string; description: string }) =>
      galleryApi.updatePhoto(id, description),
    onSuccess: () => void qc.invalidateQueries({ queryKey: photosKey(folderId) }),
    onError: () => showToast('Chyba při ukládání vzpomínky.', 'error'),
  })
}

export function useDeletePhoto(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => galleryApi.deletePhoto(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: photosKey(folderId) })
      void qc.invalidateQueries({ queryKey: GALLERY_FOLDERS_KEY })
    },
    onError: () => showToast('Chyba při mazání fotky.', 'error'),
  })
}

export function useDeletePhotos(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => galleryApi.deletePhotos(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: photosKey(folderId) })
      void qc.invalidateQueries({ queryKey: GALLERY_FOLDERS_KEY })
    },
    onError: () => showToast('Chyba při mazání fotek.', 'error'),
  })
}
