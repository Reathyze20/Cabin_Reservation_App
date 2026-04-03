/**
 * ShareListDialog.tsx — Sdílení nákupního seznamu do Notes chatu
 * Akce: "Nový seznam" nebo "Jdu nakupovat" → vyber vlákno → odešli zprávu
 */
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { notesThreadApi } from '@/api/shopping'
import type { NoteThread } from '@/api/shopping'
import { showToast } from '@/lib/toast'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/shared/Modal'

interface Props {
  listId: string
  listName: string
  onClose: () => void
}

type ActionType = 'new' | 'going'

function buildMessage(action: ActionType, listName: string): string {
  if (action === 'new') {
    return `[Nový seznam] Založil(a) jsem nový nákupní seznam: "${listName}". Prosím, doplňte, co chybí.`
  }
  return `[Nákup] Jdu nakupovat podle seznamu: "${listName}". Máte poslední šanci něco připsat!`
}

export function ShareListDialog({ listName, onClose }: Props) {
  const navigate = useNavigate()
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null | undefined>(undefined)
  const [showNewThreadForm, setShowNewThreadForm] = useState(false)
  const [newThreadName, setNewThreadName] = useState('')
  const [showTargetSection, setShowTargetSection] = useState(false)

  const {
    data: threads = [],
    isLoading: threadsLoading,
  } = useQuery<NoteThread[]>({
    queryKey: ['note-threads'],
    queryFn: notesThreadApi.getThreads,
    enabled: showTargetSection,
    staleTime: 60_000,
  })

  const createThread = useMutation({
    mutationFn: (name: string) => notesThreadApi.createThread(name),
    onSuccess: (thread) => {
      setSelectedThreadId(thread.id)
      setShowNewThreadForm(false)
      setNewThreadName('')
    },
    onError: () => showToast('Chyba při vytváření vlákna.', 'error'),
  })

  const sendNote = useMutation({
    mutationFn: () =>
      notesThreadApi.postNote(buildMessage(selectedAction!, listName), selectedThreadId ?? null),
    onSuccess: () => {
      sessionStorage.setItem('notes_goto_thread', selectedThreadId ?? '__main__')
      showToast('Zpráva odeslána. Přejíždím na nástěnku…', 'success')
      onClose()
      setTimeout(() => navigate('/notes'), 600)
    },
    onError: () => showToast('Chyba při odesílání zprávy.', 'error'),
  })

  function handleSelectAction(action: ActionType) {
    setSelectedAction(action)
    setShowTargetSection(true)
  }

  function handleSelectThread(id: string | null) {
    setSelectedThreadId(id)
  }

  const canSend = selectedAction !== null && selectedThreadId !== undefined

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Sdílet do nástěnky"
      footer={
        <>
          <button className="button-secondary" onClick={onClose}>Zrušit</button>
          <button
            className="button-primary"
            disabled={!canSend || sendNote.isPending}
            onClick={() => canSend && sendNote.mutate()}
          >
            Odeslat
          </button>
        </>
      }
    >
          <p className="share-note-subtitle">
            seznam: „<strong>{listName}</strong>"
          </p>

          <p className="share-note-step-label">1. Vyberte typ zprávy:</p>
          <div className="share-note-options">
            <button
              id="share-note-new"
              className={`share-note-btn${selectedAction === 'new' ? ' is-selected' : ''}`}
              onClick={() => handleSelectAction('new')}
            >
              <span className="share-note-btn-icon">📋</span>
              <div>
                <strong>Upozornit na nový seznam</strong>
                <span>Pošle zprávu ostatním, ať doplní položky</span>
              </div>
              {selectedAction === 'new' && <span className="share-note-selected-mark">✓</span>}
            </button>
            <button
              id="share-note-going"
              className={`share-note-btn share-note-btn-urgent${selectedAction === 'going' ? ' is-selected' : ''}`}
              onClick={() => handleSelectAction('going')}
            >
              <span className="share-note-btn-icon">🏃</span>
              <div>
                <strong>Jdu do obchodu</strong>
                <span>Urgentní výzva k doplnění seznamu</span>
              </div>
              {selectedAction === 'going' && <span className="share-note-selected-mark">✓</span>}
            </button>
          </div>

          {showTargetSection && (
            <div id="share-note-target-section" className="share-note-target-section">
              <p className="share-note-step-label">2. Vyberte cíl:</p>
              {threadsLoading ? (
                <div className="spinner-container"><div className="spinner" /></div>
              ) : (
                <div className="share-note-thread-list">
                  {/* Hlavní chat */}
                  <button
                    className={`share-thread-option${selectedThreadId === null ? ' is-selected' : ''}`}
                    data-id="__main__"
                    onClick={() => handleSelectThread(null)}
                  >
                    <span>Hlavní chat</span>
                  </button>
                  {threads.map(t => (
                    <button
                      key={t.id}
                      className={`share-thread-option${selectedThreadId === t.id ? ' is-selected' : ''}`}
                      data-id={t.id}
                      onClick={() => handleSelectThread(t.id)}
                    >
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {!showNewThreadForm ? (
                <button
                  className="share-note-add-thread-btn"
                  onClick={() => setShowNewThreadForm(true)}
                >
                  + Nové vlákno
                </button>
              ) : (
                <div className="share-note-new-thread-form">
                  <input
                    id="share-note-thread-name"
                    className="form-input"
                    type="text"
                    placeholder="Název vlákna…"
                    value={newThreadName}
                    onChange={e => setNewThreadName(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                  <div className="share-note-send-row" style={{ marginTop: '8px' }}>
                    <button
                      id="share-note-create-thread"
                      className="button-primary"
                      onClick={() => newThreadName.trim() && createThread.mutate(newThreadName.trim())}
                      disabled={createThread.isPending || !newThreadName.trim()}
                    >
                      Vytvořit
                    </button>
                    <button
                      id="share-note-cancel-thread"
                      className="button-secondary"
                      onClick={() => { setShowNewThreadForm(false); setNewThreadName('') }}
                    >
                      Zrušit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

    </Modal>
  )
}
