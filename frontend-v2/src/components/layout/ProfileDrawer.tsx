/**
 * components/layout/ProfileDrawer.tsx
 * Překlad: #profile-drawer-overlay z index.html + initProfileDrawer() z main.ts
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { showToast } from '@/lib/toast'
import { AVATARS } from '@/lib/avatars'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'

// ─── Konstanty ────────────────────────────────────────────────────────────────
const SWATCH_COLORS = [
  '#2d6a4f', '#40916c', '#52b788',
  '#bf6c3d', '#c68b3f', '#7a5b42',
  '#a0522d', '#6b7c47', '#8fa37a',
  '#c1877a', '#d4956a', '#6b7280',
  '#5c7a6b', '#7d6c5a', '#8b6914',
  '#4a6741',
]

interface ProfileData {
  email: string
  color: string
  animalIcon: string | null
}

interface ProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { updateAnimalIcon } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal')

  // ─── Email state ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')

  // ─── Color / Avatar state ───────────────────────────────────────────────────
  const [selectedColor, setSelectedColor] = useState('#8BB88B')
  const [selectedAnimal, setSelectedAnimal] = useState('')

  // ─── Security form ──────────────────────────────────────────────────────────
  const oldPasswordRef = useRef<HTMLInputElement>(null)
  const newPasswordRef = useRef<HTMLInputElement>(null)
  const newPasswordConfirmRef = useRef<HTMLInputElement>(null)
  const [securityMessage, setSecurityMessage] = useState('')
  const [securityError, setSecurityError] = useState(false)

  // ─── Zavřít klávesou Escape ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // ─── Načíst profil ──────────────────────────────────────────────────────────
  const { data: profileData } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => apiClient.get<ProfileData>('/users/me').then((r) => r.data),
    enabled: isOpen,
  })

  useEffect(() => {
    if (profileData) {
      setEmail(profileData.email ?? '')
      setSelectedColor(profileData.color ?? '#8BB88B')
      setSelectedAnimal(profileData.animalIcon ?? '')
    }
  }, [profileData])

  // ─── Auto-save color / animal ───────────────────────────────────────────────
  const patchMutation = useMutation({
    mutationFn: (payload: { color?: string; animalIcon?: string }) =>
      apiClient.patch('/users/me', payload).then((r) => r.data),
    onSuccess: (_, variables) => {
      if (variables.animalIcon !== undefined) {
        updateAnimalIcon(variables.animalIcon)
      }
      showToast('Změny uloženy', 'success')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => showToast('Nepodařilo se uložit, zkuste to prosím znovu.', 'error'),
  })

  function handleColorSelect(color: string) {
    if (selectedColor === color) return
    setSelectedColor(color)
    patchMutation.mutate({ color })
  }

  function handleAnimalSelect(icon: string) {
    if (selectedAnimal === icon) return
    setSelectedAnimal(icon)
    patchMutation.mutate({ animalIcon: icon })
  }

  // ─── Změnit e-mail ──────────────────────────────────────────────────────────
  async function handleChangeEmail() {
    const emailVal = email.trim()
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setEmailMessage('Nesprávný formát e-mailu.')
      setEmailError(true)
      return
    }
    try {
      await apiClient.patch('/users/me', { email: emailVal })
      setEmailMessage('')
      setEmailError(false)
      showToast('E-mail změněn', 'success')
    } catch {
      setEmailMessage('Chyba.')
      setEmailError(true)
    }
  }

  function handleEmailBlur() {
    const val = email.trim()
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError(true)
    } else {
      setEmailError(false)
    }
  }

  // ─── Změnit heslo ───────────────────────────────────────────────────────────
  async function handleSecuritySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const oldPassword = oldPasswordRef.current!.value
    const newPassword = newPasswordRef.current!.value
    const newPasswordConfirm = newPasswordConfirmRef.current!.value

    if (newPassword !== newPasswordConfirm) {
      setSecurityMessage('Hesla se neshodují.')
      setSecurityError(true)
      newPasswordConfirmRef.current?.classList.add('is-invalid')
      return
    }

    try {
      const res = await apiClient.patch('/users/me/password', { oldPassword, newPassword })
      if (res.status === 200) {
        setSecurityMessage('')
        setSecurityError(false)
        ;(e.currentTarget as HTMLFormElement).reset()
        showToast('Heslo úspěšně změněno', 'success')
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data
      setSecurityMessage(data?.message || 'Chyba.')
      setSecurityError(true)
      showToast('Nepodařilo se změnit heslo', 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div
      id="profile-drawer-overlay"
      className="drawer-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div id="profile-drawer" className="drawer-content right-drawer">
        <div className="drawer-header">
          <h2>Můj profil</h2>
          <button className="close-drawer" id="close-profile-drawer" aria-label="Zavřít" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="drawer-body">
          {/* Segmented Control */}
          <div className="segmented-control">
            <button
              className={`segmented-btn${activeTab === 'personal' ? ' active' : ''}`}
              data-target="profile-tab-personal"
              onClick={() => setActiveTab('personal')}
            >
              Osobní údaje
            </button>
            <button
              className={`segmented-btn${activeTab === 'security' ? ' active' : ''}`}
              data-target="profile-tab-security"
              onClick={() => setActiveTab('security')}
            >
              Zabezpečení
            </button>
          </div>

          {/* Personal Info Tab */}
          <div
            id="profile-tab-personal"
            className={`drawer-tab-content${activeTab === 'personal' ? ' active-tab' : ' hidden'}`}
          >
            <div className="drawer-section">
              <h3>Kontaktní údaje</h3>
              <div className="form-group">
                <label htmlFor="profile-email">E-mailová adresa:</label>
                <div className="drawer-email-row" style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="email"
                    id="profile-email"
                    name="email"
                    className="form-control"
                    maxLength={255}
                    placeholder="neco@neco.cz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={handleEmailBlur}
                    style={emailError ? { borderColor: 'var(--color-danger)' } : undefined}
                  />
                  <button
                    type="button"
                    id="btn-change-email"
                    className="button-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '0 15px' }}
                    onClick={handleChangeEmail}
                  >
                    Změnit
                  </button>
                </div>
                {emailError && (
                  <div id="profile-email-error" className="error-message" style={{ marginTop: '5px', textAlign: 'left' }}>
                    Zadejte e-mail ve správném formátu.
                  </div>
                )}
                {emailMessage && !emailError && (
                  <p id="profile-email-message" className="message" style={{ marginTop: '5px', textAlign: 'left' }}>
                    {emailMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="drawer-section">
              <h3>Vzhled profilu</h3>
              <div className="form-group">
                <label>Vyberte si barvu:</label>
                <div id="profile-color-grid" className="swatch-grid">
                  {SWATCH_COLORS.map((color) => (
                    <div
                      key={color}
                      className={`color-swatch${selectedColor.toLowerCase() === color.toLowerCase() ? ' active' : ''}`}
                      style={{ backgroundColor: color }}
                      tabIndex={0}
                      role="button"
                      onClick={() => handleColorSelect(color)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleColorSelect(color) } }}
                    />
                  ))}
                </div>
                <input type="hidden" id="profile-color" value={selectedColor} readOnly />
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>Váš Avatar:</label>
                <div id="profile-avatar-grid" className="avatar-grid">
                  {AVATARS.map((avatar) => (
                    <div
                      key={avatar.id}
                      className={`avatar-icon${selectedAnimal === avatar.id ? ' active' : ''}`}
                      tabIndex={0}
                      role="button"
                      title={avatar.label}
                      onClick={() => handleAnimalSelect(avatar.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAnimalSelect(avatar.id) } }}
                    >
                      <AnimalAvatar icon={avatar.id} username={avatar.label} size={40} />
                    </div>
                  ))}
                </div>
                <input type="hidden" id="profile-animal-icon" value={selectedAnimal} readOnly />
              </div>
            </div>
          </div>

          {/* Security Tab */}
          <div
            id="profile-tab-security"
            className={`drawer-tab-content${activeTab === 'security' ? ' active-tab' : ' hidden'}`}
          >
            <div className="drawer-section">
              <h3>Zabezpečení účtu</h3>
              <form id="profile-security-form" style={{ marginTop: '1.5rem' }} onSubmit={handleSecuritySubmit}>
                <div className="form-group">
                  <label htmlFor="profile-old-password">Staré heslo:</label>
                  <input type="password" id="profile-old-password" name="oldPassword" className="form-control" maxLength={100} required ref={oldPasswordRef} />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-new-password">Nové heslo:</label>
                  <input type="password" id="profile-new-password" name="newPassword" className="form-control" minLength={6} maxLength={100} required ref={newPasswordRef} />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-new-password-confirm">Potvrdit nové heslo:</label>
                  <input type="password" id="profile-new-password-confirm" name="newPasswordConfirm" className="form-control" minLength={6} maxLength={100} required ref={newPasswordConfirmRef} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="button-primary" style={{ width: '100%' }}>Změnit heslo</button>
                </div>
                {securityMessage && (
                  <p
                    id="profile-security-message"
                    className="message"
                    style={{ color: securityError ? 'var(--color-danger)' : 'var(--color-success)' }}
                  >
                    {securityMessage}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
