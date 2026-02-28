/* ============================================================================
   pages/shopping.ts — Shopping list (multi-list grid layout)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { navigate } from '../lib/router';
import {
  $, show, hide, showToast, authFetch, getUserId, getRole, setupCharCounters, validateForm
} from '../lib/common';
import { showConfirm } from '../lib/dialogs';
import { initCustomSelects, destroyCustomSelects } from '../lib/custom-select';
import { icons } from '../lib/icons';
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
  isEssential: boolean;
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

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  status: 'OK' | 'LOW' | 'EMPTY';
  location?: string | null;
  inCart: boolean;
  isEssential: boolean;
  updatedBy?: { id: string; username: string } | null;
}

// ─── Module state ─────────────────────────────────────────────────────────────
let container: HTMLElement;
let currentTab: 'shopping' | 'pantry' = 'shopping';
let inventoryEventsReady = false;
let pageAC: AbortController | null = null;
const collapsedIds = new Set<string>();
let currentInventoryIdToAdd: string | null = null;
let currentInventoryNameToAdd: string | null = null;

// ─── Status helpers ───────────────────────────────────────────────────────────

/** Cycle: pending → bring_from_home → purchased → pending */
function nextStatus(current: ItemStatus): ItemStatus {
  if (current === 'pending') return 'bring_from_home';
  if (current === 'bring_from_home') return 'purchased';
  return 'pending';
}

function statusIcon(status: ItemStatus): string {
  if (status === 'purchased') return '<span class="si-purchased">✓</span>';
  if (status === 'bring_from_home') return '<span class="si-bring">🏠</span>';
  return '<span class="si-pending">○</span>';
}

