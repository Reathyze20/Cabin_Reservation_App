/**
 * api/admin.ts — Admin API (users, system info, logs, invites)
 */
import apiClient from './client'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CabinUserApiResponse {
  id: string
  username: string
  color: string | null
  role: 'admin' | 'user' | 'guest'
  animalIcon: string | null
  email: string | null
  isVerified: boolean
  isBanned: boolean
  createdAt: string
  _count: {
    reservations: number
    galleryPhotos: number
    noteThreads: number
  }
}

export interface CabinUser {
  id: string
  username: string
  role: 'admin' | 'user' | 'guest'
  animalIcon: string | null
  avatarColor: string | null
  email: string | null
  isVerified: boolean
  isBanned: boolean
  isActive: boolean
  createdAt: string
  reservationCount: number
  photoCount: number
  threadCount: number
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
  source?: string
  path?: string
  status?: number
  userId?: string
  username?: string
  actorId?: string
  actorUsername?: string
  actorRole?: string
  cabinId?: string | null
  requestId?: string
  errorId?: string
  [key: string]: unknown
}

export interface LogQueryParams {
  date?: string
  lines?: number
  level?: string
  userId?: string
  module?: string
  source?: string
  requestId?: string
  path?: string
  status?: number
  search?: string
}

export interface LogResponse {
  date: string
  count: number
  logs: LogEntry[]
}

export interface Invite {
  id: string
  token: string
  role: string
  maxUses: number | null
  usedCount: number
  createdAt: string
  expiresAt: string
  cabinName: string
  createdBy?: { username: string }
}

function mapCabinUser(user: CabinUserApiResponse): CabinUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    animalIcon: user.animalIcon,
    avatarColor: user.color,
    email: user.email,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
    isActive: user.isVerified && !user.isBanned,
    createdAt: user.createdAt,
    reservationCount: user._count.reservations,
    photoCount: user._count.galleryPhotos,
    threadCount: user._count.noteThreads,
  }
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const adminApi = {
  // Users
  getUsers: () =>
    apiClient.get<CabinUserApiResponse[]>('/users').then((r) => r.data.map(mapCabinUser)),

  createUser: (data: { username: string; password: string; role: string }) =>
    apiClient
      .post<{ message: string; user: { id: string; username: string } }>('/users', data)
      .then((r) => r.data),

  updateUser: (id: string, data: { role?: string; password?: string }) =>
    apiClient.patch<{ message: string }>(`/users/${id}`, data).then((r) => r.data),

  removeUserFromCabin: (id: string, deleteData = false) =>
    apiClient
      .patch<{ message: string }>(`/users/${id}/remove-from-cabin`, { deleteData })
      .then((r) => r.data),

  deleteUser: (id: string) =>
    apiClient.delete<{ message: string }>(`/users/${id}`).then((r) => r.data),

  deleteUserReservations: (id: string) =>
    apiClient.delete<{ message: string }>(`/users/${id}/reservations`).then((r) => r.data),

  // System info
  getSystemInfo: () =>
    apiClient.get<SystemInfo>('/admin/system').then((r) => r.data),

  // Logs
  getLogFiles: () =>
    apiClient.get<{ files: string[] }>('/logs/files').then((r) => r.data),

  getLogs: (params: LogQueryParams) =>
    apiClient.get<LogResponse>('/logs', { params }).then((r) => r.data),

  // Invites
  createInvite: (data: { role: string; expiresInDays?: number; maxUses?: number | null }) =>
    apiClient.post<Invite>('/invites', data).then((r) => r.data),

  getInvites: () =>
    apiClient.get<Invite[]>('/invites').then((r) => r.data),

  sendInviteEmail: (id: string, email: string) =>
    apiClient.post<{ message: string }>(`/invites/${id}/send-email`, { email }).then((r) => r.data),

  revokeInvite: (id: string) =>
    apiClient.delete(`/invites/${id}`).then((r) => r.data),
}
