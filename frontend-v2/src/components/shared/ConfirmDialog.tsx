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

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
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
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-main)', lineHeight: 1.5 }}>{message}</p>
    </Modal>
  )
}
