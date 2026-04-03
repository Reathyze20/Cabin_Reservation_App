/**
 * features/reconstruction/TaskFormModal.tsx
 * Modal for creating/editing reconstruction items (idea / company / task).
 */
import { useState, useEffect, useRef } from 'react'
import type { RecItem, RecItemCreate, RecCategory } from '@/api/reconstruction'
import { Modal } from '@/components/shared/Modal'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  initialCategory: RecCategory
  editItem: RecItem | null
  onClose: () => void
  onSubmit: (data: RecItemCreate) => void
  isLoading?: boolean
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<RecCategory, string> = {
  idea: 'Nápad & Inspirace',
  company: 'Firma / Kontakt',
  task: 'Úkol & Rozpočet',
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function TaskFormModal({ initialCategory, editItem, onClose, onSubmit, isLoading }: Props) {
  const [category, setCategory] = useState<RecCategory>(
    editItem ? editItem.category : initialCategory,
  )
  const [title, setTitle] = useState(editItem?.title ?? '')
  const [description, setDescription] = useState(editItem?.description ?? '')
  const [link, setLink] = useState(editItem?.link ?? '')
  const [thumbnail, setThumbnail] = useState(editItem?.thumbnail ?? '')
  const [costIdea, setCostIdea] = useState<string>(editItem?.category === 'idea' ? String(editItem.cost ?? '') : '')
  const [phone, setPhone] = useState(editItem?.phone ?? '')
  const [email, setEmail] = useState(editItem?.email ?? '')
  const [companyLink, setCompanyLink] = useState(editItem?.category === 'company' ? (editItem.link ?? '') : '')
  const [companyStatus, setCompanyStatus] = useState<string>(
    editItem?.category === 'company' ? (editItem.status ?? 'pending') : 'pending',
  )
  const [deadline, setDeadline] = useState(
    editItem?.category === 'task' ? (editItem.deadline ? editItem.deadline.split('T')[0] : '') : '',
  )
  const [costTask, setCostTask] = useState<string>(editItem?.category === 'task' ? String(editItem.cost ?? '') : '')

  const isEdit = !!editItem
  const modalTitle = isEdit
    ? `Upravit — ${CATEGORY_LABELS[category]}`
    : `Nová položka — ${CATEGORY_LABELS[category]}`

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  // Sync initial category when prop changes (e.g. opening fresh modal)
  useEffect(() => {
    if (!editItem) setCategory(initialCategory)
  }, [initialCategory, editItem])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const data: RecItemCreate = { category, title: title.trim(), description: description.trim() }
    if (category === 'idea') {
      data.link = link.trim()
      data.thumbnail = thumbnail.trim()
      if (costIdea) data.cost = Number(costIdea)
    } else if (category === 'company') {
      data.phone = phone.trim()
      data.email = email.trim()
      data.link = companyLink.trim()
      data.status = companyStatus
    } else if (category === 'task') {
      data.deadline = deadline || undefined
      if (costTask) data.cost = Number(costTask)
    }
    onSubmit(data)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-lg"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Zrušit</button>
          <button type="submit" form="rec-task-form" className="rec-submit-btn btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Přidat položku'}
          </button>
        </div>
      }
    >
      <form id="rec-task-form" onSubmit={handleSubmit}>
          {/* Category select (hidden in edit mode) */}
          {!isEdit && (
            <div className="form-group">
              <label htmlFor="rec-category">Kategorie</label>
              <select
                id="rec-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as RecCategory)}
              >
                <option value="idea">💡 Nápad & Inspirace</option>
                <option value="company">🏢 Firma / Kontakt</option>
                <option value="task">✅ Úkol & Rozpočet</option>
              </select>
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label htmlFor="rec-title">Název *</label>
            <input
              ref={titleInputRef}
              id="rec-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder={
                category === 'idea'
                  ? 'Např. Nová terasa ze dřeva'
                  : category === 'company'
                    ? 'Např. Tesařství Novák s.r.o.'
                    : 'Např. Opravit střechu nad vchodem'
              }
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="rec-desc">Popis</label>
            <textarea
              id="rec-desc"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>

          {/* Idea fields */}
          {category === 'idea' && (
            <div id="dynamic-fields-idea" className="dynamic-fields">
              <div className="form-group">
                <label htmlFor="rec-link-idea">Odkaz (URL)</label>
                <input
                  id="rec-link-idea"
                  type="url"
                  value={link ?? ''}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="rec-thumbnail">Náhledový obrázek (URL)</label>
                <input
                  id="rec-thumbnail"
                  type="url"
                  value={thumbnail ?? ''}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="rec-cost-idea">Odhadovaná cena (Kč)</label>
                <input
                  id="rec-cost-idea"
                  type="number"
                  min="0"
                  value={costIdea}
                  onChange={(e) => setCostIdea(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Company fields */}
          {category === 'company' && (
            <div id="dynamic-fields-company" className="dynamic-fields">
              <div className="form-group">
                <label htmlFor="rec-phone">Telefon</label>
                <input
                  id="rec-phone"
                  type="tel"
                  value={phone ?? ''}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+420 123 456 789"
                />
              </div>
              <div className="form-group">
                <label htmlFor="rec-email">E-mail</label>
                <input
                  id="rec-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="firma@example.cz"
                />
              </div>
              <div className="form-group">
                <label htmlFor="rec-link-company">Web (URL)</label>
                <input
                  id="rec-link-company"
                  type="url"
                  value={companyLink ?? ''}
                  onChange={(e) => setCompanyLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="rec-status-company">Stav</label>
                <select
                  id="rec-status-company"
                  value={companyStatus}
                  onChange={(e) => setCompanyStatus(e.target.value)}
                >
                  <option value="pending">Čeká na kontakt</option>
                  <option value="contacted">Kontaktováno</option>
                  <option value="approved">Schváleno</option>
                  <option value="rejected">Zamítnuto</option>
                </select>
              </div>
            </div>
          )}

          {/* Task fields */}
          {category === 'task' && (
            <div id="dynamic-fields-task" className="dynamic-fields">
              <div className="form-group">
                <label htmlFor="rec-deadline">Termín</label>
                <input
                  id="rec-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="rec-cost-task">Odhadovaná cena (Kč)</label>
                <input
                  id="rec-cost-task"
                  type="number"
                  min="0"
                  value={costTask}
                  onChange={(e) => setCostTask(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}

      </form>
    </Modal>
  )
}