function statusLabel(status: ItemStatus): string {
  if (status === 'purchased') return 'Koupeno';
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
      <h2>Nákupní seznamy</h2>
      <button id="btn-new-list" class="button-primary">Nový košík</button>
    </div>

    <!-- Segmented Control (iOS-style Tabs) -->
    <div class="tabs-container">
      <button class="tab-button active" id="tab-shopping">Ke koupi</button>
      <button class="tab-button" id="tab-pantry">Zásoby na chatě</button>
    </div>

    <!-- Single content area — swapped on tab switch -->
    <div id="shopping-content-area">
      <div class="spinner-container"><div class="spinner"></div></div>
    </div>
  </div>

  <!-- New List Modal -->
  <div id="new-list-modal" class="modal-overlay hidden">
    <div class="modal-content" style="max-width: 400px;">
      <span class="modal-close-button" data-close="new-list-modal">&times;</span>
      <h2>Vytvořit nový nákupní seznam</h2>
      <form id="new-list-form" style="margin-top: var(--space-md);" novalidate>
        <input type="text" id="new-list-name" placeholder="Název (např. Nákup na víkend)" required maxlength="100" style="width: 100%; margin-bottom: var(--space-md);" />
        <div class="modal-actions">
          <button type="button" class="button-secondary" data-close="new-list-modal">Zrušit</button>
          <button type="submit" class="button-primary">Vytvořit</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Share to Chat Dialog -->
  <div id="share-note-modal" class="modal-overlay hidden">
    <div class="modal-content share-note-modal-content">
      <span class="modal-close-button" data-close="share-note-modal">&times;</span>
      <h2>Sdílet do chatu</h2>
      <p id="share-note-list-name" class="share-note-subtitle"></p>

      <!-- Krok 1: co poslat -->
      <p class="share-note-step-label">1. Vyberte typ zprávy:</p>
      <div class="share-note-options">
        <button id="share-note-new" class="share-note-btn" data-action="new">
          <span class="share-note-btn-icon">📋</span>
          <div>
            <strong>Upozornit na nový seznam</strong>
            <span>Pošle zprávu ostatním, ať doplňí položky</span>
          </div>
          <span class="share-note-selected-mark">✓</span>
        </button>
        <button id="share-note-going" class="share-note-btn share-note-btn-urgent" data-action="going">
          <span class="share-note-btn-icon">🏃</span>
          <div>
            <strong>Jdu do obchodu</strong>
            <span>Urgentní výzva k doplnění seznamu</span>
          </div>
          <span class="share-note-selected-mark">✓</span>
        </button>
      </div>

      <!-- Krok 2: kam poslat -->
      <div id="share-note-target-section" class="share-note-target-section hidden">
        <p class="share-note-step-label">2. Vyberte cíl:</p>
        <div id="share-note-thread-list" class="share-note-thread-list">
          <div class="spinner-container" style="padding: var(--space-md) 0"><div class="spinner"></div></div>
        </div>
        <button id="share-note-add-thread" class="share-note-add-thread-btn">
          + Vytvořit nové vlákno
        </button>
        <form id="share-note-new-thread-form" class="share-note-new-thread-form hidden" novalidate>
          <input type="text" id="share-note-thread-name" placeholder="Název vlákna..." required />
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

  <!-- ── Přidat zásobu do nákupu — výběr seznamu ── -->
  <div id="add-to-cart-modal" class="modal-overlay hidden">
    <div class="modal-content" style="max-width: 420px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md);">
        <h2 id="add-to-cart-modal-title" style="margin:0; font-size:1.1rem;">Přidat do nákupu</h2>
        <button class="modal-close-button" data-close="add-to-cart-modal" style="position:static;">&times;</button>
      </div>
      <p style="font-size:0.85rem; color:var(--color-text-muted); margin:0 0 var(--space-md);">
        Vyberte, do kterého seznamu chcete položku přidat:
      </p>
      <!-- Existující aktivní seznamy -->
      <div id="add-to-cart-lists" style="display:flex; flex-direction:column; gap:8px; margin-bottom:var(--space-md);">
        <div class="spinner-container" style="padding:var(--space-sm) 0;"><div class="spinner"></div></div>
      </div>
      <!-- Oddělovaè -->
      <div class="modal-divider">— nebo vytvořte nový —</div>
      <!-- Formulář nového seznamu -->
      <form id="new-list-for-item-form" novalidate style="display:flex; gap:8px; margin-top:var(--space-sm);">
        <input type="text" id="new-list-name-for-item"
               class="form-input" placeholder="Název nového seznamu..."
               required maxlength="100" style="flex:1; min-width:0;" />
        <button type="submit" class="button-primary" style="flex-shrink:0; white-space:nowrap;">Vytvořit</button>
      </form>
    </div>
  </div>
  `;
}

// ─── Pantry template ────────────────────────────────────────────────────────────
function getPantryTemplate(): string {
  const isGuest = getRole() === 'guest';
  return `
    <form id="inventory-add-form" class="inventory-add-form" novalidate>
      <div class="inv-name-field">
        <input type="text" id="inv-name" class="inventory-input" maxlength="100" placeholder="Název zásoby" autocomplete="off" />
        <span id="inv-name-error" class="error-message">Zadejte název zásoby.</span>
      </div>
      <input type="text" id="inv-location" class="inventory-input inventory-input-location" maxlength="100" placeholder="Kde to leží?" autocomplete="off" />
      <select id="inv-category" class="inventory-select">
        <option value="TRVANLIVÉ">Trvanlivé</option>
        <option value="NÁPOJE">Nápoje</option>
        <option value="HYGIENA">Hygiena</option>
        <option value="KOŘENÍ">Koření</option>
        <option value="OSTATNÍ" selected>Ostatní</option>
      </select>
      <select id="inv-status" class="inventory-select">
        <option value="OK">Dostatek</option>
        <option value="LOW">Málo</option>
        <option value="EMPTY">Došlo</option>
      </select>
      <button type="submit" class="button-primary inv-add-btn" title="Přidat položku">↑</button>
    </form>
    <div id="inventory-list" class="inventory-list">
      <div class="spinner-container"><div class="spinner"></div></div>
    </div>
  `;
}

// ─── Inventory Loading & Rendering ────────────────────────────────────────────────────

async function loadInventory(): Promise<void> {
  const contentArea = $('shopping-content-area');
  if (!contentArea) return;

  // Inject pantry template if not already present
  if (!$('inventory-list')) {
    contentArea.innerHTML = getPantryTemplate();
    bindInventoryFormEvents();
    initCustomSelects(contentArea);
  }

  const list = $('inventory-list');
  if (!list) return;

  list.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  const items = await authFetch<InventoryItem[]>('/api/inventory');
  if (!items) {
    list.innerHTML = '<p class="error-text">Chyba při načítání zásob.</p>';
    return;
  }

  renderInventory(items, list);
  setupCharCounters(contentArea);
}

function bindInventoryFormEvents(): void {
  if (inventoryEventsReady) return;
  inventoryEventsReady = true;

  const signal = pageAC!.signal;

  container.addEventListener('submit', async (e) => {
    const form = (e.target as HTMLElement).closest<HTMLFormElement>('#inventory-add-form');
    if (!form) return;
    e.preventDefault();
    if (!validateForm(form)) return;

    const nameEl = $<HTMLInputElement>('inv-name');
    const catEl = $<HTMLSelectElement>('inv-category');
    const stEl = $<HTMLSelectElement>('inv-status');
    const locEl = $<HTMLInputElement>('inv-location');
    const essEl = $<HTMLInputElement>('inv-essential');
    const name = nameEl?.value.trim() ?? '';
    // Custom validation message handled by validateForm for `required` but here we also check if manual empty check occurs
    if (!name) return;

    if (name.length > 100) { showToast('Název je příliš dlouhý (max 100 znaků).', 'error'); return; }

    const res = await authFetch<InventoryItem>('/api/inventory', {
      method: 'POST',
      body: JSON.stringify({
        name,
        category: catEl?.value ?? 'OSTATNÍ',
        status: stEl?.value ?? 'OK',
        location: locEl?.value.trim() || null,
        isEssential: essEl?.checked ?? false,
      }),
    });
    if (res) {
      if (nameEl) nameEl.value = '';
      if (locEl) locEl.value = '';
      if (essEl) essEl.checked = false;
      showToast('Položka přidána.', 'success');
      await loadInventory();
    }
  }, { signal });

  container.addEventListener('click', async (e) => {
    const el = e.target as HTMLElement;

    const addBtn = el.closest<HTMLButtonElement>('.btn-add-to-cart');
    if (addBtn && addBtn.dataset.id && !addBtn.disabled) {
      const row = addBtn.closest<HTMLElement>('.inventory-item');
      const rawName = row?.querySelector<HTMLElement>('.inventory-item-name')?.textContent?.trim() ?? '';
      // Strip leading SVG icon text
      const invName = rawName.replace(/^[^\w\u00C0-\u017E]+/, '').trim() || rawName;
      await openAddToCartModal(addBtn.dataset.id, invName);
      return;
    }

    const editBtn = el.closest<HTMLButtonElement>('.btn-inv-edit');
    if (editBtn && editBtn.dataset.id) {
      await openEditInventoryModal(editBtn.dataset.id);
      return;
    }

    const delBtn = el.closest<HTMLButtonElement>('.btn-inv-delete');
    if (delBtn && delBtn.dataset.id) {
      const confirmed = await showConfirm('Smazat zásobu?', 'Opravdu chcete tuto zásobu smazat?', true);
      if (!confirmed) return;
      const res = await authFetch(`/api/inventory/${delBtn.dataset.id}`, { method: 'DELETE' });
      if (res) {
        showToast('Položka smazána.', 'success');
        await loadInventory();
      }
    }

    const essBtn = el.closest<HTMLButtonElement>('.btn-inv-essential');
    if (essBtn && essBtn.dataset.id) {
      essBtn.disabled = true;
      const res = await authFetch(`/api/inventory/${essBtn.dataset.id}/toggle-essential`, { method: 'PATCH' });
      if (res) {
        await loadInventory();
      } else {
        essBtn.disabled = false;
      }
    }
  }, { signal });
}

function renderInventory(items: InventoryItem[], listEl: HTMLElement): void {
  listEl.innerHTML = '';

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="inventory-empty-state">
        <span class="empty-state-icon">${icons.box()}</span>
        <h3>Žádné zásoby</h3>
        <p>Přidejte první položku, kterou chcete na chatě sledovat.</p>
      </div>`;
    return;
  }

  // Group by category
  const grouped = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const cat = item.category || 'OSTATNÍ';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  const categoryOrder = ['TRVANLIVÉ', 'NÁPOJE', 'HYGIENA', 'KOŘENÍ', 'OSTATNÍ'];
  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const cat of sortedKeys) {
    const section = document.createElement('div');
    section.className = 'inventory-section';

    const label = document.createElement('div');
    label.className = 'inventory-category-label';
    label.textContent = cat;
    section.appendChild(label);

    for (const item of grouped.get(cat)!) {
      section.appendChild(renderInventoryRow(item));
    }

    listEl.appendChild(section);
  }
}

