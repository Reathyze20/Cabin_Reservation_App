/**
 * BulkAddToCartModal.tsx — Modál pro hromadné přidání EMPTY zásob do nákupního seznamu
 * Zobrazí aktivní (nearchivované) seznamy, uživatel vybere cílový a potvrdí.
 */
import { useState } from 'react'
import type { InventoryItem } from '@/api/shopping'
import { useShoppingLists } from './hooks/useShoppingLists'
import { useBulkAddToCart } from './hooks/useInventory'
import { Modal } from '@/components/shared/Modal'

interface Props {
  items: InventoryItem[]
  onClose: () => void
}

export function BulkAddToCartModal({ items, onClose }: Props) {
  const { data: lists = [] } = useShoppingLists()
  const bulkAdd = useBulkAddToCart()
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  const activeLists = lists.filter(l => !l.isResolved)
  const ids = items.map(i => i.id)

  async function handleConfirm() {
    if (!selectedListId) return
    try {
      await bulkAdd.mutateAsync({ ids, listId: selectedListId })
      onClose()
    } catch { /* onError in hook */ }
  }

  function getPendingCount(list: typeof activeLists[number]) {
    return list.items.filter(i => i.status !== 'purchased' && i.status !== 'bring_from_home').length
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Přidat ${items.length} chybějících zásob do nákupu`}
      maxWidth="max-w-sm"
    >
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 var(--space-md)' }}>
        Vyberte seznam, do kterého chcete přidat všechny položky se stavem „Došlo":
      </p>

      {activeLists.length === 0 ? (
        <p className="empty-state">Žádné aktivní nákupní seznamy. Nejdříve vytvořte seznam.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {activeLists.map(list => (
            <button
              key={list.id}
              className={`add-to-cart-list-btn button-secondary${selectedListId === list.id ? ' bulk-list-selected' : ''}`}
              onClick={() => setSelectedListId(list.id)}
              disabled={bulkAdd.isPending}
            >
              <span className="atc-list-name">{list.name}</span>
              <span className="atc-list-count">{getPendingCount(list)} nekoupených</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-md)', justifyContent: 'flex-end' }}>
        <button className="button-secondary" onClick={onClose} disabled={bulkAdd.isPending}>
          Zrušit
        </button>
        <button
          className="button-primary"
          onClick={handleConfirm}
          disabled={!selectedListId || bulkAdd.isPending || activeLists.length === 0}
        >
          {bulkAdd.isPending ? 'Přidávám…' : `Přidat ${items.length} položek`}
        </button>
      </div>
    </Modal>
  )
}
