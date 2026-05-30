import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import { useSystemInfo } from '@/features/admin/hooks/useAdmin'

export function SystemStatsPanel() {
  const { data, isLoading, isError, error, refetch } = useSystemInfo()

  if (isLoading) {
    return (
      <div className="system-skeleton-grid" data-testid="system-stats-panel" data-system-stats-state="loading">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton system-skeleton-card" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div data-testid="system-stats-panel" data-system-stats-state="error">
        <FeatureErrorFallback
          error={error instanceof Error ? error : new Error('Nepodařilo se načíst statistiky')}
          resetErrorBoundary={() => {
            void refetch()
          }}
          title="Statistiky se nepodařilo načíst"
        />
      </div>
    )
  }

  const stats = [
    { label: 'Uživatelé', value: data.userCount, meta: 'Všichni s přístupem do chaty', tone: 'users' },
    { label: 'Rezervace', value: data.reservationCount, meta: 'Všechna uložená obsazení', tone: 'reservations' },
    { label: 'Fotky', value: data.photoCount, meta: 'Galerie a vzpomínky', tone: 'photos' },
    { label: 'Zprávy', value: data.noteCount, meta: 'Chat a nástěnka', tone: 'messages' },
  ]

  return (
    <div id="sys-info-content" className="system-stats-grid" data-testid="system-stats-panel" data-system-stats-state="ready">
      {stats.map((stat) => (
        <div key={stat.label} className={`system-stat system-stat--${stat.tone}`} data-testid="system-stat-card" data-stat-tone={stat.tone}>
          <div className="stat-label">{stat.label}</div>
          <div className="stat-value">{stat.value}</div>
          <div className="stat-meta">{stat.meta}</div>
        </div>
      ))}
    </div>
  )
}