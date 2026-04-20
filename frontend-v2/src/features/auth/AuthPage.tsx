/**
 * features/auth/AuthPage.tsx
 * Orchestruje přepínání mezi Login / Register / Verify formuláři.
 * Překlad: app-wrapper div s #login-section, #register-section, #verify-section + bindLinks() z main.ts.
 */
import { useState } from 'react'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { VerifyForm } from './VerifyForm'

type AuthView = 'login' | 'register' | 'verify' | 'forgot'

interface VerifyState {
  username: string
  prefillCode?: string
}

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login')
  const [verifyState, setVerifyState] = useState<VerifyState>({ username: '' })

  function showVerify(username: string, prefillCode?: string) {
    setVerifyState({ username, prefillCode })
    setView('verify')
  }

  return (
    <div className="app-wrapper">
      {view === 'login' && (
        <LoginForm
          onShowForgotPassword={() => setView('forgot')}
          onShowRegister={() => setView('register')}
          onShowVerify={showVerify}
        />
      )}
      {view === 'register' && (
        <RegisterForm
          onShowLogin={() => setView('login')}
          onShowVerify={showVerify}
        />
      )}
      {view === 'verify' && (
        <VerifyForm
          username={verifyState.username}
          prefillCode={verifyState.prefillCode}
          onShowLogin={() => setView('login')}
        />
      )}
      {view === 'forgot' && (
        <ForgotPasswordForm onShowLogin={() => setView('login')} />
      )}
    </div>
  )
}
