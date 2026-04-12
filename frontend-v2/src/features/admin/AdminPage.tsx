/**
 * features/admin/AdminPage.tsx
 * Admin panel: user management, system stats, server logs.
 */
import { useState, useEffect, useRef } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useDeleteUserReservations,
  useSystemInfo,
  useAdminInvites,
  useCreateInvite,
  useRevokeInvite,
} from './hooks/useAdmin'
import { type CabinUser } from '@/api/admin'
import { showToast } from '@/lib/toast'
import { Modal } from '@/components/shared/Modal'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'
import { AlertTriangle, Check, Copy, Pencil } from 'lucide-react'

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
  const { data, isLoading, isError } = useSystemInfo()

  if (isLoading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  )
  if (isError || !data) return (
    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
      <AlertTriangle size={28} style={{ color: 'var(--color-warning)' }} />
      <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>Nepodařilo se načíst statistiky</p>
    </div>
  )

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

// ─── InvitesSection ───────────────────────────────────────────────────────────

function InvitesSection() {
  const { data: invites = [], isLoading } = useAdminInvites()
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const role = String(fd.get('invite-role') ?? 'user')
    const days = Number(fd.get('invite-days') ?? 7)
    createInvite.mutate(
      { role, expiresInDays: days },
      {
        onSuccess: () => {
          showToast('Pozvánka vytvořena', 'success')
          e.currentTarget.reset()
        },
        onError: () => showToast('Nepodařilo se vytvořit pozvánku', 'error'),
      },
    )
  }

  function handleRevoke(id: string) {
    revokeInvite.mutate(id, {
      onSuccess: () => showToast('Pozvánka zrušena', 'success'),
      onError: () => showToast('Nepodařilo se zrušit pozvánku', 'error'),
    })
  }

  function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      showToast('Odkaz zkopírován', 'success')
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => showToast('Nepodařilo se zkopírovat', 'error'))
  }

  function isExpired(expiresAt: string) {
    return new Date() > new Date(expiresAt)
  }

  function isExhausted(invite: { maxUses: number | null; usedCount: number }) {
    return invite.maxUses !== null && invite.usedCount >= invite.maxUses
  }

  const activeInvites = invites.filter((i) => !isExpired(i.expiresAt) && !isExhausted(i))
  const inactiveInvites = invites.filter((i) => isExpired(i.expiresAt) || isExhausted(i))

  return (
    <div className="page-card admin-page-card admin-section">
      <h2>Pozvánky</h2>

      {/* Create invite form */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ margin: 0, flex: '1 1 8rem' }}>
          <label htmlFor="invite-role">Role</label>
          <select id="invite-role" name="invite-role">
            <option value="user">Člen</option>
            <option value="admin">Admin</option>
            <option value="guest">Host</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: '1 1 6rem' }}>
          <label htmlFor="invite-days">Platnost (dní)</label>
          <input id="invite-days" name="invite-days" type="number" min={1} max={365} defaultValue={7} style={{ width: '100%' }} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={createInvite.isPending} style={{ whiteSpace: 'nowrap' }}>
          {createInvite.isPending ? 'Vytvářím…' : '+ Nová pozvánka'}
        </button>
      </form>

      {/* Active invites */}
      {isLoading ? (
        <div className="spinner" />
      ) : activeInvites.length === 0 ? (
        <p className="empty-state">Žádné aktivní pozvánky</p>
      ) : (
        <div className="users-list">
          {activeInvites.map((inv) => (
            <div key={inv.id} className="user-row" style={{ flexWrap: 'wrap' }}>
              <div className="user-row-left" style={{ flex: '1 1 auto', minWidth: 0 }}>
                <span className={`user-role-badge ${inv.role === 'admin' ? 'badge-admin' : inv.role === 'guest' ? 'badge-guest' : 'badge-member'}`}>
                  {inv.role === 'admin' ? 'Admin' : inv.role === 'guest' ? 'Host' : 'Člen'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  {inv.maxUses !== null ? `${inv.usedCount}/${inv.maxUses} použito` : `${inv.usedCount}× použito`}
                  {' · '}
                  platí do {new Date(inv.expiresAt).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <div className="user-row-right" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => copyLink(inv.token, inv.id)}
                  title="Zkopírovat odkaz"
                >
                  {copiedId === inv.id ? <><Check size={14} style={{ verticalAlign: 'text-bottom' }} /> Zkopírováno</> : <><Copy size={14} style={{ verticalAlign: 'text-bottom' }} /> Kopírovat</>}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRevoke(inv.id)}
                  disabled={revokeInvite.isPending}
                  title="Zrušit pozvánku"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive (expired / exhausted) */}
      {inactiveInvites.length > 0 && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Neaktivní pozvánky ({inactiveInvites.length})
          </summary>
          <div className="users-list" style={{ marginTop: '0.5rem', opacity: 0.6 }}>
            {inactiveInvites.map((inv) => (
              <div key={inv.id} className="user-row">
                <div className="user-row-left" style={{ flex: '1 1 auto' }}>
                  <span className="user-role-badge" style={{ opacity: 0.5 }}>
                    {inv.role === 'admin' ? 'Admin' : inv.role === 'guest' ? 'Host' : 'Člen'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                    {isExpired(inv.expiresAt) ? 'Vypršela' : 'Vyčerpána'}
                    {' · '}
                    {inv.usedCount}× použito
                  </span>
                </div>
                <div className="user-row-right">
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={revokeInvite.isPending}
                    title="Smazat"
                    style={{ fontSize: '0.8rem' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  useDocumentTitle('Administrace');
  const { isAdmin } = useAuth()

  const { data: users = [], isLoading: usersLoading } = useAdminUsers()
  const createUser = useCreateUser()

  const [editUser, setEditUser] = useState<CabinUser | null>(null)

  // Guard
  if (!isAdmin) {
    return (
      <div className="page-card admin-page-card">
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
      <div className="page-card admin-page-card admin-section users-section">
        <h2>Správa uživatelů</h2>

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
                    <Pencil size={14} style={{ verticalAlign: 'text-bottom' }} /> Upravit
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

      {/* Invites section */}
      <InvitesSection />

      {/* System info */}
      <div className="page-card admin-page-card" id="system-info">
        <h2>Statistiky systému</h2>
        <SystemStats />
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
