/**
 * BulkAddToCartModal.tsx — Modál pro hromadné přidání EMPTY zásob do nákupního seznamu
 * Zobrazí aktivní (nearchivované) seznamy, uživatel vybere cílový a potvrdí.
 */
import { useState } from 'react'
import type { InventoryItem } from '@/api/shopping'
import { useShoppingLists } from './hooks/useShoppingLists'
import { useBulkAddToCart } from './hooks/useInventory'
import { Modal } from '@/components/shared/Modal'
import {
  ShoppingErrorState,
  getShoppingActionErrorMessage,
} from './ShoppingErrorState'

interface Props {
  items: InventoryItem[]
  onClose: () => void
}

export function BulkAddToCartModal({ items, onClose }: Props) {
  const {
    data: lists = [],
    isLoading,
    isError,
    error: listsError,
    refetch: refetchLists,
  } = useShoppingLists()
  const bulkAdd = useBulkAddToCart()
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const activeLists = lists.filter(l => !l.isResolved)
  const ids = items.map(i => i.id)

  async function handleConfirm() {
    if (!selectedListId) return
    setSubmitError(null)
    try {
      await bulkAdd.mutateAsync({ ids, listId: selectedListId })
      onClose()
    } catch (error) {
      setSubmitError(
        getShoppingActionErrorMessage(
          error,
          'Chybějící zásoby se nepodařilo přidat do nákupu. Zkuste to znovu.',
          'Spojení vypadlo dřív, než se zásoby stihly přidat do nákupu. Zkuste to znovu po obnovení připojení.',
        ),
      )
    }
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
      footer={
        <div className="modal-dialog-actions">
          <button className="button-secondary" onClick={onClose} disabled={bulkAdd.isPending}>
            Zrušit
          </button>
          <button
            className="button-primary"
            onClick={handleConfirm}
            disabled={!selectedListId || bulkAdd.isPending || activeLists.length === 0 || isLoading || isError}
          >
            {bulkAdd.isPending ? 'Přidávám…' : `Přidat ${items.length} položek`}
          </button>
        </div>
      }
    >
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 var(--space-md)' }}>
        Vyberte seznam, do kterého chcete přidat všechny položky se stavem „Došlo":
      </p>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 18px' }}>
          <div className="spinner" />
        </div>
      ) : isError ? (
        <ShoppingErrorState
          variant="modal"
          title="Seznamy se nepodařilo načíst"
          error={listsError}
          onRetry={() => {
            void refetchLists()
          }}
          actionLabel="Načíst seznamy"
        />
      ) : activeLists.length === 0 ? (
        <p className="empty-state">Žádné aktivní nákupní seznamy. Nejdříve vytvořte seznam.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {activeLists.map(list => (
            <button
              key={list.id}
              className={`add-to-cart-list-btn button-secondary${selectedListId === list.id ? ' bulk-list-selected' : ''}`}
              onClick={() => {
                if (submitError) setSubmitError(null)
                setSelectedListId(list.id)
              }}
              disabled={bulkAdd.isPending}
            >
              <span className="atc-list-name">{list.name}</span>
              <span className="atc-list-count">{getPendingCount(list)} nekoupených</span>
            </button>
          ))}
        </div>
      )}

      {submitError ? (
        <p className="shopping-inline-error" role="alert">{submitError}</p>
      ) : null}
    </Modal>
  )
}
