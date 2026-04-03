/**
 * features/settings/hooks/useCabinSettings.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type CabinConfigUpdate } from '@/api/settings'

// Use same QK as useCabinFeatures so nav auto-updates after save
const QK = ['cabin'] as const

export function useCabinSettings() {
  return useQuery({
    queryKey: QK,
    queryFn: settingsApi.getCabin,
    staleTime: 60_000,
  })
}

export function useUpdateCabinSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CabinConfigUpdate) => settingsApi.updateCabin(data),
    onSuccess: (updated) => {
      // Update cache so nav (TopBar + MobileNav) re-renders with new feature flags
      qc.setQueryData(QK, updated)
    },
  })
}
