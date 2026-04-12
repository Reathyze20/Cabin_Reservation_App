/**
 * GalleryPage.tsx — Hlavní stránka Galerie
 * View: 'folders' → výběr alba | 'photos' → fotky v albu s lightboxem
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useGalleryFolders,
  useGalleryPhotos,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useDeletePhotos,
} from './hooks/useGallery'
import { FolderGrid, FolderGridSkeleton } from './FolderGrid'
import { PhotoGrid, PhotoGridSkeleton } from './PhotoGrid'
import { Lightbox } from './Lightbox'
import { UploadModal } from './UploadModal'
import { showToast } from '@/lib/toast'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type View = 'folders' | 'photos'

export function GalleryPage() {
  useDocumentTitle('Galerie')
  const { isGuest } = useAuth()
  const { data: folders = [], isLoading: foldersLoading } = useGalleryFolders()

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('folders')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [currentFolderName, setCurrentFolderName] = useState('')

  // ── Search/Sort ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('date-desc')

  // ── Photo state ─────────────────────────────────────────────────────────────
  const { data: photos = [], isLoading: photosLoading } = useGalleryPhotos(currentFolderId)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())

  // ── Lightbox ─────────────────────────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFolderName, setCreateFolderName] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createFolder = useCreateFolder()
  const renameFolder = useRenameFolder()
  const deleteFolder = useDeleteFolder()
  const deletePhotos = useDeletePhotos(currentFolderId ?? '')

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function openFolder(id: string, name: string) {
    setCurrentFolderId(id)
    setCurrentFolderName(name)
    setIsSelectionMode(false)
    setSelectedPhotos(new Set())
    setView('photos')
  }

  function backToFolders() {
    setView('folders')
    setCurrentFolderId(null)
    setIsSelectionMode(false)
    setSelectedPhotos(new Set())
  }

  function handleTogglePhotoSelect(id: string) {
    setSelectedPhotos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleToggleSelectionMode() {
    setIsSelectionMode(prev => {
      if (prev) setSelectedPhotos(new Set())
      return !prev
    })
  }

  function handleDeleteSelected() {
    if (!selectedPhotos.size) return
    setBulkDeleteConfirmOpen(true)
  }

  async function handleConfirmedDeleteSelected() {
    setBulkDeleteConfirmOpen(false)
    try {
      await deletePhotos.mutateAsync([...selectedPhotos])
      showToast('Fotky smazány.', 'success')
      setSelectedPhotos(new Set())
      setIsSelectionMode(false)
    } catch { /* onError in hook */ }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    const name = createFolderName.trim()
    if (!name) return
    try {
      await createFolder.mutateAsync(name)
      showToast('Album vytvořeno.', 'success')
      setCreateFolderName('')
      setShowCreateModal(false)
    } catch { /* onError in hook */ }
  }

  function openRenameModal(id: string) {
    const f = folders.find(x => x.id === id)
    if (!f) return
    setRenameFolderId(id)
    setRenameFolderValue(f.name)
    setShowRenameModal(true)
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    const name = renameFolderValue.trim()
    if (!name || !renameFolderId) return
    try {
      await renameFolder.mutateAsync({ id: renameFolderId, name })
      showToast('Přejmenováno.', 'success')
      setRenameFolderId(null)
      setShowRenameModal(false)
    } catch { /* onError in hook */ }
  }

  function openDeleteConfirm(id: string) {
    setDeleteFolderId(id)
  }

  async function handleConfirmedDeleteFolder() {
    if (!deleteFolderId) return
    try {
      await deleteFolder.mutateAsync(deleteFolderId)
      showToast('Album smazáno.', 'success')
      setDeleteFolderId(null)
    } catch { /* onError in hook */ }
  }

  return (
    <div className="gallery-page-wrapper">
      <div className="page-card gallery-glass-card">
        <AnimatePresence mode="wait">
          {view === 'folders' ? (
            <motion.div
              key="folders"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="gallery-view-container"
            >
              {foldersLoading ? (
                <FolderGridSkeleton />
              ) : (
                <FolderGrid
                  folders={folders}
                  searchQuery={searchQuery}
                  sortValue={sortValue}
                  isGuest={isGuest}
                  onSelect={openFolder}
                  onNewFolder={() => { setCreateFolderName(''); setShowCreateModal(true) }}
                  onRename={openRenameModal}
                  onDelete={openDeleteConfirm}
                  onSearchChange={setSearchQuery}
                  onSortChange={setSortValue}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="gallery-view-container"
            >
              {photosLoading ? (
                <PhotoGridSkeleton />
              ) : (
                <PhotoGrid
                  photos={photos}
                  isSelectionMode={isSelectionMode}
                  selectedPhotos={selectedPhotos}
                  isGuest={isGuest}
                  onOpenLightbox={setLightboxIndex}
                  onToggleSelect={handleTogglePhotoSelect}
                  onToggleSelectionMode={handleToggleSelectionMode}
                  onSelectAll={(ids) => setSelectedPhotos(new Set(ids))}
                  onDeselectAll={() => setSelectedPhotos(new Set())}
                  onDeleteSelected={handleDeleteSelected}
                  onUpload={() => setShowUploadModal(true)}
                  folderName={currentFolderName}
                  onBack={backToFolders}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Create folder modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nové album"
        maxWidth="max-w-sm"
        footer={
          <button type="submit" form="create-folder-form" className="btn-primary" disabled={createFolder.isPending}>
            {createFolder.isPending ? 'Vytvářím…' : 'Vytvořit'}
          </button>
        }
      >
        <form id="create-folder-form" onSubmit={handleCreateFolder}>
          <div className="form-group">
            <label htmlFor="folder-name-input" style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Název alba
            </label>
            <input
              id="folder-name-input"
              type="text"
              className="input-field"
              placeholder="např. Léto 2026"
              value={createFolderName}
              onChange={e => setCreateFolderName(e.target.value)}
              required
              autoFocus
              maxLength={100}
            />
          </div>
        </form>
      </Modal>

      {/* ── Rename folder modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Přejmenovat album"
        maxWidth="max-w-sm"
        footer={
          <button type="submit" form="rename-folder-form" className="btn-primary" disabled={renameFolder.isPending}>
            {renameFolder.isPending ? 'Ukládám…' : 'Přejmenovat'}
          </button>
        }
      >
        <form id="rename-folder-form" onSubmit={handleRename}>
          <div className="form-group">
            <label htmlFor="rename-input" style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Nový název
            </label>
            <input
              id="rename-input"
              type="text"
              className="input-field"
              value={renameFolderValue}
              onChange={e => setRenameFolderValue(e.target.value)}
              required
              autoFocus
              maxLength={100}
            />
          </div>
        </form>
      </Modal>

      {/* ── Delete folder confirm ──────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteFolderId}
        title="Smazat album"
        message={`Opravdu chcete smazat album „${folders.find(f => f.id === deleteFolderId)?.name ?? ''}" a všechny jeho fotky? Tuto akci nelze vrátit.`}
        confirmLabel="Smazat album"
        danger
        loading={deleteFolder.isPending}
        onConfirm={handleConfirmedDeleteFolder}
        onCancel={() => setDeleteFolderId(null)}
      />

      {/* ── Upload modal ───────────────────────────────────────────────────── */}
      {showUploadModal && currentFolderId && (
        <UploadModal
          folderId={currentFolderId}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && currentFolderId && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          folderId={currentFolderId}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* ── Bulk delete confirm ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen}
        title="Smazat fotky"
        message={`Opravdu chcete smazat ${selectedPhotos.size} vybraných fotek? Tuto akci nelze vrátit.`}
        confirmLabel="Smazat"
        danger
        onConfirm={handleConfirmedDeleteSelected}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </div>
  )
}
