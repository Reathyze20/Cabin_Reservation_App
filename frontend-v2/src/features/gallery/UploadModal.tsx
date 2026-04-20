/**
 * UploadModal.tsx — Upload modal with drag & drop, file previews, progress
 */
import { useState, useRef, useMemo, useEffect } from 'react'
import { useUploadPhotos } from './hooks/useGallery'
import { showToast } from '@/lib/toast'
import { formatCount, pluralize } from '@/lib/utils'
import { Modal } from '@/components/shared/Modal'
import { Upload, ImagePlus, X } from 'lucide-react'
import { getNetworkAwareActionMessage } from '@/lib/networkError'

interface Props {
  folderId: string
  onClose: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadModal({ folderId, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadPhotos(folderId)

  const previews = useMemo(
    () => files.map(f => ({ name: f.name, size: f.size, url: URL.createObjectURL(f) })),
    [files],
  )

  // Revoke old object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const incoming = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    if (incoming.length === 0) {
      showToast('Povoleny jsou pouze obrázky.', 'error')
      return
    }
    setSubmitError(null)
    setFiles(prev => [...prev, ...incoming])
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!files.length) return
    setSubmitError(null)
    try {
      await upload.mutateAsync(files)
      const verb = pluralize(files.length, 'Nahrána', 'Nahrány', 'Nahráno')
      showToast(`${verb} ${formatCount(files.length, 'fotka', 'fotky', 'fotek')}.`, 'success')
      onClose()
    } catch (error) {
      setSubmitError(
        getNetworkAwareActionMessage(
          error,
          'Fotky se nepodařilo nahrát. Zkuste to znovu.',
          'Spojení vypadlo dřív, než se fotky stihly nahrát. Zkuste to znovu po obnovení připojení.',
        ),
      )
    }
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Nahrát fotky"
      maxWidth="max-w-md"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {files.length > 0 && `${files.length} souborů · ${formatSize(totalSize)}`}
          </span>
          <button
            type="submit"
            form="upload-photo-form"
            className="btn-primary"
            disabled={upload.isPending || files.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Upload size={16} />
            {upload.isPending ? 'Nahrávám…' : 'Nahrát'}
          </button>
        </div>
      }
    >
      <form id="upload-photo-form" onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          className={`upload-dropzone${isDragging ? ' upload-dropzone--active' : ''}${files.length > 0 ? ' upload-dropzone--has-files' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = '' }}
            style={{ display: 'none' }}
          />
          <ImagePlus size={28} strokeWidth={1.5} style={{ color: isDragging ? 'var(--brand-primary)' : 'var(--text-placeholder)' }} />
          <p className="upload-dropzone__text">
            {isDragging ? 'Pusťte soubory zde' : 'Přetáhněte fotky sem'}
          </p>
          <span className="upload-dropzone__subtext">nebo klikněte pro výběr</span>
        </div>

        {/* File previews */}
        {files.length > 0 && (
          <div className="upload-previews">
            {previews.map((p, i) => (
              <div key={`${p.name}-${i}`} className="upload-preview-item">
                <img src={p.url} alt={p.name} />
                <button
                  type="button"
                  className="upload-preview-remove"
                  onClick={e => { e.stopPropagation(); removeFile(i) }}
                  aria-label={`Odebrat ${p.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <div
              className="upload-preview-add"
              onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
            >
              <ImagePlus size={20} strokeWidth={1.5} />
            </div>
          </div>
        )}

        {/* Upload progress */}
        {upload.isPending && (
          <div className="upload-progress-bar">
            <div className="upload-progress-bar__fill" />
          </div>
        )}
        {submitError ? (
          <div className="error-message show" role="alert">{submitError}</div>
        ) : null}
      </form>
    </Modal>
  )
}
