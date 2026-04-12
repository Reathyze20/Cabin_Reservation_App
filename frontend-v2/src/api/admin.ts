/**
 * api/admin.ts — Admin API (users, system info, logs, invites)
 */
import apiClient from './client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CabinUser {
  id: string
  username: string
  role: 'admin' | 'user' | 'guest'
  animalIcon: string | null
  avatarColor: string | null
  email: string | null
  isActive: boolean
  createdAt: string
}

export interface SystemInfo {
  userCount: number
  reservationCount: number
  photoCount: number
  noteCount: number
}

export interface LogEntry {
  level?: string
  time?: string | number
  msg?: string
  module?: string
  [key: string]: unknown
}

export interface Invite {
  id: string
  token: string
  role: string
  maxUses: number | null
  usedCount: number
  createdAt: string
  expiresAt: string
  createdBy?: { username: string }
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const adminApi = {
  // Users
  getUsers: () =>
    apiClient.get<CabinUser[]>('/users').then((r) => r.data),

  createUser: (data: { username: string; password: string; role: string }) =>
    apiClient.post<CabinUser>('/users', data).then((r) => r.data),

  updateUser: (id: string, data: { role?: string; password?: string }) =>
    apiClient.patch<CabinUser>(`/users/${id}`, data).then((r) => r.data),

  deleteUser: (id: string) =>
    apiClient.delete(`/users/${id}`).then((r) => r.data),

  deleteUserReservations: (id: string) =>
    apiClient.delete(`/users/${id}/reservations`).then((r) => r.data),

  // System info
  getSystemInfo: () =>
    apiClient.get<SystemInfo>('/admin/system').then((r) => r.data),

  // Logs
  getLogFiles: () =>
    apiClient.get<{ files: string[] }>('/logs/files').then((r) => r.data),

  getLogs: (params: { date?: string; lines?: number; level?: string }) =>
    apiClient
      .get<{ logs: (string | Record<string, unknown>)[] }>('/logs', { params })
      .then((r) => r.data),

  // Invites
  createInvite: (data: { role: string; expiresInDays?: number }) =>
    apiClient.post<Invite>('/invites', data).then((r) => r.data),

  getInvites: () =>
    apiClient.get<Invite[]>('/invites').then((r) => r.data),

  revokeInvite: (id: string) =>
    apiClient.delete(`/invites/${id}`).then((r) => r.data),
}
