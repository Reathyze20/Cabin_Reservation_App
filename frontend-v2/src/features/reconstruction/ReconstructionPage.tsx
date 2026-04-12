/**
 * features/reconstruction/ReconstructionPage.tsx
 * Kanban board for renovation ideas, companies, and tasks.
 */
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useReconstruction, useCreateRecItem, useUpdateRecItem } from './hooks/useReconstruction'
import { KanbanColumn } from './KanbanColumn'
import { TaskFormModal } from './TaskFormModal'
import { showToast } from '@/lib/toast'
import type { RecCategory, RecItem, RecItemCreate } from '@/api/reconstruction'

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReconstructionPage() {
  useDocumentTitle('Rekonstrukce');
  const { user, isGuest } = useAuth()
  const { data: items = [], isLoading, isError } = useReconstruction()

  const [showModal, setShowModal] = useState(false)
  const [modalCategory, setModalCategory] = useState<RecCategory>('idea')
  const [editItem, setEditItem] = useState<RecItem | null>(null)

  const createItem = useCreateRecItem()
  const updateItem = useUpdateRecItem()

  // ── Computed ──────────────────────────────────────────────────────────────

  const ideaItems = items.filter((i) => i.category === 'idea')
  const companyItems = items.filter((i) => i.category === 'company')
  const taskItems = items.filter((i) => i.category === 'task')

  // Budget bar (tasks only)
  const totalBudget = taskItems.reduce((s, t) => s + (t.cost ?? 0), 0)
  const spentBudget = taskItems
    .filter((t) => t.status === 'done')
    .reduce((s, t) => s + (t.cost ?? 0), 0)
  const budgetPercent = totalBudget > 0 ? Math.min((spentBudget / totalBudget) * 100, 100) : 0
  const hasBudget = totalBudget > 0

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openAdd(cat: RecCategory) {
    setEditItem(null)
    setModalCategory(cat)
    setShowModal(true)
  }

  function openEdit(item: RecItem) {
    setEditItem(item)
    setModalCategory(item.category)
    setShowModal(true)
  }

  function handleClose() {
    setShowModal(false)
    setEditItem(null)
  }

  function handleSubmit(data: RecItemCreate) {
    if (editItem) {
      updateItem.mutate(
        { id: editItem.id, data },
        {
          onSuccess: () => {
            setShowModal(false)
            setEditItem(null)
            showToast('Položka upravena', 'success')
          },
          onError: () => showToast('Nepodařilo se uložit položku', 'error'),
        },
      )
    } else {
      createItem.mutate(data, {
        onSuccess: () => {
          setShowModal(false)
          showToast('Položka přidána', 'success')
        },
        onError: () => showToast('Nepodařilo se přidat položku', 'error'),
      })
    }
  }

  const isSubmitting = createItem.isPending || updateItem.isPending
  const currentUserId = user?.userId ?? ''

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="main-content-reconstruction">
      <div className="page-card reconstruction-card">
        <div className="reconstruction-header">
          <div className="reconstruction-header-left">
            <h1>Rekonstrukce a plány</h1>
            <p>Nápady, firmy a úkoly na jedno místo</p>
          </div>
        </div>

        {/* Budget bar */}
        {hasBudget && (
          <div className="budget-container">
            <div className="budget-labels">
              <span className="budget-title">Celkový rozpočet</span>
              <span className="budget-amount">{totalBudget.toLocaleString('cs-CZ')} Kč</span>
            </div>
            <div className="budget-progress-bar">
              <div
                className="budget-progress-fill"
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <div className="budget-details">
              <span>Hotovo: {spentBudget.toLocaleString('cs-CZ')} Kč ({Math.round(budgetPercent)} %)</span>
              <span>Zbývá: {(totalBudget - spentBudget).toLocaleString('cs-CZ')} Kč</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="kanban-board" style={{ padding: 'var(--space-xl)' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-card" style={{ minHeight: 200 }}>
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-text long" />
                <div className="skeleton skeleton-text medium" />
                <div className="skeleton skeleton-text short" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="kanban-loading" style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/icons/empty_shelf.svg" alt="" aria-hidden="true" style={{ maxHeight: 96, width: 'auto', opacity: 0.65 }} />
            <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>Nepodařilo se načíst data</p>
          </div>
        ) : (
          <div className="kanban-board">
            <KanbanColumn
              category="idea"
              items={ideaItems}
              currentUserId={currentUserId}
              isGuest={isGuest}
              onAdd={openAdd}
              onEdit={openEdit}
            />
            <KanbanColumn
              category="company"
              items={companyItems}
              currentUserId={currentUserId}
              isGuest={isGuest}
              onAdd={openAdd}
              onEdit={openEdit}
            />
            <KanbanColumn
              category="task"
              items={taskItems}
              currentUserId={currentUserId}
              isGuest={isGuest}
              onAdd={openAdd}
              onEdit={openEdit}
            />
          </div>
        )}
      </div>

      {showModal && (
        <TaskFormModal
          initialCategory={modalCategory}
          editItem={editItem}
          onClose={handleClose}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      )}
    </div>
  )
}
