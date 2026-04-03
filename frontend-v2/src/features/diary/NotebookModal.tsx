/**
 * NotebookModal.tsx — Zápisník pro konkrétní den pobytu
 * Obsahuje editor textu, přikládání fotek a navigaci mezi dny
 */
import { useState, useEffect, useRef } from 'react'
import type { DiaryEntry } from '@/api/diary'
import { useSaveDiaryEntry, useDeleteDiaryEntry } from './hooks/useDiary'
import { usePhotosByIds } from '@/features/gallery/hooks/useGallery'
import { GalleryPicker } from './GalleryPicker'
import { DiaryLightbox } from './DiaryLightbox'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

const MAX_CHARS = 20000

const WEEKDAY_LONG = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']
const MONTH_CS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince']

function formatNotebookDate(d: Date): string {
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()}. ${MONTH_CS[d.getMonth()]} ${d.getFullYear()}`
}

interface Props {
  dateObj: Date
  entry: DiaryEntry | undefined
  folderId: string
  /** Všechna dostupná data složky (YYYY-MM-DD) pro prev/next navigaci */
  allDates: string[]
  onNavigate: (newDate: Date, newEntry: DiaryEntry | undefined) => void
  onClose: () => void
  onSaved: () => void
}

export function NotebookModal({ dateObj, entry, folderId, allDates, onNavigate, onClose, onSaved }: Props) {
  const [content, setContent] = useState(entry?.content ?? '')
  const [entryPhotoIds, setEntryPhotoIds] = useState<string[]>(entry?.galleryPhotoIds ?? [])
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const saveEntry = useSaveDiaryEntry(folderId)
  const deleteEntry = useDeleteDiaryEntry(folderId)

  const { data: attachedPhotos = [] } = usePhotosByIds(entryPhotoIds)

  // ── Navigace prev / next ─────────────────────────────────────────────────
  const dateKey = dateObj.toISOString().slice(0, 10)
  const currentIdx = allDates.indexOf(dateKey)
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx < allDates.length - 1

  // Při změně záznamu (navigace prev/next) reiniciujem state
  useEffect(() => {
    setContent(entry?.content ?? '')
    setEntryPhotoIds(entry?.galleryPhotoIds ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, dateKey])

  async function save(): Promise<boolean> {
    try {
      await saveEntry.mutateAsync({
        entryId: entry?.id ?? null,
        date: dateKey,
        content,
        galleryPhotoIds: entryPhotoIds,
      })
      return true
    } catch {
      return false
    }
  }

  async function handleSave() {
    const ok = await save()
    if (ok) onSaved()
  }

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  function handleDeleteClick() {
    if (!entry?.id) return
    setDeleteConfirmOpen(true)
  }

  async function handleConfirmedDelete() {
    if (!entry?.id) return
    setDeleteConfirmOpen(false)
    await deleteEntry.mutateAsync(entry.id)
    onSaved()
  }

  function removePhoto(id: string) {
    setEntryPhotoIds(prev => prev.filter(pid => pid !== id))
  }

  function handlePickerConfirm(newIds: string[]) {
    setEntryPhotoIds(prev => {
      const set = new Set(prev)
      for (const id of newIds) set.add(id)
      return [...set]
    })
    setShowPickerModal(false)
  }

  async function navigate(direction: 'prev' | 'next') {
    // Uložit (tiše) před navigací
    await save()
    const idx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1
    if (idx < 0 || idx >= allDates.length) return
    const newDateStr = allDates[idx]
    const newDate = new Date(newDateStr + 'T12:00:00')
    // Parent v DiaryPage najde entry z entryByDate Map a předá ji
    onNavigate(newDate, undefined)
  }

  const notebookTitle = (
    <div className="notebook-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
      <button
        className="notebook-nav-btn"
        onClick={() => navigate('prev')}
        disabled={!hasPrev}
        aria-label="Předchozí den"
      >
        ‹
      </button>
      <span className="notebook-date" style={{ flex: 1, textAlign: 'center' }}>{formatNotebookDate(dateObj)}</span>
      <button
        className="notebook-nav-btn"
        onClick={() => navigate('next')}
        disabled={!hasNext}
        aria-label="Další den"
      >
        ›
      </button>
    </div>
  )

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={notebookTitle}
        maxWidth="max-w-2xl"
        footer={
          <div className="notebook-footer">
            <button
              className="notebook-btn-attach"
              onClick={() => setShowPickerModal(true)}
            >
              📸 Fotky
            </button>
            {entry?.id && (
              <button
                className="notebook-btn-delete"
                onClick={handleDeleteClick}
                disabled={deleteEntry.isPending}
              >
                Vytrhnout
              </button>
            )}
            <button
              className="notebook-btn-save"
              onClick={handleSave}
              disabled={saveEntry.isPending}
            >
              {saveEntry.isPending ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        }
      >
          {/* Zápisník papír */}
          <div className="notebook-paper">
            <div className="notebook-holes">
              <span /><span /><span />
            </div>
            <div className="notebook-body">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Napiš co se dnes dělo…"
                maxLength={MAX_CHARS}
                rows={12}
              />
              <div className="char-counter">{content.length}/{MAX_CHARS}</div>
            </div>
          </div>

          {/* Přiložené fotky */}
          {attachedPhotos.length > 0 && (
            <div className="notebook-attachments">
              {attachedPhotos.map((photo, idx) => (
                <div key={photo.id} className="attachment-thumbnail-wrapper">
                  <img
                    className="attachment-thumbnail"
                    src={photo.thumb ?? photo.src}
                    alt={photo.description ?? ''}
                    onClick={() => setLightboxIndex(idx)}
                  />
                  <button
                    className="attachment-remove-btn"
                    onClick={() => removePhoto(photo.id)}
                    aria-label="Odebrat fotku"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
      </Modal>

      {/* Výběr fotek z galerie */}
      {showPickerModal && (
        <GalleryPicker
          currentEntryPhotoIds={entryPhotoIds}
          onConfirm={handlePickerConfirm}
          onClose={() => setShowPickerModal(false)}
        />
      )}

      {/* Lightbox pro přiložené fotky */}
      {lightboxIndex !== null && attachedPhotos.length > 0 && (
        <DiaryLightbox
          photos={attachedPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Vytrhnout zápisník"
        message="Opravdu chcete vytrhnout tento zápisník? Tato akce je nevratná."
        confirmLabel="Vytrhnout"
        danger
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  )
}
