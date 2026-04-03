/**
 * AddToCartModal.tsx — Modál pro přidání zásoby z inventáře do nákupního seznamu
 * Zobrazí aktivní (neresolved) seznamy, nebo formulář pro vytvoření nového.
 */
import { useState, useRef } from 'react'
import type { ShoppingList } from '@/api/shopping'
import { useShoppingLists } from './hooks/useShoppingLists'
import { useAddInventoryToCart } from './hooks/useInventory'
import { Modal } from '@/components/shared/Modal'

interface Props {
  invId: string
  invName: string
  onClose: () => void
}

export function AddToCartModal({ invId, invName, onClose }: Props) {
  const { data: lists = [] } = useShoppingLists()
  const addToCart = useAddInventoryToCart()
  const [newListName, setNewListName] = useState('')
  const [showNewListForm, setShowNewListForm] = useState(false)
  const newListRef = useRef<HTMLInputElement>(null)

  const activeLists = lists.filter(l => !l.isResolved)

  function getPendingCount(list: ShoppingList) {
    const pending = list.items.filter(i => i.status !== 'purchased' && i.status !== 'bring_from_home').length
    return `${pending} nekoupených`
  }

  async function handleSelectList(listId: string) {
    await addToCart.mutateAsync({ id: invId, payload: { listId } })
    onClose()
  }

  async function handleNewList(e: React.FormEvent) {
    e.preventDefault()
    const name = newListName.trim()
    if (!name) return
    await addToCart.mutateAsync({ id: invId, payload: { newListName: name } })
    onClose()
  }

  function handleShowNewForm() {
    setShowNewListForm(true)
    setTimeout(() => newListRef.current?.focus(), 50)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Přidat „${invName}“ do nákupu`}
      maxWidth="max-w-sm"
    >
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 var(--space-md)' }}>
        Vyberte, do kterého seznamu chcete položku přidat:
      </p>
      <div>
        {activeLists.length === 0 ? (
          <p className="empty-state">Žádné aktivní nákupní seznamy.</p>
        ) : (
          activeLists.map(list => (
            <button
              key={list.id}
              className="add-to-cart-list-btn button-secondary"
              onClick={() => handleSelectList(list.id)}
              disabled={addToCart.isPending}
            >
              <span className="atc-list-name">{list.name}</span>
              <span className="atc-list-count">{getPendingCount(list)}</span>
            </button>
          ))
        )}
      </div>

      <div className="modal-divider">— nebo vytvořte nový —</div>

      {!showNewListForm ? (
        <button className="add-to-cart-list-btn" onClick={handleShowNewForm}>
          + Vytvořit nový seznam
        </button>
      ) : (
        <form onSubmit={handleNewList} noValidate style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-sm)' }}>
          <input
            ref={newListRef}
            className="form-input"
            type="text"
            placeholder="Název nového seznamu..."
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            maxLength={100}
            required
            style={{ flex: 1, minWidth: 0 }}
          />
          <button
            type="submit"
            className="button-primary"
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            disabled={addToCart.isPending || !newListName.trim()}
          >
            Vytvořit
          </button>
        </form>
      )}
    </Modal>
  )
}
