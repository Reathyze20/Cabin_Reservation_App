/**
 * features/auth/RegisterForm.tsx
 * Překlad: #register-section z index.html + bindRegisterForm() z main.ts
 */
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { showToast } from '@/lib/toast'
import { Eye, EyeOff } from 'lucide-react'

const REGISTER_SWATCH_COLORS = [
  '#2d6a4f', '#40916c', '#52b788',
  '#bf6c3d', '#c68b3f', '#7a5b42',
  '#a0522d', '#6b7c47', '#c1877a',
  '#d4956a', '#6b7280', '#5c7a6b',
]

interface RegisterFormProps {
  onShowLogin: () => void
  onShowVerify: (username: string, prefillCode?: string) => void
}

interface RegisterResponse {
  message?: string
  error?: string
  requiresVerification?: boolean
  testToken?: string
  testCode?: string
}

/** Validates weather location against Open-Meteo geocoding API */
async function validateWeatherLocation(location: string): Promise<boolean> {
  if (!location) return true
  try {
    const { data } = await axios.get<{ results?: unknown[] }>(
      'https://geocoding-api.open-meteo.com/v1/search',
      {
        params: {
          name: location,
          count: 1,
          language: 'cs',
          format: 'json',
        },
      },
    )

    return Array.isArray(data.results) && data.results.length > 0
  } catch {
    return true // Let it pass on network error
  }
}

