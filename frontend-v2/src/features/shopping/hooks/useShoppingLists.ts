/**
 * useShoppingLists.ts — TanStack Query hooks pro nákupní seznamy
 * Optimistické mutace pro toggle statusu položky.
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { shoppingApi } from '@/api/shopping'
import type { ItemStatus, ShoppingItem, ShoppingList } from '@/api/shopping'
import { ShoppingListArraySchema } from '@/api/schemas'
import { showToast } from '@/lib/toast'
import { isNetworkError, OFFLINE_TOAST_MSG } from '@/lib/networkError'

export const SHOPPING_KEY = ['shopping-lists'] as const

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useShoppingLists() {
  return useQuery({
    queryKey: SHOPPING_KEY,
    queryFn: async () => {
      const data = await shoppingApi.getLists();
      // Zod validate — throws on shape mismatch → React Query error state
      return ShoppingListArraySchema.parse(data) as ShoppingList[];
    },
    staleTime: 30_000,
  })
}

// ─── List mutations ───────────────────────────────────────────────────────────

export function useCreateList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => shoppingApi.createList(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba při vytváření seznamu.',
        isNetworkError(err) ? 'info' : 'error',
      )
    },
  })
}

export function useDeleteList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => shoppingApi.deleteList(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba při mazání seznamu.',
        isNetworkError(err) ? 'info' : 'error',
      )
    },
  })
}

export function useArchiveList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => shoppingApi.archiveList(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba při archivaci seznamu.',
        isNetworkError(err) ? 'info' : 'error',
      )
    },
  })
}

export function useRenameList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      shoppingApi.renameList(id, name),
    onMutate: async ({ id, name }) => {
      await qc.cancelQueries({ queryKey: SHOPPING_KEY })
      const prev = qc.getQueryData<ShoppingList[]>(SHOPPING_KEY)
      if (prev) {
        qc.setQueryData<ShoppingList[]>(SHOPPING_KEY, prev.map(l =>
          l.id === id ? { ...l, name } : l
        ))
      }
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(SHOPPING_KEY, ctx.prev)
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba při přejmenování seznamu.',
        isNetworkError(err) ? 'info' : 'error',
      )
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
  })
}

// ─── Item mutations ───────────────────────────────────────────────────────────

export function useAddItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, name }: { listId: string; name: string }) =>
      shoppingApi.addItem(listId, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba při přidávání položky.',
        isNetworkError(err) ? 'info' : 'error',
      )
    },
  })
}

/** Optimistická mutace — toggluje status položky bez čekání na server */
export function useToggleItemStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ItemStatus }) =>
      shoppingApi.toggleItemStatus(itemId, status),

    onMutate: async ({ itemId, status }) => {
      await qc.cancelQueries({ queryKey: SHOPPING_KEY })
      const previous = qc.getQueryData<ShoppingList[]>(SHOPPING_KEY)

      qc.setQueryData<ShoppingList[]>(SHOPPING_KEY, old =>
        (old ?? []).map(list => ({
          ...list,
          items: list.items.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  status,
                  purchased: status === 'purchased',
                } satisfies ShoppingItem
              : item,
          ),
        })),
      )

      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      if (isNetworkError(_err)) {
        // Síťová chyba: ponech optmistické UI, ukaž soft toast
        // Položka zůstává v checked stavu v cache — udrží UX iluzi
        showToast(OFFLINE_TOAST_MSG, 'info')
        return
      }
      // Serverová chyba (4xx/5xx): rollback optmistické změny
      if (ctx?.previous) {
        qc.setQueryData(SHOPPING_KEY, ctx.previous)
      }
      showToast('Chyba při aktualizaci položky.', 'error')
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => shoppingApi.deleteItem(itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
    onError: (err) => {
      showToast(
        isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba při mazání položky.',
        isNetworkError(err) ? 'info' : 'error',
      )
    },
  })
}

export function useToggleItemEssential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => shoppingApi.toggleItemEssential(itemId),

    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: SHOPPING_KEY })
      const previous = qc.getQueryData<ShoppingList[]>(SHOPPING_KEY)

      qc.setQueryData<ShoppingList[]>(SHOPPING_KEY, old =>
        (old ?? []).map(list => ({
          ...list,
          items: list.items.map(item =>
            item.id === itemId
              ? { ...item, isEssential: !item.isEssential } satisfies ShoppingItem
              : item,
          ),
        })),
      )

      return { previous }
    },

    onError: (_err, _vars, ctx) => {
      if (isNetworkError(_err)) {
        showToast(OFFLINE_TOAST_MSG, 'info')
        return
      }
      if (ctx?.previous) {
        qc.setQueryData(SHOPPING_KEY, ctx.previous)
      }
      showToast('Chyba při změně označení položky.', 'error')
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: SHOPPING_KEY })
    },
  })
}
