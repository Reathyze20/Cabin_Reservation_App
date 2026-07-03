import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { superadminApi } from '@/api/superadmin'
import { handleMutationError } from '@/lib/mutationError'

const SUPERADMIN_USERS_QK = ['superadmin-users'] as const

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
    onError: handleMutationError('Nepodařilo se vytvořit účet'),
  })
}

export function useSuperadminToggleBan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: superadminApi.toggleBan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPERADMIN_USERS_QK })
    },
    onError: handleMutationError('Nepodařilo se změnit stav účtu'),
  })
}
