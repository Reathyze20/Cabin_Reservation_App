/**
 * features/reconstruction/hooks/useReconstruction.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reconstructionApi, type RecItemCreate } from '@/api/reconstruction'
import { showToast } from '@/lib/toast'
import { isNetworkError, OFFLINE_TOAST_MSG } from '@/lib/networkError'

const QK = ['reconstruction'] as const

export function useReconstruction() {
  return useQuery({
    queryKey: QK,
    queryFn: reconstructionApi.getAll,
    staleTime: 30_000,
  })
}

export function useCreateRecItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reconstructionApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateRecItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecItemCreate> }) =>
      reconstructionApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateRecStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reconstructionApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba při změně statusu.',
        isNetworkError(err) ? 'info' : 'error',
      )
    },
  })
}

export function useDeleteRecItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reconstructionApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useVoteRecItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reconstructionApi.vote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
