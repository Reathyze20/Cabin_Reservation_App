# Recipes & Patterns

Battle-tested code patterns used across the application. Copy-paste these as starting points — they enforce all CabinSaaS rules.

---

## Recipe 1: Feature Page with Loading/Error/Empty

Every feature page must handle three states. This is the canonical structure:

```tsx
// features/<feature>/<Feature>Page.tsx
import { ErrorBoundary } from 'react-error-boundary'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import { use<Feature> } from './hooks/use<Feature>'

function <Feature>PageContent() {
  const { data, isLoading, error } = use<Feature>()
  const qc = useQueryClient()

  if (isLoading) return <<Feature>Skeleton />

  if (error) {
    return (
      <FeatureErrorFallback
        error={error}
        resetErrorBoundary={() => qc.invalidateQueries({ queryKey: ['<feature>'] })}
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-8 text-center">
          <p className="text-5xl mb-4">📭</p>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Zatím žádná data</h2>
          <p className="text-slate-500 text-sm">Začněte vytvořením nového záznamu.</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-4 md:p-6 lg:p-8 pb-20 md:pb-0 space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Nadpis</h1>
        {/* Content */}
      </div>
    </motion.div>
  )
}

export function <Feature>Page() {
  const qc = useQueryClient()
  return (
    <ErrorBoundary
      FallbackComponent={FeatureErrorFallback}
      onReset={() => qc.invalidateQueries({ queryKey: ['<feature>'] })}
    >
      <<Feature>PageContent />
    </ErrorBoundary>
  )
}
```

---

## Recipe 2: TanStack Query Hook with Optimistic Mutation

```tsx
// features/<feature>/hooks/use<Feature>.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { <feature>Api, type <Item> } from '@/api/<feature>'
import { showToast } from '@/lib/toast'

// Query keys — centralize for consistency
export const <FEATURE>_KEYS = {
  all: ['<feature>'] as const,
  lists: ['<feature>', 'lists'] as const,
  detail: (id: string) => ['<feature>', 'detail', id] as const,
}

// Read hook
export function use<Feature>() {
  return useQuery<Item[]>({
    queryKey: <FEATURE>_KEYS.lists,
    queryFn: () => <feature>Api.getAll(),
    staleTime: 30_000,
  })
}

// Optimistic toggle (for checkboxes, toggles, quick actions)
export function useToggle<Feature>() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => <feature>Api.toggle(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: <FEATURE>_KEYS.lists })
      const prev = qc.getQueryData<<Item>[]>(<FEATURE>_KEYS.lists)

      qc.setQueryData<<Item>[]>(<FEATURE>_KEYS.lists, old =>
        old?.map(item =>
          item.id === id ? { ...item, active: !item.active } : item
        ) ?? []
      )

      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(<FEATURE>_KEYS.lists, ctx.prev)
      showToast('Nepodařilo se uložit změnu', 'error')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: <FEATURE>_KEYS.lists }),
  })
}

// Destructive mutation (NO optimistic update)
export function useDelete<Feature>() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => <feature>Api.delete(id),
    onSuccess: () => {
      showToast('Smazáno', 'success')
      qc.invalidateQueries({ queryKey: <FEATURE>_KEYS.lists })
    },
    onError: () => showToast('Nepodařilo se smazat', 'error'),
  })
}
```

---

## Recipe 3: Form with React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/shared/Modal'
import { showToast } from '@/lib/toast'

const formSchema = z.object({
  name: z.string().min(1, 'Název je povinný').max(100, 'Max 100 znaků'),
  description: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateModal({ isOpen, onClose }: CreateModalProps) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => api.create(data),
    onSuccess: () => {
      showToast('Vytvořeno', 'success')
      qc.invalidateQueries({ queryKey: ['feature'] })
      reset()
      onClose()
    },
    onError: () => showToast('Nepodařilo se vytvořit', 'error'),
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nový záznam"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Zrušit
          </button>
          <button
            type="submit"
            form="create-form"
            className="btn-primary"
            disabled={isSubmitting || mutation.isPending}
          >
            {mutation.isPending ? 'Ukládám...' : 'Vytvořit'}
          </button>
        </div>
      }
    >
      <form id="create-form" onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Název</label>
          <input {...register('name')} className="input-field w-full" autoFocus />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Popis</label>
          <textarea {...register('description')} className="input-field w-full" rows={3} />
          {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>}
        </div>
      </form>
    </Modal>
  )
}
```

---

## Recipe 4: Skeleton Loader

```tsx
import { motion } from 'framer-motion'

