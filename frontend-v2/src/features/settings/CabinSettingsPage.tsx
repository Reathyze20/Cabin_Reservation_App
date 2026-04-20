/**
 * features/settings/CabinSettingsPage.tsx
 * Admin-only cabin configuration: name, description, checklist, features.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useCabinSettings, useUpdateCabinSettings } from './hooks/useCabinSettings'
import { showToast } from '@/lib/toast'
import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import { getNetworkAwareActionMessage } from '@/lib/networkError'

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_CHECKLIST = [
  'Vypnuto a vypuštěno topení/voda',
  'Zavřené okenice',
  'Vybraný popel z kamen',
  'Vyprázdněná lednice',
  'Zamčeno',
]

const AVAILABLE_FEATURES = [
  { key: 'reservations', label: 'Rezervace', description: 'Kalendář rezervací chaty' },
  { key: 'shopping', label: 'Nákupy', description: 'Nákupní seznamy a zásoby' },
  { key: 'notes', label: 'Chat', description: 'Nástěnka a vlákna zpráv' },
  { key: 'gallery', label: 'Galerie', description: 'Fotoalbum a vzpomínky' },
  { key: 'diary', label: 'Deník', description: 'Deník pobytů' },
  { key: 'reconstruction', label: 'Rekonstrukce', description: 'Kanban board — nápady, firmy, úkoly' },
  { key: 'inventory', label: 'Zásoby', description: 'Správa zásob na chatě' },
]

type TabId = 'tab-basic' | 'tab-operations' | 'tab-modules'

interface CabinSettingsPanelProps {
  title?: string
  subtitle?: string
  showBackButton?: boolean
  onBack?: () => void
}

// ─── ChecklistEditor ──────────────────────────────────────────────────────────

interface ChecklistEditorProps {
  items: string[]
  onChange: (items: string[]) => void
}

function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  function update(index: number, value: string) {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function add() {
    if (items.length >= 15) {
      showToast('Maximálně 15 položek v checklistu.', 'error')
      return
    }
    onChange([...items, ''])
  }

  return (
    <div>
      <div id="cs-checklist-container" className="cs-checklist">
        {items.map((item, i) => (
          <div key={i} className="cs-checklist-item" data-index={i}>
            <span className="cs-checklist-drag">⠿</span>
            <input
              type="text"
              className="cs-checklist-input"
              value={item}
              onChange={(e) => update(i, e.target.value)}
              maxLength={100}
              placeholder="Položka checklistu"
            />
            <button
              type="button"
              className="cs-checklist-remove"
              title="Odebrat"
              onClick={() => remove(i)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="cs-btn-add" id="cs-add-checklist-item" onClick={add}>
        + Přidat položku
      </button>
    </div>
  )
}

// ─── FeatureToggles ───────────────────────────────────────────────────────────

interface FeatureTogglesProps {
  features: Record<string, boolean>
  onChange: (features: Record<string, boolean>) => void
}

function FeatureToggles({ features, onChange }: FeatureTogglesProps) {
  function toggle(key: string, enabled: boolean) {
    onChange({ ...features, [key]: enabled })
  }

  return (
    <div className="cs-features-list">
      {AVAILABLE_FEATURES.map((f) => (
        <label key={f.key} className="cs-feature-item">
          <div className="cs-feature-info">
            <strong>{f.label}</strong>
            <span>{f.description}</span>
          </div>
          <input
            type="checkbox"
            className="cs-feature-toggle"
            data-feature={f.key}
            checked={features[f.key] !== false}
            onChange={(e) => toggle(f.key, e.target.checked)}
          />
        </label>
      ))}
    </div>
  )
}

// ─── CharCounter ──────────────────────────────────────────────────────────────

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length
  const isNear = len > max * 0.9
  return (
    <span className="cs-counter">
      <span style={{ color: isNear ? 'var(--color-danger, #ef4444)' : undefined }}>{len}</span>/{max}
    </span>
  )
}

// ─── CabinSettingsPanel ───────────────────────────────────────────────────────

export function CabinSettingsPanel({
  title = 'Nastavení chaty',
  subtitle = 'Přizpůsobte si svou chatu podle sebe',
  showBackButton = false,
  onBack,
}: CabinSettingsPanelProps) {
  const { isAdmin } = useAuth()
  const {
    data: settings,
    isLoading,
    isError,
    error: settingsError,
    refetch: refetchSettings,
  } = useCabinSettings()
  const updateSettings = useUpdateCabinSettings()

  const [activeTab, setActiveTab] = useState<TabId>('tab-basic')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [weatherLocation, setWeatherLocation] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [rules, setRules] = useState('')
  const [isWinterized, setIsWinterized] = useState(false)
  const [checklist, setChecklist] = useState<string[]>(DEFAULT_CHECKLIST)
  const [features, setFeatures] = useState<Record<string, boolean>>({})

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Populate form when data loads
  useEffect(() => {
    if (!settings) return
    setName(settings.name ?? '')
    setDescription(settings.description ?? '')
    setWeatherLocation(settings.weatherLocation ?? '')
    setWelcomeMessage(settings.welcomeMessage ?? '')
    setRules(settings.rules ?? '')
    setIsWinterized(settings.isWinterized ?? false)
    setChecklist(settings.departureChecklist?.length ? settings.departureChecklist : DEFAULT_CHECKLIST)
    setFeatures(settings.features ?? {})
  }, [settings])

  const clearSaveFeedback = useCallback(() => {
    if (saveError) setSaveError(null)
    if (saveSuccess) setSaveSuccess(false)
  }, [saveError, saveSuccess])

  const doSave = useCallback(() => {
    if (name.trim().length < 2) {
      showToast('Název chaty musí mít alespoň 2 znaky.', 'error')
      return
    }

    const cleanChecklist = checklist.map((s) => s.trim()).filter((s) => s.length > 0)

    setSaveError(null)
    setSaveSuccess(false)

    updateSettings.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        welcomeMessage: welcomeMessage.trim() || null,
        weatherLocation: weatherLocation.trim() || null,
        rules: rules.trim() || null,
        departureChecklist: cleanChecklist,
        isWinterized,
        features,
      },
      {
        onSuccess: () => {
          setSaveError(null)
          showToast('Nastavení uloženo', 'success')
          setSaveSuccess(true)
          if (successTimerRef.current) clearTimeout(successTimerRef.current)
          successTimerRef.current = setTimeout(() => setSaveSuccess(false), 2500)
        },
        onError: (error) => {
          setSaveError(
            getNetworkAwareActionMessage(
              error,
              'Nastavení chaty se nepodařilo uložit. Zkuste to znovu.',
              'Spojení vypadlo dřív, než se nastavení chaty stihlo uložit. Zkuste to znovu po obnovení připojení.',
            ),
          )
        },
      },
    )
  }, [name, description, welcomeMessage, weatherLocation, rules, isWinterized, checklist, features, updateSettings])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      doSave()
    },
    [doSave],
  )

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  // Guard: admin only
  if (!isAdmin) {
    return (
      <div className="main-content-settings">
        <div className="page-card settings-page-card" style={{ padding: '28px' }}>
          <h1 className="cs-title">Přístup odepřen</h1>
          <p className="cs-subtitle">Tato stránka je dostupná pouze pro administrátory.</p>
        </div>
      </div>
    )
  }

  const TAB_LABELS: Record<TabId, string> = {
    'tab-basic': 'Základní',
    'tab-operations': 'Provoz a údržba',
    'tab-modules': 'Moduly',
  }

  const saveBtnText = updateSettings.isPending ? 'Ukládám…' : saveSuccess ? 'Uloženo' : 'Uložit změny'

  return (
    <div className="main-content-settings">
      <div className="page-card settings-page-card">

        {/* ── Header ── */}
        <div className="cs-header">
          <div className="cs-header-left">
            {showBackButton ? (
              <button
                className="cabin-settings-back"
                title="Zpět na správu chaty"
                onClick={onBack}
              >
                ←
              </button>
            ) : null}
            <div>
              <h1 className="cs-title">{title}</h1>
              <p className="cs-subtitle">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={`cs-btn-save${saveSuccess ? ' cs-btn-save--success' : ''}`}
            onClick={doSave}
            disabled={updateSettings.isPending}
          >
            {saveBtnText}
          </button>
        </div>
        {saveError ? (
          <div className="error-message show" role="alert">{saveError}</div>
        ) : null}

        {/* ── Tabs ── */}
        <div className="cs-tabs">
          {(['tab-basic', 'tab-operations', 'tab-modules'] as TabId[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`cs-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="cs-body">
          {isLoading ? (
            <div className="cabin-settings-loading">
              <div className="spinner" />
              <p>Načítám nastavení…</p>
            </div>
          ) : isError ? (
            <FeatureErrorFallback
              error={settingsError instanceof Error ? settingsError : new Error('Nepodařilo se načíst nastavení chaty')}
              resetErrorBoundary={() => {
                void refetchSettings()
              }}
              title="Nastavení chaty se nepodařilo načíst"
            />
          ) : (
            <form id="cs-form" className="cabin-settings-form" noValidate onSubmit={handleSubmit} onChangeCapture={clearSaveFeedback}>
              {/* Tab 1: Basic */}
              <div className={`cs-tab-pane${activeTab === 'tab-basic' ? ' active' : ''}`} id="tab-basic">
                <section className="cs-section">
                  <div className="cs-section-header">
                    <h2>Základní informace</h2>
                    <p>Jak se vaše chata jmenuje a kde se nachází</p>
                  </div>

                  <div className="cs-field">
                    <label htmlFor="cs-name">Název chaty</label>
                    <input
                      type="text"
                      id="cs-name"
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="např. Chalupa pod Kletí"
                      required
                    />
                    <span className="cs-hint">Zobrazuje se v navigaci a pozvánkách</span>
                  </div>

                  <div className="cs-field">
                    <label htmlFor="cs-description">
                      Popis <span className="cs-optional">(nepovinné)</span>
                    </label>
                    <textarea
                      id="cs-description"
                      maxLength={2000}
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Útulná chaloupka v podhůří Kleti s krásným výhledem…"
                    />
                    <CharCounter value={description} max={2000} />
                  </div>

                  <div className="cs-field">
                    <label htmlFor="cs-weather-location">
                      Přibližná lokalita (pro počasí){' '}
                      <span className="cs-optional">(nepovinné)</span>
                    </label>
                    <input
                      type="text"
                      id="cs-weather-location"
                      maxLength={100}
                      value={weatherLocation}
                      onChange={(e) => setWeatherLocation(e.target.value)}
                      placeholder="Např. Třebenice nebo 412 01"
                    />
                    <span className="cs-hint">
                      Z bezpečnostních důvodů úmyslně neukládáme přesnou adresu ani GPS vaší chaty.
                      K zobrazení počasí nám stačí pouze název nejbližší obce nebo PSČ.
                    </span>
                  </div>
                </section>

                <section className="cs-section">
                  <div className="cs-section-header">
                    <h2>Uvítání a pravidla</h2>
                    <p>Nastavte tón komunikace vaší chaty</p>
                  </div>

                  <div className="cs-field">
                    <label htmlFor="cs-welcome">Uvítací zpráva / motto</label>
                    <input
                      type="text"
                      id="cs-welcome"
                      maxLength={300}
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="např. U nás je vždy příjemně — ať prší nebo svítí"
                    />
                    <span className="cs-hint">Zobrazí se novým členům v pozvánce a na dashboardu</span>
                  </div>

                  <div className="cs-field">
                    <label htmlFor="cs-rules">
                      Domácí řád <span className="cs-optional">(nepovinné)</span>
                    </label>
                    <textarea
                      id="cs-rules"
                      maxLength={5000}
                      rows={6}
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      placeholder={'1. Při odjezdu zavřít okna a okenice\n2. Dřevo nosit z kůlny, ne od sousedů'}
                    />
                    <CharCounter value={rules} max={5000} />
                  </div>
                </section>
              </div>

              {/* Tab 2: Operations */}
              <div className={`cs-tab-pane${activeTab === 'tab-operations' ? ' active' : ''}`} id="tab-operations">
                <section className="cs-section">
                  <div className="cs-section-header">
                    <h2>Odjezdový checklist</h2>
                    <p>Co zkontrolovat před uzamčením chaty</p>
                  </div>
                  <ChecklistEditor
                    items={checklist}
                    onChange={(items) => {
                      clearSaveFeedback()
                      setChecklist(items)
                    }}
                  />
                </section>

                <section className="cs-section">
                  <div className="cs-section-header">
                    <h2>Zazimování</h2>
                    <p>Stav chaty v zimním období</p>
                  </div>
                  <label className="cs-toggle-row">
                    <input
                      type="checkbox"
                      id="cs-winterized"
                      checked={isWinterized}
                      onChange={(e) => setIsWinterized(e.target.checked)}
                    />
                    <span className="cs-toggle-label">Chata je zazimovaná</span>
                    <span className="cs-hint" style={{ margin: 0 }}>
                      Zapojí mrazové výstrahy a speciální režim
                    </span>
                  </label>
                </section>
              </div>

              {/* Tab 3: Modules */}
              <div className={`cs-tab-pane${activeTab === 'tab-modules' ? ' active' : ''}`} id="tab-modules">
                <section className="cs-section">
                  <div className="cs-section-header">
                    <h2>Aktivní moduly</h2>
                    <p>Zapněte nebo vypněte funkce podle potřeb vaší rodiny</p>
                  </div>
                  <FeatureToggles
                    features={features}
                    onChange={(nextFeatures) => {
                      clearSaveFeedback()
                      setFeatures(nextFeatures)
                    }}
                  />
                </section>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── CabinSettingsPage ────────────────────────────────────────────────────────

export function CabinSettingsPage() {
  useDocumentTitle('Správa chaty')
  const navigate = useNavigate()

  return (
    <div className="main-content-settings">
      <div className="page-card settings-page-card">
        <CabinSettingsPanel
          showBackButton={true}
          onBack={() => navigate('/admin')}
        />
      </div>
    </div>
  )
}
