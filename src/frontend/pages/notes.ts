/* ============================================================================
   pages/notes.ts — Chat (Master-Detail Layout)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { $, show, hide, showToast, authFetch, getUserId, getRole, setupCharCounters, validateForm } from '../lib/common';
import { showConfirm, showPrompt } from '../lib/dialogs';
import { icons } from '../lib/icons';

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
            <button id="add-tab-btn" class="button-icon" title="Nové téma">+</button>
          </div>
          <div class="notes-search">
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
          <div class="chat-header-info">
            <h3 id="active-thread-name">Hlavní</h3>
            <span class="chat-header-participants" id="active-thread-participants"></span>
          </div>
          <div class="chat-header-actions">
             <button id="toggle-filters-btn" class="button-icon" title="Filtry">☰</button>
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
          <button id="reset-filters-btn" class="button-secondary" title="Smazat filtry">${icons.close(14)}</button>
        </div>

        <div class="chat-messages" id="notes-list">
          <!-- Messages injected here -->
        </div>

        <div class="chat-input-area">
          <!-- Odjezdovy protokol panel -->
          <div class="handover-panel" id="handover-panel" style="display:none">
            <div class="handover-panel-header">
              <span>Odjezdový protokol</span>
              <button type="button" class="button-icon" id="handover-panel-close" title="Zavrít">${icons.close(16)}</button>
            </div>
            <div class="handover-checklist" id="handover-checklist">
              <!-- Injected by JS -->
            </div>
            <div class="handover-note-row">
              <input type="text" id="handover-note-input" placeholder="Poznámka (volitelná)..." autocomplete="off">
            </div>
            <div class="handover-panel-footer">
              <button type="button" class="btn-ghost-secondary" id="handover-panel-cancel">Zrušit</button>
              <button type="button" class="button-primary" id="handover-panel-insert">Vložit do zprávy</button>
            </div>
          </div>
          <form id="add-note-form" class="add-note-form" novalidate>
            <button type="button" class="button-icon attachment-btn" title="Přidat přílohu">📎</button>
            <button type="button" class="button-icon handover-btn" id="handover-template-btn" title="Vložit odjezdový protokol">🚪</button>
            <textarea id="note-message-input" placeholder="Napište vzkaz…" rows="1" maxlength="2000" required></textarea>
            <span class="char-counter" style="font-size: 0.7rem; color: #6b7280; white-space: nowrap; align-self: center;">0 / 2000</span>
            <button type="submit" class="button-primary btn-icon-round send-btn" aria-label="Odeslat">↑</button>
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

// Konverze [x]/[ ] na HTML checkboxy v bubline
function formatMessage(raw: string): string {
  const lines = raw.split('\n');
  const hasChecks = lines.some(l => /^\[[ x]\]/i.test(l));
  if (!hasChecks) return lines.join('<br>');

  const parts = lines.map(line => {
    const done = line.match(/^\[x\]\s*(.*)/i);
    const todo = line.match(/^\[ \]\s*(.*)/);
    if (done) return `<span class="msg-cb msg-cb-done">✓ <span>${done[1]}</span></span>`;
    if (todo) return `<span class="msg-cb msg-cb-todo">○ <span>${todo[1]}</span></span>`;
    return line === '' ? '<span class="msg-spacer"></span>' : `<span class="msg-line">${line}</span>`;
  });
  return `<div class="msg-protocol">${parts.join('')}</div>`;
}

// Truncate message text for pre-fill (strip checkbox syntax, collapse whitespace)
function truncateForItem(text: string, max = 100): string {
  const cleaned = text.replace(/^\[[ x]\]\s*/gim, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.substring(0, max - 3) + '...';
}