export function FeatureSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-0">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        {/* Title skeleton */}
        <div className="h-8 w-40 bg-slate-200 rounded-lg animate-pulse" />

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
                <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Recipe 5: Confirmation Delete Modal

```tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { showToast } from '@/lib/toast'

interface DeleteConfirmProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemName: string
  queryKey: readonly string[]
  deleteFn: (id: string) => Promise<void>
  successMessage?: string
  warningMessage?: string
}

export function DeleteConfirm({
  isOpen, onClose, itemId, itemName, queryKey,
  deleteFn, successMessage = 'Smazáno', warningMessage,
}: DeleteConfirmProps) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteFn(itemId),
    onSuccess: () => {
      showToast(successMessage, 'success')
      qc.invalidateQueries({ queryKey })
      onClose()
    },
    onError: () => showToast('Nepodařilo se smazat', 'error'),
  })

  const isLoading = mutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title="Potvrzení smazání"
      maxWidth="max-w-sm"
      persistent={isLoading}
      footer={
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose} disabled={isLoading}>Zrušit</button>
          <button
            className="btn-danger"
            onClick={() => mutation.mutate()}
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            {isLoading ? 'Mažu...' : 'Smazat'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">
            Opravdu chceš smazat <strong className="text-slate-900">"{itemName}"</strong>?
          </p>
        </div>
        {warningMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{warningMessage}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
```

---

## Recipe 6: API Module

```tsx
// api/<feature>.ts
import { apiClient } from './client'

export interface FeatureItem {
  id: string
  name: string
  // ... typed fields
}

interface CreatePayload {
  name: string
}

export const featureApi = {
  getAll: async (): Promise<FeatureItem[]> => {
    const { data } = await apiClient.get<FeatureItem[]>('/feature')
    return data
  },

  create: async (payload: CreatePayload): Promise<FeatureItem> => {
    const { data } = await apiClient.post<FeatureItem>('/feature', payload)
    return data
  },

  update: async (id: string, payload: Partial<CreatePayload>): Promise<FeatureItem> => {
    const { data } = await apiClient.put<FeatureItem>(`/feature/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/feature/${id}`)
  },
}
```

---

## Recipe 7: Master-Detail Layout (Mobile-Responsive)

Used by Notes and Shopping pages — left panel (list) + right panel (detail):

```tsx
export function MasterDetailPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-0">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 160px)' }}>
          {/* Master (list) — full width on mobile, 1/3 on desktop */}
          <div className={`
            w-full md:w-80 lg:w-96 border-r border-slate-200 overflow-y-auto
            ${selectedId ? 'hidden md:block' : 'block'}
          `}>
            <MasterList onSelect={setSelectedId} selectedId={selectedId} />
          </div>

          {/* Detail — full width on mobile, 2/3 on desktop */}
          <div className={`
            flex-1 overflow-y-auto
            ${selectedId ? 'block' : 'hidden md:flex md:items-center md:justify-center'}
          `}>
            {selectedId ? (
              <DetailView
                id={selectedId}
                onBack={() => setSelectedId(null)} // mobile back button
              />
            ) : (
              <p className="text-slate-400 text-center">Vyber položku ze seznamu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Anti-Patterns (NEVER DO)

```tsx
// ❌ Raw fetch — always use apiClient
const res = await fetch('/api/notes')

// ❌ Custom modal wrapper — always use <Modal>
<div className="fixed inset-0 z-50 bg-black/50">
  <div className="bg-white rounded-lg">...</div>
</div>

// ❌ any type
const data: any = await response.json()

// ❌ Direct localStorage for auth
const token = localStorage.getItem('token')

// ❌ No loading state
function Page() {
  const { data } = useQuery(...)
  return <List items={data} />  // crashes when data is undefined!
}

// ❌ Long animation
<motion.div transition={{ duration: 0.8 }}>  // max 0.3s!

// ❌ Content touching edges
<div className="rounded-2xl shadow-xl">
  <h1>Title</h1>  // needs p-6 md:p-8!
</div>

// ❌ Hardcoded backend URL
await axios.get('http://localhost:3000/api/notes')
```
