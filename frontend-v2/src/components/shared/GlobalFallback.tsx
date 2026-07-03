/**
 * GlobalFallback.tsx — Fullscreen chybová stránka pro root ErrorBoundary.
 * Zobrazí se pouze při pádu celého stromu (White Screen of Death).
 *
 * Konzistentní design s FeatureErrorFallback + fullscreen wrapper.
 * Obsahuje: support info panel, copy-all, dev-only stack trace,
 * dva CTA buttony (retry + domů).
 */
import { useCallback, useEffect, useState } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { reportError } from '@/lib/errorReporting'
import {
  extractSupportErrorDetails,
  formatSupportBlock,
  getUserFriendlyMessage,
} from '@/lib/errorDetails'

const GLOBAL_ERROR_QUIPS = [
  'Celá aplikace odešla. To se jen tak nevidí.',
  'Server se rozhodl dát si pauzu. Bez upozornění.',
  'Tohle je ta vzácná chyba, o které se píše v učebnicích.',
  'Aplikace zkusila něco odvážného. Nevyšlo to.',
  'I ti nejlepší programátoři nechávají někdy chyby. Tohle je jeden z těch případů.',
  'Technicky vzato — tohle by nemělo existovat.',
  'Chata stojí, ale aplikace se zatřásla.',
]

type ErrorWithMessage = { message?: string; stack?: string }

function pickStableQuip(seed: string, quips: string[]): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return quips[hash % quips.length]
}

function CopyAllButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => { /* silent */ })
  }, [text])

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        border: '1px solid var(--border-strong, #e5e7eb)',
        borderRadius: '6px',
        background: 'transparent',
        color: 'var(--text-muted, #4b5563)',
        fontSize: '0.72rem',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'var(--font-family, sans-serif)',
      }}
      aria-label="Zkopírovat informace o chybě"
      type="button"
    >
      {/* Inline SVG — no lucide dependency in global fallback (may crash before React loads icons) */}
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
      )}
      {copied ? 'Zkopírováno' : 'Zkopírovat'}
    </button>
  )
}

export function GlobalFallback({ error, resetErrorBoundary }: FallbackProps) {
  const err = error as ErrorWithMessage
  const quip = pickStableQuip(err?.message ?? 'GlobalFallback', GLOBAL_ERROR_QUIPS)
  const supportDetails = extractSupportErrorDetails(error)
  const friendlyMessage = getUserFriendlyMessage(supportDetails.status,
    'Omlouváme se za nepříjemnosti. Zkuste obnovit stránku — pokud chyba přetrvá, kontaktujte správce chaty.',
  )
  const supportBlock = formatSupportBlock(supportDetails)
  const [devExpanded, setDevExpanded] = useState(false)

  useEffect(() => {
    reportError({
      message: err?.message ?? 'Unknown error',
      stack: err?.stack,
      component: 'GlobalFallback',
      requestId: supportDetails.requestId,
      errorId: supportDetails.errorId,
      path: window.location.pathname,
    }, false) // use anon endpoint — auth may be broken
  }, [err, supportDetails.errorId, supportDetails.requestId])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--bg-app, #f0f4f0)',
        fontFamily: 'var(--font-family, "Plus Jakarta Sans", sans-serif)',
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
        {/* Ikona */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '9999px',
            background: 'var(--status-error-light, #fee2e2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Inline SVG AlertTriangle — safe for global fallback (no lucide dep risk) */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--status-error, #dc2626)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        {/* Titulek */}
        <h2
          style={{
            margin: 0,
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--text-main, #1a1a1a)',
            lineHeight: 1.3,
          }}
        >
          Aplikace narazila na chybu
        </h2>

        {/* Popis */}
        <p
          style={{
            margin: 0,
            color: 'var(--text-muted, #4b5563)',
            lineHeight: 1.5,
            fontSize: '0.9rem',
          }}
        >
          {friendlyMessage}
        </p>

        {/* Quip */}
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            color: 'var(--text-placeholder, #6b7280)',
            fontStyle: 'italic',
            opacity: 0.8,
          }}
        >
          „{quip}"
        </p>

        {/* ── Support info panel ──────────────────────────────────────── */}
        {supportDetails.supportCode && (
          <div
            style={{
              width: '100%',
              marginTop: '0.25rem',
              padding: '12px 16px',
              background: 'rgba(0, 0, 0, 0.03)',
              borderRadius: '10px',
              border: '1px solid var(--border-light, #f4f7f5)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--text-muted, #4b5563)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Pro podporu
              </span>
              <CopyAllButton text={supportBlock} />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                fontSize: '0.72rem',
                fontFamily: "'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace",
                color: 'var(--text-muted, #4b5563)',
              }}
            >
              <span>
                <strong style={{ color: 'var(--text-main, #1a1a1a)' }}>Kód:</strong>{' '}
                {supportDetails.supportCode}
              </span>
              {supportDetails.method && supportDetails.url && (
                <span>
                  <strong style={{ color: 'var(--text-main, #1a1a1a)' }}>Endpoint:</strong>{' '}
                  {supportDetails.method} {supportDetails.url}
                </span>
              )}
              {supportDetails.status && (
                <span>
                  <strong style={{ color: 'var(--text-main, #1a1a1a)' }}>Status:</strong>{' '}
                  {supportDetails.status}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Dev-only stack trace ────────────────────────────────────── */}
        {import.meta.env.DEV && err?.message && (
          <div style={{ width: '100%' }}>
            <button
              onClick={() => setDevExpanded((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.7rem',
                color: 'var(--text-placeholder, #6b7280)',
                fontFamily: 'var(--font-family, sans-serif)',
              }}
              type="button"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: 'transform 0.2s ease',
                  transform: devExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              Technický detail (dev)
            </button>

            {devExpanded && (
              <pre
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.68rem',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: 'var(--status-error, #dc2626)',
                  maxHeight: 180,
                  overflowY: 'auto',
                  margin: '4px 0 0 0',
                }}
              >
                {err.stack ?? err.message}
              </pre>
            )}
          </div>
        )}

        {/* ── CTA buttons ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '0.25rem',
          }}
        >
          <button className="button-primary" onClick={resetErrorBoundary}>
            Zkusit znovu
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
