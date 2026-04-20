/**
 * features/admin/AdminPage.tsx
 * Admin panel: user management, invites and cabin settings.
 */
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useRemoveUserFromCabin,
  useDeleteUser,
  useDeleteUserReservations,
  useAdminInvites,
  useCreateInvite,
  useSendInviteEmail,
  useRevokeInvite,
} from './hooks/useAdmin'
import { type CabinUser, type Invite } from '@/api/admin'
import { showToast } from '@/lib/toast'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'
import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import { getNetworkAwareActionMessage } from '@/lib/networkError'
import { Check, Copy, Mail, Pencil, ScrollText, Search, SlidersHorizontal, TicketPlus, UserPlus } from 'lucide-react'
import { AdminSectionMenu } from '@/features/admin/components/AdminSectionMenu'
import { SystemStatsPanel } from '@/features/admin/components/SystemStatsPanel'
import { CabinSettingsPanel } from '@/features/settings/CabinSettingsPage'

type UserRoleFilter = 'all' | CabinUser['role']
type AdminWorkspace = 'members' | 'invites' | 'cabin'

const USER_ROLE_ORDER: Record<CabinUser['role'], number> = {
  admin: 0,
  user: 1,
  guest: 2,
}

function getRoleLabel(role: string): string {
  if (role === 'admin') return 'Admin'
  if (role === 'guest') return 'Host'
  return 'Člen'
}

function getRoleVariant(role: string): 'admin' | 'member' | 'guest' {
  if (role === 'admin') return 'admin'
  if (role === 'guest') return 'guest'
  return 'member'
}

function getRoleBadgeClass(role: string): string {
  return `admin-role-badge admin-role-badge--${getRoleVariant(role)}`
}

function getUserStatusMeta(user: Pick<CabinUser, 'isBanned' | 'isVerified' | 'isActive'>): {
  label: string
  className: string
} {
  if (user.isBanned) {
    return {
      label: 'Zablokovaný',
      className: 'admin-status-badge admin-status-badge--banned',
    }
  }

  if (!user.isVerified) {
    return {
      label: 'Čeká na ověření',
      className: 'admin-status-badge admin-status-badge--pending',
    }
  }

  return {
    label: user.isActive ? 'Aktivní' : 'Neaktivní',
    className: `admin-status-badge ${user.isActive ? 'admin-status-badge--active' : 'admin-status-badge--inactive'}`,
  }
}

function formatDateLabel(dateString: string | null | undefined): string {
  if (!dateString) return 'Neznámé datum'

  const parsedDate = new Date(dateString)
  if (Number.isNaN(parsedDate.getTime())) return 'Neznámé datum'

  return parsedDate.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function isInviteExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt)
}

function isInviteExhausted(invite: Pick<Invite, 'maxUses' | 'usedCount'>): boolean {
  return invite.maxUses !== null && invite.usedCount >= invite.maxUses
}

function isInviteAccepted(invite: Pick<Invite, 'maxUses' | 'usedCount'>): boolean {
  return invite.usedCount > 0 && invite.maxUses !== null && invite.usedCount >= invite.maxUses
}

function getInviteStatus(invite: Invite): {
  label: string
  className: string
} {
  if (isInviteExpired(invite.expiresAt)) {
    return {
      label: 'Vypršela',
      className: 'admin-invite-status admin-invite-status--expired',
    }
  }

  if (isInviteAccepted(invite)) {
    return {
      label: 'Přijatá',
      className: 'admin-invite-status admin-invite-status--accepted',
    }
  }

  return {
    label: 'Aktivní',
    className: 'admin-invite-status admin-invite-status--active',
  }
}

function buildInviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`
}

function buildInviteShareText(invite: Invite): string {
  const roleLabel = getRoleLabel(invite.role).toLocaleLowerCase('cs-CZ')
  const usageHint = invite.maxUses === null
    ? 'Pozvánka je sdílená.'
    : invite.maxUses === 1
      ? 'Pozvánka je na jedno použití.'
      : `Pozvánku lze použít ${invite.maxUses}×.`

  return `Ahoj, zvu tě do chaty „${invite.cabinName}“ v aplikaci KdyNaChatu. Připoj se přes tento odkaz: ${buildInviteUrl(invite.token)} Role po přijetí: ${roleLabel}. Platnost do ${formatDateLabel(invite.expiresAt)}. ${usageHint}`
}

function isAdminWorkspace(value: string | null): value is AdminWorkspace {
  return value === 'members' || value === 'invites' || value === 'cabin'
}

function resolveAdminWorkspace(pathname: string, search: string, hash: string): AdminWorkspace {
  const panelFromQuery = new URLSearchParams(search).get('panel')
  if (isAdminWorkspace(panelFromQuery)) return panelFromQuery

  if (pathname === '/admin/invites') return 'invites'
  if (pathname === '/admin/cabin' || pathname === '/cabin-settings') return 'cabin'
  if (hash === '#admin-invites') return 'invites'
  if (hash === '#admin-cabin-settings') return 'cabin'

  return 'members'
}

function getAdminWorkspacePath(workspace: AdminWorkspace): string {
  if (workspace === 'invites') return '/admin/invites'
  if (workspace === 'cabin') return '/admin/cabin'
  return '/admin'
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
  const [confirmAction, setConfirmAction] = useState<'delete-user' | 'delete-reservations' | 'remove-from-cabin' | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const updateUser = useUpdateUser()
  const removeUserFromCabin = useRemoveUserFromCabin()
  const deleteUser = useDeleteUser()
  const deleteReservations = useDeleteUserReservations()

  const isSelf = currentUser?.userId === user.id

  function handleSave() {
    setSaveError(null)
    updateUser.mutate(
      { id: user.id, data: { role, password: password || undefined } },
      {
        onSuccess: () => {
          setSaveError(null)
          showToast('Uživatel upraven', 'success')
          onClose()
        },
        onError: (error) => {
          setSaveError(
            getNetworkAwareActionMessage(
              error,
              'Uživatele se nepodařilo upravit. Zkuste to znovu.',
              'Spojení vypadlo dřív, než se změny uživatele stihly uložit. Zkuste to znovu po obnovení připojení.',
            ),
          )
        },
      },
    )
  }

  function handleConfirmedAction() {
    if (confirmAction === 'delete-reservations') {
      setConfirmError(null)
      deleteReservations.mutate(user.id, {
        onSuccess: () => {
          setConfirmError(null)
          setConfirmAction(null)
          showToast('Rezervace smazány', 'success')
        },
        onError: (error) => {
          setConfirmError(
            getNetworkAwareActionMessage(
              error,
              'Rezervace uživatele se nepodařilo smazat. Zkuste to znovu.',
              'Spojení vypadlo dřív, než se rezervace stihly smazat. Zkuste to znovu po obnovení připojení.',
            ),
          )
        },
      })
    } else if (confirmAction === 'remove-from-cabin') {
      setConfirmError(null)
      removeUserFromCabin.mutate(
        { id: user.id, deleteData: false },
        {
          onSuccess: () => {
            setConfirmError(null)
            setConfirmAction(null)
            showToast('Uživatel odebrán z chaty', 'success')
            onDeleted()
            onClose()
          },
          onError: (error) => {
            setConfirmError(
              getNetworkAwareActionMessage(
                error,
                'Uživatele se nepodařilo odebrat z chaty. Zkuste to znovu.',
                'Spojení vypadlo dřív, než se odebrání stihlo uložit. Zkuste to znovu po obnovení připojení.',
              ),
            )
          },
        },
      )
    } else if (confirmAction === 'delete-user') {
      setConfirmError(null)
      deleteUser.mutate(user.id, {
        onSuccess: () => {
          setConfirmError(null)
          setConfirmAction(null)
          showToast('Uživatel smazán', 'success')
          onDeleted()
          onClose()
        },
        onError: (error) => {
          setConfirmError(
            getNetworkAwareActionMessage(
              error,
              'Uživatele se nepodařilo smazat. Zkuste to znovu.',
              'Spojení vypadlo dřív, než se uživatel stihl smazat. Zkuste to znovu po obnovení připojení.',
            ),
          )
        },
      })
    }
  }

  // ── Edit view ──────────────────────────────────────────────────────────
  const isDeletingUser = confirmAction === 'delete-user'
  const isRemovingUserFromCabin = confirmAction === 'remove-from-cabin'
  const confirmLoading = isDeletingUser
    ? deleteUser.isPending
    : isRemovingUserFromCabin
      ? removeUserFromCabin.isPending
      : deleteReservations.isPending
  const statusMeta = getUserStatusMeta(user)

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Upravit uživatele"
        footer={
          <div className="admin-modal-actions">
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
                  onClick={() => {
                    setConfirmError(null)
                    setConfirmAction('remove-from-cabin')
                  }}
                  disabled={removeUserFromCabin.isPending || isSelf}
                  title={isSelf ? 'Nemůžete odebrat sami sebe z chaty' : undefined}
                >
                  Odebrat z chaty
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setConfirmError(null)
                    setConfirmAction('delete-reservations')
                  }}
                  disabled={deleteReservations.isPending}
                >
                  Smazat rezervace
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setConfirmError(null)
                    setConfirmAction('delete-user')
                  }}
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
          <div className="admin-user-detail-grid">
            <div className="admin-user-detail-pill">
              <span>Stav</span>
              <strong>{statusMeta.label}</strong>
            </div>
            <div className="admin-user-detail-pill">
              <span>Rezervace</span>
              <strong>{user.reservationCount}</strong>
            </div>
            <div className="admin-user-detail-pill">
              <span>Fotky</span>
              <strong>{user.photoCount}</strong>
            </div>
            <div className="admin-user-detail-pill">
              <span>Vlákna</span>
              <strong>{user.threadCount}</strong>
            </div>
          </div>

          <div className="form-group">
            <label>Uživatelské jméno</label>
            <input type="text" value={user.username} disabled className="form-control" />
          </div>

          <div className="form-group">
            <label htmlFor="edit-role">Role</label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => {
                if (saveError) setSaveError(null)
                setRole(e.target.value as CabinUser['role'])
              }}
              disabled={!isAdmin}
            >
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
              onChange={(e) => {
                if (saveError) setSaveError(null)
                setPassword(e.target.value)
              }}
              placeholder="Ponechte prázdné pro zachování stávajícího"
              minLength={8}
              maxLength={100}
              autoComplete="new-password"
            />
          </div>
          {saveError ? (
            <div className="error-message show" role="alert">{saveError}</div>
          ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={isDeletingUser ? 'Smazat uživatele?' : isRemovingUserFromCabin ? 'Odebrat uživatele z chaty?' : 'Smazat rezervace?'}
        message={isDeletingUser
          ? `Opravdu smazat uživatele „${user.username}"? Budou smazány i všechny jeho rezervace, nákupní seznamy, poznámky a záznamy v deníku. Toto nelze vrátit!`
          : isRemovingUserFromCabin
            ? `Odebrat uživatele „${user.username}" z této chaty a zachovat jeho účet i data? Uživatel ztratí přístup k této chatě, ale nepřijde o svůj účet v systému.`
            : `Smazat VŠECHNY rezervace uživatele „${user.username}"?`}
        confirmLabel={isDeletingUser ? 'Smazat uživatele' : isRemovingUserFromCabin ? 'Odebrat z chaty' : 'Smazat rezervace'}
        danger={!isRemovingUserFromCabin}
        loading={confirmLoading}
        errorMessage={confirmError}
        onConfirm={handleConfirmedAction}
        onCancel={() => {
          setConfirmAction(null)
          setConfirmError(null)
        }}
      />
    </>
  )
}

