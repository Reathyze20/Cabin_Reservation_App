/* ============================================================================
   pages/shopping.ts — Shopping list (multi-list grid layout)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import {
  $, show, hide, showToast, authFetch, getUserId
} from '../lib/common';
import { showConfirm } from '../lib/dialogs';
import '../styles/shopping.css';

// ─── Module state ────────────────────────────────────────────────────
let container: HTMLElement;

// ─── Template ─────────────────────────────────────────────────────────

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
        <div style="text-align: right;">
          <button type="button" class="button-secondary" data-close="new-list-modal">Zrušit</button>
          <button type="submit" class="button-primary">Vytvořit</button>
        </div>
      </form>
    </div>
  </div>
  `;
}

// ─── Data loading ─────────────────────────────────────────────────────

async function loadShoppingLists(): Promise<void> {
  const grid = $('shopping-lists-grid');
  if (!grid) return;

  // Show spinner if empty
  if (!grid.hasChildNodes() || grid.querySelector('.spinner')) {
    grid.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
  }

  const lists = await authFetch<any[]>('/api/shopping-lists');
  if (!lists) {
    grid.innerHTML = '<p class="error-text">Chyba načítání nákupních seznamů.</p>';
    return;
  }

  renderShoppingLists(lists);
}

function renderShoppingLists(lists: any[]): void {
  const grid = $('shopping-lists-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (lists.length === 0) {
    grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-basket empty-icon"></i>
                <h3>Žádné nákupní seznamy</h3>
                <p>Klikněte na "Nový košík" pro vytvoření prvního seznamu.</p>
            </div>
        `;
    return;
  }

  const currentUserId = getUserId();

  for (const list of lists) {
    const card = document.createElement('div');
    card.className = 'shopping-list-card card';

    // Count stats
    const totalItems = list.items ? list.items.length : 0;
    const purchasedItems = list.items ? list.items.filter((i: any) => i.purchased).length : 0;

    // Create header
    const headerHTML = `
            <div class="shopping-card-header">
                <div class="shopping-card-title-area">
                    <h3>${list.name}</h3>
                    <span class="shopping-card-meta">Přidal(a) ${list.createdBy?.username || 'Neznámý'}</span>
                </div>
                ${list.createdById === currentUserId || getUserId() === 'admin' ?
        `<button class="btn-icon-danger btn-delete-list" data-id="${list.id}" title="Smazat seznam"><i class="fas fa-trash"></i></button>`
        : ''}
            </div>
            <div class="shopping-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0}%"></div>
                </div>
                <span class="progress-text">${purchasedItems} / ${totalItems} koupeno</span>
            </div>
        `;

    // Create add item row
    const addItemHTML = `
            <form class="shopping-add-item-form" data-list-id="${list.id}">
                <div class="shopping-input-wrapper">
                    <input type="text" class="shopping-add-input" placeholder="Přidat položku..." required autocomplete="off" />
                    <button type="submit" class="shopping-add-btn" title="Přidat"><i class="fas fa-arrow-up"></i></button>
                </div>
            </form>
        `;

    // Create items list
    let itemsHTML = '<div class="shopping-items-list">';
    if (list.items && list.items.length > 0) {
      // Sort items: unpurchased first, then purchased
      const sortedItems = [...list.items].sort((a, b) => {
        if (a.purchased === b.purchased) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return a.purchased ? 1 : -1;
      });

      for (const item of sortedItems) {
        const purchasedClass = item.purchased ? 'is-purchased' : '';
        itemsHTML += `
                    <div class="shopping-item-row ${purchasedClass}" data-item-id="${item.id}" data-list-id="${list.id}">
                        <label class="shopping-item-label">
                            <input type="checkbox" class="shopping-item-checkbox" ${item.purchased ? 'checked' : ''} />
                            <span class="custom-checkbox"></span>
                            <span class="shopping-item-name">${item.name}</span>
                        </label>
                        ${item.purchased ? `<span class="purchased-by-badge" title="Koupil(a) ${item.purchasedBy?.username || 'Někdo'}">${item.purchasedBy?.username?.[0]?.toUpperCase() || '✓'}</span>` : ''}
                        ${item.addedById === currentUserId || list.createdById === currentUserId || getUserId() === 'admin' ?
            `<button class="btn-icon-tiny btn-delete-item" title="Smazat položku"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                `;
      }
    } else {
      itemsHTML += `
      <div class="empty-list-container">
        <i class="fas fa-shopping-basket empty-list-icon"></i>
        <p class="empty-list-text">Seznam je prázdný.</p>
      </div>`;
    }
    itemsHTML += '</div>';

    // Actions footer
    const footerHTML = `
            <div class="shopping-card-footer">
                <button class="button-secondary btn-sm btn-resolve-list" data-id="${list.id}"><i class="fas fa-check-double"></i> Archivovat sestavu</button>
            </div>
        `;

    card.innerHTML = headerHTML + addItemHTML + itemsHTML + footerHTML;
    grid.appendChild(card);
  }

  bindCardEvents(grid);
}

// ─── Event Binding ────────────────────────────────────────────────────

function bindEvents(): void {
  // Top-level new list button
  $('btn-new-list')?.addEventListener('click', () => {
    show($('new-list-modal'));
    $<HTMLInputElement>('new-list-name')?.focus();
  });

  // Close Modals
  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = $(btn.dataset.close!);
      if (el) hide(el);
    });
  });

  // Create New List Form Submit
  $<HTMLFormElement>('new-list-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('new-list-name');
    const name = input?.value.trim();
    if (!name) return;

    const created = await authFetch('/api/shopping-lists', {
      method: 'POST',
      body: JSON.stringify({ name })
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
  // Delete List
  grid.querySelectorAll<HTMLButtonElement>('.btn-delete-list').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        'Smazat seznam?',
        'Opravdu chcete smazat tento nákupní seznam? Všechny jeho položky budou ztraceny.',
        true
      );
      if (!confirmed) return;
      const res = await authFetch(`/api/shopping-lists/${btn.dataset.id}`, { method: 'DELETE' });
      if (res) await loadShoppingLists();
    });
  });

  // Resolve/Archive List
  grid.querySelectorAll<HTMLButtonElement>('.btn-resolve-list').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        'Archivovat seznam?',
        'Chcete tento seznam archivovat? (Zmizí z hlavní plochy)'
      );
      if (!confirmed) return;
      const res = await authFetch(`/api/shopping-lists/${btn.dataset.id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ isResolved: true })
      });
      if (res) await loadShoppingLists();
    });
  });

  // Add Item to List
  grid.querySelectorAll<HTMLFormElement>('.shopping-add-item-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const listId = form.dataset.listId;
      const input = form.querySelector<HTMLInputElement>('.shopping-add-input');
      const name = input?.value.trim();
      if (!name || !listId) return;

      const res = await authFetch(`/api/shopping-list/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });

      if (res) {
        if (input) input.value = '';
        await loadShoppingLists();
      }
    });
  });

  // Toggle Item Purchased Status
  grid.querySelectorAll<HTMLInputElement>('.shopping-item-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const row = checkbox.closest('.shopping-item-row') as HTMLElement;
      const itemId = row?.dataset.itemId;
      if (!itemId) return;

      // Optimistic UI update
      if (checkbox.checked) {
        row.classList.add('is-purchased');
      } else {
        row.classList.remove('is-purchased');
      }

      const res = await authFetch(`/api/shopping-list/${itemId}/purchase`, {
        method: 'PUT',
        body: JSON.stringify({ purchased: checkbox.checked }) // we omit price/splits for quick toggle now
      });

      if (!res) {
        // Revert on failure
        checkbox.checked = !checkbox.checked;
        row.classList.toggle('is-purchased');
      } else {
        // Reload cleanly
        await loadShoppingLists();
      }
    });
  });

  // Delete Item
  grid.querySelectorAll<HTMLButtonElement>('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.shopping-item-row') as HTMLElement;
      const itemId = row?.dataset.itemId;
      if (!itemId) return;

      const res = await authFetch(`/api/shopping-list/${itemId}`, { method: 'DELETE' });
      if (res) await loadShoppingLists();
    });
  });
}

// ─── Page Module ──────────────────────────────────────────────────────

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
