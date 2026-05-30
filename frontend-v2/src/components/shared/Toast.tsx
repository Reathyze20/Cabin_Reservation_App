/**
 * components/shared/Toast.tsx
 * Globální toast — překlad z #toast v index.html + showToast() z lib/common.ts.
 * Naslouchá custom window eventu 'toast:show' → zobrazí toast s CSS třídami z toast.css.
 */
import { useEffect, useRef, useState } from 'react'
import type { ToastType } from '@/lib/toast'

interface ToastState {
  message: string
  type: ToastType
  visible: boolean
}

export function Toast() {
  const [state, setState] = useState<ToastState>({ message: '', type: 'info', visible: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail
      if (timerRef.current) clearTimeout(timerRef.current)

      setState({ message, type, visible: true })

      const duration = type === 'error' ? 6000 : type === 'success' ? 4000 : 3500
      timerRef.current = setTimeout(() => {
        setState((s) => ({ ...s, visible: false }))
      }, duration)
    }

    window.addEventListener('toast:show', handler)
    return () => {
      window.removeEventListener('toast:show', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      id="toast"
      className={`toast toast-${state.type}${state.visible ? ' show' : ''}`}
      data-testid="toast"
      data-toast-type={state.type}
      data-toast-visible={state.visible ? 'true' : 'false'}
    >
      {state.message}
    </div>
  )
}
