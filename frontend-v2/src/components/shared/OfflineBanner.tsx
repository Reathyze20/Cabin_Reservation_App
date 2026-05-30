/**
 * OfflineBanner.tsx — Překlad #offline-banner z vanilla app.
 *
 * Zobrazuje se top-of-page pro celý AppShell když uživatel ztratí připojení.
 * Používá VÝHRADNĚ originální CSS třídu `.offline-banner` z skeleton.css.
 * Žádné Tailwind, žádné shadcn, žádné Lucide ikony.
 *
 * CSS: src/styles/skeleton.css → .offline-banner
 */
import { useOnline } from '@/hooks/useOnline'

export function OfflineBanner() {
  const isOnline = useOnline()

  if (isOnline) return null

  return (
    <div className="offline-banner" role="alert" aria-live="polite" data-testid="offline-banner">
      {/* Unicode symbol — bez závislosti na icon knihovně */}
      <span aria-hidden="true">⚡</span>
      <span>Jste offline — některé obrazovky poběží z naposledy načtených dat. Nové změny po návratu spojení zkontrolujte.</span>
    </div>
  )
}
