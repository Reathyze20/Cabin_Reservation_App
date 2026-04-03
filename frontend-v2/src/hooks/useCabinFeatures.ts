/**
 * hooks/useCabinFeatures.ts
 * Načítá nastavení chaty (feature flags, winterized) z /api/cabin.
 * Odpovídá setCabinFeatures() + setCabinWinterized() z main.ts.
 */
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { useAuth } from '@/context/AuthContext'

interface CabinData {
  id?: string
  name?: string
  subdomain?: string
  features: Record<string, boolean> | null
  isWinterized: boolean
}

export function useCabinFeatures() {
  const { isLoggedIn } = useAuth()

  return useQuery({
    queryKey: ['cabin'],
    queryFn: () => apiClient.get<CabinData>('/cabin').then((r) => r.data),
    staleTime: 60_000,
    enabled: isLoggedIn,
  })
}

/** Vrací true pokud je funkce povolena (nebo cabin data nejsou k dispozici = výchozí true) */
export function isFeatureEnabled(
  features: Record<string, boolean> | null | undefined,
  key: string,
): boolean {
  if (!features) return true
  if (!(key in features)) return true
  return features[key] === true
}
