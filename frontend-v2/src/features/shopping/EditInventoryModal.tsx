/**
 * EditInventoryModal.tsx — Modál pro úpravu zásoby v inventáři
 */
import { useState, useEffect, useRef } from 'react'
import type { InventoryItem } from '@/api/shopping'
import { useUpdateInventoryItem, useDeleteInventoryItem } from './hooks/useInventory'
import { useAuth } from '@/context/AuthContext'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { CATEGORY_ORDER, CATEGORY_LABELS } from './constants'

interface Props {
  item: InventoryItem
  onClose: () => void
}

export function EditInventoryModal({ item, onClose }: Props) {
  const [name, setName] = useState(item.name)
  const [location, setLocation] = useState(item.location ?? '')
  const [status, setStatus] = useState<InventoryItem['status']>(item.status)
  const [category, setCategory] = useState(item.category)
  const [isEssential, setIsEssential] = useState(item.isEssential)
  const updateItem = useUpdateInventoryItem()
  const deleteItem = useDeleteInventoryItem()
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'
  const nameRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updateItem.mutateAsync({
      id: item.id,
      data: { name: name.trim(), category, status, location: location.trim() || undefined, isEssential },
    })
    onClose()
  }

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  async function confirmDelete() {
    await deleteItem.mutateAsync(item.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <>
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upravit zásobu"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-between w-full items-center">
          {!isGuest ? (
            <button
              type="button"
              className="btn-modal-delete"
              onClick={handleDelete}
              disabled={deleteItem.isPending}
            >
              Smazat zásobu
            </button>
          ) : <span />}
          <div className="flex gap-2 ml-auto">
            <button type="button" className="button-secondary" onClick={onClose}>
              Zrušit
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={updateItem.isPending || !name.trim()}
            >
              Uložit
            </button>
          </div>
        </div>
      }
    >
      <form id="inv-edit-form" ref={formRef} onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1">
          <div className="form-group">
            <label className="form-label" htmlFor="inv-edit-name">Název</label>
            <input
              id="inv-edit-name"
              ref={nameRef}
              className="form-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inv-edit-location">Umístění</label>
            <input
              id="inv-edit-location"
              className="form-input"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="např. spíž, sklep…"
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inv-edit-status">Stav zásoby</label>
            <select
              id="inv-edit-status"
              className="form-input"
              value={status}
              onChange={e => setStatus(e.target.value as InventoryItem['status'])}
            >
              <option value="OK">Dostatek</option>
              <option value="LOW">Málo</option>
              <option value="EMPTY">Došlo</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="inv-edit-category">Kategorie</label>
            <select
              id="inv-edit-category"
              className="form-input"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORY_ORDER.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>
          {!isGuest && (
            <div className="essential-toggle-row">
              <input
                id="inv-edit-essential"
                type="checkbox"
                className="essential-toggle-checkbox"
                checked={isEssential}
                onChange={e => setIsEssential(e.target.checked)}
              />
              <div className="essential-toggle-text">
                <label htmlFor="inv-edit-essential" className="essential-toggle-title">Základní zásoba</label>
                <span className="essential-toggle-desc">Vždy hlídat, zda tato položka nechybí na chatě.</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
    <ConfirmDialog
      isOpen={showDeleteConfirm}
      title="Smazat zásobu"
      message="Opravdu chcete tuto zásobu smazat? Tato akce je nevratná."
      confirmLabel="Smazat"
      danger
      loading={deleteItem.isPending}
      onConfirm={confirmDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
    </>
  )
}
