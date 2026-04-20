import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { superadminApi } from '@/api/superadmin'
import { showToast } from '@/lib/toast'
import { isNetworkError, OFFLINE_TOAST_MSG } from '@/lib/networkError'

const SUPERADMIN_USERS_QK = ['superadmin-users'] as const

function defaultOnError(fallbackMsg: string) {
  return (err: Error) => {
    if (isNetworkError(err)) {
      showToast(OFFLINE_TOAST_MSG, 'info')
      return
    }

    const msg = (err as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message
    showToast(msg || fallbackMsg, 'error')
  }
}

export function useSuperadminUsers() {
  return useQuery({
    queryKey: SUPERADMIN_USERS_QK,
    queryFn: superadminApi.getUsers,
    staleTime: 30_000,
  })
}

export function useSuperadminCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: superadminApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPERADMIN_USERS_QK })
    },
    onError: defaultOnError('Nepodařilo se vytvořit účet.'),
  })
}

export function useSuperadminToggleBan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: superadminApi.toggleBan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPERADMIN_USERS_QK })
    },
    onError: defaultOnError('Nepodařilo se změnit stav účtu.'),
  })
}
