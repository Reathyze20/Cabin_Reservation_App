/**
 * PantryView.tsx — Inventář / zásoby na chatě
 * Formulář přidání + seznam položek seskupených dle kategorie
 * Horizontální filter chips: Chybí, Vše, + per-kategorie
 */
import { useState, useMemo } from 'react'
import type { InventoryItem } from '@/api/shopping'
import { useInventory, useCreateInventoryItem, useDeleteInventoryItem } from './hooks/useInventory'
import { useAuth } from '@/context/AuthContext'
import { InventoryRow } from './InventoryRow'
import { EditInventoryModal } from './EditInventoryModal'
import { AddToCartModal } from './AddToCartModal'
import { BulkAddToCartModal } from './BulkAddToCartModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { showToast } from '@/lib/toast'
import { CATEGORY_ORDER, CATEGORY_LABELS } from './constants'
import { ShoppingErrorState } from './ShoppingErrorState'
import { getNetworkAwareActionMessage } from '@/lib/networkError'

type FilterKey = 'all' | 'missing' | typeof CATEGORY_ORDER[number]

interface Props {
  onBack: () => void
}

export function PantryView({ onBack }: Props) {
  const {
    data: inventory = [],
    isLoading,
    isError,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventory()
  const createItem = useCreateInventoryItem()
  const deleteItem = useDeleteInventoryItem()
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'

  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [cartItem, setCartItem] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // New item form state
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<typeof CATEGORY_ORDER[number]>('TRVANLIVÉ')
  const [newStatus, setNewStatus] = useState<InventoryItem['status']>('OK')
  const [newLocation, setNewLocation] = useState('')
  const [newEssential, setNewEssential] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [addItemError, setAddItemError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Computed: count missing (EMPTY only — LOW = málo, ne chybí) and per-category counts
  const missingCount = useMemo(() => inventory.filter(i => i.status === 'EMPTY').length, [inventory])

  // EMPTY items not yet in cart — for bulk add button
  const emptyNotInCart = useMemo(
    () => inventory.filter(i => i.status === 'EMPTY' && !i.inCart),
    [inventory]
  )
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORY_ORDER) {
      counts[cat] = inventory.filter(i => i.category === cat).length
    }
    // Count unknown categories as OSTATNÍ
    const unknownCount = inventory.filter(i => !(CATEGORY_ORDER as readonly string[]).includes(i.category)).length
    counts['OSTATNÍ'] = (counts['OSTATNÍ'] ?? 0) + unknownCount
    return counts
  }, [inventory])

  // Filtered inventory based on active filter
  const filteredInventory = useMemo(() => {
    if (activeFilter === 'all') return inventory
    if (activeFilter === 'missing') return inventory.filter(i => i.status === 'EMPTY')
    return inventory.filter(i => {
      if (activeFilter === 'OSTATNÍ') {
        return i.category === 'OSTATNÍ' || !(CATEGORY_ORDER as readonly string[]).includes(i.category)
      }
      return i.category === activeFilter
    })
  }, [inventory, activeFilter])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (name.length > 100) {
      showToast('Název zásoby je příliš dlouhý (max 100 znaků).', 'error')
      return
    }
    setAddItemError(null)
    try {
      await createItem.mutateAsync({
        name,
        category: newCategory,
        status: newStatus,
        location: newLocation.trim() || undefined,
        isEssential: newEssential,
      })
      setNewName('')
      setNewLocation('')
      setNewEssential(false)
      setNewStatus('OK')
    } catch (error) {
      setAddItemError(
        getNetworkAwareActionMessage(
          error,
          'Zásobu se nepodařilo přidat. Zkuste to znovu.',
          'Spojení vypadlo dřív, než se zásoba stihla přidat. Zkuste to znovu po obnovení připojení.',
        ),
      )
    }
  }

  // Skupiny dle kategorie (from filteredInventory)
  const grouped: Record<string, InventoryItem[]> = {}
  for (const cat of CATEGORY_ORDER) {
    const items = filteredInventory.filter(i => i.category === cat)
    if (items.length > 0) {
      grouped[cat] = items
    }
  }
  const unknownCats = filteredInventory.filter(
    i => !(CATEGORY_ORDER as readonly string[]).includes(i.category),
  )
  if (unknownCats.length > 0) {
    grouped['OSTATNÍ'] = [...(grouped['OSTATNÍ'] ?? []), ...unknownCats]
  }

  // Filter chips data
  const filterChips: { key: FilterKey; label: string; count: number; isDanger?: boolean }[] = [
    { key: 'missing', label: 'Chybí', count: missingCount, isDanger: true },
    { key: 'all', label: 'Vše', count: inventory.length },
    ...CATEGORY_ORDER
      .filter(cat => categoryCounts[cat] > 0)
      .map(cat => ({
        key: cat as FilterKey,
        label: CATEGORY_LABELS[cat],
        count: categoryCounts[cat],
      })),
  ]

  return (
    <section className="shopping-detail pantry-view-root">
    <div className="detail-content-wrapper pantry-content-wrapper">

      {/* This container locks EVERYTHING to a maximum width of 900px, creating perfect center alignment */}
      <div className="detail-inner-container pantry-inner-container">

        {/* ─── STICKY HEADER (never scrolls) ─── */}
        <div className="pantry-sticky-header">
          {/* HEADER — back + title inline on mobile */}
          <div className="detail-page-header pantry-header-compact">
            <button
              onClick={onBack}
              className="detail-back-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Zpět
            </button>
            <h2 className="detail-page-title">Zásoby na chatě</h2>
            <p className="detail-page-subtitle">Rychlý přehled všeho, co nesmí chybět.</p>
          </div>

          {/* FILTER CHIPS + BULK ACTION */}
          {inventory.length > 0 && (
            <div className="pantry-filter-bar" role="tablist" aria-label="Filtrovat zásoby">
              {filterChips.map(chip => (
                <button
                  key={chip.key}
                  role="tab"
                  aria-selected={activeFilter === chip.key}
                  className={`pantry-filter-chip${activeFilter === chip.key ? ' is-active' : ''}${chip.isDanger && chip.count > 0 ? ' is-danger' : ''}`}
                  onClick={() => setActiveFilter(chip.key)}
                >
                  {chip.label}
                  <span className="pantry-filter-chip-count">{chip.count}</span>
                </button>
              ))}
              {emptyNotInCart.length > 0 && (
                <button
                  className="pantry-bulk-chip"
                  onClick={() => setShowBulkAdd(true)}
                  aria-label={`Přidat ${emptyNotInCart.length} chybějících zásob do nákupu`}
                >
                  <span className="pantry-bulk-chip-icon">+</span>
                  Vše do nákupu
                  <span className="pantry-filter-chip-count">{emptyNotInCart.length}</span>
                </button>
              )}
            </div>
          )}

          {/* THE ADD FORM — collapsible on mobile */}
          {!isGuest && (
          <div className="pantry-add-section">
            <button
              type="button"
              className="pantry-add-toggle"
              onClick={() => setShowAddForm(v => !v)}
              aria-expanded={showAddForm}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Přidat zásobu
              <svg
                className={`pantry-add-toggle-chevron${showAddForm ? ' is-open' : ''}`}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className={`pantry-add-form-collapse${showAddForm ? ' is-open' : ''}`}>
              <div className="detail-form-card">
                <form
                  onSubmit={handleAddItem}
                  noValidate
                  className="pantry-form-grid"
                >
            {/* NÁZEV */}
            <div className="pantry-form-col-4">
              <label className="detail-form-label">Název</label>
              <input
                type="text"
                placeholder="např. Sůl, Káva"
                value={newName}
                onChange={e => {
                  if (addItemError) setAddItemError(null)
                  setNewName(e.target.value)
                }}
                maxLength={100}
                autoComplete="off"
                required
                className="detail-form-input"
              />
            </div>

            {/* UMÍSTĚNÍ */}
            <div className="pantry-form-col-3">
              <label className="detail-form-label">Kde to leží?</label>
              <input
                type="text"
                placeholder="Kumbál, Police..."
                value={newLocation}
                onChange={e => {
                  if (addItemError) setAddItemError(null)
                  setNewLocation(e.target.value)
                }}
                maxLength={100}
                autoComplete="off"
                className="detail-form-input"
              />
            </div>

            {/* KATEGORIE */}
            <div className="pantry-form-col-2">
              <label className="detail-form-label">Kategorie</label>
              <select
                value={newCategory}
                onChange={e => {
                  if (addItemError) setAddItemError(null)
                  setNewCategory(e.target.value as typeof CATEGORY_ORDER[number])
                }}
                className="detail-form-input"
              >
                {CATEGORY_ORDER.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>

            {/* STAV */}
            <div className="pantry-form-col-2">
              <label className="detail-form-label">Stav</label>
              <select
                value={newStatus}
                onChange={e => {
                  if (addItemError) setAddItemError(null)
                  setNewStatus(e.target.value as InventoryItem['status'])
                }}
                className="detail-form-input"
              >
                <option value="OK">Dostatek</option>
                <option value="LOW">Málo</option>
                <option value="EMPTY">Došlo</option>
              </select>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pantry-form-col-1">
              <button
                type="submit"
                disabled={createItem.isPending || !newName.trim()}
                className="add-form-submit-btn add-form-submit-btn--full-width"
              >
                +
              </button>
            </div>
          </form>
          {addItemError ? (
            <div className="error-message show" role="alert">{addItemError}</div>
          ) : null}
        </div>
            </div>{/* end pantry-add-form-collapse */}
          </div>
          )}
        </div>{/* end pantry-sticky-header */}

        {/* ─── SCROLLABLE LIST AREA ─── */}
        <div className="pantry-scroll-area">
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div className="spinner" />
            </div>
          ) : isError ? (
            <ShoppingErrorState
              title="Zásoby se nepodařilo načíst"
              error={inventoryError}
              onRetry={() => {
                void refetchInventory()
              }}
            />
          ) : inventory.length === 0 ? (
            <div className="detail-empty-state">
              <img src="/icons/empty_basket.svg" alt="" aria-hidden="true" style={{ maxHeight: 80, width: 'auto', opacity: 0.65, marginBottom: '0.5rem' }} />
              <h3 className="detail-empty-state-title">Žádné zásoby</h3>
              <p className="detail-empty-state-text">Přidejte první položku, kterou chcete na chatě sledovat.</p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="detail-empty-state">
              <p className="detail-empty-state-icon">✓</p>
              <h3 className="detail-empty-state-title">
                {activeFilter === 'missing' ? 'Vše je v pořádku!' : 'Žádné položky'}
              </h3>
              <p className="detail-empty-state-text">
                {activeFilter === 'missing'
                  ? 'Žádné zásoby aktuálně nechybí.'
                  : `V kategorii "${filterChips.find(c => c.key === activeFilter)?.label ?? activeFilter}" nejsou žádné zásoby.`}
              </p>
            </div>
          ) : (
            <>
              {CATEGORY_ORDER.map(cat => {
                const items = grouped[cat]
                if (!items) return null
                return (
                  <div key={cat} className="inventory-category-section">
                    <h3 className="inventory-category-heading">{cat}</h3>
                    <div className="detail-items-card">
                      {items.map(item => (
                        <InventoryRow
                          key={item.id}
                          item={item}
                          onEdit={setEditItem}
                          onAddToCart={setCartItem}
                          onDelete={(target) => {
                            setDeleteError(null)
                            setDeleteTarget(target)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

      </div>

      {/* Modály */}
      {editItem && (
        <EditInventoryModal
          item={editItem}
          onClose={() => setEditItem(null)}
        />
      )}
      {cartItem && (
        <AddToCartModal
          invId={cartItem.id}
          invName={cartItem.name}
          onClose={() => setCartItem(null)}
        />
      )}
      {showBulkAdd && (
        <BulkAddToCartModal
          items={emptyNotInCart}
          onClose={() => setShowBulkAdd(false)}
        />
      )}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Smazat zásobu"
        message={`Opravdu chcete smazat zásobu „${deleteTarget?.name ?? ''}"? Tato akce je nevratná.`}
        confirmLabel="Smazat"
        danger
        loading={deleteItem.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleteError(null)
          try {
            await deleteItem.mutateAsync(deleteTarget.id)
            setDeleteTarget(null)
          } catch (error) {
            setDeleteError(
              getNetworkAwareActionMessage(
                error,
                'Zásobu se nepodařilo smazat. Zkuste to znovu.',
                'Spojení vypadlo dřív, než se zásoba stihla smazat. Zkuste to znovu po obnovení připojení.',
              ),
            )
          }
        }}
        errorMessage={deleteError}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
    </section>
  )
}