function renderInventoryRow(item: InventoryItem): HTMLElement {
  const row = document.createElement('div');
  row.className = `inventory-item${item.isEssential ? ' is-essential' : ''}${item.status === 'EMPTY' ? ' item-empty' : ''}`;
  row.dataset.id = item.id;
  if (item.location) row.dataset.location = item.location;

  const badgeClass = item.status === 'OK' ? 'badge-full' : item.status === 'LOW' ? 'badge-low' : 'badge-empty';
  const badgeLabel = item.status === 'OK' ? 'Dostatek' : item.status === 'LOW' ? 'Málo' : 'Došlo';

  const essentialIcon = '';

  const locationHtml = item.location
    ? `<span class="inv-meta-location">${item.location}</span>`
    : '';
  const updatedByHtml = item.updatedBy
    ? `<span class="inv-meta-updated">${item.updatedBy.username}</span>`
    : '';
  const metaHtml = (locationHtml || updatedByHtml)
    ? `<div class="inv-item-meta">${locationHtml}${updatedByHtml}</div>`
    : '';

  // Only show cart button for LOW or EMPTY items
  let cartBtn = '';
  if (item.inCart) {
    cartBtn = `<span class="text-muted" style="font-size: 0.8rem; white-space: nowrap;">V nákupním seznamu 🛒</span>`;
  } else if (item.status === 'LOW' || item.status === 'EMPTY') {
    cartBtn = `<button class="btn-add-to-cart" data-id="${item.id}" title="Přidat do nákupního seznamu">Přidat do nákupu</button>`;
  }

  const essentialBtn = '';

  row.innerHTML = `
    <span class="badge ${badgeClass}">${badgeLabel}</span>
    <div class="inventory-item-info">
      <span class="inventory-item-name">${essentialIcon}${item.name}</span>
      ${metaHtml}
    </div>
    <div class="item-actions">
      ${cartBtn}
      ${essentialBtn}
      <button class="ghost-btn btn-inv-edit" data-id="${item.id}" title="Upravit">${icons.edit(14)}</button>
      <button class="ghost-btn btn-inv-delete" data-id="${item.id}" title="Smazat">${icons.close(12)}</button>
    </div>`;

  return row;
}

