/**
 * features/reconstruction/TaskFormModal.tsx
 * Modal for creating/editing reconstruction items (idea / company / task).
 */
import { useState, useEffect, useRef } from 'react'
import type { CompanyStatus, RecItem, RecItemCreate, RecCategory } from '@/api/reconstruction'
import { Modal } from '@/components/shared/Modal'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  CalendarDays,
  FileText,
  Globe,
  Hammer,
  Image as ImageIcon,
  Lightbulb,
  Link2,
  Mail,
  Phone,
  Wallet,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  initialCategory: RecCategory
  editItem: RecItem | null
  onClose: () => void
  onSubmit: (data: RecItemCreate) => void
  isLoading?: boolean
  errorMessage?: string | null
  onDirty?: () => void
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<RecCategory, string> = {
  idea: 'Nápad & Inspirace',
  company: 'Firma / Kontakt',
  task: 'Úkol & Rozpočet',
}

const CATEGORY_TABS: Array<{ value: RecCategory; label: string; icon: LucideIcon }> = [
  { value: 'idea', label: 'Nápad', icon: Lightbulb },
  { value: 'company', label: 'Firma', icon: Building2 },
  { value: 'task', label: 'Úkol', icon: Hammer },
]

function getInitialCompanyStatus(editItem: RecItem | null): CompanyStatus {
  if (editItem?.category !== 'company') {
    return 'pending'
  }

  if (editItem.status === 'contacted' || editItem.status === 'approved' || editItem.status === 'rejected') {
    return editItem.status
  }

  return 'pending'
}

interface FieldLabelProps {
  htmlFor: string
  icon: LucideIcon
  children: string
  required?: boolean
}

function FieldLabel({ htmlFor, icon: Icon, children, required = false }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="form-label">
      <span className="rec-label-content">
        <Icon size={14} className="rec-label-icon" aria-hidden="true" />
        <span>{children}</span>
        {required && <span className="label-required">*</span>}
      </span>
    </label>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function TaskFormModal({ initialCategory, editItem, onClose, onSubmit, isLoading, errorMessage, onDirty }: Props) {
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
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus>(getInitialCompanyStatus(editItem))
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
        <div className="rec-modal-footer-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading} data-testid="reconstruction-cancel-button">Zrušit</button>
          <button type="submit" form="rec-task-form" className="rec-submit-btn btn btn-primary" disabled={isLoading} data-testid="reconstruction-submit-button">
            {isLoading ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Přidat položku'}
          </button>
        </div>
      }
    >
      <form id="rec-task-form" className="rec-modal-form" onSubmit={handleSubmit} onChangeCapture={() => onDirty?.()} data-testid="reconstruction-item-form">
          {/* Category select (hidden in edit mode) */}
          {!isEdit && (
            <div className="form-group">
              <span className="form-label">Kategorie</span>
              <div className="rec-category-tabs" role="tablist" aria-label="Kategorie položky rekonstrukce" data-testid="reconstruction-category-tabs">
                {CATEGORY_TABS.map(({ value, label, icon: Icon }) => {
                  const isActive = category === value
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`rec-category-tab${isActive ? ' is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => {
                        onDirty?.()
                        setCategory(value)
                      }}
                      data-testid="reconstruction-category-tab"
                      data-category={value}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <FieldLabel htmlFor="rec-title" icon={FileText} required>Název</FieldLabel>
            <input
              ref={titleInputRef}
              id="rec-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              data-testid="reconstruction-title-input"
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
            <FieldLabel htmlFor="rec-desc" icon={FileText}>Popis</FieldLabel>
            <textarea
              id="rec-desc"
              className="form-input"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              data-testid="reconstruction-description-input"
            />
          </div>

          {/* Idea fields */}
          {category === 'idea' && (
            <div id="dynamic-fields-idea" className="dynamic-fields">
              <div className="form-group">
                <FieldLabel htmlFor="rec-link-idea" icon={Link2}>Odkaz</FieldLabel>
                <input
                  id="rec-link-idea"
                  type="url"
                  className="form-input"
                  value={link ?? ''}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  data-testid="reconstruction-idea-link-input"
                />
              </div>
              <div className="form-group">
                <FieldLabel htmlFor="rec-thumbnail" icon={ImageIcon}>Náhledový obrázek</FieldLabel>
                <input
                  id="rec-thumbnail"
                  type="url"
                  className="form-input"
                  value={thumbnail ?? ''}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://..."
                  data-testid="reconstruction-idea-thumbnail-input"
                />
              </div>
              <div className="form-group">
                <FieldLabel htmlFor="rec-cost-idea" icon={Wallet}>Odhadovaná cena</FieldLabel>
                <input
                  id="rec-cost-idea"
                  type="number"
                  min="0"
                  className="form-input"
                  value={costIdea}
                  onChange={(e) => setCostIdea(e.target.value)}
                  placeholder="0"
                  data-testid="reconstruction-idea-cost-input"
                />
              </div>
            </div>
          )}

          {/* Company fields */}
          {category === 'company' && (
            <div id="dynamic-fields-company" className="dynamic-fields">
              <div className="form-group">
                <FieldLabel htmlFor="rec-phone" icon={Phone}>Telefon</FieldLabel>
                <input
                  id="rec-phone"
                  type="tel"
                  className="form-input"
                  value={phone ?? ''}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+420 123 456 789"
                  data-testid="reconstruction-company-phone-input"
                />
              </div>
              <div className="form-group">
                <FieldLabel htmlFor="rec-email" icon={Mail}>E-mail</FieldLabel>
                <input
                  id="rec-email"
                  type="email"
                  className="form-input"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="firma@example.cz"
                  data-testid="reconstruction-company-email-input"
                />
              </div>
              <div className="form-group">
                <FieldLabel htmlFor="rec-link-company" icon={Globe}>Web</FieldLabel>
                <input
                  id="rec-link-company"
                  type="url"
                  className="form-input"
                  value={companyLink ?? ''}
                  onChange={(e) => setCompanyLink(e.target.value)}
                  placeholder="https://..."
                  data-testid="reconstruction-company-link-input"
                />
              </div>
              <div className="form-group">
                <FieldLabel htmlFor="rec-status-company" icon={Building2}>Stav</FieldLabel>
                <select
                  id="rec-status-company"
                  className="form-input"
                  value={companyStatus}
                  onChange={(e) => setCompanyStatus(e.target.value as CompanyStatus)}
                  data-testid="reconstruction-company-status-select"
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
                <FieldLabel htmlFor="rec-deadline" icon={CalendarDays}>Termín</FieldLabel>
                <input
                  id="rec-deadline"
                  type="date"
                  className="form-input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  data-testid="reconstruction-task-deadline-input"
                />
              </div>
              <div className="form-group">
                <FieldLabel htmlFor="rec-cost-task" icon={Wallet}>Odhadovaná cena</FieldLabel>
                <input
                  id="rec-cost-task"
                  type="number"
                  min="0"
                  className="form-input"
                  value={costTask}
                  onChange={(e) => setCostTask(e.target.value)}
                  placeholder="0"
                  data-testid="reconstruction-task-cost-input"
                />
              </div>
            </div>
          )}
          {errorMessage ? (
            <div className="error-message show" role="alert" data-testid="reconstruction-form-error">{errorMessage}</div>
          ) : null}

      </form>
    </Modal>
  )
}
