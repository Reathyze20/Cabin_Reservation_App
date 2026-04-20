/**
 * features/admin/hooks/useAdmin.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { showToast } from '@/lib/toast'
import { isNetworkError, OFFLINE_TOAST_MSG } from '@/lib/networkError'

function defaultOnError(fallbackMsg: string) {
  return (err: Error) => {
    if (isNetworkError(err)) { showToast(OFFLINE_TOAST_MSG, 'info'); return }
    const msg = (err as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message
    showToast(msg || fallbackMsg, 'error')
  }
}

const USERS_QK = ['admin-users'] as const
const SYSTEM_QK = ['admin-system'] as const
const INVITES_QK = ['admin-invites'] as const

export function useAdminUsers() {
  return useQuery({
    queryKey: USERS_QK,
    queryFn: adminApi.getUsers,
    staleTime: 30_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_QK }),
    onError: defaultOnError('Nepodařilo se vytvořit uživatele.'),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; password?: string } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_QK }),
    onError: defaultOnError('Nepodařilo se upravit uživatele.'),
  })
}

export function useRemoveUserFromCabin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, deleteData = false }: { id: string; deleteData?: boolean }) =>
      adminApi.removeUserFromCabin(id, deleteData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_QK })
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['shopping'] })
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['diary'] })
      qc.invalidateQueries({ queryKey: ['gallery'] })
      qc.invalidateQueries({ queryKey: SYSTEM_QK })
    },
    onError: defaultOnError('Nepodařilo se odebrat uživatele z chaty.'),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      // Cross-module cascade: deleting a user cascades to their
      // reservations, shopping lists/items, notes, threads, diary entries
      qc.invalidateQueries({ queryKey: USERS_QK })
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['shopping'] })
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['diary'] })
      qc.invalidateQueries({ queryKey: ['gallery'] })
      qc.invalidateQueries({ queryKey: SYSTEM_QK })
    },
    onError: defaultOnError('Nepodařilo se smazat uživatele.'),
  })
}

export function useDeleteUserReservations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminApi.deleteUserReservations,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: SYSTEM_QK })
    },
    onError: defaultOnError('Nepodařilo se smazat rezervace uživatele.'),
  })
}

export function useSystemInfo() {
  return useQuery({
    queryKey: SYSTEM_QK,
    queryFn: adminApi.getSystemInfo,
    staleTime: 60_000,
  })
}

export function useLogFiles() {
  return useQuery({
    queryKey: ['admin-log-files'],
    queryFn: adminApi.getLogFiles,
    staleTime: 300_000,
  })
}

export function useAdminInvites() {
  return useQuery({
    queryKey: INVITES_QK,
    queryFn: adminApi.getInvites,
    staleTime: 30_000,
  })
}

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminApi.createInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: INVITES_QK }),
    onError: defaultOnError('Nepodařilo se vytvořit pozvánku.'),
  })
}

export function useSendInviteEmail() {
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => adminApi.sendInviteEmail(id, email),
    onError: defaultOnError('Nepodařilo se odeslat pozvánku e-mailem.'),
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminApi.revokeInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: INVITES_QK }),
    onError: defaultOnError('Nepodařilo se zrušit pozvánku.'),
  })
}
