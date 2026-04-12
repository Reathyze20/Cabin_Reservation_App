/**
 * DiaryFolders.tsx — Grid složek deníku s filtrem období a hover akcemi
 */
import { useState } from 'react'
import type { DiaryFolder } from '@/api/diary'

type PeriodFilter = 'all' | 'current_year' | 'last_year' | 'older'

const TAG_ICONS: Record<string, string> = {
  relax: '○',
  party: '○',
  work: '○',
  mushroom: '○',
  hike: '○',
  family: '○',
}

function tagIcon(tag: string | null | undefined): string {
  return (tag && TAG_ICONS[tag]) ?? '○'
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return ''
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const s = new Date(start).toLocaleDateString('cs-CZ', opts)
  const e = end ? new Date(end).toLocaleDateString('cs-CZ', opts) : ''
  return e && e !== s ? `${s} — ${e}` : s
}

function filterFolders(folders: DiaryFolder[], period: PeriodFilter): DiaryFolder[] {
  if (period === 'all') return folders
  const now = new Date()
  const currentYear = now.getFullYear()
  const lastYear = currentYear - 1
  return folders.filter(f => {
    const year = f.startDate ? new Date(f.startDate).getFullYear() : null
    if (!year) return false
    if (period === 'current_year') return year === currentYear
    if (period === 'last_year') return year === lastYear
    if (period === 'older') return year < lastYear
    return true
  })
}

interface Props {
  folders: DiaryFolder[]
  onOpen: (folder: DiaryFolder) => void
  onRename: (folder: DiaryFolder) => void
  onDelete: (folder: DiaryFolder) => void
  onNewFolder: () => void
}

export function DiaryFolders({ folders, onOpen, onRename, onDelete, onNewFolder }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>('all')

  const visible = filterFolders(folders, period)

  return (
    <div className="diary-folders-view">
      <div className="diary-header">
        <div className="diary-header-left">
          <h1>Deník pobytů</h1>
          <p className="diary-subtitle">Záznamy z pobytů na chatě</p>
        </div>
        <div className="diary-header-actions">
          <div className="period-filter">
            {(['all', 'current_year', 'last_year', 'older'] as PeriodFilter[]).map(p => (
              <button
                key={p}
                className={`filter-btn${period === p ? ' active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {{ all: 'Vše', current_year: 'Letos', last_year: 'Loni', older: 'Starší' }[p]}
              </button>
            ))}
          </div>
          <button className="gallery-btn gallery-btn-primary" onClick={onNewFolder}>
            + Nový pobyt
          </button>
        </div>
      </div>

      {visible.length === 0 && (
        <p className="empty-state">Žádné záznamy pobytů.</p>
      )}

      <div className="diary-folders-grid">
        {visible.map(folder => (
          <div
            key={folder.id}
            className="folder-card diary-folder"
            onClick={() => onOpen(folder)}
          >
            <div className="folder-icon-large">{tagIcon(folder.activityTag)}</div>
            <div className="folder-info">
              <span className="folder-name">{folder.name}</span>
              {(folder.startDate || folder.endDate) && (
                <span className="folder-dates">
                  {formatDateRange(folder.startDate, folder.endDate)}
                </span>
              )}
              <div className="folder-stats-badges">
                {folder.stats && (
                  <>
                    <span className="badge">{folder.stats.entries} dnů</span>
                    <span className="badge">{folder.stats.photos} {folder.stats.photos === 1 ? 'fotka' : folder.stats.photos >= 2 && folder.stats.photos <= 4 ? 'fotky' : 'fotek'}</span>
                  </>
                )}
              </div>
            </div>
            <div className="folder-card-hover-actions" onClick={e => e.stopPropagation()}>
              <button
                className="icon-btn edit-folder-btn"
                title="Přejmenovat"
                onClick={() => onRename(folder)}
              >
                ✎
              </button>
              <button
                className="icon-btn delete-folder-btn"
                title="Smazat"
                onClick={() => onDelete(folder)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
