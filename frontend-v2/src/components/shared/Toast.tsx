/**
 * components/shared/Toast.tsx
 * Globální toast systém — strukturované toasty s ikonou, close, copy support code.
 * Podporuje stacking (max 3), Framer Motion animace, a glassmorphism.
 *
 * Naslouchá custom window eventu 'toast:show' s payloadem:
 *   { title: string; detail?: string; supportCode?: string; type: ToastType }
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, X, Copy, Check } from 'lucide-react'
import type { ToastType } from '@/lib/toast'

interface ToastItem {
  id: number
  title: string
  detail?: string
  supportCode?: string
  type: ToastType
}

const MAX_TOASTS = 3
let nextId = 0

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 8000,
  info: 3500,
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 1500)
    }).catch(() => {
      // Clipboard API failed — silently ignore
    })
  }, [text])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <button
      className="toast-support-copy"
      onClick={handleCopy}
      aria-label="Zkopírovat kód chyby"
      type="button"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: number) => void
}) {
  const Icon = ICONS[item.type] ?? Info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`toast toast-${item.type}`}
      data-testid="toast"
      data-toast-type={item.type}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="toast-icon" />

      <div className="toast-body">
        <p className="toast-title">{item.title}</p>
        {item.detail && <p className="toast-detail">{item.detail}</p>}
        {item.supportCode && (
          <span className="toast-support">
            Kód: {item.supportCode}
            <CopyButton text={item.supportCode} />
          </span>
        )}
      </div>

      <button
        className="toast-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Zavřít notifikaci"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

export function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const { title, detail, supportCode, type } = (
        e as CustomEvent<{
          title: string
          detail?: string
          supportCode?: string
          type: ToastType
        }>
      ).detail

      const id = nextId++
      const newToast: ToastItem = { id, title, detail, supportCode, type }

      setToasts((prev) => {
        // FIFO: pokud překročíme limit, odstraníme nejstarší
        const updated = [...prev, newToast]
        if (updated.length > MAX_TOASTS) {
          const removed = updated.shift()
          if (removed) {
            const timer = timersRef.current.get(removed.id)
            if (timer) {
              clearTimeout(timer)
              timersRef.current.delete(removed.id)
            }
          }
        }
        return updated
      })

      // Auto-dismiss
      const duration = DURATIONS[type] ?? 3500
      const timer = setTimeout(() => {
        dismiss(id)
      }, duration)
      timersRef.current.set(id, timer)
    }

    window.addEventListener('toast:show', handler)
    return () => {
      window.removeEventListener('toast:show', handler)
      // Cleanup all timers
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [dismiss])

  return (
    <div className="toast-container" data-testid="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} item={toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
