/* ============================================================================
   pages/shopping.ts — Shopping list (multi-list grid layout)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { navigate } from '../lib/router';
import {
  $, show, hide, showToast, authFetch, getUserId, getRole
} from '../lib/common';
import { showConfirm } from '../lib/dialogs';
import '../styles/shopping.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemStatus = 'pending' | 'bring_from_home' | 'purchased';

interface ShoppingItem {
  id: string;
  name: string;
  status: ItemStatus;
  purchased: boolean;
  addedById: string;
  createdAt: string;
  addedBy?: { id: string; username: string; animalIcon?: string | null };
  purchasedBy?: { id: string; username: string; animalIcon?: string | null } | null;
}

interface ShoppingList {
  id: string;
  name: string;
  createdById: string;
  isResolved: boolean;
  createdBy?: { id: string; username: string };
  items: ShoppingItem[];
}

// ─── Module state ─────────────────────────────────────────────────────────────
let container: HTMLElement;

// ─── Status helpers ───────────────────────────────────────────────────────────

/** Cycle: pending → bring_from_home → purchased → pending */
function nextStatus(current: ItemStatus): ItemStatus {
  if (current === 'pending') return 'bring_from_home';
  if (current === 'bring_from_home') return 'purchased';
  return 'pending';
}

function statusIcon(status: ItemStatus): string {
  if (status === 'purchased')      return '<i class="fas fa-check-circle si-purchased"></i>';
  if (status === 'bring_from_home') return '<i class="fas fa-home si-bring"></i>';
  return '<i class="far fa-circle si-pending"></i>';
}

function statusLabel(status: ItemStatus): string {
  if (status === 'purchased')       return 'Koupeno';
  if (status === 'bring_from_home') return 'Přivezu z domova';
  return 'Ke koupit';
}

function isDone(status: ItemStatus): boolean {
  return status === 'purchased' || status === 'bring_from_home';
}

// ─── Template ─────────────────────────────────────────────────────────────────

