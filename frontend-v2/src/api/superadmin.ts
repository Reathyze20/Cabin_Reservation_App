import apiClient from './client'
import type { LogQueryParams, LogResponse } from './admin'

interface SystemUserApiResponse {
  id: string
  username: string
  email: string | null
  role: 'admin' | 'user' | 'guest'
  isSuperAdmin: boolean
  isBanned: boolean
  isVerified: boolean
  createdAt: string
}

export interface SystemUser {
  id: string
  username: string
  email: string | null
  role: 'admin' | 'user' | 'guest'
  isSuperAdmin: boolean
  isBanned: boolean
  isVerified: boolean
  isActive: boolean
  createdAt: string
}

export interface SuperadminCreateUserResponse {
  message: string
  user: {
    id: string
    username: string
    email: string | null
  }
  verificationEmailSent: boolean
  tempPassword?: string
  verificationToken?: string
}

export interface ToggleBanResponse {
  message: string
  isBanned: boolean
}

function mapSystemUser(user: SystemUserApiResponse): SystemUser {
  return {
    ...user,
    isActive: user.isVerified && !user.isBanned,
  }
}

export const superadminApi = {
  getUsers: () =>
    apiClient.get<SystemUserApiResponse[]>('/superadmin/users').then((r) => r.data.map(mapSystemUser)),

  createUser: (data: { username: string; email: string; role: 'admin' | 'user' | 'guest' }) =>
    apiClient.post<SuperadminCreateUserResponse>('/superadmin/users', data).then((r) => r.data),

  toggleBan: (id: string) =>
    apiClient.patch<ToggleBanResponse>(`/superadmin/users/${id}/ban`).then((r) => r.data),

  getLogFiles: () =>
    apiClient.get<{ files: string[] }>('/superadmin/logs/files').then((r) => r.data),

  getLogs: (params: LogQueryParams) =>
    apiClient.get<LogResponse>('/superadmin/logs', { params }).then((r) => r.data),
}
