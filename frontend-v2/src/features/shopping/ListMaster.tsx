/**
 * ListMaster.tsx — Levý panel pro výběr nákupního seznamu
 */
import { motion, AnimatePresence } from 'framer-motion'
import type { ShoppingList } from '@/api/shopping'
import { useAuth } from '@/context/AuthContext'

interface Props {
  lists: ShoppingList[]
  selectedListId: string | null
  onSelect: (id: string) => void
  onShare: (list: ShoppingList) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onNewList: () => void
}

function isDone(status: ShoppingList['items'][number]['status']): boolean {
  return status === 'purchased' || status === 'bring_from_home'
}

export function ListMaster({
  lists,
  selectedListId,
  onSelect,
  onShare,
  onArchive,
  onDelete,
  onNewList,
}: Props) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="shopping-master" id="shopping-master" data-testid="shopping-list-master">
      <h2 className="master-heading">Seznamy</h2>
      <ul className="master-list" id="master-list">
        {lists.length === 0 && (
          <li className="master-empty">
            <img src="/icons/empty_basket.svg" alt="" aria-hidden="true" style={{ maxHeight: 72, width: 'auto', opacity: 0.65, marginBottom: '0.25rem' }} />
            <p>Žádné aktivní nákupy</p>
            <p className="master-empty-hint">Klikněte na „+ Nový seznam"</p>
          </li>
        )}
        <AnimatePresence mode="popLayout">
          {lists.map((list, index) => {
            const total = list.items.length
            const done = list.items.filter(i => isDone(i.status)).length
            const allDone = total > 0 && done === total
            const isActive = list.id === selectedListId
            const canEdit = list.createdById === user?.userId || isAdmin

            return (
              <motion.li
                key={list.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.04, 0.2) } }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`master-item group relative ${isActive ? ' is-active' : ''}${allDone ? ' is-complete' : ''}`}
                onClick={() => onSelect(list.id)}
                data-testid="shopping-list-row"
                data-list-id={list.id}
              >
                <div className="master-item-info">
                  <span className="master-item-name">{list.name}</span>
                  <span className="master-item-meta">
                    {list.createdBy?.username && `od ${list.createdBy.username}`}
                  </span>
                </div>
                <span className={`master-item-badge${allDone ? ' badge-done' : ''}`}>
                  {done}/{total}
                </span>
                <div className="master-item-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="master-action-btn master-action-share btn-share-list"
                    title="Sdílet do nástěnky"
                    aria-label="Sdílet do nástěnky"
                    onClick={() => onShare(list)}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21v-9a3 3 0 0 1 3-3h9M21 3l-9 9"/></svg>
                  </button>
                  {allDone && !list.isResolved && (
                    <button
                      className="master-action-btn master-action-archive btn-archive-list"
                      title="Archivovat seznam"
                      aria-label="Archivovat seznam"
                      onClick={() => onArchive(list.id)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      className="master-action-btn master-action-delete btn-delete-list"
                      title="Smazat seznam"
                      aria-label="Smazat seznam"
                      onClick={() => onDelete(list.id)}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      <button className="master-new-btn" onClick={onNewList} data-testid="shopping-list-create-button">
        + Nový seznam
      </button>
    </aside>
  )
}
