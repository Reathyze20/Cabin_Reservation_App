/**
 * useDiary.ts — TanStack Query hooks pro Diary module
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { diaryApi } from '@/api/diary'
import { showToast } from '@/lib/toast'

export const DIARY_FOLDERS_KEY = ['diary-folders'] as const

export function diaryEntriesKey(folderId: string) {
  return ['diary-entries', folderId] as const
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useDiaryFolders() {
  return useQuery({
    queryKey: DIARY_FOLDERS_KEY,
    queryFn: diaryApi.getFolders,
    staleTime: 30_000,
  })
}

export function useDiaryEntries(folderId: string | null) {
  return useQuery({
    queryKey: diaryEntriesKey(folderId ?? ''),
    queryFn: () => diaryApi.getEntries(folderId!),
    enabled: !!folderId,
    staleTime: 30_000,
  })
}

export function useReservations() {
  return useQuery({
    queryKey: ['diary', 'reservations'],
    queryFn: diaryApi.getReservations,
    staleTime: 60_000,
  })
}

// ─── Folder mutations ─────────────────────────────────────────────────────────

export function useCreateDiaryFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: diaryApi.createFolder,
    onSuccess: () => void qc.invalidateQueries({ queryKey: DIARY_FOLDERS_KEY }),
    onError: () => showToast('Chyba při vytváření pobytu.', 'error'),
  })
}

export function useRenameDiaryFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      diaryApi.renameFolder(id, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: DIARY_FOLDERS_KEY }),
    onError: () => showToast('Chyba při přejmenování.', 'error'),
  })
}

export function useDeleteDiaryFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => diaryApi.deleteFolder(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: DIARY_FOLDERS_KEY }),
    onError: () => showToast('Chyba při mazání pobytu.', 'error'),
  })
}

// ─── Entry mutations ──────────────────────────────────────────────────────────

export function useSaveDiaryEntry(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      entryId: string | null
      content: string
      date: string
      galleryPhotoIds: string[]
    }) => {
      if (data.entryId) {
        return diaryApi.updateEntry(data.entryId, {
          content: data.content,
          galleryPhotoIds: data.galleryPhotoIds,
        })
      }
      return diaryApi.createEntry({
        folderId,
        date: data.date,
        content: data.content,
        galleryPhotoIds: data.galleryPhotoIds,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: diaryEntriesKey(folderId) })
      void qc.invalidateQueries({ queryKey: DIARY_FOLDERS_KEY })
      showToast('Uloženo.', 'success')
    },
    onError: () => showToast('Chyba při ukládání záznamu.', 'error'),
  })
}

export function useDeleteDiaryEntry(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => diaryApi.deleteEntry(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: diaryEntriesKey(folderId) })
      void qc.invalidateQueries({ queryKey: DIARY_FOLDERS_KEY })
      showToast('Vytrženo.', 'success')
    },
    onError: () => showToast('Chyba při mazání záznamu.', 'error'),
  })
}
