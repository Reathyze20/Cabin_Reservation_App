import { Link } from 'react-router-dom'
import { ArrowLeft, Settings, TicketPlus, UserPlus } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { LogsPanel } from '@/components/shared/LogsPanel'
import { adminApi } from '@/api/admin'
import { AdminSectionMenu } from '@/features/admin/components/AdminSectionMenu'
import { SystemStatsPanel } from '@/features/admin/components/SystemStatsPanel'

const supportSteps = [
  'Vezměte kód chyby z toastu nebo fallback obrazovky.',
  'Vložte ho do filtru Request ID nebo Text a omezte zdroj na frontend nebo backend.',
  'Když kód nemáte, filtrujte podle uživatele, cesty a HTTP statusu 500.',
  'Detail logu pak spojí request, modul, cestu i support stopu do jednoho místa.',
]

export function AdminDiagnosticsPage() {
  useDocumentTitle('Diagnostika')

  return (
    <div className="main-content-admin pb-20 md:pb-0" data-testid="admin-diagnostics-page">
      <section className="page-card admin-page-card admin-overview-card admin-diagnostics-hero" data-testid="admin-diagnostics-hero">
        <div className="admin-overview-header">
          <div className="admin-overview-copy admin-overview-copy--wide">
            <span className="admin-kicker">Diagnostika</span>
            <h1 className="admin-page-title admin-page-title--wide">Velká stránka pro incidenty, logy a support kódy</h1>
            <p className="admin-page-lead">
              Když rodina nahlásí problém, nehledáte po více panelech. Tady máte systémové logy, request ID, support workflow i rychlý stav aplikace na jednom místě.
            </p>
          </div>

          <div className="admin-hero-actions">
            <Link to="/admin" className="btn btn-secondary">
              <ArrowLeft size={16} />
              Zpět do správy
            </Link>
            <Link to="/admin/cabin" className="btn btn-secondary">
              <Settings size={16} />
              Nastavení chaty
            </Link>
          </div>
        </div>

        <AdminSectionMenu active="diagnostics" />

        <div className="admin-diagnostics-summary">
          <article className="admin-diagnostics-summary-card admin-diagnostics-summary-card--forest">
            <strong>Rychlý postup</strong>
            <span>Vezměte support kód, filtrujte logy a dohledejte request bez SSH skákání po serveru.</span>
          </article>
          <article className="admin-diagnostics-summary-card admin-diagnostics-summary-card--mist">
            <strong>Frontend i backend</strong>
            <span>Panel umí míchat klientské chyby, warningy i HTTP provoz podle jedné společné stopy.</span>
          </article>
          <article className="admin-diagnostics-summary-card admin-diagnostics-summary-card--sand">
            <strong>Navazující akce</strong>
            <span>Ze supportu se hned vrátíte na členy, pozvánky nebo nastavení, když problém souvisí s oprávněním nebo konfigurací.</span>
          </article>
        </div>
      </section>

      <div className="admin-diagnostics-layout">
        <section className="page-card admin-page-card admin-card admin-diagnostics-primary" id="diagnostics-guide" data-testid="admin-diagnostics-guide">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-eyebrow">Support workflow</div>
              <div className="admin-card-title-row">
                <h2 className="admin-card-title">Jak incident dohledat bez zdržení</h2>
              </div>
              <p className="admin-card-description">
                Místo dlouhého popisu od rodiny potřebujete jen přibližný čas, obrazovku nebo support kód. Zbytek si dohledáte tady.
              </p>
            </div>
          </div>

          <ol className="admin-support-steps">
            {supportSteps.map((step, index) => (
              <li key={step}>
                <strong>{index + 1}.</strong>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="admin-diagnostics-quicklinks">
            <Link to="/admin" className="btn btn-secondary">
              <UserPlus size={16} />
              Členové a role
            </Link>
            <Link to="/admin/invites" className="btn btn-secondary">
              <TicketPlus size={16} />
              Pozvánky
            </Link>
            <Link to="/admin/cabin" className="btn btn-secondary">
              <Settings size={16} />
              Nastavení chaty
            </Link>
          </div>
        </section>

        <section className="page-card admin-page-card admin-card admin-diagnostics-secondary" id="system-info" data-testid="admin-diagnostics-system-info">
          <div className="admin-card-header">
            <div>
              <div className="admin-card-eyebrow">Snapshot systému</div>
              <div className="admin-card-title-row">
                <h2 className="admin-card-title">Stav aplikace</h2>
              </div>
              <p className="admin-card-description">
                Než půjdete do detailu logů, rychle si ověřte, jestli je problém izolovaný nebo systémový.
              </p>
            </div>
          </div>
          <SystemStatsPanel />
        </section>
      </div>

      <LogsPanel
        id="system-logs"
        scopeKey="admin-diagnostics"
        eyebrow="Diagnostika"
        title="Systémové logy"
        description="Velký pracovní panel pro incidenty, filtry podle request ID a dohledání backendových i frontendových chyb bez sahání do serveru."
        loadLogFiles={adminApi.getLogFiles}
        loadLogs={adminApi.getLogs}
      />
    </div>
  )
}