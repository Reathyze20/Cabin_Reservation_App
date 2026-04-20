import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reconstructionApi, type RecItem } from '@/api/reconstruction'
import { useUpdateRecStatus, useVoteRecItem } from '@/features/reconstruction/hooks/useReconstruction'

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

function createItem(overrides: Partial<RecItem> = {}): RecItem {
  return {
    id: 'item-1',
    category: 'idea',
    title: 'Nápad',
    description: null,
    votes: [],
    createdAt: '2026-04-18T10:00:00.000Z',
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('reconstruction optimistic mutations', () => {
  it('optimistically toggles vote and keeps server result', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'idea-1', category: 'idea' })
    const pendingVote = createDeferred<RecItem>()

    queryClient.setQueryData(['reconstruction'], [item])
    vi.spyOn(reconstructionApi, 'vote').mockReturnValueOnce(pendingVote.promise)

    const { result } = renderHook(() => useVoteRecItem(), { wrapper })

    act(() => {
      result.current.mutate({ id: 'idea-1', currentUserId: 'user-1' })
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].votes).toEqual(['user-1'])
    })

    pendingVote.resolve({ ...item, votes: ['user-1'] })

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].votes).toEqual(['user-1'])
    })
  })

  it('rolls back optimistic vote on error', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'idea-2', category: 'idea' })
    const pendingVote = createDeferred<RecItem>()

    queryClient.setQueryData(['reconstruction'], [item])
    vi.spyOn(reconstructionApi, 'vote').mockReturnValueOnce(pendingVote.promise)

    const { result } = renderHook(() => useVoteRecItem(), { wrapper })

    act(() => {
      result.current.mutate({ id: 'idea-2', currentUserId: 'user-2' })
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].votes).toEqual(['user-2'])
    })

    pendingVote.reject(new Error('vote failed'))

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].votes).toEqual([])
    })
  })

  it('optimistically updates company status and keeps server result', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'company-1', category: 'company', status: 'pending' })
    const pendingStatus = createDeferred<RecItem>()

    queryClient.setQueryData(['reconstruction'], [item])
    vi.spyOn(reconstructionApi, 'updateStatus').mockReturnValueOnce(pendingStatus.promise)

    const { result } = renderHook(() => useUpdateRecStatus(), { wrapper })

    act(() => {
      result.current.mutate({ id: 'company-1', status: 'contacted' })
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].status).toBe('contacted')
    })

    pendingStatus.resolve({ ...item, status: 'contacted' })

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].status).toBe('contacted')
    })
  })

  it('rolls back optimistic task status on error', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const item = createItem({ id: 'task-1', category: 'task', status: 'pending' })
    const pendingStatus = createDeferred<RecItem>()

    queryClient.setQueryData(['reconstruction'], [item])
    vi.spyOn(reconstructionApi, 'updateStatus').mockReturnValueOnce(pendingStatus.promise)

    const { result } = renderHook(() => useUpdateRecStatus(), { wrapper })

    act(() => {
      result.current.mutate({ id: 'task-1', status: 'done' })
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].status).toBe('done')
    })

    pendingStatus.reject(new Error('status failed'))

    await waitFor(() => {
      expect(queryClient.getQueryData<RecItem[]>(['reconstruction'])?.[0].status).toBe('pending')
    })
  })
})