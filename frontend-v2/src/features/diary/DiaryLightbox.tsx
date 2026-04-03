/**
 * DiaryLightbox.tsx — Lightbox pro fotky v deníku
 * Jednodušší než gallery lightbox – bez editace popisu a mazání
 */
import { useEffect, useState } from 'react'
import type { GalleryPhoto } from '@/api/gallery'

interface Props {
  photos: GalleryPhoto[]
  initialIndex: number
  onClose: () => void
}

export function DiaryLightbox({ photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)

  function prev() { setIndex(i => (i - 1 + photos.length) % photos.length) }
  function next() { setIndex(i => (i + 1) % photos.length) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, onClose])

  const photo = photos[index]
  if (!photo) return null

  return (
    <div
      className="lightbox-overlay"
      id="diary-lightbox-modal"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="lightbox-content">
        <button className="lightbox-close" onClick={onClose} aria-label="Zavřít">×</button>

        {photos.length > 1 && (
          <>
            <button className="lightbox-arrow lightbox-arrow-left" onClick={prev} aria-label="Předchozí">‹</button>
            <button className="lightbox-arrow lightbox-arrow-right" onClick={next} aria-label="Další">›</button>
          </>
        )}

        <img id="diary-lightbox-img" src={photo.src} alt={photo.description ?? ''} />

        {photo.description && (
          <div className="lightbox-caption" id="diary-lightbox-description">
            <p className="lightbox-description">{photo.description}</p>
          </div>
        )}

        <div className="lightbox-controls">
          <a className="lightbox-btn" href={photo.src} download target="_blank" rel="noreferrer">↓ Stáhnout</a>
        </div>
      </div>
    </div>
  )
}
