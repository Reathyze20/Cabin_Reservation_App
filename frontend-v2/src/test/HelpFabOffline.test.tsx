import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelpFab } from '@/components/shared/HelpFab'
import { OfflineBanner } from '@/components/shared/OfflineBanner'

let onlineState = true

function setNavigatorOnline(value: boolean) {
  onlineState = value
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

function renderHelpFab(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <HelpFab />
    </MemoryRouter>,
  )
}

describe('HelpFab and OfflineBanner', () => {
  beforeEach(() => {
    onlineState = true
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => onlineState,
    })
  })

  it('shows route-specific help for reservations', async () => {
    const user = userEvent.setup()

    renderHelpFab('/reservations')

    await user.click(screen.getByRole('button', { name: 'Potřebujete poradit?' }))

    expect(await screen.findByRole('dialog', { name: 'Nápověda k této stránce' })).toBeInTheDocument()
    expect(screen.getByText('Rezervace')).toBeInTheDocument()
    expect(screen.getByText(/Správa pobytů na chatě/)).toBeInTheDocument()
  })

  it('shows dedicated help content for cabin settings', async () => {
    const user = userEvent.setup()

    renderHelpFab('/admin/cabin')

    await user.click(screen.getByRole('button', { name: 'Potřebujete poradit?' }))

    expect(await screen.findByText('Nastavení chaty')).toBeInTheDocument()
    expect(screen.getByText(/součástí administrace chaty/)).toBeInTheDocument()
  })

  it('shows dedicated help content for diagnostics', async () => {
    const user = userEvent.setup()

    renderHelpFab('/admin/diagnostics')

    await user.click(screen.getByRole('button', { name: 'Potřebujete poradit?' }))

    expect(await screen.findByText('Diagnostika')).toBeInTheDocument()
    expect(screen.getByText(/samostatná provozní stránka/i)).toBeInTheDocument()
  })

  it('renders offline banner only while offline', async () => {
    render(<OfflineBanner />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    act(() => {
      setNavigatorOnline(false)
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Jste offline')

    act(() => {
      setNavigatorOnline(true)
    })

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
