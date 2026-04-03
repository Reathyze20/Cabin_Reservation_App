/**
 * FolderGrid.tsx — Album grid with context menu actions
 * Each card: cover image or gradient placeholder, name, count, date.
 * Three-dot menu per card for rename/delete (replaces confusing checkbox).
 */
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, FolderOpen, MoreVertical, Pencil, Trash2, Image } from 'lucide-react'
import type { GalleryFolder } from '@/api/gallery'

interface Props {
  folders: GalleryFolder[]
  searchQuery: string
  sortValue: string
  isGuest?: boolean
  onSelect: (id: string, name: string) => void
  onNewFolder: () => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onSearchChange: (v: string) => void
  onSortChange: (v: string) => void
}

function FolderContextMenu({ folderId, onRename, onDelete, onClose }: {
  folderId: string
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} className="folder-context-menu" onClick={e => e.stopPropagation()}>
      <button
        className="folder-context-item"
        onClick={() => { onRename(folderId); onClose() }}
      >
        <Pencil size={14} />
        Přejmenovat
      </button>
      <button
        className="folder-context-item folder-context-item--danger"
        onClick={() => { onDelete(folderId); onClose() }}
      >
        <Trash2 size={14} />
        Smazat
      </button>
    </div>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' as const },
  }),
}

export function FolderGrid({
  folders,
  searchQuery,
  sortValue,
  isGuest = false,
  onSelect,
  onNewFolder,
  onRename,
  onDelete,
  onSearchChange,
  onSortChange,
}: Props) {
  const [contextMenuId, setContextMenuId] = useState<string | null>(null)

  // Filter + sort
  let filtered = [...folders]
  if (searchQuery) {
    const t = searchQuery.toLowerCase()
    filtered = filtered.filter(f => f.name.toLowerCase().includes(t))
  }
  filtered.sort((a, b) => {
    if (sortValue === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sortValue === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    if (sortValue === 'name-asc') return a.name.localeCompare(b.name)
    if (sortValue === 'name-desc') return b.name.localeCompare(a.name)
    return 0
  })

  return (
    <>
      {/* Header */}
      <div className="gallery-header">
        <h2 className="gallery-title">
          <Image size={22} style={{ color: 'var(--brand-primary)' }} />
          Galerie
        </h2>
        <div className="gallery-toolbar">
          <div className="gallery-search-wrapper">
            <Search size={16} className="gallery-search-icon" />
            <input
              type="text"
              placeholder="Hledat album…"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="gallery-search-input"
              aria-label="Hledat album"
            />
          </div>
          <select
            value={sortValue}
            onChange={e => onSortChange(e.target.value)}
            className="gallery-sort-select"
            aria-label="Řazení alb"
          >
            <option value="date-desc">Nejnovější</option>
            <option value="date-asc">Nejstarší</option>
            <option value="name-asc">A → Z</option>
            <option value="name-desc">Z → A</option>
          </select>
          {!isGuest && (
            <button className="btn-primary gallery-new-album-btn" onClick={onNewFolder}>
              <Plus size={16} />
              <span className="gallery-btn-label">Nové album</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="folders-grid" role="list" aria-label="Seznam alb">
        {/* New album placeholder */}
        {!isGuest && (
          <motion.div
            className="folder-card folder-card--new"
            onClick={onNewFolder}
            whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.12)' }}
            transition={{ duration: 0.2 }}
            role="listitem"
            aria-label="Vytvořit nové album"
          >
            <div className="folder-card__cover folder-card__cover--dashed">
              <Plus size={32} strokeWidth={1.5} />
            </div>
            <div className="folder-card__info">
              <span className="folder-card__name">Nové album</span>
            </div>
          </motion.div>
        )}

        {/* Empty states */}
        {folders.length === 0 && (
          <div className="gallery-empty-state" style={{ gridColumn: '1 / -1' }}>
            <FolderOpen size={48} strokeWidth={1} style={{ color: 'var(--text-placeholder)' }} />
            <p className="gallery-empty-title">Zatím nemáte žádná alba</p>
            <p className="gallery-empty-subtitle">Začněte nahrávat fotky z vaší chaty!</p>
            {!isGuest && (
              <button className="btn-primary" onClick={onNewFolder} style={{ marginTop: 12 }}>
                <Plus size={16} /> Vytvořit první album
              </button>
            )}
          </div>
        )}
        {filtered.length === 0 && folders.length > 0 && (
          <div className="gallery-empty-state" style={{ gridColumn: '1 / -1' }}>
            <Search size={36} strokeWidth={1} style={{ color: 'var(--text-placeholder)' }} />
            <p className="gallery-empty-title">Žádné album neodpovídá hledání</p>
          </div>
        )}

        {/* Folder cards */}
        {filtered.map((f, i) => (
          <motion.div
            key={f.id}
            className="folder-card"
            onClick={() => onSelect(f.id, f.name)}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.12)' }}
            role="listitem"
            aria-label={`Album ${f.name}, ${f.photoCount ?? 0} ${(f.photoCount ?? 0) === 1 ? 'fotka' : (f.photoCount ?? 0) >= 2 && (f.photoCount ?? 0) <= 4 ? 'fotky' : 'fotek'}`}
          >
            <div className="folder-card__cover">
              {f.coverPhotoUrl ? (
                <img src={f.coverPhotoUrl} alt={f.name} loading="lazy" />
              ) : (
                <div className="folder-card__cover-placeholder">
                  <FolderOpen size={32} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="folder-card__info">
              <span className="folder-card__name">{f.name}</span>
              <div className="folder-card__meta">
                <span>{f.photoCount ?? 0} {(f.photoCount ?? 0) === 1 ? 'fotka' : (f.photoCount ?? 0) >= 2 && (f.photoCount ?? 0) <= 4 ? 'fotky' : 'fotek'}</span>
                <span>{new Date(f.createdAt).toLocaleDateString('cs-CZ')}</span>
              </div>
            </div>

            {/* Context menu trigger */}
            {!isGuest && (
              <button
                className="folder-card__menu-btn"
                onClick={e => {
                  e.stopPropagation()
                  setContextMenuId(prev => prev === f.id ? null : f.id)
                }}
                aria-label={`Akce pro album ${f.name}`}
              >
                <MoreVertical size={16} />
              </button>
            )}
            {contextMenuId === f.id && (
              <FolderContextMenu
                folderId={f.id}
                onRename={onRename}
                onDelete={onDelete}
                onClose={() => setContextMenuId(null)}
              />
            )}
          </motion.div>
        ))}
      </div>
    </>
  )
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
export function FolderGridSkeleton() {
  return (
    <>
      <div className="gallery-header">
        <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 8 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="skeleton" style={{ width: 180, height: 36, borderRadius: 20 }} />
          <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 20 }} />
        </div>
      </div>
      <div className="folders-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="folder-card" style={{ pointerEvents: 'none' }}>
            <div className="folder-card__cover">
              <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
            </div>
            <div className="folder-card__info">
              <div className="skeleton" style={{ width: '60%', height: 16, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 4, marginTop: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
