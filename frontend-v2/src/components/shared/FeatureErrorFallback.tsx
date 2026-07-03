/**
 * FeatureErrorFallback.tsx — Kompaktní chybové UI pro feature-level Error Boundaries.
 * Vykreslí se uvnitř glass-card widgetu místo spadlé komponenty.
 * Zbytek stránky funguje normálně.
 *
 * Obsahuje:
 * - Přátelský quip pro zákazníka
 * - Support info panel (kód chyby, endpoint, status) s copy-to-clipboard
 * - Dev-only expandable stack trace
 * - Framer Motion entrance animace
 */
import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Copy, Check, ChevronDown, AlertTriangle } from 'lucide-react'
import type { FallbackProps } from 'react-error-boundary'
import { reportError } from '@/lib/errorReporting'
import {
  extractSupportErrorDetails,
  formatSupportBlock,
  getUserFriendlyMessage,
} from '@/lib/errorDetails'

const FEATURE_ERROR_QUIPS = [
  'Tahle část si vzala neplánovanou dovolenou.',
  'Server se zrovna díval z okna. Zkus to znovu.',
  'Tohle by se stát nemělo. Ale stalo se.',
  'Pokud problém přetrvává, viníkem je pravděpodobně WiFi.',
  'Část aplikace odešla na procházku do lesa.',
  'Chyba č. 500: příliš mnoho sušenek v systému.',
  'Programátor na tenhle případ nemyslel. Omluva.',
  'Někde v kódu je šotek. Hledáme ho.',
  'Les zavolal a chce svou chybu zpět.',
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
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        color: 'var(--text-muted)',
        fontSize: '0.72rem',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'var(--font-family)',
      }}
      aria-label="Zkopírovat informace o chybě"
      type="button"
    >
      {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
      {copied ? 'Zkopírováno' : 'Zkopírovat'}
    </button>
  )
}

interface FeatureErrorFallbackProps extends FallbackProps {
  /** Volitelný přepis titulku (default: "Tato část se momentálně nenačítá") */
  title?: string
}

export function FeatureErrorFallback({
  error,
  resetErrorBoundary,
  title,
}: FeatureErrorFallbackProps) {
  const err = error as ErrorWithMessage
  const quip = pickStableQuip(
    `${title ?? 'FeatureErrorFallback'}|${err?.message ?? 'unknown'}`,
    FEATURE_ERROR_QUIPS,
  )
  const supportDetails = extractSupportErrorDetails(error)
  const friendlyMessage = getUserFriendlyMessage(supportDetails.status)
  const supportBlock = formatSupportBlock(supportDetails)
  const [devExpanded, setDevExpanded] = useState(false)

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
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="glass-card"
      style={{ minHeight: 160, overflow: 'hidden' }}
    >
      <div
        className="card-body-full"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-2xl) var(--space-xl)',
          textAlign: 'center',
        }}
      >
        {/* Ikona */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'var(--status-error-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertTriangle style={{ width: 24, height: 24, color: 'var(--status-error)' }} />
        </div>

        {/* Titulek */}
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            color: 'var(--text-main)',
            fontSize: 'var(--font-size-base)',
            lineHeight: 1.4,
          }}
        >
          {title ?? 'Tato část se momentálně nenačítá'}
        </p>

        {/* Friendly popis */}
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            maxWidth: 380,
          }}
        >
          {friendlyMessage}
        </p>

        {/* Quip */}
        <p
          style={{
            margin: 0,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-placeholder)',
            fontStyle: 'italic',
          }}
        >
          „{quip}"
        </p>

        {/* ── Support info panel ──────────────────────────────────────── */}
        {supportDetails.supportCode && (
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              marginTop: 'var(--space-xs)',
              padding: 'var(--space-md) var(--space-lg)',
              background: 'rgba(0, 0, 0, 0.03)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-sm)',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
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
                color: 'var(--text-muted)',
              }}
            >
              <span>
                <strong style={{ color: 'var(--text-main)' }}>Kód:</strong>{' '}
                {supportDetails.supportCode}
              </span>
              {supportDetails.method && supportDetails.url && (
                <span>
                  <strong style={{ color: 'var(--text-main)' }}>Endpoint:</strong>{' '}
                  {supportDetails.method} {supportDetails.url}
                </span>
              )}
              {supportDetails.status && (
                <span>
                  <strong style={{ color: 'var(--text-main)' }}>Status:</strong>{' '}
                  {supportDetails.status}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Retry tlačítko */}
        <button
          className="button-primary"
          style={{
            marginTop: 'var(--space-xs)',
            fontSize: 'var(--font-size-sm)',
            padding: '8px 20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onClick={resetErrorBoundary}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          Zkusit znovu
        </button>

        {/* ── Dev-only expandable stack trace ─────────────────────────── */}
        {import.meta.env.DEV && err?.message && (
          <div style={{ width: '100%', maxWidth: 360 }}>
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
                color: 'var(--text-placeholder)',
                fontFamily: 'var(--font-family)',
              }}
              type="button"
            >
              <ChevronDown
                style={{
                  width: 12,
                  height: 12,
                  transition: 'transform 0.2s ease',
                  transform: devExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
              Technický detail (dev)
            </button>

            <AnimatePresence>
              {devExpanded && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-md)',
                    fontSize: '0.68rem',
                    textAlign: 'left',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: 'var(--status-error)',
                    maxHeight: 180,
                    overflowY: 'auto',
                    margin: 'var(--space-xs) 0 0 0',
                  }}
                >
                  {err.stack ?? err.message}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}
