/**
 * DiaryPage.tsx — Hlavní stránka Deníku pobytů
 * View: 'folders' → seznam pobytů | 'entries' → kalendář dnů
 */
import { useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  useDiaryFolders,
  useDiaryEntries,
  useCreateDiaryFolder,
  useRenameDiaryFolder,
  useDeleteDiaryFolder,
  useReservations,
} from './hooks/useDiary'
import type { DiaryFolder, DiaryEntry } from '@/api/diary'
import { DiaryFolders } from './DiaryFolders'
import { DiaryCalendar } from './DiaryCalendar'
import { NotebookModal } from './NotebookModal'
import { showToast } from '@/lib/toast'
import { useAuth } from '@/context/AuthContext'
import { Modal } from '@/components/shared/Modal'

type View = 'folders' | 'entries'

interface NotebookState {
  dateObj: Date
  entry: DiaryEntry | undefined
}

const ACTIVITY_TAG_OPTIONS = [
  { value: '', label: '—' },
  { value: 'relax', label: '🍃 Relaxace' },
  { value: 'party', label: '🍻 Oslava' },
  { value: 'work', label: '🔨 Práce na chatě' },
  { value: 'mushroom', label: '🍄 Houbaření' },
  { value: 'hike', label: '👟 Turistika' },
  { value: 'family', label: '👥 Rodinné sezení' },
]

