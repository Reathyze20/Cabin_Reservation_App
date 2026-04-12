/**
 * api/members.ts — Members & invites API for the Members page
 */
import apiClient from './client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CabinMember {
  id: string
  username: string
  role: 'admin' | 'user' | 'guest'
  animalIcon: string | null
  color: string | null
  email: string | null
  createdAt: string
  _count: {
    reservations: number
    galleryPhotos: number
    noteThreads: number
  }
}

export interface Invite {
  id: string
  token: string
  role: string
  maxUses: number | null
  usedCount: number
  expiresAt: string
  createdAt: string
  createdBy: { username: string }
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const membersApi = {
  // Members (reuses /users endpoint with extended data)
  getMembers: () =>
    apiClient.get<CabinMember[]>('/users').then((r) => r.data),

  removeMember: (id: string, deleteData: boolean) =>
    apiClient.patch(`/users/${id}/remove-from-cabin`, { deleteData }).then((r) => r.data),

  updateRole: (id: string, role: string) =>
    apiClient.patch(`/users/${id}`, { role }).then((r) => r.data),

  resetPassword: (id: string, password: string) =>
    apiClient.patch(`/users/${id}`, { password }).then((r) => r.data),

  leaveCabin: () =>
    apiClient.post('/users/me/leave-cabin').then((r) => r.data),

  // Invites
  getInvites: () =>
    apiClient.get<Invite[]>('/invites').then((r) => r.data),

  createInvite: (data: { role: string; expiresInDays?: number; maxUses?: number | null }) =>
    apiClient.post<Invite>('/invites', data).then((r) => r.data),

  revokeInvite: (id: string) =>
    apiClient.delete(`/invites/${id}`).then((r) => r.data),

  sendInviteEmail: (id: string, email: string) =>
    apiClient.post(`/invites/${id}/send-email`, { email }).then((r) => r.data),
}
