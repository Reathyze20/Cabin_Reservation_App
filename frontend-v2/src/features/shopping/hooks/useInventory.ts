/**
 * useInventory.ts — TanStack Query hooks pro inventář / spíž
 * Cross-invalidace s shopping-lists při addToCart.
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { inventoryApi } from '@/api/shopping'
import { showToast } from '@/lib/toast'
import { SHOPPING_KEY } from './useShoppingLists'

export const INVENTORY_KEY = ['inventory'] as const

// ─── Query ────────────────────────────────────────────────────────────────────

export function useInventory() {
  return useQuery({
    queryKey: INVENTORY_KEY,
    queryFn: inventoryApi.getAll,
    staleTime: 30_000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVENTORY_KEY })
    },
    onError: () => {
      showToast('Chyba při přidávání zásoby.', 'error')
    },
  })
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name: string; category?: string; status: 'OK' | 'LOW' | 'EMPTY'; location?: string; isEssential: boolean }
    }) => inventoryApi.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVENTORY_KEY })
    },
    onError: () => {
      showToast('Chyba při úpravě zásoby.', 'error')
    },
  })
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVENTORY_KEY })
    },
    onError: () => {
      showToast('Chyba při mazání zásoby.', 'error')
    },
  })
}

export function useToggleInventoryEssential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => inventoryApi.toggleEssential(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVENTORY_KEY })
    },
    onError: () => {
      showToast('Chyba při změně označení zásoby.', 'error')
    },
  })
}

/** Přidá zásobu do nákupního seznamu — invaliduje OBOU klíče */
export function useAddInventoryToCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { listId: string } | { newListName: string }
    }) => inventoryApi.addToCart(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVENTORY_KEY })
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
      showToast('Přidáno do nákupního seznamu.', 'success')
    },
    onError: () => {
      showToast('Chyba při přidávání do nákupu.', 'error')
    },
  })
}

/** Hromadně přidá více inventory items (EMPTY) do jednoho nákupního seznamu */
export function useBulkAddToCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, listId }: { ids: string[]; listId: string }) => {
      for (const id of ids) {
        await inventoryApi.addToCart(id, { listId })
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INVENTORY_KEY })
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
      showToast('Všechny chybějící zásoby přidány do nákupu.', 'success')
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: INVENTORY_KEY })
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
      showToast('Některé položky se nepodařilo přidat.', 'error')
    },
  })
}