export function RegisterForm({ onShowLogin, onShowVerify }: RegisterFormProps) {
  const navigate = useNavigate()
  const [selectedColor, setSelectedColor] = useState('#5d9b62')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning'; testCode?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailSent, setEmailSent] = useState<string | null>(null) // email address → show confirmation

  const cabinNameRef = useRef<HTMLInputElement>(null)
  const weatherLocationRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function showMsg(text: string, type: 'success' | 'error' | 'warning') {
    setMessage({ text, type })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const cabinName = cabinNameRef.current!.value.trim()
    const weatherLocation = weatherLocationRef.current!.value.trim()
    const username = usernameRef.current!.value.trim()
    const email = emailRef.current!.value.trim()
    const password = passwordRef.current!.value

    if (cabinName.length < 2) {
      showMsg('Název chaty musí mít alespoň 2 znaky.', 'error')
      return
    }
    if (weatherLocation.length < 2) {
      showMsg('Lokalita (Město/PSČ) musí mít alespoň 2 znaky.', 'error')
      return
    }

    setLoading(true)
    setMessage(null)

    const isLocationValid = await validateWeatherLocation(weatherLocation)
    if (!isLocationValid) {
      showMsg('Zadaná lokalita nebyla nalezena. Zkuste existující město nebo PSČ.', 'error')
      setLoading(false)
      return
    }

    try {
      const { data } = await apiClient.post<RegisterResponse>('/register', {
        cabinName,
        weatherLocation,
        username,
        password,
        color: selectedColor,
        email,
      })

      // Token-based flow: e-mail pro aktivaci byl odeslán
      if (data.requiresVerification) {
        if (data.testToken) {
          showToast('E-mail se nepodařilo odeslat. Otevírám nouzový aktivační odkaz.', 'info')
          timerRef.current = setTimeout(() => navigate(`/verify?token=${data.testToken}`, { replace: true }), 1500)
          return
        }
        // Standardní flow — e-mail odeslán
        setEmailSent(email)
        showToast('Registrace úspěšná — zkontrolujte e-mail', 'success')
        return
      }

      // Legacy PIN-based flow
      if (data.message?.includes('ověřovací kód') || data.message?.includes('e-mail s kódem se nepodařilo odeslat')) {
        if (data.testCode) {
          setMessage({
            text: data.message,
            type: 'warning',
            testCode: data.testCode,
          })
        } else {
          showMsg(data.message, data.message.includes('nepodařilo') ? 'error' : 'success')
        }
        timerRef.current = setTimeout(
          () => onShowVerify(username, data.testCode),
          data.testCode || data.message.includes('nepodařilo') ? 4000 : 1000,
        )
      } else {
        showMsg('Registrace úspěšná, přihlaste se.', 'success')
        timerRef.current = setTimeout(onShowLogin, 1500)
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: RegisterResponse } }).response?.data
      const msg = data?.message || data?.error || 'Chyba sítě'
      showMsg(msg, 'error')
      if (data) showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // E-mail byl odeslán — zobrazíme potvrzovací screen (stejné jako v originálu)
  if (emailSent) {
    return (
      <div id="register-section" className="login-container card">
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--color-primary)' }}>✉</div>
          <h2 style={{ margin: '0 0 12px', color: 'var(--text-main, #1a2721)' }}>Zkontrolujte svůj e-mail</h2>
          <p style={{ color: 'var(--text-muted, #6b7280)', lineHeight: 1.6, margin: '0 0 24px' }}>
            Děkujeme za registraci!<br />
            Poslali jsme vám e-mail s odkazem pro aktivaci účtu na adresu <strong>{emailSent}</strong>.
          </p>
          <a
            href="#"
            style={{ color: 'var(--brand-primary, #3f7b63)', textDecoration: 'underline', cursor: 'pointer' }}
            onClick={(e) => { e.preventDefault(); onShowLogin() }}
          >
            ← Vrátit se na přihlášení
          </a>
        </div>
      </div>
    )
  }

  return (
    <div id="register-section" className="login-container card">
      <div className="auth-brand">
        <img src="/logo-icon.svg" alt="Logo" className="auth-logo-icon" />
        <h1 className="auth-brand-text">kdynachatu.cz</h1>
      </div>
      <p className="auth-subtitle">Vytvořte prostor pro vaši chatu</p>

      <form id="register-form" noValidate onSubmit={handleSubmit}>
        <div className="form-section-label">Vaše chata</div>

        <div className="form-group">
          <label htmlFor="register-cabin-name">Název chaty</label>
          <input
            type="text" id="register-cabin-name" name="cabinName" maxLength={100}
            autoComplete="off" placeholder="např. Chalupa pod Kletí"
            required minLength={2} ref={cabinNameRef}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-weather-location">Nejbližší město nebo PSČ (pro počasí)</label>
          <input
            type="text" id="register-weather-location" name="weatherLocation" maxLength={100}
            autoComplete="off" placeholder="např. Liberec nebo 46001"
            required minLength={2} ref={weatherLocationRef}
          />
        </div>

        <div className="form-section-label">Vaše údaje</div>

        <div className="form-group">
          <label htmlFor="register-username">Uživatelské jméno</label>
          <input
            type="text" id="register-username" name="username" maxLength={50}
            autoComplete="username" required minLength={2} ref={usernameRef}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-email">E-mail</label>
          <input
            type="email" id="register-email" name="email" maxLength={255}
            autoComplete="email" required ref={emailRef}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-password">Heslo (min. 8 znaků)</label>
          <div className="input-eye-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="register-password" name="password" maxLength={100}
              autoComplete="new-password" required minLength={8} ref={passwordRef}
            />
            <button
              type="button"
              className="toggle-password"
              id="toggle-password-register"
              aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Barva profilu</label>
          <div className="color-picker-swatches" id="register-color-swatches">
            {REGISTER_SWATCH_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-swatch${selectedColor === color ? ' active' : ''}`}
                style={{ backgroundColor: color }}
                data-color={color}
                aria-label={`Barva ${color}`}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          <input type="hidden" name="color" id="register-color" value={selectedColor} />
        </div>

        <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Zakládám chatu…' : 'Založit chatu a registrovat'}
        </button>

        {message && (
          <p
            id="register-message"
            className="message"
            style={{
              marginTop: '.5rem',
              color: message.type === 'error'
                ? 'var(--color-danger)'
                : message.type === 'warning'
                  ? 'var(--color-warning)'
                  : 'var(--color-success)',
              display: 'block',
            }}
          >
            {message.text}
            {message.testCode && (
              <>
                <br /><br />
                <strong>Nouzový kód pro testování:{' '}
                  <span style={{ fontSize: '1.2em', letterSpacing: '2px', color: 'var(--color-primary)' }}>{message.testCode}</span>
                </strong>
              </>
            )}
          </p>
        )}
      </form>

      <p className="toggle-form-text">
        Máte již účet?{' '}
        <a href="#" id="show-login-link" onClick={(e) => { e.preventDefault(); onShowLogin() }}>
          Přihlaste se
        </a>
      </p>
    </div>
  )
}
