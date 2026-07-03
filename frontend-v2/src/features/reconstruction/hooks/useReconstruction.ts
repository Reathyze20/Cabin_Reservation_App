/**
 * features/reconstruction/hooks/useReconstruction.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reconstructionApi, type RecItem, type RecItemCreate, type RecStatus } from '@/api/reconstruction'
import { handleMutationError } from '@/lib/mutationError'

const QK = ['reconstruction'] as const

interface UpdateRecStatusVariables {
  id: string
  status: RecStatus
}

interface VoteRecItemVariables {
  id: string
  currentUserId: string
}

interface ReconstructionMutationContext {
  previous?: RecItem[]
}

function updateCachedReconstructionItem(
  items: RecItem[] | undefined,
  itemId: string,
  update: (item: RecItem) => RecItem,
): RecItem[] {
  return (items ?? []).map((item) => (item.id === itemId ? update(item) : item))
}

function replaceCachedReconstructionItem(
  items: RecItem[] | undefined,
  updatedItem: RecItem,
): RecItem[] {
  return updateCachedReconstructionItem(items, updatedItem.id, () => updatedItem)
}

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
    onError: handleMutationError('Chyba při vytváření položky'),
  })
}

export function useUpdateRecItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecItemCreate> }) =>
      reconstructionApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: handleMutationError('Chyba při úpravě položky'),
  })
}

export function useUpdateRecStatus() {
  const qc = useQueryClient()
  return useMutation<RecItem, Error, UpdateRecStatusVariables, ReconstructionMutationContext>({
    mutationFn: ({ id, status }) =>
      reconstructionApi.updateStatus(id, status),
    onMutate: async ({ id, status }): Promise<ReconstructionMutationContext> => {
      await qc.cancelQueries({ queryKey: QK })
      const previous = qc.getQueryData<RecItem[]>(QK)

      qc.setQueryData<RecItem[]>(QK, (items) =>
        updateCachedReconstructionItem(items, id, (item) => ({
          ...item,
          status,
        })),
      )

      return { previous }
    },
    onSuccess: (updatedItem) => {
      qc.setQueryData<RecItem[]>(QK, (items) => replaceCachedReconstructionItem(items, updatedItem))
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(QK, context.previous)
      }
      handleMutationError('Chyba při změně statusu')(err)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteRecItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reconstructionApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: handleMutationError('Chyba při mazání položky'),
  })
}

export function useVoteRecItem() {
  const qc = useQueryClient()
  return useMutation<RecItem, Error, VoteRecItemVariables, ReconstructionMutationContext>({
    mutationFn: ({ id }) => reconstructionApi.vote(id),
    onMutate: async ({ id, currentUserId }): Promise<ReconstructionMutationContext> => {
      await qc.cancelQueries({ queryKey: QK })
      const previous = qc.getQueryData<RecItem[]>(QK)

      if (currentUserId) {
        qc.setQueryData<RecItem[]>(QK, (items) =>
          updateCachedReconstructionItem(items, id, (item) => {
            const hasVoted = item.votes.includes(currentUserId)
            return {
              ...item,
              votes: hasVoted
                ? item.votes.filter((voteUserId) => voteUserId !== currentUserId)
                : [...item.votes, currentUserId],
            }
          }),
        )
      }

      return { previous }
    },
    onSuccess: (updatedItem) => {
      qc.setQueryData<RecItem[]>(QK, (items) => replaceCachedReconstructionItem(items, updatedItem))
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(QK, context.previous)
      }
      handleMutationError('Chyba při hlasování')(err)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
