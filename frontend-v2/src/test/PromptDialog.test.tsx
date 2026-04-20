import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PromptDialog } from '@/components/shared/PromptDialog'

describe('PromptDialog', () => {
  it('prefills input from initialValue when opened and resets on reopen', async () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const { rerender } = render(
      <PromptDialog
        isOpen={true}
        title="Přejmenovat album"
        label="Nový název"
        initialValue="Jaro 2026"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    )

    expect(await screen.findByRole('textbox')).toHaveValue('Jaro 2026')

    rerender(
      <PromptDialog
        isOpen={false}
        title="Přejmenovat album"
        label="Nový název"
        initialValue="Jaro 2026"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    )

    rerender(
      <PromptDialog
        isOpen={true}
        title="Přejmenovat album"
        label="Nový název"
        initialValue="Léto 2026"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    )

    expect(await screen.findByRole('textbox')).toHaveValue('Léto 2026')
  })

  it('submits a trimmed value', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <PromptDialog
        isOpen={true}
        title="Nový seznam"
        label="Název"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )

    const input = await screen.findByRole('textbox')
    await user.clear(input)
    await user.type(input, '  Chata víkend  ')
    await user.click(screen.getByRole('button', { name: 'Vytvořit' }))

    expect(onSubmit).toHaveBeenCalledWith('Chata víkend')
  })

  it('respects custom canSubmit validation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <PromptDialog
        isOpen={true}
        title="Smazat pobyt"
        label="Pro potvrzení napište SMAZAT"
        submitLabel="Smazat"
        danger
        canSubmit={(value) => value.trim() === 'SMAZAT'}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )

    const input = await screen.findByLabelText('Pro potvrzení napište SMAZAT')
    const submit = screen.getByRole('button', { name: 'Smazat' })

    expect(submit).toBeDisabled()

    await user.type(input, 'smazat')
    expect(submit).toBeDisabled()

    await user.clear(input)
    await user.type(input, ' SMAZAT ')
    expect(submit).toBeEnabled()

    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledWith('SMAZAT')
  })

  it('supports password input without trimming when trimValue is false', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <PromptDialog
        isOpen={true}
        title="Smazat účet"
        label="Potvrďte heslem"
        inputType="password"
        autoComplete="current-password"
        submitLabel="Nenávratně smazat"
        trimValue={false}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )

    const input = await screen.findByLabelText('Potvrďte heslem')

    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')

    await user.type(input, '  moje heslo  ')
    await user.click(screen.getByRole('button', { name: 'Nenávratně smazat' }))

    expect(onSubmit).toHaveBeenCalledWith('  moje heslo  ')
  })
})