async function openEditInventoryModal(id: string): Promise<void> {
  // Remove any stale modal
  document.getElementById('inv-edit-modal')?.remove();

  const item = await authFetch<InventoryItem>(`/api/inventory`);
  // We don't have a single GET endpoint, so find from last known render
  const row = document.querySelector<HTMLElement>(`.inventory-item[data-id="${id}"]`);
  const nameText = row?.querySelector<HTMLElement>('.inventory-item-name')?.textContent ?? '';
  const locationText = row?.dataset.location ?? '';

  const modal = document.createElement('div');
  modal.id = 'inv-edit-modal';
  modal.className = 'modal-overlay';
  const isGuest = getRole() === 'guest';
  const essentialRow = row?.closest('.inventory-item')?.classList.contains('is-essential');
  modal.innerHTML = `
    <div class="modal-content modal-small">
      <span class="modal-close-button" id="inv-edit-close">&times;</span>
      <h2>Upravit zásobu</h2>
      <form id="inv-edit-form" style="margin-top: var(--space-md); display:flex; flex-direction:column; gap:var(--space-sm);" novalidate>
        <input type="text" id="inv-edit-name" class="inventory-input" value="${nameText}" maxlength="100" placeholder="Název zásoby" />
        <input type="text" id="inv-edit-location" class="inventory-input" value="${locationText}" maxlength="100" placeholder="Kde to leží? (např. Kůlna)" />
        <select id="inv-edit-status" class="inventory-select">
          <option value="OK">Dostatek</option>
          <option value="LOW">Málo</option>
          <option value="EMPTY">Došlo</option>
        </select>
        ${!isGuest ? `<label class="essential-toggle-label essential-toggle-label--form"><input type="checkbox" id="inv-edit-essential" ${essentialRow ? 'checked' : ''} /><span class="essential-toggle-icon">★</span><span>Důležitá položka</span></label>` : ''}
        <div class="inv-modal-footer">
          ${!isGuest ? `<button type="button" id="inv-edit-delete" class="btn-modal-delete">Smazat zásobu</button>` : '<span></span>'}
          <div style="display:flex; gap:8px;">
            <button type="button" id="inv-edit-cancel" class="button-secondary">Zrušit</button>
            <button type="submit" class="button-primary">Uložit</button>
          </div>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  // Try to pre-select current status from badge class
  const badgeEl = row?.querySelector<HTMLElement>('.badge');
  const currentStatus =
    badgeEl?.classList.contains('badge-full') ? 'OK' :
      badgeEl?.classList.contains('badge-low') ? 'LOW' : 'EMPTY';
  const sel = modal.querySelector<HTMLSelectElement>('#inv-edit-status')!;
  sel.value = currentStatus;

  setupCharCounters(modal);

  function closeModal() { modal.remove(); }
  modal.querySelector('#inv-edit-close')?.addEventListener('click', closeModal);
  modal.querySelector('#inv-edit-cancel')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ── Smazat zásobu ─────────────────────────────────────────────────
  modal.querySelector<HTMLButtonElement>('#inv-edit-delete')?.addEventListener('click', async () => {
    const confirmed = await showConfirm(
      'Smazat zásobu?',
      'Opravdu chcete tuto zásobu smazat? Tato akce je nevratná.',
      true,
    );
    if (!confirmed) return;
    const res = await authFetch(`/api/inventory/${id}`, { method: 'DELETE' });
    if (res) {
      showToast('Položka smazána.', 'success');
      closeModal();
      await loadInventory();
    }
  });

  modal.querySelector<HTMLFormElement>('#inv-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = modal.querySelector<HTMLInputElement>('#inv-edit-name')!;
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.classList.add('input-error');
      nameInput.focus();
      showToast('Zadejte název zásoby.', 'error');
      return;
    }
    if (name.length > 100) { showToast('Název je příliš dlouhý (max 100 znaků).', 'error'); return; }
    nameInput.classList.remove('input-error');
    const status = (modal.querySelector<HTMLSelectElement>('#inv-edit-status')!).value;
    const location = (modal.querySelector<HTMLInputElement>('#inv-edit-location')!).value.trim();
    const essentialCb = modal.querySelector<HTMLInputElement>('#inv-edit-essential');
    const isEssential = essentialCb?.checked ?? false;
    const res = await authFetch(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, status, location: location || null, isEssential }),
    });
    if (res) {
      showToast('Položka aktualizována.', 'success');
      closeModal();
      await loadInventory();
    }
  });
}

// ─── Add-to-cart modal ──────────────────────────────────────────────────────────

async function openAddToCartModal(invId: string, invName: string): Promise<void> {
  currentInventoryIdToAdd = invId;
  currentInventoryNameToAdd = invName;

  const modal = $('add-to-cart-modal')!;
  const title = $('add-to-cart-modal-title')!;
  const listsEl = $('add-to-cart-lists')!;
  const nameInp = $<HTMLInputElement>('new-list-name-for-item')!;

  title.textContent = `Přidat „${invName}" do nákupu`;
  nameInp.value = '';
  listsEl.innerHTML = '<div class="spinner-container" style="padding:var(--space-sm) 0;"><div class="spinner"></div></div>';
  show(modal);

  const lists = await authFetch<ShoppingList[]>('/api/shopping-lists');
  const active = (lists ?? []).filter((l) => !l.isResolved);

  if (active.length === 0) {
    listsEl.innerHTML = '<p style="font-size:0.85rem;color:var(--color-text-muted);margin:0;">Zatím žádné aktivní seznamy.</p>';
  } else {
    listsEl.innerHTML = active
      .map((l) => {
        const pending = l.items.filter((i) => !isDone(i.status)).length;
        return `
          <button type="button" class="add-to-cart-list-btn button-secondary" data-list-id="${l.id}">
            <span class="atc-list-name">${l.name}</span>
            <span class="atc-list-count">${pending} nekoupených</span>
          </button>`;
      })
      .join('');

    listsEl.querySelectorAll<HTMLButtonElement>('.add-to-cart-list-btn').forEach((btn) => {
      btn.addEventListener('click', () => submitAddToCart({ listId: btn.dataset.listId! }));
    });
  }

  // Replace form to strip any stale listeners
  const oldForm = $('new-list-for-item-form') as HTMLFormElement;
  const newForm = oldForm.cloneNode(true) as HTMLFormElement;
  oldForm.replaceWith(newForm);
  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = newForm.querySelector<HTMLInputElement>('#new-list-name-for-item')!.value.trim();
    if (!newName) return;
    if (newName.length > 100) { showToast('Název je příliš dlouhý (max 100 znaků).', 'error'); return; }
    await submitAddToCart({ newListName: newName });
  });
}

