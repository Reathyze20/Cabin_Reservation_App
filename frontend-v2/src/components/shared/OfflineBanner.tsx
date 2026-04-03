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
    <div className="offline-banner" role="alert" aria-live="polite">
      {/* Unicode symbol — bez závislosti na icon knihovně */}
      <span aria-hidden="true">⚡</span>
      <span>Jste offline — změny budou synchronizovány po obnovení připojení.</span>
    </div>
  )
}
