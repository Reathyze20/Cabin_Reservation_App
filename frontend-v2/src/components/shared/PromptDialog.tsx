/**
 * PromptDialog.tsx — Reusable single-input dialog (replaces window.prompt)
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
import { useState, useEffect, useId, type HTMLInputTypeAttribute, type ReactNode } from 'react'
import { Modal } from './Modal'

interface PromptDialogProps {
  isOpen: boolean
  title: string
  description?: ReactNode
  errorMessage?: ReactNode
  label?: string
  initialValue?: string
  placeholder?: string
  maxLength?: number
  inputType?: HTMLInputTypeAttribute
  autoComplete?: string
  submitLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  loadingLabel?: string
  trimValue?: boolean
  canSubmit?: (value: string) => boolean
  onSubmit: (value: string) => void
  onCancel: () => void
}

export function PromptDialog({
  isOpen,
  title,
  description,
  errorMessage,
  label,
  initialValue = '',
  placeholder,
  maxLength,
  inputType = 'text',
  autoComplete,
  submitLabel = 'Vytvořit',
  cancelLabel = 'Zrušit',
  danger = false,
  loading = false,
  loadingLabel = '…',
  trimValue = true,
  canSubmit,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState('')
  const inputId = useId()
  const descriptionId = useId()
  const normalizedValue = trimValue ? value.trim() : value
  const canSubmitValue = canSubmit ? canSubmit(value) : Boolean(normalizedValue)

  useEffect(() => {
    if (isOpen) setValue(initialValue)
  }, [initialValue, isOpen])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmitValue) return
    onSubmit(normalizedValue)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-sm"
      footer={
        <div className="modal-dialog-actions">
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
            className={danger ? 'btn-danger' : 'btn-primary'}
            disabled={loading || !canSubmitValue}
          >
            {loading ? loadingLabel : submitLabel}
          </button>
        </div>
      }
    >
      <form id="prompt-dialog-form" onSubmit={handleSubmit}>
        {description && (
          <div id={descriptionId} style={{ marginBottom: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
            {description}
          </div>
        )}
        {label && (
          <label
            htmlFor={inputId}
            style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={inputType}
          className="form-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-describedby={description ? descriptionId : undefined}
          autoFocus
        />
        {errorMessage ? (
          <div className="error-message show" role="alert">
            {errorMessage}
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