async function submitAddToCart(payload: { listId?: string; newListName?: string }): Promise<void> {
  if (!currentInventoryIdToAdd) return;
  const invId = currentInventoryIdToAdd;
  const invName = currentInventoryNameToAdd;
  currentInventoryIdToAdd = null;
  currentInventoryNameToAdd = null;

  hide($('add-to-cart-modal')!);

  const res = await authFetch(`/api/inventory/${invId}/add-to-cart`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res) {
    showToast(`„${invName}" přidáno do nákupu.`, 'success');
    await Promise.all([
      loadInventory(),
      currentTab === 'shopping' ? loadShoppingLists() : Promise.resolve(),
    ]);
  }
}

// ─── Data loading ──────────────────────────────────────────────────────────────

// ── Scroll-position helpers ────────────────────────────────────────────────────────
function saveScrollPositions(grid: HTMLElement): Map<string, number> {
  const map = new Map<string, number>();
  grid.querySelectorAll<HTMLElement>('.shopping-list-card').forEach((card) => {
    const listId = card.dataset.listId;
    const list = card.querySelector<HTMLElement>('.shopping-items-list');
    if (listId && list) map.set(listId, list.scrollTop);
  });
  return map;
}

function restoreScrollPositions(grid: HTMLElement, positions: Map<string, number>): void {
  grid.querySelectorAll<HTMLElement>('.shopping-list-card').forEach((card) => {
    const listId = card.dataset.listId;
    const list = card.querySelector<HTMLElement>('.shopping-items-list');
    if (listId && list && positions.has(listId)) {
      list.scrollTop = positions.get(listId)!;
    }
  });
}

