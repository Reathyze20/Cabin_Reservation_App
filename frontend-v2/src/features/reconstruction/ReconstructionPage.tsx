/**
 * features/reconstruction/ReconstructionPage.tsx
 * Kanban board for renovation ideas, companies, and tasks.
 */
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Building2, Lightbulb, ListTodo } from 'lucide-react'
import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useReconstruction, useCreateRecItem, useUpdateRecItem } from './hooks/useReconstruction'
import { KanbanColumn } from './KanbanColumn'
import { ReconstructionSkeleton } from './ReconstructionSkeleton'
import { TaskFormModal } from './TaskFormModal'
import { showToast } from '@/lib/toast'
import type { RecCategory, RecItem, RecItemCreate } from '@/api/reconstruction'
import { getNetworkAwareActionMessage } from '@/lib/networkError'

const MOTION_EASE = [0.22, 1, 0.36, 1] as const

const BOARD_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReconstructionPage() {
  useDocumentTitle('Rekonstrukce');
  const { user, isGuest } = useAuth()
  const queryClient = useQueryClient()
  const { data: items = [], isLoading, isError, error } = useReconstruction()

  const [showModal, setShowModal] = useState(false)
  const [modalCategory, setModalCategory] = useState<RecCategory>('idea')
  const [editItem, setEditItem] = useState<RecItem | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
  const summaryCards = [
    { label: 'Nápady', value: ideaItems.length, icon: Lightbulb },
    { label: 'Firmy', value: companyItems.length, icon: Building2 },
    { label: 'Úkoly', value: taskItems.length, icon: ListTodo },
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openAdd(cat: RecCategory) {
    setSubmitError(null)
    setEditItem(null)
    setModalCategory(cat)
    setShowModal(true)
  }

  function openEdit(item: RecItem) {
    setSubmitError(null)
    setEditItem(item)
    setModalCategory(item.category)
    setShowModal(true)
  }

  function handleClose() {
    setSubmitError(null)
    setShowModal(false)
    setEditItem(null)
  }

  function handleSubmit(data: RecItemCreate) {
    setSubmitError(null)
    if (editItem) {
      updateItem.mutate(
        { id: editItem.id, data },
        {
          onSuccess: () => {
            setSubmitError(null)
            setShowModal(false)
            setEditItem(null)
            showToast('Položka upravena', 'success')
          },
          onError: (error) => {
            setSubmitError(
              getNetworkAwareActionMessage(
                error,
                'Položku se nepodařilo uložit. Zkuste to znovu.',
                'Spojení vypadlo dřív, než se položka stihla uložit. Zkuste to znovu po obnovení připojení.',
              ),
            )
          },
        },
      )
    } else {
      createItem.mutate(data, {
        onSuccess: () => {
          setSubmitError(null)
          setShowModal(false)
          showToast('Položka přidána', 'success')
        },
        onError: (error) => {
          setSubmitError(
            getNetworkAwareActionMessage(
              error,
              'Položku se nepodařilo přidat. Zkuste to znovu.',
              'Spojení vypadlo dřív, než se položka stihla přidat. Zkuste to znovu po obnovení připojení.',
            ),
          )
        },
      })
    }
  }

  const isSubmitting = createItem.isPending || updateItem.isPending
  const currentUserId = user?.userId ?? ''

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="main-content-reconstruction" data-testid="reconstruction-page" data-reconstruction-state="loading">
        <ReconstructionSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="main-content-reconstruction" data-testid="reconstruction-page" data-reconstruction-state="error">
        <div className="page-card reconstruction-card">
          <div className="reconstruction-header">
            <div className="reconstruction-header-left">
              <h1>Rekonstrukce a plány</h1>
              <p>Nápady, firmy a úkoly na jedno místo</p>
            </div>
          </div>
          <div className="reconstruction-state-wrap">
            <FeatureErrorFallback
              error={error instanceof Error ? error : new Error('Nepodařilo se načíst rekonstrukce')}
              resetErrorBoundary={() => queryClient.invalidateQueries({ queryKey: ['reconstruction'] })}
              title="Rekonstrukce se nepodařilo načíst"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content-reconstruction" data-testid="reconstruction-page" data-reconstruction-state="ready">
      <div className="page-card reconstruction-card">
        <div className="reconstruction-header">
          <div className="reconstruction-header-left">
            <h1>Rekonstrukce a plány</h1>
            <p>Nápady, firmy a úkoly na jedno místo</p>
          </div>
          <div className="reconstruction-summary" aria-label="Souhrn rekonstrukcí" data-testid="reconstruction-summary">
            {summaryCards.map(({ label, value, icon: Icon }, index) => (
              <motion.div
                key={label}
                className="reconstruction-summary-pill"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: MOTION_EASE, delay: 0.04 * index }}
              >
                <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
                <div>
                  <span className="reconstruction-summary-label">{label}</span>
                  <span className="reconstruction-summary-value">{value}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Budget bar */}
        {hasBudget && (
          <motion.div
            className="budget-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: MOTION_EASE, delay: 0.08 }}
          >
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
          </motion.div>
        )}

        <motion.div className="kanban-board" variants={BOARD_VARIANTS} initial="hidden" animate="visible" data-testid="reconstruction-board">
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
        </motion.div>
      </div>

      {showModal && (
        <TaskFormModal
          initialCategory={modalCategory}
          editItem={editItem}
          onClose={handleClose}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          errorMessage={submitError}
          onDirty={() => {
            if (submitError) setSubmitError(null)
          }}
        />
      )}
    </div>
  )
}
