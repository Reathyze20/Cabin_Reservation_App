/**
 * api/shopping.ts — Types + API functions for Shopping & Inventory modules
 */
import apiClient from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemStatus = 'pending' | 'bring_from_home' | 'purchased'

export interface ShoppingItem {
  id: string
  name: string
  status: ItemStatus
  purchased: boolean
  addedById: string
  createdAt: string
  isEssential: boolean
  addedBy?: { id: string; username: string; animalIcon?: string | null }
  purchasedBy?: { id: string; username: string; animalIcon?: string | null } | null
}

export interface ShoppingList {
  id: string
  name: string
  createdById: string
  isResolved: boolean
  createdBy?: { id: string; username: string }
  items: ShoppingItem[]
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  status: 'OK' | 'LOW' | 'EMPTY'
  location?: string | null
  inCart: boolean
  isEssential: boolean
  updatedBy?: { id: string; username: string } | null
}

export interface NoteThread {
  id: string
  name: string
}

// ─── Shopping Lists ───────────────────────────────────────────────────────────

export const shoppingApi = {
  getLists: (): Promise<ShoppingList[]> =>
    apiClient.get<ShoppingList[]>('/shopping-lists?isPantry=false').then(r => r.data),

  createList: (name: string): Promise<ShoppingList> =>
    apiClient.post<ShoppingList>('/shopping-lists', { name }).then(r => r.data),

  deleteList: (id: string): Promise<void> =>
    apiClient.delete(`/shopping-lists/${id}`).then(() => undefined),

  archiveList: (id: string): Promise<ShoppingList> =>
    apiClient
      .patch<ShoppingList>(`/shopping-lists/${id}/resolve`, { isResolved: true })
      .then(r => r.data),

  renameList: (id: string, name: string): Promise<ShoppingList> =>
    apiClient
      .patch<ShoppingList>(`/shopping-lists/${id}/rename`, { name })
      .then(r => r.data),

  // ─── Items ─────────────────────────────────────────────────────────────────

  addItem: (listId: string, name: string): Promise<ShoppingItem> =>
    apiClient
      .post<ShoppingItem>(`/shopping-list/${listId}/items`, { name, isEssential: false })
      .then(r => r.data),

  toggleItemStatus: (itemId: string, status: ItemStatus): Promise<ShoppingItem> =>
    apiClient
      .put<ShoppingItem>(`/shopping-list/${itemId}/purchase`, { status })
      .then(r => r.data),

  deleteItem: (itemId: string): Promise<void> =>
    apiClient.delete(`/shopping-list/${itemId}`).then(() => undefined),

  toggleItemEssential: (itemId: string): Promise<ShoppingItem> =>
    apiClient
      .patch<ShoppingItem>(`/shopping-list/${itemId}/toggle-essential`)
      .then(r => r.data),
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  getAll: (): Promise<InventoryItem[]> =>
    apiClient.get<InventoryItem[]>('/inventory').then(r => r.data),

  create: (data: {
    name: string
    category: string
    status: 'OK' | 'LOW' | 'EMPTY'
    location?: string
    isEssential: boolean
  }): Promise<InventoryItem> =>
    apiClient.post<InventoryItem>('/inventory', data).then(r => r.data),

  update: (
    id: string,
    data: { name: string; category?: string; status: 'OK' | 'LOW' | 'EMPTY'; location?: string; isEssential: boolean },
  ): Promise<InventoryItem> =>
    apiClient.put<InventoryItem>(`/inventory/${id}`, data).then(r => r.data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/inventory/${id}`).then(() => undefined),

  toggleEssential: (id: string): Promise<InventoryItem> =>
    apiClient.patch<InventoryItem>(`/inventory/${id}/toggle-essential`).then(r => r.data),

  addToCart: (id: string, payload: { listId: string } | { newListName: string }): Promise<unknown> =>
    apiClient.post(`/inventory/${id}/add-to-cart`, payload).then(r => r.data),
}

// ─── Notes / Threads (pro Share dialog) ──────────────────────────────────────

export const notesThreadApi = {
  getThreads: (): Promise<NoteThread[]> =>
    apiClient.get<NoteThread[]>('/channels').then(r => r.data),

  createThread: (name: string): Promise<NoteThread> =>
    apiClient.post<NoteThread>('/channels', { name }).then(r => r.data),

  postNote: (message: string, threadId?: string | null): Promise<unknown> => {
    const url =
      threadId == null
        ? '/channels/messages'
        : `/channels/${encodeURIComponent(threadId)}/messages`;
    return apiClient.post(url, { message }).then(r => r.data);
  },
}
