/**
 * ListDetail.tsx — Pravý panel s detail vybraného nákupního seznamu
 * add-form + sorted items (items done → konec), back button for mobile
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { ShoppingList, ItemStatus } from '@/api/shopping'
import { useAddItem, useRenameList } from './hooks/useShoppingLists'
import { ItemRow } from './ItemRow'
import { showToast } from '@/lib/toast'
import { getNetworkAwareActionMessage } from '@/lib/networkError'

interface Props {
  list: ShoppingList | null
  onBack: () => void
}

function isDone(status: ItemStatus): boolean {
  return status === 'purchased' || status === 'bring_from_home'
}

export function ListDetail({ list, onBack }: Props) {
  const [newItemName, setNewItemName] = useState('')
  const [addItemError, setAddItemError] = useState<string | null>(null)
  const addItem = useAddItem()
  const renameList = useRenameList()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus input when list changes
  useEffect(() => {
    if (list) inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list?.id])

  // Reset editing state when list changes
  useEffect(() => {
    setIsEditing(false)
    setAddItemError(null)
  }, [list?.id])

  const startEditing = useCallback(() => {
    if (!list) return
    setEditName(list.name)
    setIsEditing(true)
    requestAnimationFrame(() => titleInputRef.current?.select())
  }, [list])

  const commitRename = useCallback(() => {
    if (!list) return
    const trimmed = editName.trim()
    setIsEditing(false)
    if (!trimmed || trimmed === list.name) return
    if (trimmed.length > 100) {
      showToast('Název je příliš dlouhý (max 100 znaků).', 'error')
      return
    }
    renameList.mutate({ id: list.id, name: trimmed })
  }, [list, editName, renameList])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRename() }
    if (e.key === 'Escape') { setIsEditing(false) }
  }, [commitRename])

  if (!list) {
    return (
      <section className="shopping-detail" id="shopping-detail" data-testid="shopping-list-detail">
        <div className="detail-placeholder">
          <img src="/icons/empty_basket.svg" alt="" aria-hidden="true" style={{ maxHeight: 80, width: 'auto', opacity: 0.65, marginBottom: '0.5rem' }} />
          <p className="detail-placeholder-title">Vyberte nákupní seznam</p>
          <p className="detail-placeholder-hint">Klikněte na seznam vlevo, nebo vytvořte nový.</p>
        </div>
      </section>
    )
  }

  const totalItems = list.items.length
  const doneItems = list.items.filter(i => isDone(i.status)).length

  const sorted = [...list.items].sort((a, b) => {
    const aDone = isDone(a.status) ? 1 : 0
    const bDone = isDone(b.status) ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name) return
    if (name.length > 100) {
      showToast('Název položky je příliš dlouhý (max 100 znaků).', 'error')
      return
    }
    setAddItemError(null)
    try {
      await addItem.mutateAsync({ listId: list!.id, name })
      setNewItemName('')
      inputRef.current?.focus()
    } catch (error) {
      setAddItemError(
        getNetworkAwareActionMessage(
          error,
          'Položku se nepodařilo přidat. Zkuste to znovu.',
          'Spojení vypadlo dřív, než se položka stihla přidat. Zkuste to znovu po obnovení připojení.',
        ),
      )
    }
  }

  return (
    <section className="shopping-detail" id="shopping-detail" data-testid="shopping-list-detail">
      <div className="detail-content-wrapper">

        {/* Centered max-width container — matches PantryView */}
        <div className="detail-inner-container">

          {/* HEADER — compact: title + inline form row */}
          <div className="detail-page-header">
            <button
              className="detail-back-btn"
              id="detail-back-btn"
              onClick={onBack}
              data-testid="shopping-detail-back-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Zpět
            </button>
            <h2 className="detail-page-title">
              {isEditing ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  className="detail-title-edit"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleTitleKeyDown}
                  maxLength={100}
                  autoComplete="off"
                />
              ) : (
                <span
                  className="detail-title-text"
                  onClick={startEditing}
                  title="Klikněte pro přejmenování"
                >
                  {list.name}
                  <svg className="detail-title-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </span>
              )}
            </h2>
            <div className="detail-header-row">
              <span className="detail-page-subtitle">{doneItems}/{totalItems}</span>
              <form
                id="detail-add-form"
                data-list-id={list.id}
                onSubmit={handleAddItem}
                noValidate
                className="detail-inline-form"
                data-testid="shopping-add-item-form"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Přidat položku…"
                  maxLength={100}
                  required
                  autoComplete="off"
                  value={newItemName}
                  onChange={e => {
                    if (addItemError) setAddItemError(null)
                    setNewItemName(e.target.value)
                  }}
                  className="detail-form-input"
                  data-testid="shopping-add-item-input"
                />
                <button
                  type="submit"
                  title="Přidat položku"
                  disabled={addItem.isPending || !newItemName.trim()}
                  className="add-form-submit-btn"
                  data-testid="shopping-add-item-button"
                >
                  +
                </button>
              </form>
            </div>
            {addItemError ? (
              <div className="error-message show" role="alert">{addItemError}</div>
            ) : null}
          </div>

          {/* ITEMS — White card wrapper matching PantryView */}
          <div>
            {sorted.length === 0 ? (
              <div className="detail-empty-state">
                <img src="/icons/empty_basket.svg" alt="" aria-hidden="true" style={{ maxHeight: 80, width: 'auto', opacity: 0.65, marginBottom: '0.5rem' }} />
                <h3 className="detail-empty-state-title">Košík je prázdný</h3>
                <p className="detail-empty-state-text">Přidejte první položku.</p>
              </div>
            ) : (
              <div className="detail-items-card">
                <AnimatePresence mode="popLayout">
                  {sorted.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      listCreatedById={list.createdById}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}
