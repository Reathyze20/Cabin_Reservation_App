/**
 * Lightbox.tsx — Premium fullscreen photo viewer
 * Top toolbar: counter + download + delete + close
 * Keyboard: Escape/←/→, touch swipe, description (vzpomínka)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, Trash2, X, MessageSquarePlus } from 'lucide-react'
import type { GalleryPhoto } from '@/api/gallery'
import { useUpdatePhoto, useDeletePhoto } from './hooks/useGallery'
import { useAuth } from '@/context/AuthContext'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { showToast } from '@/lib/toast'
import { getNetworkAwareActionMessage } from '@/lib/networkError'

const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  photos: GalleryPhoto[]
  initialIndex: number
  folderId: string
  onClose: () => void
}

export function Lightbox({ photos, initialIndex, folderId, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [showDescForm, setShowDescForm] = useState(false)
  const [descValue, setDescValue] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [descError, setDescError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const descInputRef = useRef<HTMLInputElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const touchStartX = useRef<number | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const { user } = useAuth()
  const updatePhoto = useUpdatePhoto(folderId)
  const deletePhoto = useDeletePhoto(folderId)

  const photo = photos[index]
  const isOwnerOrAdmin = user?.role === 'admin' || photo?.uploadedBy === user?.username

  // Auto-hide controls after inactivity
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000)
  }, [])

  useEffect(() => {
    resetHideTimer()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [resetHideTimer])

  // Focus trap: save previous focus, restore on unmount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    // Focus the overlay container for keyboard capture
    overlayRef.current?.focus()
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  // Reset description on photo change
  useEffect(() => {
    setShowDescForm(false)
    setDescValue(photo?.description ?? '')
    setDescError(null)
    setDeleteError(null)
  }, [photo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showDescForm) descInputRef.current?.focus()
  }, [showDescForm])

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'ArrowLeft' && index > 0) { setIndex(i => i - 1); resetHideTimer() }
      if (e.key === 'ArrowRight' && index < photos.length - 1) { setIndex(i => i + 1); resetHideTimer() }
      // Focus trap: loop Tab within the lightbox
      if (e.key === 'Tab' && overlayRef.current) {
        const focusable = overlayRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusable.length === 0) { e.preventDefault(); return }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, photos.length, resetHideTimer])

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).classList.contains('lb-overlay')) onClose()
  }

  async function handleSaveDesc() {
    if (!photo) return
    setDescError(null)
    try {
      await updatePhoto.mutateAsync({ id: photo.id, description: descValue })
      showToast('Vzpomínka uložena.', 'success')
      setShowDescForm(false)
    } catch (error) {
      setDescError(
        getNetworkAwareActionMessage(
          error,
          'Vzpomínku se nepodařilo uložit. Zkuste to znovu.',
          'Spojení vypadlo dřív, než se vzpomínka stihla uložit. Zkuste to znovu po obnovení připojení.',
        ),
      )
    }
  }

  async function handleConfirmedDelete() {
    if (!photo) return
    setDeleteError(null)
    try {
      await deletePhoto.mutateAsync(photo.id)
      setDeleteConfirmOpen(false)
      if (photos.length <= 1) {
        onClose()
      } else if (index >= photos.length - 1) {
        setIndex(i => i - 1)
      }
    } catch (error) {
      setDeleteError(
        getNetworkAwareActionMessage(
          error,
          'Fotku se nepodařilo smazat. Zkuste to znovu.',
          'Spojení vypadlo dřív, než se fotka stihla smazat. Zkuste to znovu po obnovení připojení.',
        ),
      )
    }
  }

  // Touch swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 60 && index < photos.length - 1) { setIndex(i => i + 1); resetHideTimer() }
    else if (diff < -60 && index > 0) { setIndex(i => i - 1); resetHideTimer() }
    touchStartX.current = null
  }

  if (!photo) return null

  return createPortal(
    <>
      <div
        ref={overlayRef}
        className="lb-overlay"
        onClick={handleBackdrop}
        onMouseMove={resetHideTimer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Prohlížeč fotek"
        tabIndex={-1}
      >
        {/* ── Top toolbar ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {controlsVisible && (
            <motion.div
              className="lb-toolbar"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <span className="lb-counter">{index + 1} / {photos.length}</span>
              <div className="lb-toolbar-actions">
                <a
                  className="lb-action-btn"
                  href={photo.src}
                  download="foto.jpg"
                  onClick={e => e.stopPropagation()}
                  title="Stáhnout"
                >
                  <Download size={18} />
                </a>
                {isOwnerOrAdmin && (
                  <button
                    className="lb-action-btn lb-action-btn--danger"
                    onClick={e => { e.stopPropagation(); setDeleteError(null); setDeleteConfirmOpen(true) }}
                    disabled={deletePhoto.isPending}
                    title="Smazat"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  className="lb-action-btn"
                  onClick={e => { e.stopPropagation(); onClose() }}
                  title="Zavřít"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Photo ────────────────────────────────────────────────────── */}
        <div className="lb-image-wrapper">
          <AnimatePresence mode="wait">
            <motion.img
              key={photo.id}
              src={photo.src}
              alt={photo.description ?? ''}
              className="lb-image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>
        </div>

        {/* ── Navigation arrows ────────────────────────────────────────── */}
        <AnimatePresence>
          {controlsVisible && photos.length > 1 && (
            <>
              {index > 0 && (
                <motion.button
                  className="lb-nav lb-nav--left"
                  onClick={e => { e.stopPropagation(); setIndex(i => i - 1); resetHideTimer() }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-label="Předchozí fotka"
                >
                  <ChevronLeft size={28} />
                </motion.button>
              )}
              {index < photos.length - 1 && (
                <motion.button
                  className="lb-nav lb-nav--right"
                  onClick={e => { e.stopPropagation(); setIndex(i => i + 1); resetHideTimer() }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-label="Další fotka"
                >
                  <ChevronRight size={28} />
                </motion.button>
              )}
            </>
          )}
        </AnimatePresence>

        {/* ── Caption / description ────────────────────────────────────── */}
        <div className="lb-caption">
          {showDescForm ? (
            <div className="lb-desc-form">
              <input
                ref={descInputRef}
                type="text"
                className="lb-desc-input"
                placeholder="Vaše vzpomínka…"
                value={descValue}
                onChange={e => {
                  if (descError) setDescError(null)
                  setDescValue(e.target.value)
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveDesc(); if (e.key === 'Escape') setShowDescForm(false) }}
                maxLength={500}
              />
              <button className="lb-desc-save" onClick={handleSaveDesc} disabled={updatePhoto.isPending}>
                {updatePhoto.isPending ? '…' : 'Uložit'}
              </button>
            </div>
          ) : photo.description ? (
            <>
              {descError ? (
                <div className="error-message show" role="alert">{descError}</div>
              ) : null}
              <motion.span
                className="lb-description"
                onClick={() => {
                  setDescError(null)
                  setShowDescForm(true)
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {photo.description}
              </motion.span>
            </>
          ) : photo.description ? (
            <motion.span
              className="lb-description"
              onClick={() => {
                setDescError(null)
                setShowDescForm(true)
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {photo.description}
            </motion.span>
          ) : (
            <>
              {descError ? (
                <div className="error-message show" role="alert">{descError}</div>
              ) : null}
              <button className="lb-add-desc-btn" onClick={() => { setDescError(null); setShowDescForm(true) }}>
                <MessageSquarePlus size={14} />
                Přidat vzpomínku
              </button>
            </>
          )}
          {showDescForm && descError ? (
            <div className="error-message show" role="alert">{descError}</div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Smazat fotku"
        message="Opravdu chcete smazat tuto fotku? Tuto akci nelze vrátit."
        confirmLabel="Smazat"
        danger
        loading={deletePhoto.isPending}
        errorMessage={deleteError}
        onConfirm={handleConfirmedDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false)
          setDeleteError(null)
        }}
      />
    </>,
    document.body
  )
}
