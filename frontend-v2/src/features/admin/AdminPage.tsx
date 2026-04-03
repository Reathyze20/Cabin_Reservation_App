/**
 * features/admin/AdminPage.tsx
 * Admin panel: user management, system stats, server logs.
 */
import { useState, useEffect, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useDeleteUserReservations,
  useSystemInfo,
  useLogFiles,
} from './hooks/useAdmin'
import { adminApi, type CabinUser } from '@/api/admin'
import { showToast } from '@/lib/toast'
import { Modal } from '@/components/shared/Modal'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKIP_LOG_KEYS = new Set([
  'level', 'time', 'msg', 'module', 'userId', 'username', 'role',
  'source', 'requestId', 'actorId', 'app', 'env', 'pid',
])

function formatLogEntry(entry: Record<string, unknown>): { text: string; color: string } {
  const lvl = String(entry.level ?? 'info').toLowerCase().replace(/\d+/, (n) => {
    const lvls: Record<string, string> = { '10': 'trace', '20': 'debug', '30': 'info', '40': 'warn', '50': 'error', '60': 'fatal' }
    return lvls[n] ?? 'info'
  })

  const rawTime = entry.time
  let time = ''
  if (rawTime) {
    const d = typeof rawTime === 'number' ? new Date(rawTime) : new Date(String(rawTime))
    if (!isNaN(d.getTime())) {
      time = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  }

  const module = entry.module ? `[${entry.module}] ` : ''
  const msg = String(entry.msg ?? '')
  const userId = entry.userId ? ` | user:${entry.userId}` : ''
  const source = entry.source === 'frontend' ? ' [FE]' : ''
  const reqId = entry.requestId ? ` | req:${entry.requestId}` : ''
  const extra = Object.entries(entry)
    .filter(([k]) => !SKIP_LOG_KEYS.has(k))
    .map(([k, v]) => `${k}:${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' | ')

  const text = `[${time}]${source} [${lvl.toUpperCase()}] ${module}${msg}${userId}${reqId}${extra ? ' | ' + extra : ''}`
  const color = lvl === 'error' || lvl === 'fatal' ? 'var(--log-error)'
    : lvl === 'warn' ? 'var(--log-warn)'
    : lvl === 'debug' || lvl === 'trace' ? 'var(--log-muted)'
    : 'var(--log-info)'

  return { text, color }
}

// ─── EditUserModal ────────────────────────────────────────────────────────────

interface EditUserModalProps {
  user: CabinUser
  onClose: () => void
  onDeleted: () => void
}

function EditUserModal({ user, onClose, onDeleted }: EditUserModalProps) {
  const { user: currentUser, isAdmin } = useAuth()
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState('')
  const [confirmAction, setConfirmAction] = useState<'delete-user' | 'delete-reservations' | null>(null)
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const deleteReservations = useDeleteUserReservations()

  const isSelf = currentUser?.userId === user.id

  function handleSave() {
    updateUser.mutate(
      { id: user.id, data: { role, password: password || undefined } },
      {
        onSuccess: () => {
          showToast('Uživatel upraven', 'success')
          onClose()
        },
        onError: () => showToast('Nepodařilo se upravit uživatele', 'error'),
      },
    )
  }

  function handleConfirmedAction() {
    if (confirmAction === 'delete-reservations') {
      setConfirmAction(null)
      deleteReservations.mutate(user.id, {
        onSuccess: () => showToast('Rezervace smazány', 'success'),
        onError: () => showToast('Nepodařilo se smazat rezervace', 'error'),
      })
    } else if (confirmAction === 'delete-user') {
      setConfirmAction(null)
      deleteUser.mutate(user.id, {
        onSuccess: () => {
          showToast('Uživatel smazán', 'success')
          onDeleted()
          onClose()
        },
        onError: () => showToast('Nepodařilo se smazat uživatele', 'error'),
      })
    }
  }

  // ── Confirmation view ──────────────────────────────────────────────────
  if (confirmAction) {
    const isDeletingUser = confirmAction === 'delete-user'
    return (
      <Modal
        isOpen={true}
        onClose={() => setConfirmAction(null)}
        title={isDeletingUser ? 'Smazat uživatele?' : 'Smazat rezervace?'}
        maxWidth="max-w-sm"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>
              Zrušit
            </button>
            <button className="btn btn-danger" onClick={handleConfirmedAction}>
              {isDeletingUser ? 'Smazat uživatele' : 'Smazat rezervace'}
            </button>
          </div>
        }
      >
        <p className="text-slate-600">
          {isDeletingUser
            ? `Opravdu smazat uživatele „${user.username}"? Budou smazány i všechny jeho rezervace, nákupní seznamy, poznámky a záznamy v deníku. Toto nelze vrátit!`
            : `Smazat VŠECHNY rezervace uživatele „${user.username}"?`}
        </p>
      </Modal>
    )
  }

  // ── Edit view ──────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upravit uživatele"
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={updateUser.isPending}
          >
            {updateUser.isPending ? 'Ukládám…' : 'Uložit'}
          </button>
          {isAdmin && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmAction('delete-reservations')}
                disabled={deleteReservations.isPending}
                style={{ marginLeft: 'auto' }}
              >
                Smazat rezervace
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setConfirmAction('delete-user')}
                disabled={deleteUser.isPending || isSelf}
                title={isSelf ? 'Nemůžete smazat sami sebe' : undefined}
              >
                Smazat uživatele
              </button>
            </>
          )}
        </div>
      }
    >
        <div className="form-group">
          <label>Uživatelské jméno</label>
          <input type="text" value={user.username} disabled className="form-control" />
        </div>

        <div className="form-group">
          <label htmlFor="edit-role">Role</label>
          <select id="edit-role" value={role} onChange={(e) => setRole(e.target.value as CabinUser['role'])} disabled={!isAdmin}>
            <option value="admin">Admin</option>
            <option value="user">Člen</option>
            <option value="guest">Host</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="edit-password">Nové heslo <span className="cs-optional">(nepovinné)</span></label>
          <input
            id="edit-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ponechte prázdné pro zachování stávajícího"
            minLength={6}
            maxLength={100}
            autoComplete="new-password"
          />
        </div>
    </Modal>
  )
}

