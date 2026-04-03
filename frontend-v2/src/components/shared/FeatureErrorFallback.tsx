/**
 * FeatureErrorFallback.tsx — Kompaktní chybové UI pro feature-level Error Boundaries.
 * Vykreslí se uvnitř glass-card widgetu místo spadlé komponenty.
 * Zbytek stránky funguje normálně.
 */
import { useEffect } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { reportError } from '@/lib/errorReporting'

type ErrorWithMessage = { message?: string; stack?: string }

interface FeatureErrorFallbackProps extends FallbackProps {
  /** Volitelný přepis titulku (default: "Komponentu se nepodařilo načíst") */
  title?: string
}

export function FeatureErrorFallback({
  error,
  resetErrorBoundary,
  title,
}: FeatureErrorFallbackProps) {
  const err = error as ErrorWithMessage;

  useEffect(() => {
    reportError({
      message: err?.message ?? 'Unknown error',
      stack: err?.stack,
      component: title ?? 'FeatureErrorFallback',
    })
  }, [err, title])
  return (
    <div className="glass-card" style={{ minHeight: 120 }}>
      <div
        className="card-body-full"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '1.75rem' }}>⚠️</span>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text, #1a1a1a)', fontSize: '0.95rem' }}>
          {title ?? 'Komponentu se nepodařilo načíst'}
        </p>
        {import.meta.env.DEV && err?.message && (
          <p
            style={{
              margin: 0,
              fontSize: '0.72rem',
              color: 'var(--color-danger, #ef4444)',
              opacity: 0.8,
              wordBreak: 'break-all',
            }}
          >
            {err.message}
          </p>
        )}
        <button
          className="button-secondary"
          style={{ marginTop: '0.25rem', fontSize: '0.85rem', padding: '0.35rem 0.9rem' }}
          onClick={resetErrorBoundary}
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  )
}
