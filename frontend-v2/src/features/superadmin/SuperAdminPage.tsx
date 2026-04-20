import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Search, Shield, UserPlus } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { showToast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import { LogsPanel } from '@/components/shared/LogsPanel'
import { superadminApi, type SuperadminCreateUserResponse, type SystemUser } from '@/api/superadmin'
import {
  useSuperadminCreateUser,
  useSuperadminToggleBan,
  useSuperadminUsers,
} from './hooks/useSuperadmin'
import { getNetworkAwareActionMessage } from '@/lib/networkError'


type RoleFilter = 'all' | SystemUser['role']
type StatusFilter = 'all' | 'active' | 'pending' | 'banned' | 'superadmin'

function getRoleLabel(role: SystemUser['role']): string {
  if (role === 'admin') return 'Admin'
  if (role === 'guest') return 'Host'
  return 'Člen'
}

function formatDateLabel(dateString: string): string {
  const parsedDate = new Date(dateString)
  if (Number.isNaN(parsedDate.getTime())) return 'Neznámé datum'

  return parsedDate.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusMeta(user: SystemUser): { label: string; className: string } {
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
    label: 'Aktivní',
    className: 'admin-status-badge admin-status-badge--active',
  }
}

function UserListSkeleton() {
  return (
    <div className="admin-members-list">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="admin-user-card admin-user-card--skeleton">
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

export function SuperAdminPage() {
  useDocumentTitle('Backoffice')

  const { isSuperAdmin, user: currentUser } = useAuth()
  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useSuperadminUsers()
  const createUser = useSuperadminCreateUser()
  const toggleBan = useSuperadminToggleBan()

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [createError, setCreateError] = useState<string | null>(null)
  const [banError, setBanError] = useState<string | null>(null)
  const [pendingBanUser, setPendingBanUser] = useState<SystemUser | null>(null)
  const [lastCreatedUser, setLastCreatedUser] = useState<SuperadminCreateUserResponse | null>(null)
  const [copiedSecret, setCopiedSecret] = useState<'password' | 'token' | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [])

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('cs-CZ')
  const sortedUsers = [...users].sort((left, right) => {
    if (left.isSuperAdmin !== right.isSuperAdmin) return left.isSuperAdmin ? -1 : 1
    if (left.isBanned !== right.isBanned) return left.isBanned ? 1 : -1
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })

  const filteredUsers = sortedUsers.filter((user) => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus =
      statusFilter === 'all'
      || (statusFilter === 'active' && user.isActive)
      || (statusFilter === 'pending' && !user.isVerified && !user.isBanned)
      || (statusFilter === 'banned' && user.isBanned)
      || (statusFilter === 'superadmin' && user.isSuperAdmin)
    const matchesText =
      !normalizedSearch
      || user.username.toLocaleLowerCase('cs-CZ').includes(normalizedSearch)
      || user.email?.toLocaleLowerCase('cs-CZ').includes(normalizedSearch)

    return matchesRole && matchesStatus && matchesText
  })

  const totalUsers = users.length
  const superAdminCount = users.filter((user) => user.isSuperAdmin).length
  const bannedCount = users.filter((user) => user.isBanned).length
  const pendingCount = users.filter((user) => !user.isVerified && !user.isBanned).length
  const activeCount = users.filter((user) => user.isActive).length
  const hasFilters = normalizedSearch.length > 0 || roleFilter !== 'all' || statusFilter !== 'all'

  const roleFilters: Array<{ value: RoleFilter; label: string; count: number }> = [
    { value: 'all', label: 'Všechny role', count: users.length },
    { value: 'admin', label: 'Admini', count: users.filter((user) => user.role === 'admin').length },
    { value: 'user', label: 'Členové', count: users.filter((user) => user.role === 'user').length },
    { value: 'guest', label: 'Hosté', count: users.filter((user) => user.role === 'guest').length },
  ]

  const statusFilters: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: 'all', label: 'Všechny stavy', count: users.length },
    { value: 'active', label: 'Aktivní', count: activeCount },
    { value: 'pending', label: 'Čekají', count: pendingCount },
    { value: 'banned', label: 'Zablokovaní', count: bannedCount },
    { value: 'superadmin', label: 'Super Admini', count: superAdminCount },
  ]

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function resetFilters() {
    setSearchTerm('')
    setRoleFilter('all')
    setStatusFilter('all')
  }

  function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      username: String(formData.get('username') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      role: String(formData.get('role') ?? 'user') as SystemUser['role'],
    }

    if (!payload.username || !payload.email) {
      showToast('Vyplňte jméno i e-mail.', 'error')
      return
    }

    setCreateError(null)
    createUser.mutate(payload, {
      onSuccess: (response) => {
        setCreateError(null)
        setLastCreatedUser(response)
        setShowSecrets(false)
        form.reset()
        showToast(response.message, response.verificationEmailSent ? 'success' : 'info')
      },
      onError: (mutationError) => {
        setCreateError(
          getNetworkAwareActionMessage(
            mutationError,
            'Účet se nepodařilo vytvořit. Zkuste to znovu.',
            'Spojení vypadlo dřív, než se účet stihl vytvořit. Zkuste to znovu po obnovení připojení.',
          ),
        )
      },
    })
  }

  function handleConfirmBan() {
    if (!pendingBanUser) return

    setBanError(null)
    toggleBan.mutate(pendingBanUser.id, {
      onSuccess: (response) => {
        setBanError(null)
        showToast(response.message, 'success')
        setPendingBanUser(null)
      },
      onError: (mutationError) => {
        setBanError(
          getNetworkAwareActionMessage(
            mutationError,
            'Stav účtu se nepodařilo změnit. Zkuste to znovu.',
            'Spojení vypadlo dřív, než se změna stihla uložit. Zkuste to znovu po obnovení připojení.',
          ),
        )
      },
    })
  }

  async function copySecret(kind: 'password' | 'token', value: string) {
    try {
      await navigator.clipboard.writeText(value)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      setCopiedSecret(kind)
      showToast('Hodnota zkopírována', 'success')
      copyTimerRef.current = setTimeout(() => setCopiedSecret(null), 1800)
    } catch {
      showToast('Prohlížeč nepovolil kopírování.', 'error')
    }
  }

  function revealSecretsTemporarily() {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    setShowSecrets(true)
    revealTimerRef.current = setTimeout(() => {
      setShowSecrets(false)
    }, 20_000)
  }

  function hideSecrets() {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    setShowSecrets(false)
  }

  if (!isSuperAdmin) {
    return (
      <div className="main-content-admin pb-20 md:pb-0">
        <div className="page-card admin-page-card admin-denied-card">
          <span className="admin-kicker">Backoffice</span>
          <h1 className="admin-page-title">Přístup odepřen</h1>
          <p className="admin-page-lead">Tato sekce je vyhrazená pouze pro Super Adminy.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content-admin pb-20 md:pb-0">
      <section className="page-card admin-page-card admin-overview-card superadmin-overview-card">
        <div className="admin-overview-header">
          <div className="admin-overview-copy">
            <span className="admin-kicker">Backoffice</span>
            <h1 className="admin-page-title">Globální dohled nad účty a provozem</h1>
            <p className="admin-page-lead">
              Tady řešíš systémové účty napříč celou aplikací, blokace, ruční zakládání uživatelů a provozní logy. Rozhraní je záměrně stejné jako cabin admin, ale s větším důrazem na kontrolu a bezpečnost.
            </p>
          </div>

          <div className="admin-hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => scrollToSection('superadmin-create-user')}>
              <UserPlus size={16} />
              Nový účet
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => scrollToSection('superadmin-logs')}>
              <Shield size={16} />
              Provozní logy
            </button>
          </div>
        </div>

        <div className="admin-overview-grid">
          <article className="admin-overview-stat admin-overview-stat--forest">
            <span className="admin-overview-stat-label">Účty v systému</span>
            <strong className="admin-overview-stat-value">{isLoading || isError ? '—' : totalUsers}</strong>
            <p className="admin-overview-stat-meta">Celkový počet registrovaných účtů napříč všemi chatami.</p>
          </article>

          <article className="admin-overview-stat admin-overview-stat--mist">
            <span className="admin-overview-stat-label">Aktivní účty</span>
            <strong className="admin-overview-stat-value">{isLoading || isError ? '—' : activeCount}</strong>
            <p className="admin-overview-stat-meta">{pendingCount > 0 ? `${pendingCount} účtů ještě čeká na dokončení aktivace.` : 'Žádný účet momentálně nečeká na ověření.'}</p>
          </article>

          <article className="admin-overview-stat admin-overview-stat--sand">
            <span className="admin-overview-stat-label">Zablokované účty</span>
            <strong className="admin-overview-stat-value">{isLoading || isError ? '—' : bannedCount}</strong>
            <p className="admin-overview-stat-meta">Okamžitý přehled účtů, které mají zablokovaný přístup.</p>
          </article>

          <article className="admin-overview-stat admin-overview-stat--ink">
            <span className="admin-overview-stat-label">Super Admini</span>
            <strong className="admin-overview-stat-value">{isLoading || isError ? '—' : superAdminCount}</strong>
            <p className="admin-overview-stat-meta">Počet globálních správců s přístupem do backoffice.</p>
          </article>
        </div>
      </section>

      <div className="admin-layout-grid superadmin-layout-grid">
        <section className="page-card admin-page-card admin-card admin-users-card" id="superadmin-users">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-eyebrow">Systémové účty</div>
              <div className="admin-card-title-row">
                <h2 className="admin-card-title">Přehled uživatelů</h2>
                <span className="admin-card-counter">
                  {isLoading || isError ? 'Načítám…' : `${filteredUsers.length}/${users.length}`}
                </span>
              </div>
              <p className="admin-card-description">
                Filtruj podle role, stavu nebo textu. Přímo z listu zablokuješ problémový účet a okamžitě vidíš, kdo má globální práva.
              </p>
            </div>
          </div>

          <div className="admin-toolbar">
            <label className="admin-search" htmlFor="superadmin-user-search">
              <Search size={16} aria-hidden="true" />
              <input
                id="superadmin-user-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Hledat podle jména nebo e-mailu"
              />
            </label>

            <div className="superadmin-filter-groups">
              <div className="admin-filter-row" role="tablist" aria-label="Filtrovat účty podle role">
                {roleFilters.map((option) => (
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

              <div className="admin-filter-row" role="tablist" aria-label="Filtrovat účty podle stavu">
                {statusFilters.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-filter-chip ${statusFilter === option.value ? 'is-active' : ''}`}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    <span>{option.label}</span>
                    <span className="admin-filter-chip-count">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <UserListSkeleton />
          ) : isError ? (
            <FeatureErrorFallback
              error={error instanceof Error ? error : new Error('Nepodařilo se načíst systémové uživatele')}
              resetErrorBoundary={() => {
                void refetch()
              }}
              title="Systémové účty se nepodařilo načíst"
            />
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty-state">
              <h3>{users.length === 0 ? 'Systém je zatím prázdný' : 'Tomu filtru nic neodpovídá'}</h3>
              <p>
                {users.length === 0
                  ? 'Jakmile vznikne první účet, objeví se tady včetně jeho stavu a systémových práv.'
                  : 'Zkuste upravit filtry nebo vyčistit hledání.'}
              </p>
              {hasFilters ? (
                <div className="admin-empty-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetFilters}>
                    Vyčistit filtry
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="admin-list-meta">
                <span>
                  {hasFilters
                    ? `Zobrazuji ${filteredUsers.length} účtů podle aktivních filtrů.`
                    : 'Účty jsou řazené podle privilegovanosti, stavu a data vytvoření.'}
                </span>
                {hasFilters ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
                    Vyčistit filtry
                  </button>
                ) : null}
              </div>

              <div className="admin-members-list superadmin-members-list">
                {filteredUsers.map((user) => {
                  const statusMeta = getStatusMeta(user)
                  const isSelf = currentUser?.userId === user.id
                  const lockActionDisabled = isSelf || user.isSuperAdmin

                  return (
                    <article key={user.id} className={`admin-user-card superadmin-user-card ${isSelf ? 'is-current-user' : ''}`}>
                      <div className="admin-user-main">
                        <div className="superadmin-user-avatar">
                          <span>{user.username.charAt(0).toUpperCase()}</span>
                        </div>

                        <div className="admin-user-identity">
                          <div className="admin-user-title-row">
                            <span className="admin-user-name">{user.username}</span>
                            {isSelf ? <span className="admin-user-self-badge">Váš účet</span> : null}
                          </div>
                          <div className="admin-user-subline">
                            <span>{user.email || 'Účet bez e-mailu'}</span>
                            <span>Založen {formatDateLabel(user.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="admin-user-tags superadmin-user-tags">
                        {user.isSuperAdmin ? <span className="admin-role-badge admin-role-badge--superadmin">Super Admin</span> : null}
                        <span className={`admin-role-badge admin-role-badge--${user.role === 'admin' ? 'admin' : user.role === 'guest' ? 'guest' : 'member'}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </div>

                      <div className="admin-user-actions">
                        <button
                          type="button"
                          className={`btn ${user.isBanned ? 'btn-secondary' : 'btn-danger'}`}
                          onClick={() => {
                            setBanError(null)
                            setPendingBanUser(user)
                          }}
                          disabled={lockActionDisabled}
                          title={
                            isSelf
                              ? 'Nelze měnit stav vlastního účtu.'
                              : user.isSuperAdmin
                                ? 'Nelze blokovat jiného Super Admina.'
                                : undefined
                          }
                        >
                          {user.isBanned ? 'Zrušit blokaci' : 'Zablokovat'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <aside className="admin-sidebar-stack superadmin-sidebar-stack">
          <section className="page-card admin-page-card admin-card" id="superadmin-create-user">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-eyebrow">Ruční založení</div>
                <div className="admin-card-title-row">
                  <h2 className="admin-card-title">Vytvořit účet</h2>
                </div>
                <p className="admin-card-description">
                  Použij pro podporu, onboarding nebo ruční zásah. Po vytvoření dostaneš nouzové údaje i informaci, zda se povedlo doručit verifikační e-mail.
                </p>
              </div>
            </div>

            <form
              className="admin-compact-form admin-user-create-form"
              onSubmit={handleCreateUser}
              onChange={() => {
                if (createError) setCreateError(null)
              }}
            >
              <div className="form-group">
                <label htmlFor="superadmin-username">Uživatelské jméno</label>
                <input id="superadmin-username" name="username" type="text" minLength={2} maxLength={50} required />
              </div>
              <div className="form-group">
                <label htmlFor="superadmin-email">E-mail</label>
                <input id="superadmin-email" name="email" type="email" maxLength={255} required />
              </div>
              <div className="form-group">
                <label htmlFor="superadmin-role">Výchozí role</label>
                <select id="superadmin-role" name="role" defaultValue="user">
                  <option value="user">Člen</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Host</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={createUser.isPending}>
                <UserPlus size={16} />
                {createUser.isPending ? 'Zakládám…' : 'Vytvořit účet'}
              </button>
            </form>

            {createError ? <div className="error-message show admin-section-error">{createError}</div> : null}
          </section>

          <section className="page-card admin-page-card admin-card superadmin-handoff-card">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-eyebrow">Bezpečný handoff</div>
                <div className="admin-card-title-row">
                  <h2 className="admin-card-title">Poslední vytvořený účet</h2>
                </div>
                <p className="admin-card-description">
                  Nouzové údaje používej jen tehdy, když se nepodaří doručit e-mail. Po úspěšném předání je dál nesdílej.
                </p>
              </div>
            </div>

            {lastCreatedUser ? (
              <div className="superadmin-secret-stack">
                <div className="superadmin-secret-card">
                  <span className="superadmin-secret-label">Účet</span>
                  <strong>{lastCreatedUser.user.username}</strong>
                  <span>{lastCreatedUser.user.email || 'Bez e-mailu'}</span>
                </div>

                <div className="superadmin-secret-actions">
                  <button type="button" className="btn btn-secondary" onClick={showSecrets ? hideSecrets : revealSecretsTemporarily}>
                    {showSecrets ? 'Skrýt citlivé údaje' : 'Zobrazit dočasně na 20 s'}
                  </button>
                  <p className="superadmin-secret-help">
                    Citlivé údaje drž schované, dokud je opravdu nepotřebuješ předat.
                  </p>
                </div>

                <div className="superadmin-secret-card">
                  <span className="superadmin-secret-label">Dočasné heslo</span>
                  <code>{showSecrets ? lastCreatedUser.tempPassword : 'Skryto. Nejprve použijte dočasné zobrazení.'}</code>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => copySecret('password', lastCreatedUser.tempPassword)} disabled={!showSecrets}>
                    {copiedSecret === 'password' ? <><Check size={14} /> Zkopírováno</> : <><Copy size={14} /> Kopírovat</>}
                  </button>
                </div>

                <div className="superadmin-secret-card">
                  <span className="superadmin-secret-label">Fallback token</span>
                  <code>{showSecrets ? lastCreatedUser.verificationToken : 'Skryto. Nejprve použijte dočasné zobrazení.'}</code>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => copySecret('token', lastCreatedUser.verificationToken)} disabled={!showSecrets}>
                    {copiedSecret === 'token' ? <><Check size={14} /> Zkopírováno</> : <><Copy size={14} /> Kopírovat</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="admin-empty-state">
                <h3>Zatím není co předat</h3>
                <p>Po vytvoření účtu se tady objeví dočasné heslo i fallback token.</p>
              </div>
            )}
          </section>
        </aside>
      </div>

      <LogsPanel
        id="superadmin-logs"
        scopeKey="superadmin"
        eyebrow="Provoz"
        title="Systémové logy"
        description="Stejný log panel jako v cabin administraci, ale s globálním přístupem pro backoffice zásahy a diagnostiku produkčních problémů."
        loadLogFiles={superadminApi.getLogFiles}
        loadLogs={superadminApi.getLogs}
      />

      <ConfirmDialog
        isOpen={pendingBanUser !== null}
        title={pendingBanUser?.isBanned ? 'Zrušit blokaci účtu?' : 'Zablokovat účet?'}
        message={pendingBanUser?.isBanned
          ? `Opravdu chcete zrušit blokaci účtu „${pendingBanUser.username}“? Uživateli se okamžitě vrátí možnost přihlášení.`
          : `Opravdu chcete zablokovat účet „${pendingBanUser?.username}“? Uživatel se nebude moci přihlásit, dokud blokaci nezrušíte.`}
        confirmLabel={pendingBanUser?.isBanned ? 'Zrušit blokaci' : 'Zablokovat účet'}
        danger={!pendingBanUser?.isBanned}
        loading={toggleBan.isPending}
        errorMessage={banError}
        onConfirm={handleConfirmBan}
        onCancel={() => {
          setPendingBanUser(null)
          setBanError(null)
        }}
      />
    </div>
  )
}
