/* ============================================================================
   pages/notes.ts — Nástěnka / message board
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { $, show, hide, showToast, authFetch, getUserId, getRole } from '../lib/common';

let allNotesData: any[] = [];

function getTemplate(): string {
  return `
  <div class="main-content-notes">
    <div class="notes-page-card card">
      <h2><i class="fas fa-thumbtack"></i> Nástěnka</h2>

      <div class="filters-container">
        <select id="author-filter"><option value="">Všichni autoři</option></select>
        <input type="date" id="date-from-filter" />
        <input type="date" id="date-to-filter" />
        <button id="reset-filters-btn" class="button-secondary"><i class="fas fa-times"></i> Reset</button>
      </div>

      <form id="add-note-form" class="add-note-form">
        <textarea id="note-message-input" rows="3" placeholder="Napište vzkaz…" required></textarea>
        <button type="submit" class="button-primary"><i class="fas fa-paper-plane"></i> Odeslat</button>
      </form>

      <div id="notes-list"></div>
    </div>
  </div>`;
}

function populateAuthorFilter(notes: any[]): void {
  const sel = $<HTMLSelectElement>('author-filter');
  if (!sel) return;
  const current = sel.value;
  const authors = [...new Set(notes.map((n) => n.username))].sort();
  sel.innerHTML = '<option value="">Všichni autoři</option>';
  for (const a of authors) {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    sel.appendChild(opt);
  }
  if (current && authors.includes(current)) sel.value = current;
}

function applyFilters(): void {
  const authorVal = ($<HTMLSelectElement>('author-filter'))?.value || '';
  const fromVal = ($<HTMLInputElement>('date-from-filter'))?.value || '';
  const toVal = ($<HTMLInputElement>('date-to-filter'))?.value || '';

  const filtered = allNotesData.filter((note) => {
    if (authorVal && note.username !== authorVal) return false;
    const dStr = new Date(note.createdAt).toISOString().split('T')[0];
    if (fromVal && dStr < fromVal) return false;
    if (toVal && dStr > toVal) return false;
    return true;
  });
  renderNotes(filtered);
}

function renderNotes(notes: any[]): void {
  const list = $('notes-list');
  if (!list) return;
  list.innerHTML = '';

  if (!notes.length) {
    list.innerHTML = '<p style="text-align:center;color:#666;margin-top:20px"><i>Žádné vzkazy neodpovídají filtrům.</i></p>';
    return;
  }

  const myId = getUserId();
  const admin = getRole() === 'admin';

  for (const note of notes) {
    const el = document.createElement('div');
    el.className = 'note-item';
    el.dataset.id = note.id;

    const canDel = admin || note.userId === myId;
    const delBtn = canDel ? '<button class="delete-note-btn" title="Smazat"><i class="fas fa-times"></i></button>' : '';

    const d = new Date(note.createdAt);
    const fmt = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} v ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

    el.innerHTML = `
      ${delBtn}
      <div class="note-header">
        <span class="note-author" style="font-weight:bold;color:#d97706">${note.username}</span>
        <span class="note-date" style="font-size:.85em;color:#777;margin-left:8px">${fmt}</span>
      </div>
      <p class="note-content">${note.message.replace(/\n/g, '<br>')}</p>`;
    list.appendChild(el);
  }
}

async function loadNotes(): Promise<void> {
  const list = $('notes-list');
  if (list) list.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  const data = await authFetch<any[]>('/api/notes', { silent: true });
  if (!data) { if (list) list.innerHTML = '<p style="color:red">Chyba načítání.</p>'; return; }

  allNotesData = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  populateAuthorFilter(allNotesData);
  applyFilters();
}

function bindEvents(): void {
  $('author-filter')?.addEventListener('change', applyFilters);
  $('date-from-filter')?.addEventListener('change', applyFilters);
  $('date-to-filter')?.addEventListener('change', applyFilters);
  $('reset-filters-btn')?.addEventListener('click', () => {
    const af = $<HTMLSelectElement>('author-filter');
    const df = $<HTMLInputElement>('date-from-filter');
    const dt = $<HTMLInputElement>('date-to-filter');
    if (af) af.value = '';
    if (df) df.value = '';
    if (dt) dt.value = '';
    applyFilters();
  });

  $<HTMLFormElement>('add-note-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $<HTMLTextAreaElement>('note-message-input');
    const msg = input?.value.trim();
    if (!msg) return;
    const result = await authFetch('/api/notes', { method: 'POST', body: JSON.stringify({ message: msg }) });
    if (!result) return;
    if (input) input.value = '';
    // Reset filters so user sees their new post
    const af = $<HTMLSelectElement>('author-filter');
    const df = $<HTMLInputElement>('date-from-filter');
    const dt = $<HTMLInputElement>('date-to-filter');
    if (af) af.value = '';
    if (df) df.value = '';
    if (dt) dt.value = '';
    await loadNotes();
  });

  $('notes-list')?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.delete-note-btn');
    if (!btn) return;
    const noteEl = btn.closest<HTMLElement>('.note-item');
    if (!noteEl) return;
    if (!confirm('Smazat vzkaz?')) return;
    await authFetch(`/api/notes/${noteEl.dataset.id}`, { method: 'DELETE' });
    await loadNotes();
  });
}

const notesPage: PageModule = {
  async mount(el) {
    el.innerHTML = getTemplate();
    bindEvents();
    await loadNotes();
  },
  unmount() {
    allNotesData = [];
  },
};

export default notesPage;
