/**
 * GlobalFallback.tsx — Fullscreen chybová stránka pro root ErrorBoundary.
 * Zobrazí se pouze při pádu celého stromu (White Screen of Death).
 */
import { useEffect } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { reportError } from '@/lib/errorReporting'

type ErrorWithMessage = { message?: string; stack?: string }

export function GlobalFallback({ error, resetErrorBoundary }: FallbackProps) {
  const err = error as ErrorWithMessage;

  useEffect(() => {
    reportError({
      message: err?.message ?? 'Unknown error',
      stack: err?.stack,
      component: 'GlobalFallback',
    }, false) // use anon endpoint — auth may be broken
  }, [err])
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--bg-primary, #f0f4f0)',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: 480,
          width: '100%',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>🏚️</div>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-text, #1a1a1a)' }}>
          Aplikace narazila na chybu
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-muted, #666)', lineHeight: 1.5 }}>
          Omlouváme se za nepříjemnosti. Zkuste obnovit stránku — pokud chyba přetrvá,
          kontaktujte správce chaty.
        </p>

        {/* Dev-only: zobraz technický detail chyby */}
        {import.meta.env.DEV && err?.message && (
          <pre
            style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              padding: '0.75rem',
              fontSize: '0.72rem',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: 'var(--color-danger, #ef4444)',
              width: '100%',
              maxHeight: 150,
              overflowY: 'auto',
              margin: 0,
            }}
          >
            {err.message}
          </pre>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="button-primary"
            onClick={resetErrorBoundary}
          >
            🔄 Zkusit znovu
          </button>
          <button
            className="button-secondary"
            onClick={() => window.location.assign('/')}
          >
            ← Domů
          </button>
        </div>
      </div>
    </div>
  )
}