// ─── SystemStats ──────────────────────────────────────────────────────────────

function SystemStats() {
  const { data, isLoading } = useSystemInfo()

  if (isLoading) return <div className="spinner" />
  if (!data) return null

  const stats = [
    { label: 'Uživatelé', value: data.userCount },
    { label: 'Rezervace', value: data.reservationCount },
    { label: 'Fotky', value: data.photoCount },
    { label: 'Zprávy', value: data.noteCount },
  ]

  return (
    <div id="sys-info-content" className="system-stats-grid">
      {stats.map((s) => (
        <div key={s.label} className="system-stat">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── LogsViewer ───────────────────────────────────────────────────────────────

function LogsViewer() {
  const { data: filesData } = useLogFiles()
  const files = filesData?.files ?? []

  const [selectedDate, setSelectedDate] = useState('')
  const [level, setLevel] = useState('')
  const [logsEntries, setLogsEntries] = useState<{ text: string; color: string }[]>([])
  const [logsStatus, setLogsStatus] = useState<'idle' | 'empty' | 'error' | 'loaded'>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const logsRef = useRef<HTMLDivElement>(null)

  // Auto-select first file
  useEffect(() => {
    if (files.length > 0 && !selectedDate) {
      setSelectedDate(files[0])
    }
  }, [files, selectedDate])

  useEffect(() => {
    if (selectedDate) loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, level])

  async function loadLogs() {
    setIsLoading(true)
    try {
      const data = await adminApi.getLogs({ date: selectedDate, lines: 500, level: level || undefined })
      const logs = data?.logs ?? []

      if (logs.length === 0) {
        setLogsEntries([])
        setLogsStatus('empty')
        return
      }

      const entries = logs.map((entry) => {
        if (typeof entry === 'string') {
          return { text: entry, color: 'var(--log-info)' }
        }
        return formatLogEntry(entry as Record<string, unknown>)
      })

      setLogsEntries(entries)
      setLogsStatus('loaded')
    } catch {
      setLogsEntries([])
      setLogsStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logsEntries])

  function downloadLogs() {
    const el = logsRef.current
    if (!el) return
    const text = (el.textContent ?? '').trim()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chata-logs-${selectedDate || 'logs'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div id="server-logs">
      <div className="logs-controls" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <select
          id="log-date-select"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ minWidth: '10rem' }}
        >
          {files.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          id="log-level-select"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">Všechny levely</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <button id="btn-refresh-logs" className="btn btn-secondary" onClick={loadLogs} disabled={isLoading}>
          {isLoading ? '⟳ Načítám…' : '⟳ Obnovit'}
        </button>
        <button id="btn-download-logs" className="btn btn-secondary" onClick={downloadLogs}>
          ↓ Stáhnout
        </button>
      </div>
      <div
        id="logs-content"
        ref={logsRef}
        style={{
          background: 'var(--log-bg)',
          color: 'var(--log-text)',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          padding: '0.75rem',
          borderRadius: '8px',
          height: '400px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
        }}
      >
        {logsStatus === 'idle' && (
          <span style={{ color: 'var(--log-muted)' }}>Vyberte datum pro zobrazení logů…</span>
        )}
        {logsStatus === 'empty' && (
          <span style={{ color: 'var(--log-muted)' }}>Žádné záznamy pro tento den/level.</span>
        )}
        {logsStatus === 'error' && (
          <span style={{ color: 'var(--log-error)' }}>Nepodařilo se načíst logy.</span>
        )}
        {logsStatus === 'loaded' && logsEntries.map((entry, i) => (
          <span key={i} style={{ color: entry.color }}>{entry.text}{'\n'}</span>
        ))}
      </div>
    </div>
  )
}

// ─── UserListSkeleton ─────────────────────────────────────────────────────────

function UserListSkeleton() {
  return (
    <div className="users-list">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="user-row">
          <div className="user-row-left">
            <div className="user-row-avatar animate-pulse" style={{ background: 'var(--border-strong)' }} />
            <div className="animate-pulse rounded" style={{ width: '8rem', height: '1rem', background: 'var(--border-strong)' }} />
          </div>
          <div className="user-row-middle">
            <div className="animate-pulse rounded-full" style={{ width: '4rem', height: '1.5rem', background: 'var(--border-strong)' }} />
          </div>
          <div className="user-row-right">
            <div className="animate-pulse rounded" style={{ width: '5rem', height: '2rem', background: 'var(--border-strong)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  useDocumentTitle('Administrace');
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const { data: users = [], isLoading: usersLoading } = useAdminUsers()
  const createUser = useCreateUser()

  const [editUser, setEditUser] = useState<CabinUser | null>(null)

  // Guard
  if (!isAdmin) {
    return (
      <div className="admin-page-card">
        <h2>Přístup odepřen</h2>
        <p>Nemáte administrátorská oprávnění.</p>
      </div>
    )
  }

  // ── Add user handler ────────────────────────────────────────────────────

  function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const body = {
      username: String(fd.get('username') ?? '').trim(),
      password: String(fd.get('password') ?? ''),
      role: String(fd.get('role') ?? 'user'),
    }
    if (!body.username || !body.password) {
      showToast('Vyplňte uživatelské jméno a heslo', 'error')
      return
    }
    createUser.mutate(body, {
      onSuccess: () => {
        showToast('Uživatel vytvořen', 'success')
        form.reset()
      },
      onError: () => showToast('Nepodařilo se vytvořit uživatele', 'error'),
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="main-content-admin p-4 md:p-6 lg:p-8 space-y-6 pb-20 md:pb-0">
      {/* Users section */}
      <div className="admin-page-card admin-section users-section">
        <h2>👤 Správa uživatelů</h2>

        {/* User list */}
        {usersLoading ? (
          <UserListSkeleton />
        ) : (
          <div id="users-list" className="users-list">
            {users.length === 0 && <p className="empty-state">Žádní uživatelé</p>}
            {users.map((u) => (
              <div key={u.id} className="user-row">
                <div className="user-row-left">
                  <div className="user-row-avatar"><AnimalAvatar icon={u.animalIcon} username={u.username} color={u.avatarColor ?? undefined} size={36} /></div>
                  <span className="user-row-name">{u.username}</span>
                </div>
                <div className="user-row-middle">
                  <span className={`user-role-badge ${u.role === 'admin' ? 'badge-admin' : u.role === 'guest' ? 'badge-guest' : 'badge-member'}`}>
                    {u.role === 'admin' ? 'Admin' : u.role === 'guest' ? 'Host' : 'Člen'}
                  </span>
                </div>
                <div className="user-row-right">
                  <button
                    className="btn-edit-user btn btn-secondary"
                    data-uid={u.id}
                    onClick={() => setEditUser(u)}
                    title="Upravit"
                  >
                    ✎ Upravit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add user form */}
        <div className="add-user-section" style={{ marginTop: '1.5rem' }}>
          <h3>Přidat uživatele</h3>
          <form id="add-user-form" className="add-user-form" onSubmit={handleCreateUser}>
            <div className="form-group">
              <label htmlFor="new-username">Uživatelské jméno</label>
              <input id="new-username" name="username" type="text" required minLength={3} maxLength={50} />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">Heslo</label>
              <input id="new-password" name="password" type="password" required minLength={6} maxLength={100} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label htmlFor="new-role">Role</label>
              <select id="new-role" name="role">
                <option value="user">Člen</option>
                <option value="admin">Admin</option>
                <option value="guest">Host</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={createUser.isPending}>
              {createUser.isPending ? 'Přidávám…' : 'Přidat uživatele'}
            </button>
          </form>
        </div>
      </div>

      {/* System info */}
      <div className="admin-page-card" id="system-info">
        <h2>📊 Statistiky systému</h2>
        <SystemStats />
      </div>

      {/* Server logs */}
      <div className="admin-page-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>📋 Serverové logy</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/cabin-settings')}>
            ⚙️ Nastavení chaty
          </button>
        </div>
        <LogsViewer />
      </div>

      {/* Edit user modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onDeleted={() => setEditUser(null)}
        />
      )}
    </div>
  )
}
