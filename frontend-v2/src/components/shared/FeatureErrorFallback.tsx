/**
 * FeatureErrorFallback.tsx — Kompaktní chybové UI pro feature-level Error Boundaries.
 * Vykreslí se uvnitř glass-card widgetu místo spadlé komponenty.
 * Zbytek stránky funguje normálně.
 */
import { useEffect } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { reportError } from '@/lib/errorReporting'
import { extractSupportErrorDetails } from '@/lib/errorDetails'

const FEATURE_ERROR_QUIPS = [
  'Tahle část si vzala neplánovanou dovolenou.',
  'Server se zrovna díval z okna. Zkus to znovu.',
  'Tohle by se stát nemělo. Ale stalo se.',
  'Pokud problém přetrvává, viníkem je pravděpodobně WiFi.',
  'Část aplikace odešla na procházku do lesa.',
  'Chyba č. 500: příliš mnoho sušenek v systému.',
  'Programátor na tenhle případ nemyslel. Omluva.',
]

type ErrorWithMessage = { message?: string; stack?: string }

function pickStableQuip(seed: string, quips: string[]): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return quips[hash % quips.length]
}

interface FeatureErrorFallbackProps extends FallbackProps {
  /** Volitelný přepis titulku (default: "Komponentu se nepodařilo načíst") */
  title?: string
}

export function FeatureErrorFallback({
  error,
  resetErrorBoundary,
  title,
}: FeatureErrorFallbackProps) {
  const err = error as ErrorWithMessage
  const quip = pickStableQuip(`${title ?? 'FeatureErrorFallback'}|${err?.message ?? 'unknown'}`, FEATURE_ERROR_QUIPS)
  const supportDetails = extractSupportErrorDetails(error)

  useEffect(() => {
    reportError({
      message: err?.message ?? 'Unknown error',
      stack: err?.stack,
      component: title ?? 'FeatureErrorFallback',
      requestId: supportDetails.requestId,
      errorId: supportDetails.errorId,
      path: window.location.pathname,
    })
  }, [err, supportDetails.errorId, supportDetails.requestId, title])
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
        <img
          src="/icons/error-cesta.svg"
          alt=""
          aria-hidden="true"
          style={{ maxHeight: 180, width: 'auto', opacity: 0.7 }}
        />
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text, #1a1a1a)', fontSize: '0.95rem' }}>
          {title ?? 'Tato část se momentálně nenačítá'}
        </p>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted, #666)', fontStyle: 'italic' }}>
          {quip}
        </p>
        {supportDetails.supportCode && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text, #1a1a1a)' }}>
            Kód chyby: <strong>{supportDetails.supportCode}</strong>
          </p>
        )}
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
          className="button-primary"
          style={{ marginTop: '0.25rem', fontSize: '0.85rem', padding: '0.35rem 0.9rem' }}
          onClick={resetErrorBoundary}
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  )
}
