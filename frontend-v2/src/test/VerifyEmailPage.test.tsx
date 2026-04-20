import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'

function renderWithRouter(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  )
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows missing token message when no token param', () => {
    renderWithRouter('/verify')
    expect(screen.getByText('Chybí ověřovací odkaz')).toBeInTheDocument()
  })

  it('shows loading state when token is present', () => {
    vi.spyOn(apiClient, 'get').mockReturnValue(new Promise(() => {}) as ReturnType<typeof apiClient.get>)
    renderWithRouter('/verify?token=abc123')
    expect(screen.getByText('Ověřuji váš účet…')).toBeInTheDocument()
  })

  it('shows success on valid token', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { message: 'Účet byl úspěšně aktivován!' },
    } as Awaited<ReturnType<typeof apiClient.get>>)

    renderWithRouter('/verify?token=valid-token')

    await waitFor(() => {
      expect(screen.getByText('Ověření úspěšné')).toBeInTheDocument()
    })
  })

  it('shows error on invalid token', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({
      response: {
        data: { message: 'Neplatný token.' },
      },
    })

    renderWithRouter('/verify?token=bad-token')

    await waitFor(() => {
      expect(screen.getByText('Ověření selhalo')).toBeInTheDocument()
    })
  })
})