// Escape HTML for safe attribute insertion
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Context action: Add message to shopping list ──────────────────────────
async function showAddToShoppingDialog(noteId: string, messageText: string): Promise<void> {
  if (getRole() === 'guest') {
    showToast('Nemáte oprávnění vytvářet položky.', 'error');
    return;
  }

  const lists = await authFetch<any[]>('/api/shopping-lists?isPantry=false');
  if (!lists || lists.length === 0) {
    showToast('Nejsou žádné aktivní nákupní seznamy. Vytvořte nejprve seznam.', 'error');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialogBox = document.createElement('div');
  dialogBox.className = 'dialog-box';

  const defaultName = truncateForItem(messageText);

  dialogBox.innerHTML = `
    <div class="dialog-header"><h3>Přidat do nákupního seznamu</h3></div>
    <form class="dialog-form">
      <div class="dialog-body">
        <div class="dialog-field">
          <label>Seznam:</label>
          <select class="dialog-input" id="ctx-shopping-list-select">
            ${lists.map(l => `<option value="${escapeAttr(l.id)}">${escapeAttr(l.name)} (${(l.items?.filter((i: any) => !i.purchased).length) || 0} položek)</option>`).join('')}
          </select>
        </div>
        <div class="dialog-field">
          <label>Název položky:</label>
          <input type="text" class="dialog-input" id="ctx-shopping-item-name" value="${escapeAttr(defaultName)}" maxlength="100" required />
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="button-secondary dialog-cancel-btn">Zrušit</button>
        <button type="submit" class="button-primary dialog-confirm-btn">Přidat 🛒</button>
      </div>
    </form>
  `;

  overlay.appendChild(dialogBox);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const cleanup = () => {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', onEsc);
    setTimeout(() => { if (document.body.contains(overlay)) document.body.removeChild(overlay); }, 200);
  };

  const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') cleanup(); };
  document.addEventListener('keydown', onEsc);

  return new Promise<void>((resolve) => {
    const form = dialogBox.querySelector('form')!;
    const cancelBtn = dialogBox.querySelector('.dialog-cancel-btn')!;
    const nameInput = dialogBox.querySelector<HTMLInputElement>('#ctx-shopping-item-name')!;

    nameInput.focus();
    nameInput.select();

    cancelBtn.addEventListener('click', () => { cleanup(); resolve(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const listId = (dialogBox.querySelector('#ctx-shopping-list-select') as HTMLSelectElement).value;
      const itemName = nameInput.value.trim();
      if (!itemName) return;

      const confirmBtn = dialogBox.querySelector<HTMLButtonElement>('.dialog-confirm-btn')!;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Ukládám...';

      const result = await authFetch('/api/shopping-list/' + listId + '/items', {
        method: 'POST',
        body: JSON.stringify({ name: itemName, sourceMessageId: noteId }),
      });

      if (result) {
        await authFetch('/api/notes/' + noteId + '/resolve', { method: 'PATCH' });
        const note = allNotesData.find(n => n.id === noteId);
        if (note) note.isResolvedAsTask = true;
        showToast('Položka přidána do nákupního seznamu ✓', 'success');
        applyFilters();
      }

      cleanup();
      resolve();
    });
  });
}

// ── Context action: Create reconstruction/repair task from message ────────
async function showCreateRepairDialog(noteId: string, messageText: string): Promise<void> {
  if (getRole() === 'guest') {
    showToast('Nemáte oprávnění vytvářet úkoly.', 'error');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';

  const dialogBox = document.createElement('div');
  dialogBox.className = 'dialog-box';

  const defaultTitle = truncateForItem(messageText, 200);

  dialogBox.innerHTML = `
    <div class="dialog-header"><h3>Vytvořit úkol v rekonstrukcích</h3></div>
    <form class="dialog-form">
      <div class="dialog-body">
        <div class="dialog-field">
          <label>Kategorie:</label>
          <select class="dialog-input" id="ctx-repair-category">
            <option value="task" selected>Úkol</option>
            <option value="idea">Nápad</option>
            <option value="company">Firma / Kontakt</option>
          </select>
        </div>
        <div class="dialog-field">
          <label>Název:</label>
          <input type="text" class="dialog-input" id="ctx-repair-title" value="${escapeAttr(defaultTitle)}" required />
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="button-secondary dialog-cancel-btn">Zrušit</button>
        <button type="submit" class="button-primary dialog-confirm-btn">Vytvořit 🛠️</button>
      </div>
    </form>
  `;

  overlay.appendChild(dialogBox);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const cleanup = () => {
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', onEsc);
    setTimeout(() => { if (document.body.contains(overlay)) document.body.removeChild(overlay); }, 200);
  };

  const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') cleanup(); };
  document.addEventListener('keydown', onEsc);

  return new Promise<void>((resolve) => {
    const form = dialogBox.querySelector('form')!;
    const cancelBtn = dialogBox.querySelector('.dialog-cancel-btn')!;
    const titleInput = dialogBox.querySelector<HTMLInputElement>('#ctx-repair-title')!;

    titleInput.focus();
    titleInput.select();

    cancelBtn.addEventListener('click', () => { cleanup(); resolve(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = (dialogBox.querySelector('#ctx-repair-category') as HTMLSelectElement).value;
      const title = titleInput.value.trim();
      if (!title) return;

      const confirmBtn = dialogBox.querySelector<HTMLButtonElement>('.dialog-confirm-btn')!;
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Ukládám...';

      const result = await authFetch('/api/reconstruction', {
        method: 'POST',
        body: JSON.stringify({ category, title, description: messageText, sourceMessageId: noteId }),
      });

      if (result) {
        await authFetch('/api/notes/' + noteId + '/resolve', { method: 'PATCH' });
        const note = allNotesData.find(n => n.id === noteId);
        if (note) note.isResolvedAsTask = true;
        showToast('Úkol vytvořen v rekonstrukcích ✓', 'success');
        applyFilters();
      }

      cleanup();
      resolve();
    });
  });
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
  const isGuest = getRole() === 'guest';

  for (const note of notes) {
    const isMine = note.userId === myId;
    const canDel = admin || isMine;
    const resolved = note.isResolvedAsTask === true;

    const user = allUsers.find(u => u.username === note.username);
    const userColor = user?.color || '#a3b19b';
    const animalIcon = user?.animalIcon;
    const initial = animalIcon || note.username.charAt(0).toUpperCase();

    const d = new Date(note.createdAt);
    const timeFmt = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const dateFmt = `${d.getDate()}.${d.getMonth() + 1}.`;

    const el = document.createElement('div');
    el.className = `message-wrapper ${isMine ? 'message-mine' : 'message-other'}${resolved ? ' message-resolved' : ''}`;
    el.dataset.id = note.id;

    const delBtn = canDel ? `<button class="delete-note-btn" title="Smazat">${icons.close(14)}</button>` : '';
    const actionBtns = (!isGuest && !resolved) ? `<button class="msg-action-btn msg-action-shopping" title="Do nákupu">🛒</button><button class="msg-action-btn msg-action-repair" title="Nový úkol">🛠️</button>` : '';
    const resolvedBadge = resolved ? `<span class="message-resolved-badge" title="Převedeno na úkol">✅</span>` : '';
    const metaContent = actionBtns + delBtn;
    const metaHtml = metaContent ? `<div class="message-meta">${metaContent}</div>` : '';

    if (isMine) {
      el.innerHTML = `
        <div class="message-bubble" title="${dateFmt} ${timeFmt}">
          <div class="message-content">${formatMessage(note.message)}</div>
          ${resolvedBadge}
          ${metaHtml}
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="message-avatar" style="${animalIcon ? 'background-color: transparent; font-size: 24px;' : `background-color: ${userColor}`}">${initial}</div>
        <div class="message-bubble-container">
          <span class="message-sender">${note.username}</span>
          <div class="message-bubble" title="${dateFmt} ${timeFmt}">
            <div class="message-content">${formatMessage(note.message)}</div>
            ${resolvedBadge}
            ${metaHtml}
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
  const participantsContainer = $('active-thread-participants');

  if (activeThreadId === null) {
    if (headerName) headerName.textContent = 'Hlavní';
  } else {
    const t = allThreads.find(th => th.id === activeThreadId);
    if (t) {
      if (headerName) headerName.textContent = t.name;
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
  const containerEl = document.querySelector('.main-content-notes') as HTMLElement;
  if (containerEl) setupCharCounters(containerEl);

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

  $('add-tab-btn')?.addEventListener('click', async () => {
    let name = await showPrompt('Nové téma', 'Zadejte název nového tématu (max 100 znaků):');
    if (name && name.trim()) {
      if (name.trim().length > 100) {
        showToast('Název tématu je příliš dlouhý (max 100 znaků).', 'error');
        return;
      }
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
  textarea?.addEventListener('input', function () {
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
    const form = e.currentTarget as HTMLFormElement;
    if (!validateForm(form)) return;

    const input = $<HTMLTextAreaElement>('note-message-input');
    const msg = input?.value.trim();
    if (!msg) return;

    const submitBtn = (e.currentTarget as HTMLElement)?.querySelector<HTMLButtonElement>('button[type="submit"]');
    const origText = submitBtn?.textContent ?? '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Odesílám…';
    }

    try {
      const payload = { message: msg, threadId: activeThreadId };
      const result = await authFetch('/api/notes', { method: 'POST', body: JSON.stringify(payload) });
      if (!result) return;

      if (input) {
        input.value = '';
        input.style.height = 'auto';
        input.dispatchEvent(new Event('input')); // Aktualizuje char-counter
      }

      // Reset filters so user sees their new post
      const af = $<HTMLSelectElement>('author-filter');
      const df = $<HTMLInputElement>('date-from-filter');
      const dt = $<HTMLInputElement>('date-to-filter');
      if (af) af.value = '';
      if (df) df.value = '';
      if (dt) dt.value = '';
      await loadData();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }
  });

  $('notes-list')?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Delete message
    const delBtn = target.closest<HTMLButtonElement>('.delete-note-btn');
    if (delBtn) {
      const noteEl = delBtn.closest<HTMLElement>('.message-wrapper');
      if (!noteEl) return;
      const confirmed = await showConfirm('Smazat zprávu?', 'Opravdu chcete smazat tuto zprávu?', true);
      if (!confirmed) return;
      await authFetch(`/api/notes/${noteEl.dataset.id}`, { method: 'DELETE' });
      await loadData();
      return;
    }

    // Context action: Add to shopping list
    const shopBtn = target.closest<HTMLButtonElement>('.msg-action-shopping');
    if (shopBtn) {
      const noteEl = shopBtn.closest<HTMLElement>('.message-wrapper');
      if (!noteEl?.dataset.id) return;
      const note = allNotesData.find(n => n.id === noteEl.dataset.id);
      if (!note) return;
      shopBtn.disabled = true;
      await showAddToShoppingDialog(note.id, note.message);
      shopBtn.disabled = false;
      return;
    }

    // Context action: Create repair/reconstruction task
    const repairBtn = target.closest<HTMLButtonElement>('.msg-action-repair');
    if (repairBtn) {
      const noteEl = repairBtn.closest<HTMLElement>('.message-wrapper');
      if (!noteEl?.dataset.id) return;
      const note = allNotesData.find(n => n.id === noteEl.dataset.id);
      if (!note) return;
      repairBtn.disabled = true;
      await showCreateRepairDialog(note.id, note.message);
      repairBtn.disabled = false;
      return;
    }
  });

  // ── Odjezdový protokol  —  panel s checkboxy ────────────────────
  const HANDOVER_ITEMS = [
    { key: 'kamna', label: 'Kamna: Popel vybrán, vyhasnuto' },
    { key: 'drevo', label: 'Dřevo: Třísky a polena pro dalšího připraveny' },
    { key: 'jidlo', label: 'Jídlo: Uklizeno (ochrana před myšmi)' },
    { key: 'voda', label: 'Voda: Kohoutky zavřeny, trubky vypuštěny' },
    { key: 'zabezpeceni', label: 'Zabezpečení: Okenice a dveře zajištěny' },
  ];

  // Naplnit checklist
  const checklist = $('handover-checklist');
  if (checklist) {
    checklist.innerHTML = HANDOVER_ITEMS.map(item => `
      <label class="handover-item">
        <input type="checkbox" name="${item.key}" checked>
        <span>${item.label}</span>
      </label>
    `).join('');
  }

  const panel = $('handover-panel');

  function openHandoverPanel(): void {
    // Reset: vše zaškrtnuto, poznámka prázdná
    checklist?.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(cb => cb.checked = true);
    const noteInput = $<HTMLInputElement>('handover-note-input');
    if (noteInput) noteInput.value = '';
    if (panel) panel.style.display = 'block';
    noteInput?.focus();
  }

  function closeHandoverPanel(): void {
    if (panel) panel.style.display = 'none';
  }

  $('handover-template-btn')?.addEventListener('click', openHandoverPanel);
  $('handover-panel-close')?.addEventListener('click', closeHandoverPanel);
  $('handover-panel-cancel')?.addEventListener('click', closeHandoverPanel);

  $('handover-panel-insert')?.addEventListener('click', () => {
    const lines: string[] = ['Odjezdový protokol:', ''];

    HANDOVER_ITEMS.forEach(item => {
      const cb = checklist?.querySelector<HTMLInputElement>(`input[name="${item.key}"]`);
      const checked = cb?.checked ?? true;
      lines.push(`${checked ? '[x]' : '[ ]'} ${item.label}`);
    });

    const noteVal = $<HTMLInputElement>('handover-note-input')?.value.trim();
    if (noteVal) {
      lines.push('');
      lines.push(`Poznámka: ${noteVal}`);
    }

    const textarea = $<HTMLTextAreaElement>('note-message-input');
    if (textarea) {
      const existing = textarea.value.trimEnd();
      textarea.value = existing.length > 0
        ? existing + '\n\n' + lines.join('\n')
        : lines.join('\n');

      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }

    closeHandoverPanel();
  });

  // Zavrít panel kliknutím mimo
  document.addEventListener('click', (e) => {
    if (!panel || panel.style.display === 'none') return;
    if (!(e.target as HTMLElement).closest('#handover-panel, #handover-template-btn')) {
      closeHandoverPanel();
    }
  });
}

const notesPage: PageModule = {
  async mount(el) {
    document.body.classList.add('page-notes');
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

    // Navigate to thread requested from another page (e.g. shopping share)
    const gotoThread = sessionStorage.getItem('notes_goto_thread');
    if (gotoThread !== null) {
      sessionStorage.removeItem('notes_goto_thread');
      activeThreadId = gotoThread === '__main__' ? null : gotoThread;
      renderTabs();
      applyFilters();
      if (isMobileView) {
        const sidebar = $('notes-sidebar');
        const chatArea = $('notes-chat-area');
        if (sidebar) sidebar.style.display = 'none';
        if (chatArea) chatArea.style.display = 'flex';
      }
    }
  },
  unmount() {
    document.body.classList.remove('page-notes');
    window.removeEventListener('resize', updateMobileView);
    allNotesData = [];
    allThreads = [];
    activeThreadId = null;
  },
};

export default notesPage;
