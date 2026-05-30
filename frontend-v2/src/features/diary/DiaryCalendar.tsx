/**
 * DiaryCalendar.tsx — Kalendář dnů pobytu uvnitř složky deníku
 * Loop od startDate do endDate, každý den = .diary-day-card
 */
import type { DiaryEntry, DiaryFolder } from '@/api/diary'

interface Props {
  folder: DiaryFolder
  entries: DiaryEntry[]
  onOpenNotebook: (dateObj: Date, entry: DiaryEntry | undefined) => void
}

const WEEKDAY_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']

export function DiaryCalendar({ folder, entries, onOpenNotebook }: Props) {
  // Generuj pole dnů od startDate do endDate
  const days: Date[] = []
  if (folder.startDate && folder.endDate) {
    const start = new Date(folder.startDate)
    const end = new Date(folder.endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    const cur = new Date(start)
    while (cur <= end) {
      days.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
  }

  // Map date-string → entry
  const entryByDate = new Map<string, DiaryEntry>()
  for (const e of entries) {
    entryByDate.set(e.date.slice(0, 10), e)
  }

  return (
    <div className="diary-calendar-wrapper" data-testid="diary-calendar-wrapper">
      <div className="diary-calendar" data-testid="diary-calendar">
        {days.length === 0 && (
          <p className="empty-state">Složka nemá nastavené datum pobytu.</p>
        )}
        {days.map(day => {
          const key = day.toISOString().slice(0, 10)
          const entry = entryByDate.get(key)
          const hasEntry = !!entry
          const preview = entry?.content
            ? entry.content.length > 50
              ? entry.content.slice(0, 50) + '…'
              : entry.content
            : ''
          const hasPhotos = (entry?.galleryPhotoIds?.length ?? 0) > 0

          return (
            <div
              key={key}
              className={`diary-day-card${hasEntry ? ' has-entry' : ''}`}
              onClick={() => onOpenNotebook(day, entry)}
              data-testid="diary-day-card"
              data-date={key}
            >
              <div className="day-header-row">
                <span className="day-weekday">{WEEKDAY_SHORT[day.getDay()]}</span>
              </div>
              <div className="day-number">{day.getDate()}</div>
              {preview && (
                <div className="entry-preview">
                  {preview}
                  {hasPhotos && ' •'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
