/**
 * PhotoGrid.tsx — Masonry photo grid with selection mode + classic pagination
 * CSS columns masonry, paginated with prev/next + page number buttons.
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, CheckSquare, ChevronLeft, ChevronRight, Trash2, Upload, X } from 'lucide-react'
import type { GalleryPhoto } from '@/api/gallery'
import { formatCount } from '@/lib/utils'

const PAGE_SIZE = 10

interface Props {
  photos: GalleryPhoto[]
  isSelectionMode: boolean
  selectedPhotos: Set<string>
  isGuest?: boolean
  onOpenLightbox: (index: number) => void
  onToggleSelect: (id: string) => void
  onToggleSelectionMode: () => void
  onSelectAll: (ids: string[]) => void
  onDeselectAll: () => void
  onDeleteSelected: () => void
  onUpload: () => void
  folderName: string
  onBack: () => void
}

export function PhotoGrid({
  photos,
  isSelectionMode,
  selectedPhotos,
  isGuest = false,
  onOpenLightbox,
  onToggleSelect,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onUpload,
  folderName,
  onBack,
}: Props) {
  const [page, setPage] = useState(0)
  const masonryRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.max(1, Math.ceil(photos.length / PAGE_SIZE))
  const pagePhotos = photos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset to page 0 when folder changes
  useEffect(() => {
    setPage(0)
  }, [photos])

  function goToPage(p: number) {
    setPage(p)
    // Scroll masonry container to top on page change
    masonryRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectAll() {
    if (selectedPhotos.size === photos.length) {
      onDeselectAll()
    } else {
      onSelectAll(photos.map(p => p.id))
    }
  }

  return (
    <>
      {/* Header */}
      <div className="gallery-header">
        <div className="gallery-breadcrumb">
          <button
            className="gallery-back-btn"
            onClick={onBack}
            aria-label="Zpět na seznam alb"
            data-testid="gallery-back-to-folders-button"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="gallery-title">
            <button className="gallery-breadcrumb-link" onClick={onBack}>
              Galerie
            </button>
            <span className="gallery-breadcrumb-sep">/</span>
            <span>{folderName}</span>
          </h2>
        </div>
        <div className="gallery-toolbar">
          {!isGuest && (
            <>
              <AnimatePresence>
                {isSelectionMode && (
                  <motion.div
                    className="gallery-selection-bar"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button className="gallery-tool-btn" onClick={handleSelectAll} title="Vybrat vše">
                      <CheckSquare size={16} />
                    </button>
                    <span className="gallery-selection-count">
                      {selectedPhotos.size} vybráno
                    </span>
                    <button
                      className="gallery-tool-btn gallery-tool-btn--danger"
                      onClick={onDeleteSelected}
                      disabled={selectedPhotos.size === 0}
                      title="Smazat vybrané"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                className={`gallery-tool-btn ${isSelectionMode ? 'gallery-tool-btn--active' : ''}`}
                onClick={onToggleSelectionMode}
                title={isSelectionMode ? 'Zrušit výběr' : 'Vybrat fotky'}
              >
                {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />}
                <span className="gallery-btn-label">{isSelectionMode ? 'Zrušit' : 'Vybrat'}</span>
              </button>
              <button className="btn-primary gallery-upload-btn" onClick={onUpload} data-testid="gallery-upload-button">
                <Upload size={16} />
                <span className="gallery-btn-label">Nahrát</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Photo grid — masonry via CSS columns */}
      <div
        ref={masonryRef}
        className={`photos-masonry${pagePhotos.length <= 1 ? ' photos-masonry--cols-1' : pagePhotos.length <= 3 ? ' photos-masonry--cols-2' : ''}`}
        role="grid"
        aria-label={`Fotky v albu ${folderName}`}
        data-testid="gallery-photo-grid"
      >
        {photos.length === 0 && (
          <div className="gallery-empty-state" style={{ gridColumn: '1 / -1' }}>
            <Upload size={40} strokeWidth={1} style={{ color: 'var(--text-placeholder)' }} />
            <p className="gallery-empty-title">Album je prázdné</p>
            <p className="gallery-empty-subtitle">Nahrajte své první fotky</p>
            {!isGuest && (
              <button className="btn-primary" onClick={onUpload} style={{ marginTop: 12 }} data-testid="gallery-empty-upload-button">
                <Upload size={16} /> Nahrát fotky
              </button>
            )}
          </div>
        )}
        {pagePhotos.map((photo, idx) => {
          const globalIdx = page * PAGE_SIZE + idx
          const isSelected = selectedPhotos.has(photo.id)
          return (
            <motion.div
              key={photo.id}
              className={`photo-masonry-item${isSelected ? ' photo-masonry-item--selected' : ''}`}
              onClick={() => {
                if (isSelectionMode) onToggleSelect(photo.id)
                else onOpenLightbox(globalIdx)
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={photo.description ?? `Fotka ${globalIdx + 1}`}
              data-testid="gallery-photo-card"
              data-photo-id={photo.id}
            >
              <img
                src={photo.thumb ?? photo.src}
                alt={photo.description ?? ''}
                loading="lazy"
              />
              <div className="photo-masonry-overlay" />
              {isSelectionMode && (
                <div className={`photo-select-badge${isSelected ? ' photo-select-badge--active' : ''}`}>
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              )}
              {photo.description && !isSelectionMode && (
                <div className="photo-masonry-desc">{photo.description}</div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Pagination + photo count */}
      {photos.length > 0 && (
        <div className="gallery-pagination-bar">
          {totalPages > 1 ? (
            <div className="gallery-pagination">
              <button
                className="gallery-page-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                aria-label="Předchozí stránka"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`gallery-page-btn${i === page ? ' gallery-page-btn--active' : ''}`}
                  onClick={() => goToPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="gallery-page-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages - 1}
                aria-label="Další stránka"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          ) : null}
          <div className="gallery-photo-count">
            {formatCount(photos.length, 'fotka', 'fotky', 'fotek')}
          </div>
        </div>
      )}
    </>
  )
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
export function PhotoGridSkeleton() {
  const heights = [180, 240, 160, 280, 200, 220, 160, 260]
  return (
    <>
      <div className="gallery-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div className="skeleton" style={{ width: 160, height: 24, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 20 }} />
          <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 20 }} />
        </div>
      </div>
      <div className="photos-masonry">
        {heights.map((h, i) => (
          <div key={i} className="photo-masonry-item" style={{ pointerEvents: 'none' }}>
            <div className="skeleton" style={{ width: '100%', height: h, borderRadius: 'var(--radius-lg)' }} />
          </div>
        ))}
      </div>
    </>
  )
}
