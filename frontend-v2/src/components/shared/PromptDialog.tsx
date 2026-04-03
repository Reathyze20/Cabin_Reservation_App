/**
 * PromptDialog.tsx — Reusable text-input dialog (replaces window.prompt)
 *
 * Usage:
 *   <PromptDialog
 *     isOpen={showPrompt}
 *     title="Nové téma"
 *     label="Název tématu"
 *     placeholder="Např. Opravy na jaře"
 *     maxLength={100}
 *     onSubmit={(value) => createThread(value)}
 *     onCancel={() => setShowPrompt(false)}
 *   />
 */
import { useState, useEffect } from 'react'
import { Modal } from './Modal'

interface PromptDialogProps {
  isOpen: boolean
  title: string
  label?: string
  placeholder?: string
  maxLength?: number
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  onSubmit: (value: string) => void
  onCancel: () => void
}

export function PromptDialog({
  isOpen,
  title,
  label,
  placeholder,
  maxLength,
  submitLabel = 'Vytvořit',
  cancelLabel = 'Zrušit',
  loading = false,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (isOpen) setValue('')
  }, [isOpen])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit(value.trim())
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form="prompt-dialog-form"
            className="btn-primary"
            disabled={loading || !value.trim()}
          >
            {loading ? '…' : submitLabel}
          </button>
        </>
      }
    >
      <form id="prompt-dialog-form" onSubmit={handleSubmit}>
        {label && (
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            {label}
          </label>
        )}
        <input
          type="text"
          className="form-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus
        />
      </form>
    </Modal>
  )
}
