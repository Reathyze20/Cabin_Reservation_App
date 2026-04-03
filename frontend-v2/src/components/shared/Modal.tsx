/**
 * Modal.tsx — Unified, reusable modal component
 *
 * Renders into a React portal attached to document.body.
 * Provides consistent SaaS-grade look: glassmorphism backdrop, white rounded card,
 * structured header/body/footer zones, Escape key & backdrop click to close.
 * Entrance/exit animations via framer-motion.
 *
 * Usage:
 *   <Modal isOpen={open} onClose={close} title="Edit Item" footer={<buttons/>}>
 *     <form>...</form>
 *   </Modal>
 */
import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export interface ModalProps {
  /** Controls visibility */
  isOpen: boolean
  /** Called when user clicks backdrop, presses Escape, or clicks close button */
  onClose: () => void
  /** Header title text or JSX */
  title: ReactNode
  /** Modal body content */
  children: ReactNode
  /** Optional footer (action buttons) */
  footer?: ReactNode
  /** Tailwind max-width class — default "max-w-lg" */
  maxWidth?: string
  /** If true, the modal will not close on backdrop click */
  persistent?: boolean
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 15 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

const overlayTransition = { duration: 0.2, ease: 'easeOut' as const }
const cardTransition = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
  persistent = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Lock body scroll & handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  // Auto-focus first focusable element inside the modal
  useEffect(() => {
    if (!isOpen) return
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const el = overlayRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [autofocus]'
      )
      el?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [isOpen])

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (!persistent && e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="modal-unified-overlay"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={overlayTransition}
        >
          <motion.div
            className={`modal-unified-card ${maxWidth}`}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={cardTransition}
          >
            {/* Header */}
            <div className="modal-unified-header">
              <h3 className="modal-unified-title">{title}</h3>
              <button
                type="button"
                className="modal-unified-close"
                onClick={onClose}
                aria-label="Zavřít"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-unified-body">
              {children}
            </div>

            {/* Footer (optional) */}
            {footer && (
              <div className="modal-unified-footer">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