export function DiaryPage() {
  useDocumentTitle('Deník');
  const { user } = useAuth()

  const { data: folders = [], isLoading: foldersLoading } = useDiaryFolders()
  const [view, setView] = useState<View>('folders')
  const [currentFolder, setCurrentFolder] = useState<DiaryFolder | null>(null)

  const { data: entries = [], isLoading: entriesLoading } = useDiaryEntries(currentFolder?.id ?? null)

  // ── Notebook ──────────────────────────────────────────────────────────────
  const [notebookState, setNotebookState] = useState<NotebookState | null>(null)

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createStartDate, setCreateStartDate] = useState('')
  const [createEndDate, setCreateEndDate] = useState('')
  const [createTag, setCreateTag] = useState('')
  const [createFromReservation, setCreateFromReservation] = useState('')

  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameTarget, setRenameTarget] = useState<DiaryFolder | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DiaryFolder | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createFolder = useCreateDiaryFolder()
  const renameFolder = useRenameDiaryFolder()
  const deleteFolder = useDeleteDiaryFolder()

  // ── Reservations for create modal ─────────────────────────────────────────
  const { data: reservations = [] } = useReservations()
  const myReservations = useMemo(
    () => reservations.filter(r => r.userId === user?.userId)
      .sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()),
    [reservations, user?.userId]
  )

  // ── allDates for notebook navigation ─────────────────────────────────────
  const allDates = useMemo((): string[] => {
    if (!currentFolder?.startDate || !currentFolder?.endDate) return []
    const dates: string[] = []
    const start = new Date(currentFolder.startDate); start.setHours(0,0,0,0)
    const end   = new Date(currentFolder.endDate);   end.setHours(0,0,0,0)
    const cur = new Date(start)
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder?.id])

  // entryByDate Map for notebook navigation
  const entryByDate = useMemo(() => {
    const m = new Map<string, DiaryEntry>()
    for (const e of entries) m.set(e.date.slice(0, 10), e)
    return m
  }, [entries])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openFolder(folder: DiaryFolder) {
    setCurrentFolder(folder)
    setView('entries')
    setNotebookState(null)
  }

  function backToFolders() {
    setView('folders')
    setCurrentFolder(null)
    setNotebookState(null)
  }

  function openNotebook(dateObj: Date, entry: DiaryEntry | undefined) {
    setNotebookState({ dateObj, entry })
  }

  // Called from NotebookModal when prev/next is pressed (after auto-save)
  function handleNotebookNavigate(newDate: Date) {
    const key = newDate.toISOString().slice(0, 10)
    const newEntry = entryByDate.get(key)
    setNotebookState({ dateObj: newDate, entry: newEntry })
  }

  function handleNotebookSaved() {
    setNotebookState(null)
  }

  // ── Create folder ──────────────────────────────────────────────────────────

  function openCreateModal() {
    setCreateName(''); setCreateStartDate(''); setCreateEndDate(''); setCreateTag(''); setCreateFromReservation('')
    setShowCreateModal(true)
  }

  function handleReservationSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    setCreateFromReservation(id)
    if (!id) return
    const res = myReservations.find(r => r.id === id)
    if (!res) return
    setCreateName(res.purpose || '')
    setCreateStartDate(res.from.slice(0, 10))
    setCreateEndDate(res.to.slice(0, 10))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = createName.trim()
    if (!name) return
    await createFolder.mutateAsync({ name, startDate: createStartDate || '', endDate: createEndDate || '', activityTag: createTag || null })
    showToast('Pobyt vytvořen.', 'success')
    setShowCreateModal(false)
  }

  // ── Rename ──────────────────────────────────────────────────────────────────

  function openRenameModal(folder: DiaryFolder) {
    setRenameTarget(folder)
    setRenameValue(folder.name)
    setShowRenameModal(true)
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameTarget) return
    await renameFolder.mutateAsync({ id: renameTarget.id, name: renameValue.trim() })
    showToast('Přejmenováno.', 'success')
    setShowRenameModal(false)
    setRenameTarget(null)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  function openDeleteModal(folder: DiaryFolder) {
    setDeleteTarget(folder)
    setDeleteConfirm('')
    setShowDeleteModal(true)
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (deleteConfirm.trim() !== 'SMAZAT') {
      showToast("Napište 'SMAZAT' pro potvrzení.", 'error')
      return
    }
    if (!deleteTarget) return
    await deleteFolder.mutateAsync(deleteTarget.id)
    showToast('Pobyt smazán.', 'success')
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  return (
    <div className="main-content-diary">
      <div className="diary-card">

        {/* ── FOLDERS VIEW ─────────────────────────────────────────────── */}
        {view === 'folders' && (
          foldersLoading ? (
            <div className="spinner-container"><div className="spinner" /></div>
          ) : (
            <DiaryFolders
              folders={folders}
              onOpen={openFolder}
              onRename={openRenameModal}
              onDelete={openDeleteModal}
              onNewFolder={openCreateModal}
            />
          )
        )}

        {/* ── ENTRIES / CALENDAR VIEW ──────────────────────────────────── */}
        {view === 'entries' && currentFolder && (
          <div className="diary-entries-view">
            <div className="diary-header">
              <div className="diary-header-left">
                <button className="back-btn" onClick={backToFolders}>← Zpět</button>
                <h1>{currentFolder.name}</h1>
              </div>
            </div>
            {entriesLoading ? (
              <div className="spinner-container"><div className="spinner" /></div>
            ) : (
              <DiaryCalendar
                folder={currentFolder}
                entries={entries}
                onOpenNotebook={openNotebook}
              />
            )}
          </div>
        )}

      </div>

      {/* ── Create folder modal ─────────────────────────────────────────── */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Nový pobyt"
          maxWidth="max-w-md"
          footer={
            <button type="submit" form="create-diary-form" className="button-primary" disabled={createFolder.isPending}>Vytvořit</button>
          }
        >
          <form id="create-diary-form" onSubmit={handleCreate}>
            {myReservations.length > 0 && (
              <div className="form-group">
                <label htmlFor="reservation-select">Načíst z rezervace</label>
                <select id="reservation-select" value={createFromReservation} onChange={handleReservationSelect}>
                  <option value="">— Vyberte rezervaci —</option>
                  {myReservations.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.from.slice(0, 10)} – {r.to.slice(0, 10)}{r.purpose ? ` (${r.purpose})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="diary-folder-name">Název pobytu</label>
              <input id="diary-folder-name" type="text" value={createName} onChange={e => setCreateName(e.target.value)} required maxLength={100} autoFocus />
            </div>
            <div className="form-group">
              <label htmlFor="diary-start-date">Od</label>
              <input id="diary-start-date" type="date" value={createStartDate} onChange={e => setCreateStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="diary-end-date">Do</label>
              <input id="diary-end-date" type="date" value={createEndDate} onChange={e => setCreateEndDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="activity-tag">Typ pobytu</label>
              <select id="activity-tag" value={createTag} onChange={e => setCreateTag(e.target.value)}>
                {ACTIVITY_TAG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Rename folder modal ─────────────────────────────────────────── */}
      {showRenameModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRenameModal(false)}
          title="Přejmenovat pobyt"
          maxWidth="max-w-sm"
          footer={
            <button type="submit" form="rename-diary-form" className="button-primary" disabled={renameFolder.isPending}>Přejmenovat</button>
          }
        >
          <form id="rename-diary-form" onSubmit={handleRename}>
            <div className="form-group">
              <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} required autoFocus maxLength={100} />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete folder modal ─────────────────────────────────────────── */}
      {showDeleteModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteModal(false)}
          title="Smazat pobyt"
          maxWidth="max-w-sm"
          footer={
            <button type="submit" form="delete-diary-form" className="button-danger" disabled={deleteFolder.isPending}>Smazat</button>
          }
        >
          <p>Smaže se celý pobyt včetně zápisků. Napište <strong>SMAZAT</strong>:</p>
          <form id="delete-diary-form" onSubmit={handleDelete}>
            <div className="form-group">
              <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} required autoFocus />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Notebook modal ───────────────────────────────────────────────── */}
      {notebookState && currentFolder && (
        <NotebookModal
          dateObj={notebookState.dateObj}
          entry={notebookState.entry}
          folderId={currentFolder.id}
          allDates={allDates}
          onNavigate={handleNotebookNavigate}
          onClose={() => setNotebookState(null)}
          onSaved={handleNotebookSaved}
        />
      )}
    </div>
  )
}