// ─── UserListSkeleton ─────────────────────────────────────────────────────────

function UserListSkeleton() {
  return (
    <div className="admin-members-list">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="admin-user-card admin-user-card--skeleton">
          <div className="admin-user-main">
            <div className="skeleton admin-user-avatar-skeleton" />
            <div className="admin-user-skeleton-copy">
              <div className="skeleton admin-skeleton-line admin-skeleton-line--lg" />
              <div className="skeleton admin-skeleton-line admin-skeleton-line--sm" />
            </div>
          </div>
          <div className="admin-user-tags">
            <div className="skeleton admin-skeleton-pill" />
            <div className="skeleton admin-skeleton-pill admin-skeleton-pill--muted" />
          </div>
          <div className="skeleton admin-skeleton-button" />
        </div>
      ))}
    </div>
  )
}

interface InvitesSectionProps {
  invites: Invite[]
  isLoading: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
}

function InvitesSection({ invites, isLoading, isError, error, onRetry }: InvitesSectionProps) {
  const createInvite = useCreateInvite()
  const sendInviteEmail = useSendInviteEmail()
  const revokeInvite = useRevokeInvite()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [emailInvite, setEmailInvite] = useState<Invite | null>(null)
  const [emailValue, setEmailValue] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const role = String(fd.get('invite-role') ?? 'user')
    const days = Number(fd.get('invite-days') ?? 7)
    const rawMaxUses = String(fd.get('invite-max-uses') ?? '').trim()
    const maxUses = rawMaxUses ? Number(rawMaxUses) : null

    createInvite.mutate(
      { role, expiresInDays: days, maxUses },
      {
        onSuccess: () => {
          setCreateError(null)
          showToast('Pozvánka vytvořena', 'success')
          form.reset()
        },
        onError: (error) => {
          setCreateError(
            getNetworkAwareActionMessage(
              error,
              'Pozvánku se nepodařilo vytvořit. Zkuste to znovu.',
              'Spojení vypadlo dřív, než se pozvánka stihla vytvořit. Zkuste to znovu po obnovení připojení.',
            ),
          )
        },
      },
    )
  }

  function handleRevoke(id: string) {
    setActionError(null)
    revokeInvite.mutate(id, {
      onSuccess: () => {
        setActionError(null)
        showToast('Pozvánka zrušena', 'success')
      },
      onError: (error) => {
        setActionError(
          getNetworkAwareActionMessage(
            error,
            'Pozvánku se nepodařilo zrušit. Zkuste to znovu.',
            'Spojení vypadlo dřív, než se pozvánka stihla zrušit. Zkuste to znovu po obnovení připojení.',
          ),
        )
      },
    })
  }

  function handleOpenEmailModal(invite: Invite) {
    setActionError(null)
    setEmailError(null)
    setEmailValue('')
    setEmailInvite(invite)
  }

  function handleCloseEmailModal() {
    if (sendInviteEmail.isPending) return
    setEmailInvite(null)
    setEmailValue('')
    setEmailError(null)
  }

  function copyShareMessage(invite: Invite) {
    setActionError(null)
    navigator.clipboard.writeText(buildInviteShareText(invite)).then(() => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      setCopiedId(invite.id)
      showToast('Text pozvánky zkopírován', 'success')
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {
      setActionError('Prohlížeč nepovolil zkopírování textu pozvánky. Zkuste akci zopakovat nebo zprávu poslat e-mailem.')
      showToast('Nepodařilo se zkopírovat text', 'error')
    })
  }

  function handleSendInviteEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!emailInvite) return

    const trimmedEmail = emailValue.trim()
    if (!trimmedEmail) {
      setEmailError('Zadejte e-mail, kam se má pozvánka poslat.')
      return
    }

    setEmailError(null)
    setActionError(null)
    sendInviteEmail.mutate(
      { id: emailInvite.id, email: trimmedEmail },
      {
        onSuccess: (response) => {
          setEmailError(null)
          showToast(response.message || 'Pozvánka odeslána e-mailem', 'success')
          handleCloseEmailModal()
        },
        onError: (error) => {
          setEmailError(
            getNetworkAwareActionMessage(
              error,
              'Pozvánku se nepodařilo odeslat e-mailem. Zkuste to znovu.',
              'Spojení vypadlo dřív, než se pozvánka stihla odeslat. Zkuste to znovu po obnovení připojení.',
            ),
          )
        },
      },
    )
  }

  const activeInvites = invites.filter((invite) => !isInviteExpired(invite.expiresAt) && !isInviteExhausted(invite))
  const inactiveInvites = invites.filter((invite) => isInviteExpired(invite.expiresAt) || isInviteExhausted(invite))

  return (
    <section className="page-card admin-page-card admin-card admin-invites-card" id="admin-invites">
      <div className="admin-card-header">
        <div>
          <div className="admin-card-eyebrow">Pozvánky</div>
          <div className="admin-card-title-row">
            <h2 className="admin-card-title">Dočasné přístupy</h2>
            <span className="admin-card-counter">{activeInvites.length} aktivních</span>
          </div>
          <p className="admin-card-description">
            Rychlé vstupy pro rodinu, brigádníka nebo hosta. Aktivní pozvánky drž na očích, staré nech v archivu.
          </p>
        </div>
      </div>

      <form
        className="admin-compact-form admin-invite-create-form"
        onSubmit={handleCreate}
        onChange={() => {
          if (createError) setCreateError(null)
        }}
      >
        <div className="form-group">
          <label htmlFor="invite-role">Role</label>
          <select id="invite-role" name="invite-role">
            <option value="user">Člen</option>
            <option value="admin">Admin</option>
            <option value="guest">Host</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="invite-days">Platnost (dní)</label>
          <input id="invite-days" name="invite-days" type="number" min={1} max={365} defaultValue={7} />
        </div>
        <div className="form-group">
          <label htmlFor="invite-max-uses">Počet použití</label>
          <input id="invite-max-uses" name="invite-max-uses" type="number" min={1} max={100} defaultValue={1} placeholder="1" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={createInvite.isPending}>
          <TicketPlus size={16} />
          {createInvite.isPending ? 'Vytvářím…' : 'Vytvořit pozvánku'}
        </button>
      </form>
      <p className="admin-form-note">Pro rodinu je nejpraktičtější jednorázová pozvánka. Pole počet použití můžete smazat, pokud chcete sdílený odkaz.</p>
      {createError ? (
        <div className="error-message show admin-section-error" role="alert">{createError}</div>
      ) : null}

      {isLoading ? (
        <div className="admin-inline-loader">
          <div className="spinner" />
          <span>Načítám pozvánky…</span>
        </div>
      ) : isError ? (
        <FeatureErrorFallback
          error={error instanceof Error ? error : new Error('Nepodařilo se načíst pozvánky')}
          resetErrorBoundary={onRetry}
          title="Pozvánky se nepodařilo načíst"
        />
      ) : activeInvites.length === 0 ? (
        <div className="admin-empty-state">
          <h3>Žádné aktivní pozvánky</h3>
          <p>Jakmile vytvoříš nový odkaz, objeví se tady s informací o využití a expiraci.</p>
        </div>
      ) : (
        <div className="admin-invite-list">
          {activeInvites.map((inv) => (
            <article key={inv.id} className="admin-invite-card">
              <div className="admin-invite-main">
                <div className="admin-invite-top">
                  <span className={getRoleBadgeClass(inv.role)}>{getRoleLabel(inv.role)}</span>
                  <span className={getInviteStatus(inv).className}>{getInviteStatus(inv).label}</span>
                </div>
                <div className="admin-invite-meta">
                  <span>
                    {inv.maxUses !== null
                      ? isInviteAccepted(inv)
                        ? `Přijato ${inv.usedCount}/${inv.maxUses}`
                        : `${inv.usedCount}/${inv.maxUses} použití`
                      : inv.usedCount > 0
                        ? `Použito ${inv.usedCount}×`
                        : 'Sdílená pozvánka'}
                  </span>
                  <span>Platí do {formatDateLabel(inv.expiresAt)}</span>
                  <span>Chata {inv.cabinName}</span>
                  {inv.createdBy?.username ? <span>Vytvořil {inv.createdBy.username}</span> : null}
                </div>
              </div>
              <div className="admin-invite-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyShareMessage(inv)}
                  title="Zkopírovat text pro WhatsApp nebo SMS"
                >
                  {copiedId === inv.id ? <><Check size={14} /> Zkopírováno</> : <><Copy size={14} /> Text zprávy</>}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEmailModal(inv)}
                  title="Odeslat pozvánku e-mailem"
                >
                  <Mail size={14} /> E-mail
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRevoke(inv.id)}
                  disabled={revokeInvite.isPending}
                  title="Zrušit pozvánku"
                >
                  Zrušit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {actionError ? (
        <div className="error-message show admin-section-error" role="alert">{actionError}</div>
      ) : null}

      {!isError && inactiveInvites.length > 0 && (
        <details className="admin-details">
          <summary>
            <span>Archiv neaktivních pozvánek</span>
            <span className="admin-details-count">{inactiveInvites.length}</span>
          </summary>
          <div className="admin-invite-archive">
            {inactiveInvites.map((inv) => (
              <article key={inv.id} className="admin-invite-card admin-archive-card">
                <div className="admin-invite-main">
                  <div className="admin-invite-top">
                    <span className={getRoleBadgeClass(inv.role)}>{getRoleLabel(inv.role)}</span>
                    <span className={getInviteStatus(inv).className}>{getInviteStatus(inv).label}</span>
                  </div>
                  <div className="admin-invite-meta">
                    <span>{isInviteAccepted(inv) ? `Přijato ${inv.usedCount}${inv.maxUses ? `/${inv.maxUses}` : '×'}` : `${inv.usedCount} použití`}</span>
                    <span>Platnost do {formatDateLabel(inv.expiresAt)}</span>
                    <span>Chata {inv.cabinName}</span>
                  </div>
                </div>
                <div className="admin-invite-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRevoke(inv.id)}
                    disabled={revokeInvite.isPending}
                    title="Odstranit záznam pozvánky"
                  >
                    Odstranit
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}

      <Modal
        isOpen={emailInvite !== null}
        onClose={handleCloseEmailModal}
        title="Odeslat pozvánku e-mailem"
        footer={
          <div className="admin-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCloseEmailModal} disabled={sendInviteEmail.isPending}>
              Zrušit
            </button>
            <button type="submit" form="invite-email-form" className="btn btn-primary" disabled={sendInviteEmail.isPending}>
              {sendInviteEmail.isPending ? 'Odesílám…' : 'Odeslat pozvánku'}
            </button>
          </div>
        }
      >
        {emailInvite ? (
          <form id="invite-email-form" className="admin-compact-form" onSubmit={handleSendInviteEmail}>
            <p className="admin-form-note admin-invite-modal-note">
              Pozvánka do chaty <strong>{emailInvite.cabinName}</strong> se odešle jako role <strong>{getRoleLabel(emailInvite.role).toLocaleLowerCase('cs-CZ')}</strong>.
            </p>
            <div className="form-group">
              <label htmlFor="invite-email-target">E-mail příjemce</label>
              <input
                id="invite-email-target"
                type="email"
                value={emailValue}
                onChange={(event) => {
                  setEmailValue(event.target.value)
                  if (emailError) setEmailError(null)
                }}
                placeholder="napr. rodina@example.com"
                autoFocus
                maxLength={255}
              />
            </div>
            <div className="admin-invite-share-preview">
              <span>Krátký text pro zprávu:</span>
              <p>{buildInviteShareText(emailInvite)}</p>
            </div>
            {emailError ? <div className="error-message show admin-section-error" role="alert">{emailError}</div> : null}
          </form>
        ) : null}
      </Modal>
    </section>
  )
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export function AdminPage() {
  useDocumentTitle('Administrativa');
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin, user: currentUser } = useAuth()

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersFailed,
    error: usersError,
    refetch: refetchUsers,
  } = useAdminUsers()
  const {
    data: invites = [],
    isLoading: invitesLoading,
    isError: invitesFailed,
    error: invitesError,
    refetch: refetchInvites,
  } = useAdminInvites()
  const createUser = useCreateUser()

  const [editUser, setEditUser] = useState<CabinUser | null>(null)
  const [createUserError, setCreateUserError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all')

  const sortedUsers = [...users].sort((left, right) => {
    const roleDiff = USER_ROLE_ORDER[left.role] - USER_ROLE_ORDER[right.role]
    if (roleDiff !== 0) return roleDiff

    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1

    return left.username.localeCompare(right.username, 'cs-CZ')
  })

  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('cs-CZ')
  const filteredUsers = sortedUsers.filter((user) => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesText = !normalizedSearchTerm
      || user.username.toLocaleLowerCase('cs-CZ').includes(normalizedSearchTerm)
      || user.email?.toLocaleLowerCase('cs-CZ').includes(normalizedSearchTerm)

    return matchesRole && matchesText
  })

  const adminCount = users.filter((user) => user.role === 'admin').length
  const memberCount = users.filter((user) => user.role === 'user').length
  const guestCount = users.filter((user) => user.role === 'guest').length
  const activeInvitesCount = invites.filter((invite) => !isInviteExpired(invite.expiresAt) && !isInviteExhausted(invite)).length
  const archivedInvitesCount = invites.length - activeInvitesCount
  const localAccountCount = users.filter((user) => !user.email).length
  const hasUserFilters = normalizedSearchTerm.length > 0 || roleFilter !== 'all'

  const filterOptions: Array<{ value: UserRoleFilter; label: string; count: number }> = [
    { value: 'all', label: 'Všichni', count: users.length },
    { value: 'admin', label: 'Admini', count: adminCount },
    { value: 'user', label: 'Členové', count: memberCount },
    { value: 'guest', label: 'Hosté', count: guestCount },
  ]
  const activeWorkspace = resolveAdminWorkspace(location.pathname, location.search, location.hash)

  const workspaceSummary: Record<AdminWorkspace, { title: string; lead: string }> = {
    members: {
      title: 'Správa členů, rolí a lokálních účtů',
      lead: 'Přidejte člena bez e-mailu, upravte role a rychle zkontrolujte, kdo má do chaty skutečně přístup.',
    },
    invites: {
      title: 'Pozvánky, sdílené odkazy a nové vstupy',
      lead: 'Když potřebujete přidat nového člověka, řešte to tady: role, platnost, kopírování zprávy i odeslání e-mailem.',
    },
    cabin: {
      title: 'Společné nastavení chaty v jednom panelu',
      lead: 'Všechno, co mění chování celé aplikace pro rodinu: údaje chaty, pravidla, checklist a zapnuté moduly.',
    },
  }

  function resetUserFilters() {
    setSearchTerm('')
    setRoleFilter('all')
  }

  function openWorkspace(workspace: AdminWorkspace, sectionId?: string) {
    navigate(`${getAdminWorkspacePath(workspace)}${sectionId ? `#${sectionId}` : ''}`)
  }

  useEffect(() => {
    const legacyPanel = new URLSearchParams(location.search).get('panel')
    if (!legacyPanel) return

    if (legacyPanel === 'debug') {
      navigate(`/admin/diagnostics${location.hash || ''}`, { replace: true })
      return
    }

    if (legacyPanel === 'members' || legacyPanel === 'invites' || legacyPanel === 'cabin') {
      navigate(`${getAdminWorkspacePath(legacyPanel)}${location.hash || ''}`, { replace: true })
    }
  }, [location.hash, location.search, navigate])

  useEffect(() => {
    if (!location.hash) return

    const sectionId = location.hash.slice(1)
    const timeoutId = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [location.hash, usersLoading, invitesLoading])

  // Guard
  if (!isAdmin) {
    return (
      <div className="main-content-admin pb-20 md:pb-0">
        <div className="page-card admin-page-card admin-denied-card">
          <span className="admin-kicker">Administrace</span>
          <h1 className="admin-page-title">Přístup odepřen</h1>
          <p className="admin-page-lead">Nemáte administrátorská oprávnění pro správu účtů, pozvánek ani systémového přehledu.</p>
        </div>
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
    setCreateUserError(null)
    createUser.mutate(body, {
      onSuccess: () => {
        setCreateUserError(null)
        showToast('Uživatel vytvořen', 'success')
        form.reset()
      },
      onError: (error) => {
        setCreateUserError(
          getNetworkAwareActionMessage(
            error,
            'Uživatele se nepodařilo vytvořit. Zkuste to znovu.',
            'Spojení vypadlo dřív, než se uživatel stihl vytvořit. Zkuste to znovu po obnovení připojení.',
          ),
        )
      },
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="main-content-admin pb-20 md:pb-0">
      <section className="page-card admin-page-card admin-shell-card">
        <div className="admin-shell-topbar">
          <div className="admin-shell-copy">
            <span className="admin-kicker">Administrativa</span>
            <h1 className="admin-page-title admin-page-title--compact">{workspaceSummary[activeWorkspace].title}</h1>
            <p className="admin-page-lead admin-page-lead--compact">
              {workspaceSummary[activeWorkspace].lead}
            </p>
          </div>

          <div className="admin-hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => openWorkspace('members', 'admin-create-user')}>
              <UserPlus size={16} />
              Přidat člena
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/diagnostics#system-logs')}>
              <ScrollText size={16} />
              Otevřít diagnostiku
            </button>
          </div>
        </div>

        <AdminSectionMenu active={activeWorkspace} />
      </section>

      {activeWorkspace === 'members' ? (
        <div className="admin-layout-grid">
          <section className="page-card admin-page-card admin-card admin-users-card" id="admin-users">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-eyebrow">Účty a role</div>
                <div className="admin-card-title-row">
                  <h2 className="admin-card-title">Přehled uživatelů</h2>
                  <span className="admin-card-counter">
                    {usersLoading || usersFailed ? 'Načítám…' : `${filteredUsers.length}/${users.length}`}
                  </span>
                </div>
                <p className="admin-card-description">
                  Hledej podle jména nebo e-mailu, filtruj role a otevři detail účtu pro změnu oprávnění, hesla nebo mazání rezervací.
                </p>
              </div>
            </div>

            <div className="admin-toolbar">
              <label className="admin-search" htmlFor="admin-user-search">
                <Search size={16} aria-hidden="true" />
                <input
                  id="admin-user-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Hledat podle jména nebo e-mailu"
                />
              </label>

              <div className="admin-filter-row" role="tablist" aria-label="Filtrovat účty podle role">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-filter-chip ${roleFilter === option.value ? 'is-active' : ''}`}
                    onClick={() => setRoleFilter(option.value)}
                  >
                    <span>{option.label}</span>
                    <span className="admin-filter-chip-count">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {usersLoading ? (
              <UserListSkeleton />
            ) : usersFailed ? (
              <FeatureErrorFallback
                error={usersError instanceof Error ? usersError : new Error('Nepodařilo se načíst uživatele')}
                resetErrorBoundary={() => {
                  void refetchUsers()
                }}
                title="Uživatele se nepodařilo načíst"
              />
            ) : filteredUsers.length === 0 ? (
              <div className="admin-empty-state">
                <h3>{users.length === 0 ? 'Zatím tu nikdo není' : 'Tomu filtru nic neodpovídá'}</h3>
                <p>
                  {users.length === 0
                    ? 'Vytvoř první účet a správa uživatelů se začne plnit.'
                    : 'Zkuste změnit hledaný výraz nebo zrušit aktivní filtr role.'}
                </p>
                <div className="admin-empty-actions">
                  {users.length === 0 ? (
                    <button type="button" className="btn btn-primary" onClick={() => openWorkspace('members', 'admin-create-user')}>
                      <UserPlus size={16} />
                      Vytvořit první účet
                    </button>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={resetUserFilters}>
                      Vyčistit filtr
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="admin-list-meta">
                  <span>
                    {hasUserFilters
                      ? `Zobrazuji ${filteredUsers.length} účtů podle aktuálního filtru.`
                      : 'Účty jsou seřazené podle role, aktivity a názvu.'}
                  </span>
                  {hasUserFilters ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={resetUserFilters}>
                      Vyčistit filtr
                    </button>
                  ) : null}
                </div>

                <div id="users-list" className="admin-members-list">
                  {filteredUsers.map((user) => {
                    const statusMeta = getUserStatusMeta(user)

                    return (
                      <article
                        key={user.id}
                        className={`admin-user-card ${currentUser?.userId === user.id ? 'is-current-user' : ''}`}
                      >
                        <div className="admin-user-main">
                          <AnimalAvatar
                            icon={user.animalIcon}
                            username={user.username}
                            color={user.avatarColor ?? undefined}
                            size={48}
                            className="admin-user-avatar"
                          />

                          <div className="admin-user-identity">
                            <div className="admin-user-title-row">
                              <span className="admin-user-name">{user.username}</span>
                              {currentUser?.userId === user.id ? (
                                <span className="admin-user-self-badge">Váš účet</span>
                              ) : null}
                            </div>
                            <div className="admin-user-subline">
                              <span>{user.email || 'Lokální účet bez e-mailu'}</span>
                              <span>Vytvořen {formatDateLabel(user.createdAt)}</span>
                            </div>
                            <div className="admin-user-metrics">
                              <span className="admin-user-metric">{user.reservationCount} rezervací</span>
                              <span className="admin-user-metric">{user.photoCount} fotek</span>
                              <span className="admin-user-metric">{user.threadCount} vláken</span>
                            </div>
                          </div>
                        </div>

                        <div className="admin-user-tags">
                          <span className={getRoleBadgeClass(user.role)}>{getRoleLabel(user.role)}</span>
                          <span className={statusMeta.className}>{statusMeta.label}</span>
                        </div>

                        <div className="admin-user-actions">
                          <button
                            className="btn btn-secondary"
                            data-uid={user.id}
                            onClick={() => setEditUser(user)}
                            title={`Upravit účet ${user.username}`}
                          >
                            <Pencil size={14} /> Upravit účet
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          <aside className="admin-sidebar-stack">
            <section className="page-card admin-page-card admin-card" id="admin-create-user">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-eyebrow">Nový přístup</div>
                  <div className="admin-card-title-row">
                    <h2 className="admin-card-title">Vytvořit lokální účet</h2>
                  </div>
                  <p className="admin-card-description">
                    Použij pro členy rodiny, kteří se přihlašují přímo jménem a heslem bez pozvánky e-mailem.
                  </p>
                </div>
              </div>

              <form
                id="add-user-form"
                className="admin-compact-form admin-user-create-form"
                onSubmit={handleCreateUser}
                onChange={() => {
                  if (createUserError) setCreateUserError(null)
                }}
              >
                <div className="form-group">
                  <label htmlFor="new-username">Uživatelské jméno</label>
                  <input id="new-username" name="username" type="text" required minLength={3} maxLength={50} />
                </div>
                <div className="form-group">
                  <label htmlFor="new-password">Heslo</label>
                  <input id="new-password" name="password" type="password" required minLength={8} maxLength={100} autoComplete="new-password" />
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
                  <UserPlus size={16} />
                  {createUser.isPending ? 'Přidávám…' : 'Přidat uživatele'}
                </button>
              </form>

              <p className="admin-form-note">
                Admin má plný přístup. Host uvidí obsah, ale bez běžného vytváření a mazání. Účet můžeš později upravit v detailu uživatele.
              </p>

              {createUserError ? (
                <div className="error-message show admin-section-error" role="alert">{createUserError}</div>
              ) : null}
            </section>

            <section className="page-card admin-page-card admin-card" id="system-info">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-eyebrow">Přehled aplikace</div>
                  <div className="admin-card-title-row">
                    <h2 className="admin-card-title">Statistiky systému</h2>
                  </div>
                  <p className="admin-card-description">
                    Rychlý snapshot toho, kolik je v systému lidí, rezervací, fotek a zpráv. Hodí se při kontrole aktivity nebo před větší údržbou.
                  </p>
                </div>
              </div>
              <SystemStatsPanel />
            </section>
          </aside>
        </div>
      ) : null}

      {activeWorkspace === 'invites' ? (
        <div className="admin-layout-grid">
          <div className="admin-panel-stack">
            <InvitesSection
              invites={invites}
              isLoading={invitesLoading}
              isError={invitesFailed}
              error={invitesError}
              onRetry={() => {
                void refetchInvites()
              }}
            />
          </div>

          <aside className="admin-sidebar-stack">
            <section className="page-card admin-page-card admin-card admin-focus-card">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-eyebrow">Rychlé rozhodnutí</div>
                  <div className="admin-card-title-row">
                    <h2 className="admin-card-title">Jak člena přidat</h2>
                  </div>
                  <p className="admin-card-description">
                    Pozvánka je nejlepší pro většinu rodiny. Lokální účet použijte jen tam, kde nechcete řešit e-mail nebo onboarding přes odkaz.
                  </p>
                </div>
              </div>

              <div className="admin-task-list">
                <button type="button" className="btn btn-secondary" onClick={() => openWorkspace('members', 'admin-create-user')}>
                  <UserPlus size={16} />
                  Vytvořit lokální účet
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => openWorkspace('cabin')}>
                  <SlidersHorizontal size={16} />
                  Zkontrolovat moduly chaty
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/diagnostics#system-logs')}>
                  <ScrollText size={16} />
                  Otevřít diagnostiku
                </button>
              </div>

              <div className="admin-focus-metrics">
                <div className="admin-focus-metric">
                  <span>Aktivní pozvánky</span>
                  <strong>{invitesLoading || invitesFailed ? '—' : activeInvitesCount}</strong>
                </div>
                <div className="admin-focus-metric">
                  <span>Archiv</span>
                  <strong>{invitesLoading || invitesFailed ? '—' : archivedInvitesCount}</strong>
                </div>
                <div className="admin-focus-metric">
                  <span>Lokální účty</span>
                  <strong>{usersLoading || usersFailed ? '—' : localAccountCount}</strong>
                </div>
              </div>
            </section>

            <section className="page-card admin-page-card admin-card" id="system-info">
              <div className="admin-card-header">
                <div>
                  <div className="admin-card-eyebrow">Přehled aplikace</div>
                  <div className="admin-card-title-row">
                    <h2 className="admin-card-title">Statistiky systému</h2>
                  </div>
                  <p className="admin-card-description">
                    Rychlý kontext, kolik je v systému lidí a jak je aplikace opravdu využívaná.
                  </p>
                </div>
              </div>
              <SystemStatsPanel />
            </section>
          </aside>
        </div>
      ) : null}

      {activeWorkspace === 'cabin' ? (
        <section className="page-card settings-page-card admin-page-card admin-card admin-settings-shell" id="admin-cabin-settings">
          <CabinSettingsPanel
            title="Společné nastavení chaty"
            subtitle="Všechno sdílené na jednom místě: údaje chaty, pravidla, odjezdový checklist i zapnuté moduly."
          />
        </section>
      ) : null}

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
