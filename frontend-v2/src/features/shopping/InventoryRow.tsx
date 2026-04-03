/**
 * InventoryRow.tsx — Řádek položky v inventáři / spíži
 * Badge status: OK→badge-full, LOW→badge-low, EMPTY→badge-empty
 */
import type { InventoryItem } from '@/api/shopping'
import { useAuth } from '@/context/AuthContext'

interface Props {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onAddToCart: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

function getStatusBadge(status: InventoryItem['status']): { cls: string; label: string } {
  switch (status) {
    case 'OK':
      return { cls: 'badge badge-full', label: 'Dostatek' }
    case 'LOW':
      return { cls: 'badge badge-low', label: 'Málo' }
    case 'EMPTY':
      return { cls: 'badge badge-empty', label: 'Došlo' }
  }
}

export function InventoryRow({ item, onEdit, onAddToCart, onDelete }: Props) {
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'
  const badge = getStatusBadge(item.status)

  const showAddToCart = (item.status === 'LOW' || item.status === 'EMPTY') && !item.inCart

  return (
    <div
      className={`inventory-row${item.status === 'EMPTY' ? ' inventory-row--empty' : ''}`}
      data-id={item.id}
    >
      {/* Col 1: Status badge */}
      <span className={badge.cls}>{badge.label}</span>

      {/* Col 2: Item info */}
      <div className="inventory-row-info">
        <span className="inventory-row-name">{item.name}</span>
        {(item.location || item.updatedBy) && (
          <div className="inventory-row-meta">
            {item.location && <span>{item.location}</span>}
            {item.updatedBy && <span>{item.updatedBy.username}</span>}
          </div>
        )}
      </div>

      {/* Col 3: Actions */}
      <div className="inventory-row-actions">
        {item.inCart ? (
          <span className="inventory-row-in-cart">V nákupním seznamu</span>
        ) : showAddToCart ? (
          <button
            onClick={() => onAddToCart(item)}
            title="Přidat do nákupního seznamu"
            aria-label="Přidat do nákupního seznamu"
            className="inventory-row-add-btn"
          >
            <svg className="inventory-row-add-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="inventory-row-add-btn-text">Přidat do nákupu</span>
          </button>
        ) : null}
        {!isGuest && (
          <button
            onClick={() => onEdit(item)}
            title="Upravit"
            aria-label="Upravit zásobu"
            className="inventory-row-icon-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        )}
        {!isGuest && (
          <button
            onClick={() => onDelete(item)}
            title="Smazat"
            aria-label="Smazat zásobu"
            className="inventory-row-icon-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}
      </div>
    </div>
  )
}
