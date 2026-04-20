import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import type { LogEntry, LogQueryParams, LogResponse } from '@/api/admin'

interface LogsPanelProps {
  id?: string
  scopeKey: string
  eyebrow: string
  title: string
  description: string
  loadLogFiles: () => Promise<{ files: string[] }>
  loadLogs: (params: LogQueryParams) => Promise<LogResponse>
}

function getLevelBadgeClass(level: string | undefined): string {
  const normalized = level?.toLowerCase() ?? 'info'

  if (normalized === 'error') return 'admin-log-level admin-log-level--error'
  if (normalized === 'warn') return 'admin-log-level admin-log-level--warn'
  return 'admin-log-level admin-log-level--info'
}

function getLevelLabel(level: string | undefined): string {
  const normalized = level?.toLowerCase() ?? 'info'

  if (normalized === 'error') return 'Error'
  if (normalized === 'warn') return 'Warn'
  return 'Info'
}

function formatLogTime(value: string | number | undefined): string {
  if (!value) return 'Bez času'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)

  return parsed.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatLogDetail(entry: LogEntry): string {
  return JSON.stringify(entry, null, 2)
}

function normalizeTextInput(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeStatusInput(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : undefined
}

function getActorLabel(entry: LogEntry): string | undefined {
  const actorUsername = typeof entry.actorUsername === 'string'
    ? entry.actorUsername
    : typeof entry.username === 'string'
      ? entry.username
      : undefined

  const actorId = typeof entry.actorId === 'string'
    ? entry.actorId
    : typeof entry.userId === 'string'
      ? entry.userId
      : undefined

  if (actorUsername && actorId && actorUsername !== actorId) {
    return `${actorUsername} (${actorId})`
  }

  return actorUsername ?? actorId
}

function buildMetaPills(entry: LogEntry): string[] {
  const meta: string[] = []
  const actorLabel = getActorLabel(entry)

  if (typeof entry.module === 'string' && entry.module) {
    meta.push(`Modul: ${entry.module}`)
  }
  if (typeof entry.source === 'string' && entry.source) {
    meta.push(`Zdroj: ${entry.source}`)
  }
  if (typeof entry.path === 'string' && entry.path) {
    meta.push(`Cesta: ${entry.path}${typeof entry.status === 'number' ? ` · ${entry.status}` : ''}`)
  } else if (typeof entry.status === 'number') {
    meta.push(`Status: ${entry.status}`)
  }
  if (actorLabel) {
    meta.push(`Uživatel: ${actorLabel}`)
  }
  if (typeof entry.cabinId === 'string' && entry.cabinId) {
    meta.push(`Chata: ${entry.cabinId}`)
  }
  if (typeof entry.requestId === 'string' && entry.requestId) {
    meta.push(`Request: ${entry.requestId}`)
  }
  if (typeof entry.errorId === 'string' && entry.errorId) {
    meta.push(`Error: ${entry.errorId}`)
  }

  return meta
}

export function LogsPanel({
  id,
  scopeKey,
  eyebrow,
  title,
  description,
  loadLogFiles,
  loadLogs,
}: LogsPanelProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [level, setLevel] = useState<'all' | 'debug' | 'error' | 'warn' | 'info'>('all')
  const [source, setSource] = useState<'all' | 'backend' | 'frontend'>('all')
  const [lines, setLines] = useState(50)
  const [requestId, setRequestId] = useState('')
  const [userId, setUserId] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  const filesQuery = useQuery({
    queryKey: [scopeKey, 'log-files'],
    queryFn: loadLogFiles,
    staleTime: 300_000,
  })

  const availableDates = filesQuery.data?.files ?? []

  useEffect(() => {
    if (availableDates.length === 0) return

    setSelectedDate((current) => {
      if (!current || !availableDates.includes(current)) return availableDates[0]
      return current
    })
  }, [availableDates])

  const deferredRequestId = useDeferredValue(requestId)
  const deferredUserId = useDeferredValue(userId)
  const deferredModuleFilter = useDeferredValue(moduleFilter)
  const deferredPathFilter = useDeferredValue(pathFilter)
  const deferredStatusFilter = useDeferredValue(statusFilter)
  const deferredSearchFilter = useDeferredValue(searchFilter)

  const logParams: LogQueryParams = useMemo(
    () => ({
      date: selectedDate || availableDates[0],
      lines,
      level: level === 'all' ? undefined : level,
      source: source === 'all' ? undefined : source,
      requestId: normalizeTextInput(deferredRequestId),
      userId: normalizeTextInput(deferredUserId),
      module: normalizeTextInput(deferredModuleFilter),
      path: normalizeTextInput(deferredPathFilter),
      status: normalizeStatusInput(deferredStatusFilter),
      search: normalizeTextInput(deferredSearchFilter),
    }),
    [
      availableDates,
      deferredModuleFilter,
      deferredPathFilter,
      deferredRequestId,
      deferredSearchFilter,
      deferredStatusFilter,
      deferredUserId,
      level,
      lines,
      selectedDate,
      source,
    ],
  )

  const logsQuery = useQuery({
    queryKey: [scopeKey, 'logs', logParams],
    queryFn: () => loadLogs(logParams),
    staleTime: 20_000,
  })

  const logs = logsQuery.data?.logs ?? []
  const errorCount = logs.filter((entry) => String(entry.level).toLowerCase() === 'error').length
  const warnCount = logs.filter((entry) => String(entry.level).toLowerCase() === 'warn').length
  const infoCount = logs.filter((entry) => !entry.level || String(entry.level).toLowerCase() === 'info').length
  const hasActiveFilters = level !== 'all'
    || source !== 'all'
    || Boolean(requestId.trim())
    || Boolean(userId.trim())
    || Boolean(moduleFilter.trim())
    || Boolean(pathFilter.trim())
    || Boolean(statusFilter.trim())
    || Boolean(searchFilter.trim())

  function resetFilters(): void {
    setLevel('all')
    setSource('all')
    setLines(50)
    setRequestId('')
    setUserId('')
    setModuleFilter('')
    setPathFilter('')
    setStatusFilter('')
    setSearchFilter('')
  }

  return (
    <section id={id} className="page-card admin-page-card admin-card admin-logs-card">
      <div className="admin-card-header">
        <div>
          <div className="admin-card-eyebrow">{eyebrow}</div>
          <div className="admin-card-title-row">
            <h2 className="admin-card-title">{title}</h2>
            <span className="admin-card-counter">
              {logsQuery.isLoading ? 'Načítám…' : `${logs.length} záznamů`}
            </span>
          </div>
          <p className="admin-card-description">{description}</p>
        </div>
      </div>

      <div className="admin-log-toolbar">
        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-date`}>Den</label>
          <select
            id={`${scopeKey}-log-date`}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            disabled={filesQuery.isLoading || availableDates.length === 0}
          >
            {availableDates.length === 0 ? (
              <option value="">Dnešní log</option>
            ) : (
              availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-level`}>Úroveň</label>
          <select
            id={`${scopeKey}-log-level`}
            value={level}
            onChange={(event) => setLevel(event.target.value as 'all' | 'debug' | 'error' | 'warn' | 'info')}
          >
            <option value="all">Vše</option>
            <option value="debug">Jen debug</option>
            <option value="error">Jen chyby</option>
            <option value="warn">Jen warningy</option>
            <option value="info">Jen info</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-source`}>Zdroj</label>
          <select
            id={`${scopeKey}-log-source`}
            value={source}
            onChange={(event) => setSource(event.target.value as 'all' | 'backend' | 'frontend')}
          >
            <option value="all">Backend + frontend</option>
            <option value="backend">Jen backend</option>
            <option value="frontend">Jen frontend</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-lines`}>Rozsah</label>
          <select
            id={`${scopeKey}-log-lines`}
            value={String(lines)}
            onChange={(event) => setLines(Number(event.target.value))}
          >
            <option value="50">50 řádků</option>
            <option value="100">100 řádků</option>
            <option value="200">200 řádků</option>
            <option value="500">500 řádků</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-request-id`}>Request ID</label>
          <input
            id={`${scopeKey}-log-request-id`}
            type="text"
            value={requestId}
            placeholder="Např. 1a2b3c"
            onChange={(event) => setRequestId(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-user-id`}>User ID</label>
          <input
            id={`${scopeKey}-log-user-id`}
            type="text"
            value={userId}
            placeholder="UUID nebo actorId"
            onChange={(event) => setUserId(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-module`}>Modul</label>
          <input
            id={`${scopeKey}-log-module`}
            type="text"
            value={moduleFilter}
            placeholder="AUTH, INVITES, SHOPPING"
            onChange={(event) => setModuleFilter(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-path`}>Cesta</label>
          <input
            id={`${scopeKey}-log-path`}
            type="text"
            value={pathFilter}
            placeholder="/api/invites, /dashboard"
            onChange={(event) => setPathFilter(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-status`}>Status</label>
          <input
            id={`${scopeKey}-log-status`}
            type="text"
            inputMode="numeric"
            value={statusFilter}
            placeholder="500"
            onChange={(event) => setStatusFilter(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${scopeKey}-log-search`}>Text</label>
          <input
            id={`${scopeKey}-log-search`}
            type="text"
            value={searchFilter}
            placeholder="invite, SMTP, galerie"
            onChange={(event) => setSearchFilter(event.target.value)}
          />
        </div>

        <div className="admin-log-actions">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary admin-log-refresh"
              onClick={resetFilters}
            >
              Vyčistit filtry
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary admin-log-refresh"
            onClick={() => {
              void filesQuery.refetch()
              void logsQuery.refetch()
            }}
          >
            Obnovit logy
          </button>
        </div>
      </div>

      {filesQuery.isError ? (
        <FeatureErrorFallback
          error={filesQuery.error instanceof Error ? filesQuery.error : new Error('Nepodařilo se načíst seznam logů')}
          resetErrorBoundary={() => {
            void filesQuery.refetch()
          }}
          title="Seznam logů se nepodařilo načíst"
        />
      ) : logsQuery.isError ? (
        <FeatureErrorFallback
          error={logsQuery.error instanceof Error ? logsQuery.error : new Error('Nepodařilo se načíst logy')}
          resetErrorBoundary={() => {
            void logsQuery.refetch()
          }}
          title="Logy se nepodařilo načíst"
        />
      ) : logsQuery.isLoading ? (
        <div className="admin-inline-loader">
          <div className="spinner" />
          <span>Načítám logy…</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="admin-empty-state">
          <h3>Žádné logy pro tento filtr</h3>
          <p>Vyzkoušej jiný den, jinou úroveň logu nebo větší rozsah řádků.</p>
        </div>
      ) : (
        <>
          <div className="admin-log-summary">
            <span className="admin-log-summary-pill admin-log-summary-pill--error">{errorCount} error</span>
            <span className="admin-log-summary-pill admin-log-summary-pill--warn">{warnCount} warn</span>
            <span className="admin-log-summary-pill admin-log-summary-pill--info">{infoCount} info</span>
          </div>

          <div className="admin-log-list">
            {logs.map((entry, index) => (
              <details key={`${entry.time ?? 'time'}-${entry.msg ?? 'msg'}-${index}`} className="admin-log-item">
                <summary>
                  <div className="admin-log-item-main">
                    <span className={getLevelBadgeClass(typeof entry.level === 'string' ? entry.level : undefined)}>
                      {getLevelLabel(typeof entry.level === 'string' ? entry.level : undefined)}
                    </span>
                    <div className="admin-log-copy">
                      <strong>{entry.msg || 'Záznam bez zprávy'}</strong>
                      <span>
                        {formatLogTime(typeof entry.time === 'string' || typeof entry.time === 'number' ? entry.time : undefined)}
                      </span>
                      {buildMetaPills(entry).length > 0 && (
                        <div className="admin-log-meta">
                          {buildMetaPills(entry).map((pill) => (
                            <span key={pill} className="admin-log-meta-pill">
                              {pill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </summary>
                <pre className="admin-log-detail">{formatLogDetail(entry)}</pre>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
