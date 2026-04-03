/**
 * api/settings.ts — Cabin settings API
 */
import apiClient from './client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CabinConfig {
  id: string
  name: string
  subdomain: string
  description: string | null
  welcomeMessage: string | null
  weatherLocation: string | null
  rules: string | null
  departureChecklist: string[] | null
  coverPhotoUrl: string | null
  isWinterized: boolean
  features: Record<string, boolean> | null
}

export interface CabinConfigUpdate {
  name?: string
  description?: string | null
  welcomeMessage?: string | null
  weatherLocation?: string | null
  rules?: string | null
  departureChecklist?: string[]
  isWinterized?: boolean
  features?: Record<string, boolean>
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const settingsApi = {
  getCabin: () =>
    apiClient.get<CabinConfig>('/cabin').then((r) => r.data),

  updateCabin: (data: CabinConfigUpdate) =>
    apiClient.patch<CabinConfig>('/cabin', data).then((r) => r.data),
}