async function loadShoppingLists(): Promise<void> {
  const contentArea = $('shopping-content-area');
  if (!contentArea) return;

  // Create or reuse grid inside content area
  let grid = document.getElementById('shopping-lists-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.id = 'shopping-lists-grid';
    grid.className = 'shopping-lists-grid';
    contentArea.innerHTML = '';
    contentArea.appendChild(grid);
  }

  // Zachovat scroll pozice před překreslením
  const scrollPositions = saveScrollPositions(grid);

  grid.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  const lists = await authFetch<ShoppingList[]>('/api/shopping-lists?isPantry=false');
  if (!lists) {
    grid.innerHTML = '<p class="error-text">Chyba načítání nákupních seznamů.</p>';
    return;
  }
  renderShoppingLists(lists, grid);
  setupCharCounters(contentArea);

  // Obnovit scroll pozice po překreslení
  restoreScrollPositions(grid, scrollPositions);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderShoppingItemRow(
  item: ShoppingItem,
  currentUserId: string | null,
  listCreatedById: string,
  isAdminUser: boolean,
  isEssentialSection: boolean,
): string {
  const isPurchased = item.status === 'purchased';
  const isFromHome = item.status === 'bring_from_home';
  const doneClass = isPurchased ? 'is-purchased' : isFromHome ? 'is-from-home' : '';
  const essentialClass = item.isEssential ? 'is-essential' : '';
  const canDeleteItem =
    item.addedById === currentUserId ||
    listCreatedById === currentUserId ||
    isAdminUser;

  // ── Levý checkbox — pouze Koupeno / Nekoupeno ──────────────────────────────
  const svgCheck = icons.check(12);
  const checkboxBtn = `<button class="item-checkbox${isPurchased ? ' is-checked' : ''}" title="${isPurchased ? 'Zrušit koupení' : 'Označit jako koupené'}" data-item-id="${item.id}">${isPurchased ? svgCheck : ''}</button>`;

  // ── Pravá strana: badge + 🏠 + ❗ + × ────────────────────────────────────────
  const purchasedBadge =
    isPurchased && item.purchasedBy
      ? `<span class="purchased-by-badge" title="Koupil(a) ${item.purchasedBy.username}">${item.purchasedBy.animalIcon ?? item.purchasedBy.username[0].toUpperCase()}</span>`
      : '';

  const svgHome = icons.homeSmall(14);
  const fromHomeBtn = `<button class="btn-action btn-home${isFromHome ? ' is-active' : ''}" title="${isFromHome ? 'Zrušit „Z domova“' : 'Přivezu z domova'}" data-item-id="${item.id}">${svgHome}</button>`;

  const isGuest = getRole() === 'guest';
  const essentialBtn = !isGuest
    ? `<button class="btn-action btn-essential${item.isEssential ? ' is-active' : ''}" title="${item.isEssential ? 'Zrušit jako důležité' : 'Označit jako důležité'}" data-item-id="${item.id}"><span class="critical-badge${item.isEssential ? ' is-active' : ''}">★</span></button>`
    : (item.isEssential ? '<span class="critical-badge is-active">★</span>' : '');

  const svgX = icons.close(12);
  const deleteBtn = canDeleteItem
    ? `<button class="btn-action btn-delete-item" title="Smazat položku" data-item-id="${item.id}">${svgX}</button>`
    : '';

  return `
    <div class="shopping-item-row ${doneClass} ${essentialClass}" data-item-id="${item.id}" data-list-id="" data-status="${item.status}" data-essential="${item.isEssential}">
      ${checkboxBtn}
      <span class="shopping-item-name">${item.name}</span>
      ${item.isEssential ? '<span class="from-inventory-badge">Ze zásob</span>' : ''}
      ${purchasedBadge}
      <div class="item-actions">
        ${fromHomeBtn}
        ${essentialBtn}
        ${deleteBtn}
      </div>
    </div>`;
}

function renderShoppingLists(lists: ShoppingList[], grid: HTMLElement): void {
  grid.innerHTML = '';

  if (lists.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">${icons.shoppingBasket()}</span>
        <h3>Žádné aktivní nákupy</h3>
        <p>Klikněte na <strong>Nový košík</strong> a vytvořte první seznam.</p>
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
    const doneItems = list.items.filter((i) => isDone(i.status)).length;
    const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
    const allDone = totalItems > 0 && doneItems === totalItems;
    const canEdit = list.createdById === currentUserId || isAdminUser;

    // ── Header (vždy viditelný) ──────────────────────────────────────────────
    const headerHTML = `
      <div class="shopping-card-header shopping-card-toggle" role="button" tabindex="0"
           aria-expanded="${!isCollapsed}" data-list-id="${list.id}">
        <div class="shopping-card-title-area">
          <h3>${list.name}</h3>
          <span class="shopping-card-meta">Přidal(a) ${list.createdBy?.username ?? 'Neznámý'}</span>
        </div>
        <div class="shopping-card-header-actions">
          <button class="btn-share-list btn-icon-action btn-icon-share" data-id="${list.id}" data-name="${list.name.replace(/"/g, '&quot;')}" title="Sdílet do chatu">${icons.externalLink()}</button>
          ${allDone ? `<button class="btn-archive-list btn-icon-action btn-icon-success" data-id="${list.id}" title="Archivovat seznam">${icons.check(14)}</button>` : ''}
          ${canEdit ? `<button class="btn-delete-list btn-icon-action btn-icon-danger" data-id="${list.id}" title="Smazat seznam">${icons.close(14)}</button>` : ''}
          <button class="btn-collapse-list" title="${isCollapsed ? 'Rozbalit' : 'Sbalit'}" data-list-id="${list.id}" aria-label="Přepnout sbalení">
            <span class="collapse-icon">▼</span>
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
    const isGuest = getRole() === 'guest';
    const addItemHTML = `
      <form class="shopping-add-item-form" data-list-id="${list.id}" novalidate>
        <div class="shopping-input-wrapper">
          <input type="text" class="shopping-add-input" placeholder="Přidat položku..." maxlength="100" required autocomplete="off" />
          <button type="submit" class="shopping-add-btn" title="Přidat položku">↑</button>
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

      // Render all items uniformly — no separate "NEZAPOMEŇTE" section
      for (const item of sorted) {
        itemsHTML += renderShoppingItemRow(item, currentUserId, list.createdById, isAdminUser, false);
      }
    } else {
      itemsHTML += `
        <div class="empty-list-container">
          <i class="fas fa-shopping-basket empty-list-icon" style="color:#9ca3af;opacity:0.4"></i>
          <p class="empty-list-text">Seznam je prázdný.</p>
        </div>`;
    }
    itemsHTML += '</div>';

    // Zabal měnitelný obsah – skrývá se při sbalení
    const collapsibleHTML = `
      <div class="shopping-collapsible">
        <div class="shopping-collapsible-inner">
          ${addItemHTML}
          ${itemsHTML}
        </div>
      </div>`;

    card.innerHTML = headerHTML + collapsibleHTML;
    grid.appendChild(card);
  }

  bindCardEvents(grid);
}

