/**
 * api/reconstruction.ts — Reconstruction Kanban API
 */
import apiClient from './client'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RecCategory = 'idea' | 'company' | 'task'

export type IdeaStatus = 'pending' | 'approved'
export type CompanyStatus = 'pending' | 'contacted' | 'approved' | 'rejected'
export type TaskStatus = 'pending' | 'done'
export type RecStatus = IdeaStatus | CompanyStatus | TaskStatus

export interface RecItem {
  id: string
  category: RecCategory
  title: string
  description: string | null
  // idea fields
  link?: string | null
  thumbnail?: string | null
  // company fields
  phone?: string | null
  email?: string | null
  status?: RecStatus | null
  // task fields
  deadline?: string | null
  cost?: number | null
  // voting (ideas)
  votes: string[]
  createdAt: string
}

export interface RecItemCreate {
  category: RecCategory
  title: string
  description?: string
  link?: string
  thumbnail?: string
  cost?: number | null
  phone?: string
  email?: string
  status?: RecStatus
  deadline?: string
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const reconstructionApi = {
  getAll: () =>
    apiClient.get<RecItem[]>('/reconstruction').then((r) => r.data),

  create: (data: RecItemCreate) =>
    apiClient.post<RecItem>('/reconstruction', data).then((r) => r.data),

  update: (id: string, data: Partial<RecItemCreate>) =>
    apiClient.put<RecItem>(`/reconstruction/${id}`, data).then((r) => r.data),

  updateStatus: (id: string, status: RecStatus) =>
    apiClient.patch<RecItem>(`/reconstruction/${id}/status`, { status }).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/reconstruction/${id}`).then((r) => r.data),

  vote: (id: string) =>
    apiClient.patch<RecItem>(`/reconstruction/${id}/vote`).then((r) => r.data),
}
