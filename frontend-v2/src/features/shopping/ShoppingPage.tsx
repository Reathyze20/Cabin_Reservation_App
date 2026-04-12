/**
 * ShoppingPage.tsx — Hlavní stránka nákupů a inventáře
 * Mode: 'shopping' (nákupní seznamy) | 'pantry' (spíž / inventář)
 */
import { useState, useEffect } from 'react'
import { ViewSwitcher } from './ViewSwitcher'
import type { ShoppingList } from '@/api/shopping'
import {
  useShoppingLists,
  useCreateList,
  useDeleteList,
  useArchiveList,
} from './hooks/useShoppingLists'
import { ListMaster } from './ListMaster'
import { ListDetail } from './ListDetail'
import { PantryView } from './PantryView'
import { ShareListDialog } from './ShareListDialog'
import { showToast } from '@/lib/toast'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useInventory } from './hooks/useInventory'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type ActiveView = 'shopping' | 'pantry'

export function ShoppingPage() {
  useDocumentTitle('Nákupy');
  const { data: lists = [], isLoading, isError } = useShoppingLists()
  const { data: inventory = [] } = useInventory()
  const createList = useCreateList()
  const deleteList = useDeleteList()
  const archiveList = useArchiveList()

  const missingCount = inventory.filter(i => i.status === 'EMPTY').length

  const [activeView, setActiveView] = useState<ActiveView>('shopping')
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [shareList, setShareList] = useState<ShoppingList | null>(null)
  const [showNewListModal, setShowNewListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const [archiveListId, setArchiveListId] = useState<string | null>(null)

  // Auto-select first list on load
  useEffect(() => {
    if (activeView === 'shopping' && !selectedListId && lists.length > 0) {
      setSelectedListId(lists[0].id)
    }
    if (selectedListId && !lists.find(l => l.id === selectedListId) && lists.length > 0) {
      setSelectedListId(lists[0].id)
    }
  }, [lists, selectedListId, activeView])

  const selectedList = lists.find(l => l.id === selectedListId) ?? null

  function handleSelectList(id: string) {
    setSelectedListId(id)
    setActiveView('shopping')
    setMobileDetailOpen(true)
  }

  function handleShowPantry() {
    if (activeView === 'pantry') return
    setActiveView('pantry')
    setSelectedListId(null)
    setMobileDetailOpen(true)
  }

  function handleShowLists() {
    if (activeView === 'shopping') return
    setActiveView('shopping')
    setMobileDetailOpen(false)
  }

  function handleBack() {
    setMobileDetailOpen(false)
  }

  function handleDeleteList(id: string) {
    setDeleteListId(id)
  }

  async function confirmDeleteList() {
    if (!deleteListId) return
    try {
      await deleteList.mutateAsync(deleteListId)
      if (selectedListId === deleteListId) {
        setSelectedListId(null)
        setMobileDetailOpen(false)
      }
      showToast('Seznam smazán.', 'success')
    } catch { /* onError in hook */ }
    setDeleteListId(null)
  }

  function handleArchiveList(id: string) {
    setArchiveListId(id)
  }

  async function confirmArchiveList() {
    if (!archiveListId) return
    try {
      await archiveList.mutateAsync(archiveListId)
      showToast('Seznam archivován.', 'success')
    } catch { /* onError in hook */ }
    setArchiveListId(null)
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault()
    const name = newListName.trim()
    if (!name) return
    if (name.length > 100) {
      showToast('Název seznamu je příliš dlouhý (max 100 znaků).', 'error')
      return
    }
    try {
      const created = await createList.mutateAsync(name)
      setNewListName('')
      setShowNewListModal(false)
      showToast('Nákupní seznam vytvořen.', 'success')
      setSelectedListId(created.id)
      setActiveView('shopping')
      setMobileDetailOpen(true)
    } catch { /* onError in hook */ }
  }

  return (
    <div className="shopping-page" id="shopping-page">
      {/* Mobile-only switcher — visible when master panel is showing */}
      <div className="shopping-switcher-bar shopping-switcher-bar--mobile">
        <ViewSwitcher
          activeView={activeView}
          onShowLists={handleShowLists}
          onShowPantry={handleShowPantry}
          missingCount={missingCount}
        />
      </div>

      {/* Content */}
      <div
        className={`shopping-layout${mobileDetailOpen ? ' detail-open' : ''}`}
        id="shopping-layout"
      >
        {/* Master panel (only in shopping view) */}
        {activeView !== 'pantry' && (
          isLoading ? (
            <aside className="shopping-master" id="shopping-master">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-list-item skeleton-list-item--master">
                  <div className="skeleton-list-text">
                    <div className="skeleton skeleton-text medium"></div>
                    <div className="skeleton skeleton-text short"></div>
                  </div>
                  <div className="skeleton skeleton-badge"></div>
                </div>
              ))}
            </aside>
          ) : isError ? (
            <aside className="shopping-master" id="shopping-master">
              <p className="error-text">Chyba načítání nákupních seznamů.</p>
            </aside>
          ) : (
            <ListMaster
              lists={lists}
              selectedListId={selectedListId}
              onSelect={handleSelectList}
              onShare={list => setShareList(list)}
              onArchive={handleArchiveList}
              onDelete={handleDeleteList}
              onNewList={() => setShowNewListModal(true)}
            />
          )
        )}

        {/* Right column: switcher + detail */}
        <div className="shopping-right-col">
          <div className="shopping-switcher-bar shopping-switcher-bar--desktop">
            <ViewSwitcher
              activeView={activeView}
              onShowLists={handleShowLists}
              onShowPantry={handleShowPantry}
              missingCount={missingCount}
            />
          </div>

          {/* Detail panel */}
          {activeView === 'pantry' ? (
            <PantryView onBack={handleBack} />
          ) : (
            <ListDetail list={selectedList} onBack={handleBack} />
          )}
        </div>
      </div>

      {/* Modál nového seznamu */}
      {showNewListModal && (
        <Modal
        isOpen={true}
        onClose={() => setShowNewListModal(false)}
        title="Nový nákupní seznam"
        maxWidth="max-w-sm"
        footer={
          <button
            type="submit"
            form="new-list-form"
            className="button-primary"
            disabled={createList.isPending || !newListName.trim()}
          >
            Vytvořit
          </button>
        }
      >
        <form id="new-list-form" onSubmit={handleCreateList} noValidate>
          <input
            className="form-input"
            type="text"
            placeholder="Název seznamu…"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            maxLength={100}
            required
            autoFocus
          />
        </form>
      </Modal>
    )}

      {/* Share dialog */}
      {shareList && (
        <ShareListDialog
          listId={shareList.id}
          listName={shareList.name}
          onClose={() => setShareList(null)}
        />
      )}

      {/* Delete list confirmation */}
      <ConfirmDialog
        isOpen={deleteListId !== null}
        title="Smazat seznam"
        message="Opravdu chcete smazat tento nákupní seznam? Všechny jeho položky budou ztraceny."
        confirmLabel="Smazat"
        danger
        loading={deleteList.isPending}
        onConfirm={confirmDeleteList}
        onCancel={() => setDeleteListId(null)}
      />

      {/* Archive list confirmation */}
      <ConfirmDialog
        isOpen={archiveListId !== null}
        title="Uzavřít seznam"
        message="Všechny položky jsou hotové. Chcete seznam uzavřít? Zmizí z přehledu."
        confirmLabel="Uzavřít"
        loading={archiveList.isPending}
        onConfirm={confirmArchiveList}
        onCancel={() => setArchiveListId(null)}
      />
    </div>
  )
}