// ─── Collapse helper ─────────────────────────────────────────────────────────

function toggleCollapse(card: HTMLElement): void {
  const listId = card.dataset.listId;
  const isNowCollapsed = card.classList.toggle('collapsed');
  if (listId) {
    if (isNowCollapsed) collapsedIds.add(listId);
    else collapsedIds.delete(listId);
  }
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
  const modal = $('share-note-modal')!;
  const subtitle = $('share-note-list-name')!;
  const targetSection = $('share-note-target-section')!;
  const threadListEl = $('share-note-thread-list')!;
  const sendBtn = $<HTMLButtonElement>('share-note-send')!;
  const addThreadBtn = $('share-note-add-thread')!;
  const newThreadForm = $('share-note-new-thread-form')!;
  const threadNameInp = $<HTMLInputElement>('share-note-thread-name')!;
  const createBtn = $('share-note-create-thread')!;
  const cancelBtn = $('share-note-cancel-thread')!;
  const btnNew = $<HTMLButtonElement>('share-note-new')!;
  const btnGoing = $<HTMLButtonElement>('share-note-going')!;

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
    mainOpt.innerHTML = '<span>Hlavní chat</span>';
    mainOpt.addEventListener('click', () => selectThread(null, 'Hlavní chat'));
    threadListEl.appendChild(mainOpt);

    for (const t of threads) {
      const opt = document.createElement('button');
      opt.className = 'share-thread-option';
      opt.dataset.id = t.id;
      opt.innerHTML = `<span>${t.name}</span>`;
      opt.addEventListener('click', () => selectThread(t.id, t.name));
      threadListEl.appendChild(opt);
    }
  }

  // Clone action buttons to remove old listeners
  const newBtnClone = btnNew.cloneNode(true) as HTMLButtonElement;
  const goingBtnClone = btnGoing.cloneNode(true) as HTMLButtonElement;
  btnNew.replaceWith(newBtnClone);
  btnGoing.replaceWith(goingBtnClone);

  function attachActionBtn(btn: HTMLButtonElement, action: 'new' | 'going') {
    btn.addEventListener('click', async () => {
      selectedAction = action;
      $('share-note-new')!.classList.toggle('is-selected', action === 'new');
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
  attachActionBtn($<HTMLButtonElement>('share-note-new')!, 'new');
  attachActionBtn($<HTMLButtonElement>('share-note-going')!, 'going');

  // "+ Vytvořit nové vlákno" toggle
  const addClone = addThreadBtn.cloneNode(true) as HTMLButtonElement;
  const sendClone = sendBtn.cloneNode(true) as HTMLButtonElement;
  const createClone = createBtn.cloneNode(true) as HTMLButtonElement;
  const cancelClone = cancelBtn.cloneNode(true) as HTMLButtonElement;
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
    opt.innerHTML = `<span>${created.name}</span>`;
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
  // ── Tabs ──
  $('tab-shopping')?.addEventListener('click', () => {
    if (currentTab === 'shopping') return;
    currentTab = 'shopping';
    $('tab-shopping')?.classList.add('active');
    $('tab-pantry')?.classList.remove('active');
    show($('btn-new-list'));
    void loadShoppingLists();
  });

  $('tab-pantry')?.addEventListener('click', () => {
    if (currentTab === 'pantry') return;
    currentTab = 'pantry';
    $('tab-pantry')?.classList.add('active');
    $('tab-shopping')?.classList.remove('active');
    hide($('btn-new-list'));
    void loadInventory();
  });

  // ── New list button ──
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

  // Klik mimo add-to-cart modal ho zavře
  $('add-to-cart-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hide($('add-to-cart-modal')!);
  });

  $<HTMLFormElement>('new-list-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('new-list-name');
    const name = input?.value.trim();
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
      const listId = btn.dataset.id!;
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
      const input = form.querySelector<HTMLInputElement>('.shopping-add-input');
      const essentialCheckbox = form.querySelector<HTMLInputElement>('.essential-checkbox');
      const name = input?.value.trim();
      if (!name || !listId) return;

      if (name.length > 100) {
        showToast('Název položky je příliš dlouhý (max 100 znaků).', 'error');
        return;
      }

      const isEssential = essentialCheckbox?.checked ?? false;

      const res = await authFetch(`/api/shopping-list/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify({ name, isEssential }),
      });

      if (res) {
        if (input) input.value = '';
        if (essentialCheckbox) essentialCheckbox.checked = false;
        await loadShoppingLists();
      }
    });
  });

  // ── Toggle PURCHASED (levý checkbox) ────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.item-checkbox').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const row = btn.closest<HTMLElement>('.shopping-item-row');
      if (!row) { btn.disabled = false; return; }
      const itemId = row.dataset.itemId!;
      const wasPurchased = row.dataset.status === 'purchased';
      const newStatus: ItemStatus = wasPurchased ? 'pending' : 'purchased';
      const svgCheck = icons.check(12);

      // Optimistic update
      row.dataset.status = newStatus;
      row.classList.toggle('is-purchased', !wasPurchased);
      row.classList.remove('is-from-home');
      btn.classList.toggle('is-checked', !wasPurchased);
      btn.innerHTML = !wasPurchased ? svgCheck : '';
      btn.title = !wasPurchased ? 'Zrušit koupení' : 'Označit jako koupené';
      const fhBtn = row.querySelector<HTMLButtonElement>('.btn-home');
      if (fhBtn) { fhBtn.classList.remove('is-active'); fhBtn.title = 'Přivezu z domova'; }

      const res = await authFetch(`/api/shopping-list/${itemId}/purchase`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res) {
        row.dataset.status = wasPurchased ? 'purchased' : 'pending';
        row.classList.toggle('is-purchased', wasPurchased);
        btn.classList.toggle('is-checked', wasPurchased);
        btn.innerHTML = wasPurchased ? svgCheck : '';
        showToast('Chyba při aktualizaci položky.', 'error');
        btn.disabled = false;
      } else {
        await loadShoppingLists();
      }
    });
  });

  // ── Toggle FROM HOME (domeček, pravá strana) ──────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.btn-home').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const row = btn.closest<HTMLElement>('.shopping-item-row');
      if (!row) { btn.disabled = false; return; }
      const itemId = row.dataset.itemId!;
      const wasFromHome = row.dataset.status === 'bring_from_home';
      const newStatus: ItemStatus = wasFromHome ? 'pending' : 'bring_from_home';

      // Optimistic update
      row.dataset.status = newStatus;
      row.classList.toggle('is-from-home', !wasFromHome);
      row.classList.remove('is-purchased');
      btn.classList.toggle('is-active', !wasFromHome);
      btn.title = !wasFromHome ? 'Zrušit „Z domova"' : 'Přivezu z domova';
      const cbBtn = row.querySelector<HTMLButtonElement>('.item-checkbox');
      if (cbBtn) { cbBtn.classList.remove('is-checked'); cbBtn.innerHTML = ''; }

      const res = await authFetch(`/api/shopping-list/${itemId}/purchase`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res) {
        row.dataset.status = wasFromHome ? 'bring_from_home' : 'pending';
        row.classList.toggle('is-from-home', wasFromHome);
        btn.classList.toggle('is-active', wasFromHome);
        btn.title = wasFromHome ? 'Zrušit „Z domova"' : 'Přivezu z domova';
        showToast('Chyba při aktualizaci položky.', 'error');
        btn.disabled = false;
      } else {
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

  // ── Toggle essential ──────────────────────────────────────────────────────
  grid.querySelectorAll<HTMLButtonElement>('.btn-essential').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.itemId!;
      btn.disabled = true;
      const wasActive = btn.classList.contains('is-active');
      // Optimistic toggle
      btn.classList.toggle('is-active');
      btn.title = wasActive ? 'Označit jako důležité' : 'Zrušit jako důležité';
      const badge = btn.querySelector<HTMLElement>('.critical-badge');
      if (badge) badge.classList.toggle('is-active', !wasActive);

      const res = await authFetch(`/api/shopping-list/${itemId}/toggle-essential`, { method: 'PATCH' });
      if (res) {
        await loadShoppingLists();
      } else {
        btn.classList.toggle('is-active');
        btn.title = wasActive ? 'Zrušit jako důležité' : 'Označit jako důležité';
        if (badge) badge.classList.toggle('is-active', wasActive);
        btn.disabled = false;
      }
    });
  });
}

// ─── Page Module ───────────────────────────────────────────────────────────────

const shoppingPage: PageModule = {
  async mount(el: HTMLElement) {
    pageAC?.abort();
    pageAC = new AbortController();
    container = el;
    currentTab = 'shopping';
    collapsedIds.clear();
    inventoryEventsReady = false;

    el.innerHTML = getTemplate();
    bindEvents();
    setupCharCounters(container); // Added as per instruction

    // Ensure the new-list button is always visible on shopping tab
    show($('btn-new-list'));

    await loadShoppingLists();
  },
  unmount() {
    destroyCustomSelects(container);
    pageAC?.abort();
    pageAC = null;
    inventoryEventsReady = false;
  }
};

export default shoppingPage;
