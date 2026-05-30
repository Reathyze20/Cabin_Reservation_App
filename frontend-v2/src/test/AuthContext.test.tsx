import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from '@/context/AuthContext'

function LoginProbe() {
  const { login, user, activeCabinId } = useAuth()

  useEffect(() => {
    login({
      token: 'token-123',
      username: 'tester',
      userId: 'user-123',
      role: 'user',
      animalIcon: 'fox',
      cabinId: null,
      isSuperAdmin: false,
      remember: true,
    })
  }, [login])

  return (
    <div>
      <span data-testid="cabin-id">{user?.cabinId ?? 'none'}</span>
      <span data-testid="active-cabin-id">{activeCabinId ?? 'none'}</span>
    </div>
  )
}

function SessionLoginProbe() {
  const { login, user, activeCabinId } = useAuth()

  useEffect(() => {
    login({
      token: 'token-456',
      username: 'tester-session',
      userId: 'user-456',
      role: 'user',
      animalIcon: 'owl',
      cabinId: 'cabin-session',
      isSuperAdmin: false,
      remember: false,
    })
  }, [login])

  return (
    <div>
      <span data-testid="session-cabin-id">{user?.cabinId ?? 'none'}</span>
      <span data-testid="session-active-cabin-id">{activeCabinId ?? 'none'}</span>
    </div>
  )
}

describe('AuthContext login storage cleanup', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('authToken', 'stale-token')
    localStorage.setItem('username', 'tester')
    localStorage.setItem('userId', 'user-123')
    localStorage.setItem('role', 'admin')
    localStorage.setItem('animalIcon', 'bear')
    localStorage.setItem('cabinId', 'cabin-old')
    localStorage.setItem('activeCabinId', 'cabin-old')
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('removes stored cabin identifiers when auth state is updated to no cabin', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginProbe />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('cabin-id')).toHaveTextContent('none')
      expect(screen.getByTestId('active-cabin-id')).toHaveTextContent('none')
    })

    expect(localStorage.getItem('cabinId')).toBeNull()
    expect(localStorage.getItem('activeCabinId')).toBeNull()
    expect(sessionStorage.getItem('cabinId')).toBeNull()
    expect(sessionStorage.getItem('activeCabinId')).toBeNull()
  })

  it('clears stale active cabin data from the non-active storage when switching to session auth', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionLoginProbe />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('session-cabin-id')).toHaveTextContent('cabin-session')
      expect(screen.getByTestId('session-active-cabin-id')).toHaveTextContent('cabin-session')
    })

    expect(localStorage.getItem('activeCabinId')).toBeNull()
    expect(sessionStorage.getItem('activeCabinId')).toBe('cabin-session')
  })
})