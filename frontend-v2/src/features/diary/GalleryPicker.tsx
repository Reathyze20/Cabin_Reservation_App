/**
 * GalleryPicker.tsx — Výběr fotek z galerie pro Deník
 * Dvouúrovňový: Složky → Fotky (multi-select)
 */
import { useState } from 'react'
import {
  useGalleryFolders,
  useGalleryPhotos,
} from '@/features/gallery/hooks/useGallery'
import type { GalleryFolder } from '@/api/gallery'
import { Modal } from '@/components/shared/Modal'

interface Props {
  /** IDs fotek již přidaných do záznamu (greyscale, nelze znovu vybrat) */
  currentEntryPhotoIds: string[]
  onConfirm: (newIds: string[]) => void
  onClose: () => void
}

export function GalleryPicker({ currentEntryPhotoIds, onConfirm, onClose }: Props) {
  const { data: allFolders = [], isLoading: foldersLoading } = useGalleryFolders()

  const [pickerFolderId, setPickerFolderId] = useState<string | null>(null)
  const [pickerFolderName, setPickerFolderName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: pickerPhotos = [], isLoading: photosLoading } = useGalleryPhotos(pickerFolderId)

  function openPickerFolder(folder: GalleryFolder) {
    setPickerFolderId(folder.id)
    setPickerFolderName(folder.name)
  }

  function backToFolders() {
    setPickerFolderId(null)
    setPickerFolderName('')
  }

  function togglePhoto(id: string) {
    // Pokud už je v záznamu, nelze znovu vybrat
    if (currentEntryPhotoIds.includes(id)) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleConfirm() {
    onConfirm([...selected])
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Přidat fotky z galerie"
      maxWidth="max-w-2xl"
      footer={
        <div className="gallery-picker-footer" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <span className="picker-selected-count" style={{ flex: 1 }}>
            {selected.size > 0 ? `${selected.size} vybráno` : ''}
          </span>
          <button
            className="button-primary"
            onClick={handleConfirm}
            disabled={selected.size === 0}
          >
            Přidat vybrané
          </button>
        </div>
      }
    >
        {pickerFolderId && (
          <button
            className="gallery-btn"
            onClick={backToFolders}
          >
            ← Zpět na alba
          </button>
        )}

        {!pickerFolderId ? (
          /* ── Folder level ──────────────────────────────────────────── */
          foldersLoading ? (
            <div className="spinner-container"><div className="spinner" /></div>
          ) : allFolders.length === 0 ? (
            <p className="empty-state">Žádná alba v galerii.</p>
          ) : (
            <div className="folders-grid gallery-picker-folders">
              {allFolders.map(folder => (
                <div
                  key={folder.id}
                  className="folder-card"
                  onClick={() => openPickerFolder(folder)}
                >
                  {folder.coverPhotoUrl ? (
                    <img className="folder-cover" src={folder.coverPhotoUrl} alt={folder.name} />
                  ) : (
                    <div className="folder-cover folder-cover-placeholder">📁</div>
                  )}
                  <div className="folder-info">
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-meta">{folder.photoCount} {folder.photoCount === 1 ? 'fotka' : folder.photoCount >= 2 && folder.photoCount <= 4 ? 'fotky' : 'fotek'}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── Photo level ───────────────────────────────────────────── */
          photosLoading ? (
            <div className="spinner-container"><div className="spinner" /></div>
          ) : pickerPhotos.length === 0 ? (
            <p className="empty-state">Toto album je prázdné.</p>
          ) : (
            <>
              <p className="picker-folder-name"><strong>{pickerFolderName}</strong></p>
              <div className="photos-grid gallery-picker-photos">
                {pickerPhotos.map(photo => {
                  const isAlreadyAdded = currentEntryPhotoIds.includes(photo.id)
                  const isSelected = selected.has(photo.id)
                  return (
                    <div
                      key={photo.id}
                      className={`photo-card picker-photo${isSelected ? ' picker-selected' : ''}${isAlreadyAdded ? ' picker-already-added' : ''}`}
                      onClick={() => togglePhoto(photo.id)}
                    >
                      <img src={photo.thumb ?? photo.src} alt={photo.description ?? ''} />
                      {isSelected && <span className="picker-check-overlay">✓</span>}
                      {isAlreadyAdded && <span className="picker-added-overlay">✓</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )
        )}
    </Modal>
  )
}