function getTemplate(): string {
  return `
  <div class="shopping-page">
    <div class="shopping-header-area">
      <h2><i class="fas fa-shopping-basket"></i> Nákupní seznamy</h2>
      <button id="btn-new-list" class="button-primary"><i class="fas fa-plus"></i> Nový košík</button>
    </div>

    <div id="shopping-lists-grid" class="shopping-lists-grid">
      <div class="spinner-container"><div class="spinner"></div></div>
    </div>
  </div>

  <!-- New List Modal -->
  <div id="new-list-modal" class="modal-overlay hidden">
    <div class="modal-content" style="max-width: 400px;">
      <span class="modal-close-button" data-close="new-list-modal">&times;</span>
      <h2>Vytvořit nový nákupní seznam</h2>
      <form id="new-list-form" style="margin-top: var(--space-md);">
        <input type="text" id="new-list-name" placeholder="Název (např. Nákup na víkend)" required style="width: 100%; margin-bottom: var(--space-md);" />
        <div class="modal-actions">
          <button type="button" class="button-secondary" data-close="new-list-modal">Zrušit</button>
          <button type="submit" class="button-primary">Vytvořit</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Share to Nástěnka Dialog -->
  <div id="share-note-modal" class="modal-overlay hidden">
    <div class="modal-content share-note-modal-content">
      <span class="modal-close-button" data-close="share-note-modal">&times;</span>
      <h2><i class="fas fa-bullhorn"></i> Sdílet do chatu</h2>
      <p id="share-note-list-name" class="share-note-subtitle"></p>

      <!-- Krok 1: co poslat -->
      <p class="share-note-step-label">1. Vyberte typ zprávy:</p>
      <div class="share-note-options">
        <button id="share-note-new" class="share-note-btn" data-action="new">
          <span class="share-note-btn-icon"><i class="fas fa-basket-shopping"></i></span>
          <div>
            <strong>Upozornit na nový seznam</strong>
            <span>Pošle zprávu ostatním, ať doplňí položky</span>
          </div>
          <i class="fas fa-check share-note-selected-mark"></i>
        </button>
        <button id="share-note-going" class="share-note-btn share-note-btn-urgent" data-action="going">
          <span class="share-note-btn-icon"><i class="fas fa-person-running"></i></span>
          <div>
            <strong>Jdu do obchodu</strong>
            <span>Urgentní výzva k doplňění seznamu</span>
          </div>
          <i class="fas fa-check share-note-selected-mark"></i>
        </button>
      </div>

      <!-- Krok 2: kam poslat -->
      <div id="share-note-target-section" class="share-note-target-section hidden">
        <p class="share-note-step-label">2. Vyberte cíl:</p>
        <div id="share-note-thread-list" class="share-note-thread-list">
          <div class="spinner-container" style="padding: var(--space-md) 0"><div class="spinner"></div></div>
        </div>
        <button id="share-note-add-thread" class="share-note-add-thread-btn">
          <i class="fas fa-plus"></i> Vytvořit nové vlákno
        </button>
        <div id="share-note-new-thread-form" class="share-note-new-thread-form hidden">
          <input type="text" id="share-note-thread-name" placeholder="Název vlákna..." />
          <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-sm)">
            <button id="share-note-create-thread" class="button-primary">Vytvořit a vybrat</button>
            <button id="share-note-cancel-thread" class="button-secondary">Zrušit</button>
          </div>
        </div>
        <div class="share-note-send-row">
          <button id="share-note-send" class="button-primary" disabled>Odeslat</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

// ─── Data loading ──────────────────────────────────────────────────────────────

async function loadShoppingLists(): Promise<void> {
  const grid = $('shopping-lists-grid');
  if (!grid) return;

  if (!grid.hasChildNodes() || grid.querySelector('.spinner')) {
    grid.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
  }

  const lists = await authFetch<ShoppingList[]>('/api/shopping-lists');
  if (!lists) {
    grid.innerHTML = '<p class="error-text">Chyba načítání nákupních seznamů.</p>';
    return;
  }

  renderShoppingLists(lists);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderShoppingLists(lists: ShoppingList[]): void {
  const grid = $('shopping-lists-grid');
  if (!grid) return;

  // Zapamatuj sbalené karty před přerenderem
  const collapsedIds = new Set<string>();
  grid.querySelectorAll<HTMLElement>('.shopping-list-card.collapsed').forEach((el) => {
    if (el.dataset.listId) collapsedIds.add(el.dataset.listId);
  });

  grid.innerHTML = '';

  if (lists.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-shopping-basket empty-icon"></i>
        <h3>Žádné nákupní seznamy</h3>
        <p>Klikněte na "Nový košík" pro vytvoření prvního seznamu.</p>
      </div>`;
    return;
  }

  const currentUserId = getUserId();
  const isAdminUser = getRole() === 'admin';

  for (const list of lists) {
    const card = document.createElement('div');
    const isCollapsed = collapsedIds.has(list.id);
    card.className = `shopping-list-card card${isCollapsed ? ' collapsed' : ''}`;
    card.dataset.listId = list.id;

    const totalItems = list.items.length;
    const doneItems  = list.items.filter((i) => isDone(i.status)).length;
    const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
    const allDone  = totalItems > 0 && doneItems === totalItems;
    const canEdit  = list.createdById === currentUserId || isAdminUser;

    // ── Header (vždy viditelný) ──────────────────────────────────────────────
    const headerHTML = `
      <div class="shopping-card-header shopping-card-toggle" role="button" tabindex="0"
           aria-expanded="${!isCollapsed}" data-list-id="${list.id}">
        <div class="shopping-card-title-area">
          <h3>${list.name}</h3>
          <span class="shopping-card-meta">Přidal(a) ${list.createdBy?.username ?? 'Neznámý'}</span>
        </div>
        <div class="shopping-card-header-actions">
          <button class="btn-share-list btn-icon-action btn-icon-share" data-id="${list.id}" data-name="${list.name.replace(/"/g, '&quot;')}" title="Sdílet do chatu"><i class="fas fa-bullhorn"></i></button>
          ${allDone ? `<button class="btn-archive-list btn-icon-action btn-icon-success" data-id="${list.id}" title="Archivovat seznam"><i class="fas fa-archive"></i></button>` : ''}
          ${canEdit ? `<button class="btn-delete-list btn-icon-action btn-icon-danger" data-id="${list.id}" title="Smazat seznam"><i class="fas fa-trash"></i></button>` : ''}
          <button class="btn-collapse-list" title="${isCollapsed ? 'Rozbalit' : 'Sbalit'}" data-list-id="${list.id}" aria-label="Přepnout sbalení">
            <i class="fas fa-chevron-up collapse-icon"></i>
          </button>
        </div>
      </div>
      <div class="shopping-progress">
        <div class="progress-bar">
          <div class="progress-fill ${allDone ? 'progress-complete' : ''}" style="width: ${progressPct}%"></div>
        </div>
        <span class="progress-text">${doneItems} / ${totalItems} hotovo</span>
      </div>`;

    // ── Add item form ────────────────────────────────────────────────────────
    const addItemHTML = `
      <form class="shopping-add-item-form" data-list-id="${list.id}">
        <div class="shopping-input-wrapper">
          <input type="text" class="shopping-add-input" placeholder="Přidat položku..." required autocomplete="off" />
          <button type="submit" class="shopping-add-btn" title="Přidat"><i class="fas fa-arrow-up"></i></button>
        </div>
      </form>`;

    // ── Items ────────────────────────────────────────────────────────────────
    let itemsHTML = '<div class="shopping-items-list">';
    if (list.items.length > 0) {
      const sorted = [...list.items].sort((a, b) => {
        const aDone = isDone(a.status) ? 1 : 0;
        const bDone = isDone(b.status) ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      for (const item of sorted) {
        const doneClass = isDone(item.status) ? 'is-done' : '';
        const canDeleteItem =
          item.addedById === currentUserId ||
          list.createdById === currentUserId ||
          isAdminUser;

        const bringBadge = item.status === 'bring_from_home'
          ? '<span class="shopping-item-badge bring-badge"><i class="fas fa-home"></i> Z domova</span>'
          : '';

        const purchasedBadge =
          item.status === 'purchased' && item.purchasedBy
            ? `<span class="purchased-by-badge" title="Koupil(a) ${item.purchasedBy.username}">${item.purchasedBy.animalIcon ?? item.purchasedBy.username[0].toUpperCase()}</span>`
            : '';

        const deleteBtn = canDeleteItem
          ? `<button class="btn-delete-item" title="Smazat položku" data-item-id="${item.id}"><i class="fas fa-times"></i></button>`
          : '';

        itemsHTML += `
          <div class="shopping-item-row ${doneClass}" data-item-id="${item.id}" data-list-id="${list.id}" data-status="${item.status}">
            <button class="shopping-status-btn" title="${statusLabel(item.status)}" data-item-id="${item.id}">
              ${statusIcon(item.status)}
            </button>
            <span class="shopping-item-name">${item.name}</span>
            ${bringBadge}
            ${purchasedBadge}
            ${deleteBtn}
          </div>`;
      }
    } else {
      itemsHTML += `
        <div class="empty-list-container">
          <i class="fas fa-shopping-basket empty-list-icon"></i>
          <p class="empty-list-text">Seznam je prázdný.</p>
        </div>`;
    }
    itemsHTML += '</div>';

    // ── Footer (archivace) ───────────────────────────────────────────────────
    const footerHTML = allDone ? `
      <div class="shopping-card-footer">
        <button class="btn-resolve-list btn-archive-list" data-id="${list.id}">
          <i class="fas fa-archive"></i> Archivovat / Uzavřít
        </button>
      </div>` : '';

    // Zabal měnitelný obsah – skrývá se při sbalení
    const collapsibleHTML = `
      <div class="shopping-collapsible">
        <div class="shopping-collapsible-inner">
          ${addItemHTML}
          ${itemsHTML}
          ${footerHTML}
        </div>
      </div>`;

    card.innerHTML = headerHTML + collapsibleHTML;
    grid.appendChild(card);
  }

  bindCardEvents(grid);
}

// ─── Collapse helper ─────────────────────────────────────────────────────────

function toggleCollapse(card: HTMLElement): void {
  const isNowCollapsed = card.classList.toggle('collapsed');
  const btn = card.querySelector<HTMLButtonElement>('.btn-collapse-list');
  if (btn) {
    btn.title = isNowCollapsed ? 'Rozbalit' : 'Sbalit';
    btn.setAttribute('aria-label', isNowCollapsed ? 'Rozbalit seznam' : 'Sbalit seznam');
  }
  const header = card.querySelector<HTMLElement>('.shopping-card-toggle');
  if (header) header.setAttribute('aria-expanded', String(!isNowCollapsed));
}

// ─── Share dialog ─────────────────────────────────────────────────────────────

interface NoteThread { id: string; name: string; }

async function openShareDialog(listId: string, listName: string): Promise<void> {
  const modal         = $('share-note-modal')!;
  const subtitle      = $('share-note-list-name')!;
  const targetSection = $('share-note-target-section')!;
  const threadListEl  = $('share-note-thread-list')!;
  const sendBtn       = $<HTMLButtonElement>('share-note-send')!;
  const addThreadBtn  = $('share-note-add-thread')!;
  const newThreadForm = $('share-note-new-thread-form')!;
  const threadNameInp = $<HTMLInputElement>('share-note-thread-name')!;
  const createBtn     = $('share-note-create-thread')!;
  const cancelBtn     = $('share-note-cancel-thread')!;
  const btnNew        = $<HTMLButtonElement>('share-note-new')!;
  const btnGoing      = $<HTMLButtonElement>('share-note-going')!;

  subtitle.textContent = `seznam: "${listName}"`;

  // Reset state
  hide(targetSection);
  hide(newThreadForm);
  sendBtn.disabled = true;
  btnNew.classList.remove('is-selected');
  btnGoing.classList.remove('is-selected');
  threadListEl.innerHTML = '<div class="spinner-container" style="padding: var(--space-md) 0"><div class="spinner"></div></div>';

  let selectedAction: 'new' | 'going' | null = null;
  let selectedThreadId: string | null | undefined = undefined; // undefined = not yet chosen; null = main board

  // Message builder
  function buildMessage(): string {
    if (selectedAction === 'new') {
      return `[Nový seznam] Založil(a) jsem nový nákupní seznam: "${listName}". Prosím, doplňte, co chybí.`;
    }
    return `[Nákup] Jdu nakupovat podle seznamu: "${listName}". Máte poslední šanci něco připsat!`;
  }

  function refreshSendBtn() {
    const btn = $<HTMLButtonElement>('share-note-send');
    if (btn) btn.disabled = selectedAction === null || selectedThreadId === undefined;
  }

  // Thread selection helpers
  function selectThread(id: string | null, label: string) {
    selectedThreadId = id;
    threadListEl.querySelectorAll<HTMLElement>('.share-thread-option').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.id === (id ?? '__main__'));
    });
    refreshSendBtn();
  }

  function renderThreads(threads: NoteThread[]) {
    threadListEl.innerHTML = '';

    // Main board option
    const mainOpt = document.createElement('button');
    mainOpt.className = 'share-thread-option';
    mainOpt.dataset.id = '__main__';
    mainOpt.innerHTML = '<i class="fas fa-house"></i><span>Hlavní nástěnka</span>';
    mainOpt.addEventListener('click', () => selectThread(null, 'Hlavní nástěnka'));
    threadListEl.appendChild(mainOpt);

    for (const t of threads) {
      const opt = document.createElement('button');
      opt.className = 'share-thread-option';
      opt.dataset.id = t.id;
      opt.innerHTML = `<i class="fas fa-comment"></i><span>${t.name}</span>`;
      opt.addEventListener('click', () => selectThread(t.id, t.name));
      threadListEl.appendChild(opt);
    }
  }

  // Clone action buttons to remove old listeners
  const newBtnClone   = btnNew.cloneNode(true)   as HTMLButtonElement;
  const goingBtnClone = btnGoing.cloneNode(true) as HTMLButtonElement;
  btnNew.replaceWith(newBtnClone);
  btnGoing.replaceWith(goingBtnClone);

  function attachActionBtn(btn: HTMLButtonElement, action: 'new' | 'going') {
    btn.addEventListener('click', async () => {
      selectedAction = action;
      $('share-note-new')!.classList.toggle('is-selected',   action === 'new');
      $('share-note-going')!.classList.toggle('is-selected', action === 'going');
      show(targetSection);
      refreshSendBtn();

      // Load threads once per dialog open
      if (threadListEl.querySelector('.spinner')) {
        const threads = await authFetch<NoteThread[]>('/api/note-threads') ?? [];
        renderThreads(threads);
      }
    });
  }
  attachActionBtn($<HTMLButtonElement>('share-note-new')!,   'new');
  attachActionBtn($<HTMLButtonElement>('share-note-going')!, 'going');

  // "+ Vytvořit nové vlákno" toggle
  const addClone    = addThreadBtn.cloneNode(true) as HTMLButtonElement;
  const sendClone   = sendBtn.cloneNode(true)      as HTMLButtonElement;
  const createClone = createBtn.cloneNode(true)    as HTMLButtonElement;
  const cancelClone = cancelBtn.cloneNode(true)    as HTMLButtonElement;
  addThreadBtn.replaceWith(addClone);
  sendBtn.replaceWith(sendClone);
  createBtn.replaceWith(createClone);
  cancelBtn.replaceWith(cancelClone);

  $('share-note-add-thread')!.addEventListener('click', () => {
    show(newThreadForm);
    $<HTMLInputElement>('share-note-thread-name')!.focus();
  });

  $('share-note-cancel-thread')!.addEventListener('click', () => {
    hide(newThreadForm);
    ($<HTMLInputElement>('share-note-thread-name')!).value = '';
  });

  $('share-note-create-thread')!.addEventListener('click', async () => {
    const name = ($<HTMLInputElement>('share-note-thread-name')!).value.trim();
    if (!name) return;
    const created = await authFetch<NoteThread>('/api/note-threads', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!created) return;
    // Add to list and select it
    const opt = document.createElement('button');
    opt.className = 'share-thread-option';
    opt.dataset.id = created.id;
    opt.innerHTML = `<i class="fas fa-comment"></i><span>${created.name}</span>`;
    opt.addEventListener('click', () => selectThread(created.id, created.name));
    threadListEl.appendChild(opt);
    ($<HTMLInputElement>('share-note-thread-name')!).value = '';
    hide(newThreadForm);
    selectThread(created.id, created.name);
  });

  $<HTMLButtonElement>('share-note-send')!.addEventListener('click', async () => {
    if (selectedAction === null || selectedThreadId === undefined) return;
    hide(modal);
    const body: Record<string, unknown> = { message: buildMessage() };
    if (selectedThreadId !== null) body.threadId = selectedThreadId;
    const res = await authFetch('/api/notes', { method: 'POST', body: JSON.stringify(body) });
    if (res) {
      // Store the target thread so notes page can auto-select it
      sessionStorage.setItem('notes_goto_thread', selectedThreadId ?? '__main__');
      showToast('Zpráva odeslána. Přejíždím na nástěnku...', 'success');
      setTimeout(() => navigate('/notes'), 600);
    }
  });

  show(modal);
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindEvents(): void {
  $('btn-new-list')?.addEventListener('click', () => {
    show($('new-list-modal'));
    $<HTMLInputElement>('new-list-name')?.focus();
  });

  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = $(btn.dataset.close!);
      if (el) hide(el);
    });
  });

  $<HTMLFormElement>('new-list-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('new-list-name');
    const name  = input?.value.trim();
    if (!name) return;

    if (name.length > 100) {
      showToast('Název seznamu je příliš dlouhý (max 100 znaků).', 'error');
      return;
    }

    const created = await authFetch('/api/shopping-lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (created) {
      if (input) input.value = '';
      hide($('new-list-modal'));
      showToast('Nákupní seznam vytvořen.', 'success');
      await loadShoppingLists();
    }
  });
}

