/**
 * features/reconstruction/KanbanColumn.tsx
 * Single kanban column (Nápady / Firmy / Úkoly) + individual TaskCard.
 */
import type { RecItem, RecCategory, RecStatus } from '@/api/reconstruction'
import { useVoteRecItem, useUpdateRecStatus, useDeleteRecItem } from './hooks/useReconstruction'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { escapeHtml } from '@/lib/utils'
import { getNetworkAwareActionMessage } from '@/lib/networkError'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  Lightbulb,
  ListTodo,
  Mail,
  Pencil,
  Phone,
  Plus,
  ThumbsUp,
  Trash2,
} from 'lucide-react'

const MOTION_EASE = [0.22, 1, 0.36, 1] as const

const COLUMN_VARIANTS = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
      ease: MOTION_EASE,
    },
  },
}

const ITEM_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
  transition: { duration: 0.2, ease: MOTION_EASE },
}

const EMPTY_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18, ease: MOTION_EASE },
}

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
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleVote() {
    vote.mutate({ id: item.id, currentUserId })
  }

  function handleStatusChange(status: RecStatus) {
    updateStatus.mutate({ id: item.id, status })
  }

  function handleDelete() {
    setDeleteError(null)
    setShowDeleteConfirm(true)
  }

  function confirmDelete() {
    setDeleteError(null)
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        setDeleteError(null)
        setShowDeleteConfirm(false)
      },
      onError: (error) => {
        setDeleteError(
          getNetworkAwareActionMessage(
            error,
            'Položku se nepodařilo smazat. Zkuste to znovu.',
            'Spojení vypadlo dřív, než se položka stihla smazat. Zkuste to znovu po obnovení připojení.',
          ),
        )
      },
    })
  }

  // ── Idea card ──────────────────────────────────────────────────────────────

  if (item.category === 'idea') {
    return (
      <div className="kanban-item idea-card" data-testid="reconstruction-item-card" data-item-id={item.id} data-item-category={item.category}>
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
                  aria-label="Otevřít odkaz"
                >
                  <ExternalLink className="rec-action-icon" aria-hidden="true" />
                </a>
              )}
              {!isGuest && (
                <>
                  <button type="button" className="card-action-edit" title="Upravit" aria-label="Upravit položku" onClick={() => onEdit(item)} data-testid="reconstruction-item-edit-button">
                    <Pencil className="rec-action-icon" aria-hidden="true" />
                  </button>
                  <button type="button" className="card-action-del" title="Smazat" aria-label="Smazat položku" onClick={handleDelete} data-testid="reconstruction-item-delete-button">
                    <Trash2 className="rec-action-icon" aria-hidden="true" />
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
              type="button"
              aria-pressed={hasVoted}
              data-testid="reconstruction-item-vote-button"
            >
              <ThumbsUp size={14} aria-hidden="true" />
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
          loading={deleteItem.isPending}
          errorMessage={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setDeleteError(null)
          }}
        />
      </div>
    )
  }

  // ── Company card ───────────────────────────────────────────────────────────

  if (item.category === 'company') {
    return (
      <div className="kanban-item company-card" data-testid="reconstruction-item-card" data-item-id={item.id} data-item-category={item.category}>
        <div className="card-header">
          <div className="kanban-item-title">{item.title}</div>
          <div className="card-actions">
            {!isGuest && (
              <>
                <button type="button" className="card-action-edit" title="Upravit" aria-label="Upravit kontakt" onClick={() => onEdit(item)} data-testid="reconstruction-item-edit-button">
                  <Pencil className="rec-action-icon" aria-hidden="true" />
                </button>
                <button type="button" className="card-action-del" title="Smazat" aria-label="Smazat kontakt" onClick={handleDelete} data-testid="reconstruction-item-delete-button">
                  <Trash2 className="rec-action-icon" aria-hidden="true" />
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
                <Phone size={14} aria-hidden="true" />
                Zavolat
              </a>
            )}
            {item.email && (
              <a href={`mailto:${item.email}`} className="company-action-btn">
                <Mail size={14} aria-hidden="true" />
                Napsat
              </a>
            )}
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="company-action-btn">
                <Globe size={14} aria-hidden="true" />
                Web
              </a>
            )}
          </div>
        )}
        <div className="form-group company-status-control">
          <select
            className="company-status-select"
            value={item.status ?? 'pending'}
            onChange={(e) => handleStatusChange(e.target.value as RecStatus)}
            disabled={updateStatus.isPending}
            data-testid="reconstruction-item-status-select"
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
          loading={deleteItem.isPending}
          errorMessage={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setDeleteError(null)
          }}
        />
      </div>
    )
  }

  // ── Task card ──────────────────────────────────────────────────────────────

  const isDone = item.status === 'done'
  return (
    <div className={`kanban-item task-card${isDone ? ' task-done' : ''}`} data-testid="reconstruction-item-card" data-item-id={item.id} data-item-category={item.category}>
      <div className="card-header">
        <div className="task-title-row">
          <label className="task-checkbox-wrapper">
            <input
              type="checkbox"
              className="task-checkbox"
              checked={isDone}
              onChange={(e) => handleStatusChange(e.target.checked ? 'done' : 'pending')}
              disabled={updateStatus.isPending}
              data-testid="reconstruction-item-toggle-done"
            />
            <span className="checkmark" />
          </label>
          <div className="kanban-item-title">{item.title}</div>
        </div>
        <div className="card-actions">
          {!isGuest && (
            <>
              <button type="button" className="card-action-edit" title="Upravit" aria-label="Upravit úkol" onClick={() => onEdit(item)} data-testid="reconstruction-item-edit-button">
                <Pencil className="rec-action-icon" aria-hidden="true" />
              </button>
              <button type="button" className="card-action-del" title="Smazat" aria-label="Smazat úkol" onClick={handleDelete} data-testid="reconstruction-item-delete-button">
                <Trash2 className="rec-action-icon" aria-hidden="true" />
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
              <CalendarDays size={13} aria-hidden="true" />
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
        loading={deleteItem.isPending}
        errorMessage={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setDeleteError(null)
        }}
      />
    </div>
  )
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<
  RecCategory,
  {
    title: string
    icon: LucideIcon
    cssClass: string
    listId: string
    emptyTitle: string
    emptyHint: string
    addLabel: string
  }
> = {
  idea: {
    title: 'Nápady & Inspirace',
    icon: Lightbulb,
    cssClass: 'col-navrzeno',
    listId: 'list-idea',
    emptyTitle: 'Zatím žádné nápady',
    emptyHint: 'Ulož si sem inspirace, odkazy a odhadované ceny, ať se v tom rodina neztratí.',
    addLabel: 'Přidat první nápad',
  },
  company: {
    title: 'Firmy & Kontakty',
    icon: Building2,
    cssClass: 'col-schvaleno',
    listId: 'list-company',
    emptyTitle: 'Zatím žádné kontakty',
    emptyHint: 'Přidej sem firmy, telefon a stav oslovení, aby bylo jasné, kdo co řeší.',
    addLabel: 'Přidat první kontakt',
  },
  task: {
    title: 'Úkoly & Práce',
    icon: ListTodo,
    cssClass: 'col-probehlo',
    listId: 'list-task',
    emptyTitle: 'Zatím žádné úkoly',
    emptyHint: 'Rozepiš konkrétní práci, termín a rozpočet. Pak se to bude líp hlídat.',
    addLabel: 'Přidat první úkol',
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
  const Icon = cfg.icon

  return (
    <motion.section className={`kanban-column ${cfg.cssClass}`} variants={COLUMN_VARIANTS}>
      <div className="kanban-column-header">
        <span>
          <Icon size={18} strokeWidth={2.2} className="kanban-column-icon" aria-hidden="true" />
          {cfg.title}
        </span>
        <span className="kanban-count">{items.length}</span>
        {!isGuest && (
          <button
            className="add-col-btn"
            data-category={category}
            type="button"
            onClick={() => onAdd(category)}
            title={`Přidat ${cfg.title.toLowerCase()}`}
            aria-label={`Přidat ${cfg.title.toLowerCase()}`}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        )}
      </div>

      <motion.div className="kanban-column-body" id={cfg.listId} layout>
        <AnimatePresence initial={false} mode="popLayout">
          {items.length === 0 ? (
            <motion.div key={`${category}-empty`} className="kanban-empty-state" {...EMPTY_MOTION}>
              <Icon size={36} strokeWidth={1.8} className="kanban-empty-icon" aria-hidden="true" />
              <p className="kanban-empty-title">{cfg.emptyTitle}</p>
              <span className="kanban-empty-hint">{cfg.emptyHint}</span>
              {!isGuest && (
                <button type="button" className="reconstruction-empty-action" onClick={() => onAdd(category)}>
                  <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
                  {cfg.addLabel}
                </button>
              )}
            </motion.div>
          ) : (
            items.map((item) => (
              <motion.div key={item.id} layout className="kanban-item-motion" {...ITEM_MOTION}>
                <TaskCard
                  item={item}
                  currentUserId={currentUserId}
                  isGuest={isGuest}
                  onEdit={onEdit}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </motion.section>
  )
}
