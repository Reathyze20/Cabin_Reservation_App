/**
 * ItemRow.tsx — Řádek položky v nákupním seznamu
 * Klik na řádek → toggle purchased; tlačítka: z domova, důležité, smazat
 */
import { memo } from 'react'
import { motion } from 'framer-motion'
import type { ShoppingItem, ItemStatus } from '@/api/shopping'
import { useToggleItemStatus, useDeleteItem, useToggleItemEssential } from './hooks/useShoppingLists'
import { useAuth } from '@/context/AuthContext'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'

interface Props {
  item: ShoppingItem
  listCreatedById: string
}

function ItemRowInner({ item, listCreatedById }: Props) {
  const { user } = useAuth()
  const toggleStatus = useToggleItemStatus()
  const deleteItem = useDeleteItem()
  const toggleEssential = useToggleItemEssential()

  const isPurchased = item.status === 'purchased'
  const isFromHome = item.status === 'bring_from_home'
  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'
  const canDelete =
    item.addedById === user?.userId ||
    listCreatedById === user?.userId ||
    isAdmin

  const doneClass = isPurchased ? 'is-purchased' : isFromHome ? 'is-from-home' : ''
  const essentialClass = item.isEssential ? 'is-essential' : ''

  function handleRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.detail-item-actions')) return
    const newStatus: ItemStatus = isPurchased ? 'pending' : 'purchased'
    toggleStatus.mutate({ itemId: item.id, status: newStatus })
  }

  function handleFromHome(e: React.MouseEvent) {
    e.stopPropagation()
    const newStatus: ItemStatus = isFromHome ? 'pending' : 'bring_from_home'
    toggleStatus.mutate({ itemId: item.id, status: newStatus })
  }

  function handleEssential(e: React.MouseEvent) {
    e.stopPropagation()
    toggleEssential.mutate(item.id)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteItem.mutate(item.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`detail-item ${doneClass} ${essentialClass}`.trim()}
      data-testid="shopping-item-row"
      data-item-id={item.id}
      data-status={item.status}
      data-essential={String(item.isEssential)}
      onClick={handleRowClick}
    >
      <span className={`item-checkbox${isPurchased ? ' is-checked' : ''}`}>
        {isPurchased && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="detail-item-name">{item.name}</span>
      {item.isEssential && <span className="from-inventory-badge">Ze zásob</span>}
      {isPurchased && item.purchasedBy && (
        <span
          className="purchased-by-badge"
          title={`Koupil(a) ${item.purchasedBy.username}`}
        >
          <AnimalAvatar icon={item.purchasedBy.animalIcon ?? null} username={item.purchasedBy.username} size={20} />
        </span>
      )}
      <div className="detail-item-actions">
        {/* Z domova */}
        <button
          className={`btn-action btn-home${isFromHome ? ' is-active' : ''}`}
          title={isFromHome ? 'Zrušit „Z domova"' : 'Přivezu z domova'}
          aria-label={isFromHome ? 'Zrušit z domova' : 'Přivezu z domova'}
          data-item-id={item.id}
          onClick={handleFromHome}
          disabled={toggleStatus.isPending}
          data-testid="shopping-item-from-home-button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>

        {/* Důležité */}
        {!isGuest ? (
          <button
            className={`btn-action btn-essential${item.isEssential ? ' is-active' : ''}`}
            title={item.isEssential ? 'Zrušit jako důležité' : 'Označit jako důležité'}
            aria-label={item.isEssential ? 'Zrušit důležitost' : 'Označit jako důležité'}
            data-item-id={item.id}
            onClick={handleEssential}
            disabled={toggleEssential.isPending}
            data-testid="shopping-item-essential-button"
          >
            <span className={`critical-badge${item.isEssential ? ' is-active' : ''}`}>★</span>
          </button>
        ) : (
          item.isEssential ? <span className="critical-badge is-active">★</span> : null
        )}

        {/* Smazat */}
        {canDelete && (
          <button
            className="btn-action btn-delete-item"
            title="Smazat položku"
            aria-label="Smazat položku"
            data-item-id={item.id}
            onClick={handleDelete}
            disabled={deleteItem.isPending}
            data-testid="shopping-item-delete-button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  )
}

export const ItemRow = memo(ItemRowInner)