function bindCardEvents(grid: HTMLElement): void {

  // ── Sbalit / rozbalit ─────────────────────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.btn-collapse-list').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // nepropagovat na header
      const card = btn.closest<HTMLElement>('.shopping-list-card');
      if (card) toggleCollapse(card);
    });
  });

  // Klik na celou hlavičku (mimo akční tlačítka) sbalí/rozbalí
  grid.querySelectorAll<HTMLElement>('.shopping-card-toggle').forEach((header) => {
    header.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-icon-action, .btn-collapse-list')) return;
      const card = header.closest<HTMLElement>('.shopping-list-card');
      if (card) toggleCollapse(card);
    });
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const card = header.closest<HTMLElement>('.shopping-list-card');
        if (card) toggleCollapse(card);
      }
    });
  });

  // ── Sdílet na nástěnku ────────────────────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.btn-share-list').forEach((btn) => {
    btn.addEventListener('click', () => {
      const listId   = btn.dataset.id!;
      const listName = btn.dataset.name ?? listId;
      void openShareDialog(listId, listName);
    });
  });

  // ── Smazat celý seznam ────────────────────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.btn-delete-list').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        'Smazat seznam?',
        'Opravdu chcete smazat tento nákupní seznam? Všechny jeho položky budou ztraceny.',
        true
      );
      if (!confirmed) return;
      const res = await authFetch(`/api/shopping-lists/${btn.dataset.id}`, { method: 'DELETE' });
      if (res) {
        showToast('Seznam smazán.', 'success');
        await loadShoppingLists();
      }
    });
  });

  // ── Archivovat seznam ─────────────────────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.btn-archive-list').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        'Archivovat seznam?',
        'Všechny položky jsou hotové. Chcete seznam uzavřít? Zmizí z přehledu.',
        false
      );
      if (!confirmed) return;
      const res = await authFetch(`/api/shopping-lists/${btn.dataset.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ isResolved: true }),
      });
      if (res) {
        showToast('Seznam archivován.', 'success');
        await loadShoppingLists();
      }
    });
  });

  // ── Přidat položku ────────────────────────────────────────────────────────
  grid.querySelectorAll<HTMLFormElement>('.shopping-add-item-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const listId = form.dataset.listId;
      const input  = form.querySelector<HTMLInputElement>('.shopping-add-input');
      const name   = input?.value.trim();
      if (!name || !listId) return;

      if (name.length > 100) {
        showToast('Název položky je příliš dlouhý (max 100 znaků).', 'error');
        return;
      }

      const res = await authFetch(`/api/shopping-list/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });

      if (res) {
        if (input) input.value = '';
        await loadShoppingLists();
      }
    });
  });

  // ── Třístavový přepínač statusu ───────────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.shopping-status-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest<HTMLElement>('.shopping-item-row');
      if (!row) return;
      const itemId        = row.dataset.itemId!;
      const currentStatus = (row.dataset.status ?? 'pending') as ItemStatus;
      const newStatus     = nextStatus(currentStatus);

      // Optimistic UI update
      row.dataset.status = newStatus;
      row.classList.toggle('is-done', isDone(newStatus));
      btn.innerHTML = statusIcon(newStatus);
      btn.title     = statusLabel(newStatus);

      const res = await authFetch(`/api/shopping-list/${itemId}/purchase`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res) {
        // Revert on failure
        row.dataset.status = currentStatus;
        row.classList.toggle('is-done', isDone(currentStatus));
        btn.innerHTML = statusIcon(currentStatus);
        btn.title     = statusLabel(currentStatus);
        showToast('Chyba při aktualizaci položky.', 'error');
      } else {
        // Reload to refresh progress bar + archive button visibility
        await loadShoppingLists();
      }
    });
  });

  // ── Smazat položku ────────────────────────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.btn-delete-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.itemId!;
      const res = await authFetch(`/api/shopping-list/${itemId}`, { method: 'DELETE' });
      if (res) await loadShoppingLists();
    });
  });
}

// ─── Page Module ───────────────────────────────────────────────────────────────

const shoppingPage: PageModule = {
  async mount(el: HTMLElement) {
    container = el;
    el.innerHTML = getTemplate();
    bindEvents();
    await loadShoppingLists();
  },
  unmount() {
    // cleanup if needed
  }
};

export default shoppingPage;
