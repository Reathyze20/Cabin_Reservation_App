/**
 * features/reconstruction/KanbanColumn.tsx
 * Single kanban column (Nápady / Firmy / Úkoly) + individual TaskCard.
 */
import type { RecItem, RecCategory } from '@/api/reconstruction'
import { useVoteRecItem, useUpdateRecStatus, useDeleteRecItem } from './hooks/useReconstruction'
import { showToast } from '@/lib/toast'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { escapeHtml } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čeká na kontakt',
  contacted: 'Kontaktováno',
  approved: 'Schváleno',
  rejected: 'Zamítnuto',
}

function isDeadlineNear(deadline: string): boolean {
  const d = new Date(deadline)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  item: RecItem
  currentUserId: string
  isGuest?: boolean
  onEdit: (item: RecItem) => void
}

function TaskCard({ item, currentUserId, isGuest = false, onEdit }: TaskCardProps) {
  const vote = useVoteRecItem()
  const updateStatus = useUpdateRecStatus()
  const deleteItem = useDeleteRecItem()

  const hasVoted = item.votes?.includes(currentUserId)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleVote() {
    vote.mutate(item.id, {
      onError: () => showToast('Nepodařilo se hlasovat', 'error'),
    })
  }

  function handleStatusChange(status: string) {
    updateStatus.mutate({ id: item.id, status }, {
      onError: () => showToast('Nepodařilo se změnit stav', 'error'),
    })
  }

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  function confirmDelete() {
    deleteItem.mutate(item.id, {
      onError: () => showToast('Nepodařilo se smazat položku', 'error'),
    })
    setShowDeleteConfirm(false)
  }

  // ── Idea card ──────────────────────────────────────────────────────────────

  if (item.category === 'idea') {
    return (
      <div className="kanban-item idea-card">
        {item.thumbnail && (
          <div className="idea-thumbnail">
            <img src={item.thumbnail} alt="" loading="lazy" />
          </div>
        )}
        <div className="idea-content">
          <div className="card-header">
            <div className="kanban-item-title">{item.title}</div>
            <div className="card-actions">
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-action-link"
                  title="Otevřít odkaz"
                >
                  ↗
                </a>
              )}
              {!isGuest && (
                <>
                  <button className="card-action-edit" title="Upravit" onClick={() => onEdit(item)}>
                    ✎
                  </button>
                  <button className="card-action-del" title="Smazat" onClick={handleDelete}>
                    ×
                  </button>
                </>
              )}
            </div>
          </div>
          {item.description && (
            <div
              className="kanban-item-desc"
              dangerouslySetInnerHTML={{ __html: escapeHtml(item.description).replace(/\n/g, '<br>') }}
            />
          )}
          <div className="card-footer">
            {item.cost != null ? (
              <span className="card-cost">{item.cost.toLocaleString('cs-CZ')} Kč</span>
            ) : (
              <span />
            )}
            <button
              className={`vote-btn${hasVoted ? ' voted-up' : ''}`}
              onClick={handleVote}
              disabled={vote.isPending}
            >
              Hlasy: {item.votes?.length ?? 0}
            </button>
          </div>
        </div>
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Smazat položku"
          message="Opravdu chcete smazat tuto položku?"
          confirmLabel="Smazat"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    )
  }

  // ── Company card ───────────────────────────────────────────────────────────

  if (item.category === 'company') {
    return (
      <div className="kanban-item company-card">
        <div className="card-header">
          <div className="kanban-item-title">{item.title}</div>
          <div className="card-actions">
            {!isGuest && (
              <>
                <button className="card-action-edit" title="Upravit" onClick={() => onEdit(item)}>
                  ✎
                </button>
                <button className="card-action-del" title="Smazat" onClick={handleDelete}>
                  ×
                </button>
              </>
            )}
          </div>
        </div>
        <div className={`company-status-badge status-${item.status ?? 'pending'}`}>
          {STATUS_LABELS[item.status ?? 'pending']}
        </div>
        {item.description && (
          <div
            className="kanban-item-desc"
            dangerouslySetInnerHTML={{ __html: escapeHtml(item.description).replace(/\n/g, '<br>') }}
          />
        )}
        {(item.phone || item.email || item.link) && (
          <div className="company-contact-row">
            {item.phone && (
              <a href={`tel:${item.phone}`} className="company-action-btn">
                Zavolat
              </a>
            )}
            {item.email && (
              <a href={`mailto:${item.email}`} className="company-action-btn">
                Napsat
              </a>
            )}
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="company-action-btn">
                Web
              </a>
            )}
          </div>
        )}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <select
            value={item.status ?? 'pending'}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updateStatus.isPending}
            style={{ fontSize: '0.8rem' }}
          >
            <option value="pending">Čeká na kontakt</option>
            <option value="contacted">Kontaktováno</option>
            <option value="approved">Schváleno</option>
            <option value="rejected">Zamítnuto</option>
          </select>
        </div>
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Smazat položku"
          message="Opravdu chcete smazat tuto položku?"
          confirmLabel="Smazat"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    )
  }

  // ── Task card ──────────────────────────────────────────────────────────────

  const isDone = item.status === 'done'
  return (
    <div className={`kanban-item task-card${isDone ? ' task-done' : ''}`}>
      <div className="card-header">
        <div className="task-title-row">
          <label className="task-checkbox-wrapper">
            <input
              type="checkbox"
              className="task-checkbox"
              checked={isDone}
              onChange={(e) => handleStatusChange(e.target.checked ? 'done' : 'pending')}
              disabled={updateStatus.isPending}
            />
            <span className="checkmark" />
          </label>
          <div className="kanban-item-title">{item.title}</div>
        </div>
        <div className="card-actions">
          {!isGuest && (
            <>
              <button className="card-action-edit" title="Upravit" onClick={() => onEdit(item)}>
                ✎
              </button>
              <button className="card-action-del" title="Smazat" onClick={handleDelete}>
                ×
              </button>
            </>
          )}
        </div>
      </div>
      {item.description && (
        <div
          className="kanban-item-desc"
          dangerouslySetInnerHTML={{ __html: escapeHtml(item.description).replace(/\n/g, '<br>') }}
        />
      )}
      {(item.cost != null || item.deadline) && (
        <div className="card-footer">
          {item.cost != null ? (
            <span className="card-cost">{item.cost.toLocaleString('cs-CZ')} Kč</span>
          ) : (
            <span />
          )}
          {item.deadline && (
            <span className={`task-deadline${isDeadlineNear(item.deadline) ? ' deadline-near' : ''}`}>
              {formatDate(item.deadline)}
            </span>
          )}
        </div>
      )}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Smazat položku"
        message="Opravdu chcete smazat tuto položku?"
        confirmLabel="Smazat"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<
  RecCategory,
  { title: string; iconSrc: string; cssClass: string; listId: string }
> = {
  idea: {
    title: 'Nápady & Inspirace',
    iconSrc: '/icons/bulp.svg',
    cssClass: 'col-navrzeno',
    listId: 'list-idea',
  },
  company: {
    title: 'Firmy & Kontakty',
    iconSrc: '/icons/company.svg',
    cssClass: 'col-schvaleno',
    listId: 'list-company',
  },
  task: {
    title: 'Úkoly & Práce',
    iconSrc: '/icons/task.svg',
    cssClass: 'col-probehlo',
    listId: 'list-task',
  },
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  category: RecCategory
  items: RecItem[]
  currentUserId: string
  isGuest?: boolean
  onAdd: (category: RecCategory) => void
  onEdit: (item: RecItem) => void
}

export function KanbanColumn({ category, items, currentUserId, isGuest = false, onAdd, onEdit }: KanbanColumnProps) {
  const cfg = COLUMN_CONFIG[category]

  return (
    <div className={`kanban-column ${cfg.cssClass}`}>
      <div className="kanban-column-header">
        <span>
          <img src={cfg.iconSrc} alt="" width={22} height={22} className="kanban-column-icon" />
          {cfg.title}
        </span>
        <span className="kanban-count">{items.length}</span>
        {!isGuest && (
          <button
            className="add-col-btn"
            data-category={category}
            onClick={() => onAdd(category)}
            title={`Přidat ${cfg.title.toLowerCase()}`}
          >
            +
          </button>
        )}
      </div>

      <div className="kanban-column-body" id={cfg.listId}>
        {items.length === 0 ? (
          <div className="kanban-empty-state">
            <img src={cfg.iconSrc} alt="" width={48} height={48} className="kanban-empty-icon" />
            <p>Zatím žádné položky</p>
          </div>
        ) : (
          items.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              isGuest={isGuest}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  )
}
