/**
 * ConfirmDialog.tsx — Reusable confirmation dialog (replaces window.confirm)
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showConfirm}
 *     title="Smazat položku"
 *     message="Opravdu chcete tuto položku smazat?"
 *     confirmLabel="Smazat"
 *     danger
 *     onConfirm={handleConfirmedDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
import { Modal } from './Modal'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  errorMessage?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button style */
  danger?: boolean
  /** Loading state — disables buttons */
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  errorMessage,
  confirmLabel = 'Potvrdit',
  cancelLabel = 'Zrušit',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
            data-testid="confirm-dialog-cancel-button"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-dialog-confirm-button"
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      }
    >
      <p style={{ color: 'var(--text-main)', lineHeight: 1.5 }} data-testid="confirm-dialog-message">{message}</p>
      {errorMessage ? (
        <div className="error-message show" role="alert" style={{ marginTop: '12px' }} data-testid="confirm-dialog-error">
          {errorMessage}
        </div>
      ) : null}
    </Modal>
  )
}
