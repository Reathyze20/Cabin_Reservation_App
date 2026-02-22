/* ============================================================================
   pages/notes.ts — Nástěnka / message board (Master-Detail Layout)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { $, show, hide, showToast, authFetch, getUserId, getRole } from '../lib/common';
import { showConfirm, showPrompt } from '../lib/dialogs';

let allNotesData: any[] = [];
let allUsers: any[] = [];
let allThreads: any[] = [];
let activeThreadId: string | null = null;
let isMobileView = window.innerWidth <= 768;

function getTemplate(): string {
  return `
  <div class="main-content main-content-notes">
    <div class="notes-layout">
      
      <!-- Left Panel: Sidebar (Thread List) -->
      <div class="notes-sidebar" id="notes-sidebar">
        <div class="notes-sidebar-header">
          <div class="notes-sidebar-title">
            <h2>Chat</h2>
            <button id="add-tab-btn" class="button-icon" title="Nové téma"><i class="fas fa-plus"></i></button>
          </div>
          <div class="notes-search">
            <i class="fas fa-search"></i>
            <input type="text" id="thread-search-input" placeholder="Hledat téma..." autocomplete="off" />
          </div>
        </div>
        <div class="notes-thread-list" id="chat-tabs-list">
          <!-- Threads injected here -->
        </div>
      </div>

      <!-- Right Panel: Chat Area -->
      <div class="notes-chat-area" id="notes-chat-area">
        <div class="chat-header">
          <button id="mobile-back-btn" class="button-icon mobile-only" title="Zpět"><i class="fas fa-arrow-left"></i></button>
          <div class="chat-header-info">
            <h3 id="active-thread-name">Hlavní</h3>
            <span class="chat-header-participants" id="active-thread-participants"></span>
          </div>
          <div class="chat-header-actions">
             <button id="delete-thread-btn" class="button-icon text-danger" title="Smazat téma" style="display:none;"><i class="fas fa-trash-alt"></i></button>
             <button id="toggle-filters-btn" class="button-icon" title="Filtry"><i class="fas fa-filter"></i></button>
          </div>
        </div>
        
        <div id="filters-panel" class="filters-container collapsed">
          <div class="filter-group">
            <select id="author-filter" aria-label="Autor"><option value="">Všichni autoři</option></select>
          </div>
          <div class="filter-group">
            <label for="date-from-filter">Od:</label>
            <input type="date" id="date-from-filter" />
          </div>
          <div class="filter-group">
            <label for="date-to-filter">Do:</label>
            <input type="date" id="date-to-filter" />
          </div>
          <button id="reset-filters-btn" class="button-secondary" title="Smazat filtry"><i class="fas fa-times"></i></button>
        </div>

        <div class="chat-messages" id="notes-list">
          <!-- Messages injected here -->
        </div>

        <div class="chat-input-area">
          <form id="add-note-form" class="add-note-form">
            <button type="button" class="button-icon attachment-btn" title="Přidat přílohu"><i class="fas fa-paperclip"></i></button>
            <textarea id="note-message-input" placeholder="Napište vzkaz…" rows="1" required></textarea>
            <button type="submit" class="button-primary btn-icon-round send-btn" aria-label="Odeslat"><i class="fas fa-paper-plane"></i></button>
          </form>
        </div>
      </div>

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

  const activeNotes = allNotesData.filter(n => n.threadId === activeThreadId);

  const filtered = activeNotes.filter((note) => {
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
    list.innerHTML = '<div class="empty-chat-state"><p>Zatím zde nejsou žádné zprávy.</p></div>';
    return;
  }

  const myId = getUserId();
  const admin = getRole() === 'admin';

  for (const note of notes) {
    const isMine = note.userId === myId;
    const canDel = admin || isMine;

    const user = allUsers.find(u => u.username === note.username);
    const userColor = user?.color || '#a3b19b';
    const animalIcon = user?.animalIcon;
    const initial = animalIcon || note.username.charAt(0).toUpperCase();

    const d = new Date(note.createdAt);
    const timeFmt = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const dateFmt = `${d.getDate()}.${d.getMonth() + 1}.`;

    const el = document.createElement('div');
    el.className = `message-wrapper ${isMine ? 'message-mine' : 'message-other'}`;
    el.dataset.id = note.id;

    const delBtn = canDel ? `<button class="delete-note-btn" title="Smazat"><i class="fas fa-trash-alt"></i></button>` : '';

    if (isMine) {
      el.innerHTML = `
        <div class="message-bubble" title="${dateFmt} ${timeFmt}">
          <div class="message-content">${note.message.replace(/\n/g, '<br>')}</div>
          ${delBtn ? `<div class="message-meta">${delBtn}</div>` : ''}
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="message-avatar" style="background-color: ${userColor}">${initial}</div>
        <div class="message-bubble-container">
          <span class="message-sender">${note.username}</span>
          <div class="message-bubble" title="${dateFmt} ${timeFmt}">
            <div class="message-content">${note.message.replace(/\n/g, '<br>')}</div>
            ${delBtn ? `<div class="message-meta">${delBtn}</div>` : ''}
          </div>
        </div>
      `;
    }
    list.appendChild(el);
  }

  scrollToBottom();
}

function scrollToBottom(): void {
  const list = $('notes-list');
  if (list) {
    setTimeout(() => {
      list.scrollTop = list.scrollHeight;
    }, 10);
  }
}

async function fetchUsers(): Promise<void> {
  const data = await authFetch<any[]>('/api/users', { silent: true });
  allUsers = data || [];
}

function renderTabs(searchQuery: string = ''): void {
  const tabsList = $('chat-tabs-list');
  if (!tabsList) return;

  const myId = getUserId();
  const admin = getRole() === 'admin';

  // Prepare threads list including "Hlavní"
  const threadsList = [
    { id: null, name: 'Hlavní', createdById: null },
    ...allThreads
  ];

  let html = '';

  for (const t of threadsList) {
    // Filter by search query
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      continue;
    }

    // Find last message for this thread
    const threadNotes = allNotesData.filter(n => n.threadId === t.id);
    const lastNote = threadNotes.length > 0 ? threadNotes[threadNotes.length - 1] : null;
    
    let lastMessageText = 'Žádné zprávy';
    let lastMessageTime = '';
    
    if (lastNote) {
      lastMessageText = lastNote.message.replace(/\n/g, ' ');
      if (lastMessageText.length > 30) lastMessageText = lastMessageText.substring(0, 30) + '...';
      
      const d = new Date(lastNote.createdAt);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        lastMessageTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } else {
        lastMessageTime = `${d.getDate()}.${d.getMonth() + 1}.`;
      }
    }

    const isActive = activeThreadId === t.id;
    
    // Avatar for thread (could be initials of thread name)
    const threadInitial = t.name.charAt(0).toUpperCase();
    const threadColor = t.id === null ? 'var(--color-primary)' : 'var(--color-text-light)';

    html += `
      <div class="thread-item ${isActive ? 'active' : ''}" data-id="${t.id || ''}">
        <div class="thread-avatar" style="background-color: ${threadColor}">${threadInitial}</div>
        <div class="thread-info">
          <div class="thread-info-top">
            <span class="thread-name">${t.name}</span>
            <span class="thread-time">${lastMessageTime}</span>
          </div>
          <div class="thread-info-bottom">
            <span class="thread-last-message">${lastMessageText}</span>
          </div>
        </div>
      </div>
    `;
  }

  tabsList.innerHTML = html;
  updateChatHeader();
}

function updateChatHeader(): void {
  const headerName = $('active-thread-name');
  const delBtn = $('delete-thread-btn');
  const participantsContainer = $('active-thread-participants');
  
  if (activeThreadId === null) {
    if (headerName) headerName.textContent = 'Hlavní';
    if (delBtn) hide(delBtn);
  } else {
    const t = allThreads.find(th => th.id === activeThreadId);
    if (t) {
      if (headerName) headerName.textContent = t.name;
      const myId = getUserId();
      const admin = getRole() === 'admin';
      if (admin || t.createdById === myId) {
        if (delBtn) show(delBtn);
      } else {
        if (delBtn) hide(delBtn);
      }
    }
  }

  if (participantsContainer) {
    const activeNotes = allNotesData.filter(n => n.threadId === activeThreadId);
    const participants = [...new Set(activeNotes.map(n => n.username))];
    if (participants.length > 0) {
      participantsContainer.textContent = participants.join(', ');
    } else {
      participantsContainer.textContent = 'Zatím bez zpráv';
    }
  }
}

async function loadData(): Promise<void> {
  const list = $('notes-list');
  if (list) list.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  // Fetch ALL notes and ALL threads
  const [notesData, threadsData] = await Promise.all([
    authFetch<any[]>('/api/notes?threadId=all', { silent: true }),
    authFetch<any[]>('/api/note-threads', { silent: true })
  ]);

  allThreads = threadsData || [];
  
  if (!notesData) { if (list) list.innerHTML = '<p style="color:red">Chyba načítání.</p>'; return; }

  allNotesData = notesData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  renderTabs();
  populateAuthorFilter(allNotesData.filter(n => n.threadId === activeThreadId));
  applyFilters();
}

function updateMobileView() {
  isMobileView = window.innerWidth <= 768;
  const sidebar = $('notes-sidebar');
  const chatArea = $('notes-chat-area');
  
  if (!sidebar || !chatArea) return;

  if (isMobileView) {
    // If a thread is selected, show chat, hide sidebar
    // Wait, we don't have a state for "is thread selected" vs "just loaded".
    // Let's assume if we are on mobile, we show sidebar first, unless they just clicked a thread.
    // We'll handle this in the click handler.
  } else {
    // Desktop: show both
    sidebar.style.display = 'flex';
    chatArea.style.display = 'flex';
  }
}

function bindEvents(): void {
  window.addEventListener('resize', updateMobileView);

  $('toggle-filters-btn')?.addEventListener('click', () => {
    const panel = $('filters-panel');
    if (panel) {
      panel.classList.toggle('collapsed');
    }
  });

  $('thread-search-input')?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    renderTabs(val);
  });

  $('chat-tabs-list')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>('.thread-item');
    
    if (item) {
      const id = item.dataset.id;
      activeThreadId = id ? id : null;
      
      // Update UI
      renderTabs(($('thread-search-input') as HTMLInputElement)?.value || '');
      populateAuthorFilter(allNotesData.filter(n => n.threadId === activeThreadId));
      applyFilters();

      // Mobile: hide sidebar, show chat
      if (isMobileView) {
        const sidebar = $('notes-sidebar');
        const chatArea = $('notes-chat-area');
        if (sidebar) sidebar.style.display = 'none';
        if (chatArea) chatArea.style.display = 'flex';
      }
    }
  });

  $('mobile-back-btn')?.addEventListener('click', () => {
    if (isMobileView) {
      const sidebar = $('notes-sidebar');
      const chatArea = $('notes-chat-area');
      if (sidebar) sidebar.style.display = 'flex';
      if (chatArea) chatArea.style.display = 'none';
    }
  });

  $('add-tab-btn')?.addEventListener('click', async () => {
    const name = await showPrompt('Nové téma', 'Zadejte název nového tématu:');
    if (name && name.trim()) {
      const res = await authFetch<any>('/api/note-threads', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      if (res) {
        activeThreadId = res.id;
        await loadData();
        if (isMobileView) {
          const sidebar = $('notes-sidebar');
          const chatArea = $('notes-chat-area');
          if (sidebar) sidebar.style.display = 'none';
          if (chatArea) chatArea.style.display = 'flex';
        }
      }
    }
  });

  $('delete-thread-btn')?.addEventListener('click', async () => {
    if (!activeThreadId) return;
    const confirmed = await showConfirm('Smazat téma?', 'Opravdu chcete smazat toto téma a všechny zprávy v něm?', true);
    if (!confirmed) return;
    const res = await authFetch(`/api/note-threads/${activeThreadId}`, { method: 'DELETE' });
    if (res) {
      activeThreadId = null;
      await loadData();
      if (isMobileView) {
        const sidebar = $('notes-sidebar');
        const chatArea = $('notes-chat-area');
        if (sidebar) sidebar.style.display = 'flex';
        if (chatArea) chatArea.style.display = 'none';
      }
    }
  });

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

  // Auto-resize textarea
  const textarea = $<HTMLTextAreaElement>('note-message-input');
  textarea?.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.scrollHeight > 150) {
      this.style.overflowY = 'auto';
    } else {
      this.style.overflowY = 'hidden';
    }
  });

  // Submit on Enter (without Shift)
  textarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('add-note-form')?.dispatchEvent(new Event('submit'));
    }
  });

  $<HTMLFormElement>('add-note-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $<HTMLTextAreaElement>('note-message-input');
    const msg = input?.value.trim();
    if (!msg) return;

    const payload = { message: msg, threadId: activeThreadId };
    const result = await authFetch('/api/notes', { method: 'POST', body: JSON.stringify(payload) });
    if (!result) return;
    
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    // Reset filters so user sees their new post
    const af = $<HTMLSelectElement>('author-filter');
    const df = $<HTMLInputElement>('date-from-filter');
    const dt = $<HTMLInputElement>('date-to-filter');
    if (af) af.value = '';
    if (df) df.value = '';
    if (dt) dt.value = '';
    await loadData();
  });

  $('notes-list')?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.delete-note-btn');
    if (!btn) return;
    const noteEl = btn.closest<HTMLElement>('.message-wrapper');
    if (!noteEl) return;
    const confirmed = await showConfirm('Smazat zprávu?', 'Opravdu chcete smazat tuto zprávu?', true);
    if (!confirmed) return;
    await authFetch(`/api/notes/${noteEl.dataset.id}`, { method: 'DELETE' });
    await loadData();
  });
}

const notesPage: PageModule = {
  async mount(el) {
    el.innerHTML = getTemplate();
    bindEvents();
    updateMobileView();
    
    // On mobile, initially show sidebar, hide chat
    if (isMobileView) {
      const chatArea = $('notes-chat-area');
      if (chatArea) chatArea.style.display = 'none';
    }

    await fetchUsers();
    await loadData();
  },
  unmount() {
    window.removeEventListener('resize', updateMobileView);
    allNotesData = [];
    allThreads = [];
    activeThreadId = null;
  },
};

export default notesPage;
