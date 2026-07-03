import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shoppingApi, type ShoppingItem, type ShoppingList } from '@/api/shopping'
import { OFFLINE_TOAST_MSG } from '@/lib/networkError'
import { showToast } from '@/lib/toast'
import { SHOPPING_KEY, useToggleItemStatus } from '@/features/shopping/hooks/useShoppingLists'

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}))

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'item-1',
    name: 'Mléko',
    status: 'pending',
    purchased: false,
    addedById: 'user-1',
    createdAt: '2026-04-18T12:00:00.000Z',
    isEssential: false,
    ...overrides,
  }
}

function createList(item: ShoppingItem): ShoppingList {
  return {
    id: 'list-1',
    name: 'Víkend',
    createdById: 'user-1',
    isResolved: false,
    items: [item],
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('shopping optimistic status mutation', () => {
  it('optimistically marks item as purchased and keeps server result', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'item-purchased' })
    const pendingToggle = createDeferred<ShoppingItem>()

    queryClient.setQueryData(SHOPPING_KEY, [createList(item)])
    vi.spyOn(shoppingApi, 'toggleItemStatus').mockReturnValueOnce(pendingToggle.promise)

    const { result } = renderHook(() => useToggleItemStatus(), { wrapper })

    act(() => {
      result.current.mutate({ itemId: 'item-purchased', status: 'purchased' })
    })

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('purchased')
      expect(cachedItem?.purchased).toBe(true)
    })

    pendingToggle.resolve({ ...item, status: 'purchased', purchased: true })

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('purchased')
      expect(cachedItem?.purchased).toBe(true)
    })
  })

  it('rolls back optimistic purchased change on server error', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'item-server-error' })
    const pendingToggle = createDeferred<ShoppingItem>()

    queryClient.setQueryData(SHOPPING_KEY, [createList(item)])
    vi.spyOn(shoppingApi, 'toggleItemStatus').mockReturnValueOnce(pendingToggle.promise)

    const { result } = renderHook(() => useToggleItemStatus(), { wrapper })

    act(() => {
      result.current.mutate({ itemId: 'item-server-error', status: 'purchased' })
    })

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('purchased')
      expect(cachedItem?.purchased).toBe(true)
    })

    pendingToggle.reject(new Error('server failed'))

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('pending')
      expect(cachedItem?.purchased).toBe(false)
    })

    expect(showToast).toHaveBeenCalledWith(
      {
        title: 'Chyba při aktualizaci položky',
        detail: 'Něco se pokazilo. Zkuste to prosím znovu.',
        supportCode: undefined,
      },
      'error',
    )
  })

  it('keeps optimistic purchased state on network error', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'item-offline' })
    const pendingToggle = createDeferred<ShoppingItem>()

    queryClient.setQueryData(SHOPPING_KEY, [createList(item)])
    vi.spyOn(shoppingApi, 'toggleItemStatus').mockReturnValueOnce(pendingToggle.promise)

    const { result } = renderHook(() => useToggleItemStatus(), { wrapper })

    act(() => {
      result.current.mutate({ itemId: 'item-offline', status: 'purchased' })
    })

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('purchased')
      expect(cachedItem?.purchased).toBe(true)
    })

    pendingToggle.reject(new TypeError('Network Error'))

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('purchased')
      expect(cachedItem?.purchased).toBe(true)
    })

    expect(showToast).toHaveBeenCalledWith(
      { title: 'Výpadek připojení', detail: OFFLINE_TOAST_MSG },
      'info',
    )
  })

  it('optimistically marks bring-from-home without purchased flag', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'item-home', status: 'pending', purchased: false })
    const pendingToggle = createDeferred<ShoppingItem>()

    queryClient.setQueryData(SHOPPING_KEY, [createList(item)])
    vi.spyOn(shoppingApi, 'toggleItemStatus').mockReturnValueOnce(pendingToggle.promise)

    const { result } = renderHook(() => useToggleItemStatus(), { wrapper })

    act(() => {
      result.current.mutate({ itemId: 'item-home', status: 'bring_from_home' })
    })

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('bring_from_home')
      expect(cachedItem?.purchased).toBe(false)
    })

    pendingToggle.resolve({ ...item, status: 'bring_from_home', purchased: false })

    await waitFor(() => {
      const cachedItem = queryClient.getQueryData<ShoppingList[]>(SHOPPING_KEY)?.[0].items[0]
      expect(cachedItem?.status).toBe('bring_from_home')
      expect(cachedItem?.purchased).toBe(false)
    })
  })
})