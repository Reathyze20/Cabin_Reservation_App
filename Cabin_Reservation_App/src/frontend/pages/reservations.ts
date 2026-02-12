/* ============================================================================
   pages/reservations.ts — Reservations calendar + booking (from script.js)
   ============================================================================ */
import flatpickr from 'flatpickr';
import { Czech } from 'flatpickr/dist/l10n/cs.js';
import 'flatpickr/dist/flatpickr.min.css';
import type { PageModule } from '../lib/router';
import {
  $, show, hide, showToast, authFetch,
  getToken, getUserId, getRole, getUsername,
} from '../lib/common';
import type { Reservation } from '@shared/types';

// ─── Module state ────────────────────────────────────────────────────
let container: HTMLElement;
let flatpickrInstance: flatpickr.Instance | null = null;
let currentReservations: (Reservation & { userColor?: string })[] = [];
let allUsers: { id: string; username: string; color?: string; role?: string }[] = [];
let reservationIdToDelete: string | null = null;
let currentEditingListId: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────

function hexToRgba(hex: string | undefined, alpha = 1): string | null {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return null;
  let c = hex.substring(1).split('');
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  const n = parseInt(c.join(''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function formatDateForDisplay(date: string | Date): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const off = dateObj.getTimezoneOffset() * 60000;
  const corrected = new Date(dateObj.getTime() + off);
  return `${corrected.getDate()}.${corrected.getMonth() + 1}.${corrected.getFullYear()}`;
}

function getUserColor(userId: string): string {
  const user = allUsers.find((u) => u.id === userId);
  return user?.color || '#808080';
}

const monthNames = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];

// ─── Template ─────────────────────────────────────────────────────────

function getTemplate(): string {
  return `
  <div class="main-content">
    <!-- Shopping lists -->
    <div class="card shopping-list-container">
      <h2>Nákupní seznamy</h2>
      <form id="add-item-form" class="add-item-form">
        <input type="text" id="item-name-input" placeholder="Název nového seznamu" required />
        <button type="submit" class="button-add-item" title="Vytvořit seznam"><i class="fas fa-plus"></i></button>
      </form>
      <div id="shopping-list" class="shopping-list-content">
        <div class="spinner-container"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- Calendar card -->
    <div class="card calendar-card">
      <div class="date-display-bar">
        <div class="date-part">
          <i class="far fa-calendar-alt icon"></i>
          <div>
            <span class="label">Datum příjezdu</span>
            <span class="date-value" id="check-in-date-display">- Vyberte -</span>
          </div>
        </div>
        <span class="date-separator">do</span>
        <div class="date-part">
          <div>
            <span class="label">Datum odjezdu</span>
            <span class="date-value" id="check-out-date-display">- Vyberte -</span>
          </div>
        </div>
      </div>
      <div class="calendar-container"></div>
      <div style="display:flex;gap:8px;align-items:center">
        <button id="open-booking-modal-button" class="button-primary" style="display:none">Pokračovat k rezervaci</button>
        <button id="clear-selection-button" class="button-secondary" style="display:none">Vymazat výběr</button>
      </div>
    </div>

    <!-- Reservations list -->
    <div class="reservations-list-container card">
      <h2 id="reservations-title">Přehled rezervací</h2>
      <div id="reservations-list">Načítám rezervace...</div>
    </div>
  </div>

  <!-- Booking modal -->
  <div id="booking-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="booking-modal">&times;</span>
      <h2 id="modal-title">Detail rezervace</h2>
      <div id="backup-warning-message" class="backup-warning hidden">
        <p><strong>Upozornění:</strong> Vámi vybraný termín je již obsazen. Vaše rezervace bude vytvořena jako <strong>záložní</strong>.</p>
      </div>
      <p><strong>Termín:</strong> <span id="modal-date-range"></span></p>
      <form id="booking-form">
        <input type="hidden" id="reservation-id" />
        <div class="form-group">
          <label for="purpose-select">Účel návštěvy:</label>
          <select id="purpose-select">
            <option value="Relax">Relax</option>
            <option value="Práce na zahradě">Práce na zahradě</option>
            <option value="Údržba chaty">Údržba chaty</option>
            <option value="Jiný">Jiný (specifikujte)</option>
          </select>
        </div>
        <div class="form-group hidden" id="other-purpose-group">
          <label for="other-purpose-input">Specifikujte jiný účel:</label>
          <input type="text" id="other-purpose-input" placeholder="např. Oslava narozenin" />
        </div>
        <div class="form-group">
          <label for="notes-textarea">Poznámky:</label>
          <textarea id="notes-textarea" rows="4" placeholder="např. Ostříhat stromy, vymalovat pokoj..."></textarea>
        </div>
        <div class="modal-buttons">
          <button type="submit" id="modal-submit-button" class="button-primary">Potvrdit rezervaci</button>
          <button type="button" id="modal-delete-button" class="button-danger hidden">Odstranit rezervaci</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Confirm delete modal -->
  <div id="confirm-delete-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <h2>Opravdu smazat?</h2>
      <p>Tato akce je nevratná.</p>
      <div class="modal-buttons">
        <button id="confirm-delete-btn" class="button-danger">Ano, smazat</button>
        <button id="cancel-delete-btn" class="button-secondary">Zrušit</button>
      </div>
    </div>
  </div>

  <!-- Assign modal -->
  <div id="assign-reservation-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="assign-reservation-modal">&times;</span>
      <h2>Přiřadit rezervaci</h2>
      <p id="assign-modal-text"></p>
      <form id="assign-reservation-form">
        <input type="hidden" id="assign-reservation-id-input" />
        <div class="form-group">
          <label for="assign-user-select">Nový vlastník:</label>
          <select id="assign-user-select" required></select>
        </div>
        <div class="modal-buttons">
          <button type="submit" class="button-primary">Potvrdit přiřazení</button>
          <button type="button" id="cancel-assign-btn" class="button-secondary">Zrušit</button>
        </div>
        <p id="assign-error-message" class="error-message" style="margin-top:10px"></p>
      </form>
    </div>
  </div>

  <!-- Shopping list detail modal -->
  <div id="shopping-list-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="shopping-list-modal">&times;</span>
      <h2 id="shopping-modal-title">Seznam</h2>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input type="text" id="shopping-item-input" placeholder="Přidat položku..." />
        <button id="shopping-item-add-btn" class="button-primary">Přidat</button>
      </div>
      <div id="shopping-modal-list"></div>
      <div style="text-align:right;margin-top:12px">
        <button id="shopping-modal-close" class="button-secondary">Zavřít</button>
      </div>
    </div>
  </div>

  <!-- Price split modal -->
  <div id="price-split-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="price-split-modal">&times;</span>
      <h2>Rozdělit útratu</h2>
      <p id="split-modal-info"></p>
      <form id="price-split-form">
        <div id="user-split-list" class="user-split-list"></div>
        <div class="modal-buttons">
          <button type="submit" class="button-primary">Potvrdit rozdělení</button>
        </div>
      </form>
    </div>
  </div>
  `;
}

// ─── Data loading ─────────────────────────────────────────────────────

async function fetchUsers(): Promise<void> {
  const data = await authFetch<typeof allUsers>('/api/users', { silent: true });
  allUsers = data || [];
}

async function loadReservations(): Promise<void> {
  const list = $('reservations-list');
  if (list) list.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  const data = await authFetch<(Reservation & { userColor?: string })[]>('/api/reservations', { silent: true });
  if (!data) return;

  currentReservations = data;

  if (flatpickrInstance) {
    flatpickrInstance.redraw();
    renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
  } else {
    initDatePicker();
    setTimeout(() => {
      if (flatpickrInstance) renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
    }, 50);
  }
}

// ─── Flatpickr ────────────────────────────────────────────────────────

function initDatePicker(): void {
  const cal = container.querySelector<HTMLElement>('.calendar-container');
  if (!cal) return;

  flatpickrInstance = flatpickr(cal, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    inline: true,
    minDate: 'today',
    locale: Czech,
    onDayCreate(_dObj, _dStr, _fp, dayElem) {
      const date = dayElem.dateObj;
      const ts = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      if (!currentReservations.length) return;

      const forDay = currentReservations.filter((r) => {
        try {
          const s = new Date(r.from + 'T00:00:00Z').getTime();
          const e = new Date(r.to + 'T00:00:00Z').getTime();
          return ts >= s && ts <= e;
        } catch { return false; }
      });

      const primary = forDay.find((r) => r.status !== 'backup');
      if (primary) {
        dayElem.title = `Rezervováno: ${primary.username}`;
        dayElem.classList.add('booked-day');
        const c = primary.userColor;
        if (c) {
          dayElem.style.backgroundColor = hexToRgba(c, 0.8) || '';
          dayElem.style.color = '#fff';
          dayElem.style.fontWeight = 'bold';
        }
      }
    },
    onChange(selectedDates, _dateStr, instance) {
      const checkIn = $('check-in-date-display');
      const checkOut = $('check-out-date-display');
      const openBtn = $('open-booking-modal-button');
      const clearBtn = $('clear-selection-button');

      if (selectedDates.length >= 1) {
        if (checkIn) checkIn.textContent = instance.formatDate(selectedDates[0], 'd. M Y');
        if (selectedDates.length === 2) {
          if (checkOut) checkOut.textContent = instance.formatDate(selectedDates[1], 'd. M Y');
          if (openBtn) openBtn.style.display = 'block';
        } else {
          if (checkOut) checkOut.textContent = '- Vyberte -';
          if (openBtn) openBtn.style.display = 'none';
        }
      } else {
        if (checkIn) checkIn.textContent = '- Vyberte -';
        if (checkOut) checkOut.textContent = '- Vyberte -';
        if (openBtn) openBtn.style.display = 'none';
      }

      if (selectedDates.length === 2) {
        renderReservationsForSelection(selectedDates);
        if (clearBtn) clearBtn.style.display = 'inline-block';
      } else {
        renderReservationsOverview(instance.currentMonth, instance.currentYear);
        if (clearBtn) clearBtn.style.display = 'none';
      }
    },
    onMonthChange(_sd, _ds, instance) {
      renderReservationsOverview(instance.currentMonth, instance.currentYear);
    },
    onReady(_sd, _ds, instance) {
      renderReservationsOverview(instance.currentMonth, instance.currentYear);
    },
  });
}

// ─── Reservation rendering ────────────────────────────────────────────

function renderReservationsOverview(month: number, year: number): void {
  const listDiv = $('reservations-list');
  const title = $('reservations-title');
  if (!listDiv || !title) return;

  title.textContent = `Přehled v ${monthNames[month]} ${year}`;
  const mStart = new Date(year, month, 1);
  const mEnd = new Date(year, month + 1, 0);

  const filtered = currentReservations.filter((r) => {
    try {
      return new Date(r.from) <= mEnd && new Date(r.to) >= mStart;
    } catch { return false; }
  });
  renderReservationList(filtered, 'Pro tento měsíc nejsou žádné rezervace.');
}

function renderReservationsForSelection(sel: Date[]): void {
  const listDiv = $('reservations-list');
  const title = $('reservations-title');
  if (!listDiv || !title || sel.length !== 2) return;

  title.textContent = 'Konflikty pro Váš výběr';
  const overlapping = currentReservations.filter((r) => {
    try {
      return new Date(r.from) <= sel[1] && new Date(r.to) >= sel[0];
    } catch { return false; }
  });
  renderReservationList(overlapping, 'Ve vybraném termínu nejsou žádné jiné rezervace.');
}

function renderReservationList(reservations: typeof currentReservations, emptyMsg: string): void {
  const listDiv = $('reservations-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';

  if (reservations.length === 0) {
    listDiv.innerHTML = `<p><i>${emptyMsg}</i></p>`;
    return;
  }

  reservations.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
  const ul = document.createElement('ul');
  const myId = getUserId();
  const admin = getRole() === 'admin';

  for (const r of reservations) {
    const li = document.createElement('li');
    const notesHTML = r.notes
      ? `<p><strong>Poznámka:</strong> ${r.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
      : '';

    let actions = '';
    if (myId === r.userId || admin) {
      actions = `
        <div class="action-buttons-inline">
          <button class="edit-btn" data-id="${r.id}" title="Upravit"><i class="fas fa-pencil-alt"></i></button>
          <button class="assign-btn" data-id="${r.id}" title="Přiřadit"><i class="fas fa-user-plus"></i></button>
          <button class="delete-btn" data-id="${r.id}" title="Smazat"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }

    let badge = '';
    if (r.status === 'backup') badge = '<span class="status-badge backup">Záložní</span>';

    li.innerHTML = `
      <div class="reservation-header"><strong title="${r.username}">${r.username}</strong></div>
      <div class="reservation-body">
        <div class="reservation-dates-row">
          <div class="dates-left"><strong>Od–do:</strong> ${formatDateForDisplay(r.from)} – ${formatDateForDisplay(r.to)}</div>
          <div class="dates-actions">${badge}${actions}</div>
        </div>
        <p><strong>Účel:</strong> ${r.purpose || '<em>Nespecifikováno</em>'}</p>
        ${notesHTML}
      </div>`;
    ul.appendChild(li);
  }
  listDiv.appendChild(ul);
}

// ─── Booking modal ────────────────────────────────────────────────────

function openBookingModal(isEdit = false, reservation?: Reservation & { userColor?: string }): void {
  const form = $<HTMLFormElement>('booking-form');
  const dateRange = $('modal-date-range');
  const title = $('modal-title');
  const submitBtn = $('modal-submit-button');
  const deleteBtn = $('modal-delete-button');
  const resIdInput = $<HTMLInputElement>('reservation-id');
  const purposeSel = $<HTMLSelectElement>('purpose-select');
  const otherGroup = $('other-purpose-group');
  const otherInput = $<HTMLInputElement>('other-purpose-input');
  const notesTa = $<HTMLTextAreaElement>('notes-textarea');
  const backupWarn = $('backup-warning-message');
  const modal = $('booking-modal');

  if (!form || !modal) return;
  form.reset();
  hide(otherGroup);
  if (resIdInput) resIdInput.value = '';
  hide(deleteBtn);
  hide(backupWarn);

  if (isEdit && reservation) {
    if (title) title.textContent = 'Upravit rezervaci';
    if (submitBtn) submitBtn.textContent = 'Uložit změny';
    show(deleteBtn);
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        closeModal('booking-modal');
        openConfirmDelete(reservation.id);
      };
    }
    if (dateRange) {
      dateRange.innerHTML = `
        <label>Od: <input type="date" id="edit-from-date" value="${reservation.from}" /></label>
        <label>Do: <input type="date" id="edit-to-date" value="${reservation.to}" /></label>`;
    }
    if (resIdInput) resIdInput.value = reservation.id;

    const isOther = !['Relax', 'Práce na zahradě', 'Údržba chaty'].includes(reservation.purpose);
    if (isOther) {
      if (purposeSel) purposeSel.value = 'Jiný';
      show(otherGroup);
      if (otherInput) otherInput.value = reservation.purpose || '';
    } else {
      if (purposeSel) purposeSel.value = reservation.purpose || 'Relax';
    }
    if (notesTa) notesTa.value = reservation.notes || '';
  } else {
    if (title) title.textContent = 'Detail rezervace';
    if (submitBtn) submitBtn.textContent = 'Potvrdit rezervaci';
    if (flatpickrInstance?.selectedDates.length === 2) {
      const [from, to] = flatpickrInstance.selectedDates;
      if (dateRange) dateRange.textContent = `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;
      const overlapping = currentReservations.some((r) => {
        if (r.status === 'backup') return false;
        return new Date(r.from) <= to && new Date(r.to) >= from;
      });
      if (overlapping) show(backupWarn);
    }
  }
  show(modal);
}

function closeModal(id: string): void {
  const el = $(id);
  if (el) { hide(el); }
}

function openConfirmDelete(id: string): void {
  reservationIdToDelete = id;
  show($('confirm-delete-modal'));
}

function closeConfirmDelete(): void {
  hide($('confirm-delete-modal'));
  reservationIdToDelete = null;
}

// ─── Assign modal ─────────────────────────────────────────────────────

function openAssignModal(reservationId: string): void {
  const reservation = currentReservations.find((r) => r.id === reservationId);
  if (!reservation) { showToast('Rezervace nenalezena.', 'error'); return; }

  const modal = $('assign-reservation-modal');
  const idInput = $<HTMLInputElement>('assign-reservation-id-input');
  const text = $('assign-modal-text');
  const select = $<HTMLSelectElement>('assign-user-select');
  const errMsg = $('assign-error-message');

  if (!modal || !idInput || !select) return;
  idInput.value = reservationId;
  if (errMsg) errMsg.textContent = '';
  if (text) text.textContent = `Přiřazujete rezervaci: ${formatDateForDisplay(reservation.from)} - ${formatDateForDisplay(reservation.to)}.`;

  select.innerHTML = '<option value="">-- Vyberte uživatele --</option>';
  const eligible = allUsers.filter((u) => u.role !== 'admin' && u.id !== reservation.userId);
  for (const u of eligible) {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.username;
    select.appendChild(opt);
  }
  show(modal);
}

function closeAssignModal(): void {
  hide($('assign-reservation-modal'));
}

// ─── Shopping list ────────────────────────────────────────────────────

async function loadShoppingList(): Promise<void> {
  const div = $('shopping-list');
  if (div) div.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  const lists = await authFetch<any[]>('/api/shopping-list', { silent: true });
  if (!lists) { if (div) div.innerHTML = '<p style="color:red;">Chyba načítání.</p>'; return; }
  renderShoppingLists(lists);
}

function renderShoppingLists(lists: any[]): void {
  const div = $('shopping-list');
  if (!div) return;
  div.innerHTML = '';
  if (!lists.length) { div.innerHTML = '<p><i>Seznamy jsou prázdné.</i></p>'; return; }

  const c = document.createElement('div');
  c.className = 'shopping-lists-overview';
  lists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  for (const list of lists) {
    const card = document.createElement('div');
    card.className = 'shopping-list-card';
    const count = Array.isArray(list.items) ? list.items.length : 0;
    card.innerHTML = `
      <div class="list-header">
        <strong>${list.name}</strong>
        <div class="list-meta">${count} položek • Přidal: ${list.addedBy}</div>
      </div>
      <div class="list-actions">
        <button class="btn-open-list" data-id="${list.id}">Otevřít</button>
        <button class="btn-delete-list" data-id="${list.id}">Smazat</button>
      </div>`;
    c.appendChild(card);
  }
  div.appendChild(c);

  div.querySelectorAll<HTMLButtonElement>('.btn-open-list').forEach((btn) => {
    btn.addEventListener('click', () => openShoppingListModal(btn.dataset.id!));
  });
  div.querySelectorAll<HTMLButtonElement>('.btn-delete-list').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Opravdu smazat tento seznam?')) return;
      await authFetch(`/api/shopping-list/${btn.dataset.id}`, { method: 'DELETE' });
      await loadShoppingList();
    });
  });
}

async function openShoppingListModal(listId: string): Promise<void> {
  const lists = await authFetch<any[]>('/api/shopping-list');
  if (!lists) return;
  const list = lists.find((l: any) => l.id === listId);
  if (!list) { showToast('Seznam nenalezen.', 'error'); return; }

  currentEditingListId = listId;
  const title = $('shopping-modal-title');
  if (title) title.textContent = list.name;
  renderShoppingModalItems(list.items || []);
  show($('shopping-list-modal'));
}

function renderShoppingModalItems(items: any[]): void {
  const list = $('shopping-modal-list');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) { list.innerHTML = '<p><i>Seznam je prázdný.</i></p>'; return; }

  for (const it of items) {
    const div = document.createElement('div');
    div.className = `modal-item ${it.purchased ? 'purchased' : ''}`;
    div.dataset.id = it.id;
    div.innerHTML = `
      <div class="modal-item-main">
        <input type="checkbox" class="modal-purchase-checkbox" ${it.purchased ? 'checked' : ''}>
        <span class="modal-item-name">${it.name}</span>
        <button class="modal-delete-item" title="Smazat">&times;</button>
      </div>`;
    list.appendChild(div);
  }

  list.querySelectorAll<HTMLInputElement>('.modal-purchase-checkbox').forEach((ch) => {
    ch.addEventListener('change', async () => {
      const id = ch.closest<HTMLElement>('.modal-item')!.dataset.id!;
      await authFetch(`/api/shopping-list/${currentEditingListId}/items/${id}/purchase`, {
        method: 'PUT',
        body: JSON.stringify({ purchased: ch.checked }),
      });
      await openShoppingListModal(currentEditingListId!);
      await loadShoppingList();
    });
  });

  list.querySelectorAll<HTMLButtonElement>('.modal-delete-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest<HTMLElement>('.modal-item')!.dataset.id!;
      if (!confirm('Smazat položku?')) return;
      await authFetch(`/api/shopping-list/${currentEditingListId}/items/${id}`, { method: 'DELETE' });
      await openShoppingListModal(currentEditingListId!);
      await loadShoppingList();
    });
  });
}

// ─── Event Binding ────────────────────────────────────────────────────

function bindEvents(): void {
  // Close buttons (data-close attribute)
  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close!));
  });

  // Open booking modal
  $('open-booking-modal-button')?.addEventListener('click', () => openBookingModal(false));

  // Clear calendar selection
  $('clear-selection-button')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!flatpickrInstance) return;
    flatpickrInstance.clear();
    const ci = $('check-in-date-display');
    const co = $('check-out-date-display');
    if (ci) ci.textContent = '- Vyberte -';
    if (co) co.textContent = '- Vyberte -';
    const btn = $('open-booking-modal-button');
    if (btn) btn.style.display = 'none';
    const clr = $('clear-selection-button');
    if (clr) clr.style.display = 'none';
    renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
  });

  // Purpose select toggle
  $<HTMLSelectElement>('purpose-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    const grp = $('other-purpose-group');
    if (grp) grp.classList.toggle('hidden', val !== 'Jiný');
  });

  // Booking form submit
  $<HTMLFormElement>('booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const purposeSel = $<HTMLSelectElement>('purpose-select');
    const otherInput = $<HTMLInputElement>('other-purpose-input');
    const notesTa = $<HTMLTextAreaElement>('notes-textarea');
    const resIdInput = $<HTMLInputElement>('reservation-id');

    let purpose = purposeSel?.value || 'Relax';
    if (purpose === 'Jiný') purpose = otherInput?.value.trim() || '';
    const notes = notesTa?.value.trim() || '';
    const isEdit = !!resIdInput?.value;
    const url = isEdit ? `/api/reservations/${resIdInput!.value}` : '/api/reservations';
    const method = isEdit ? 'PUT' : 'POST';

    const body: Record<string, string> = { purpose, notes };
    if (isEdit) {
      const fromEl = $<HTMLInputElement>('edit-from-date');
      const toEl = $<HTMLInputElement>('edit-to-date');
      if (fromEl && toEl) { body.from = fromEl.value; body.to = toEl.value; }
      else {
        const orig = currentReservations.find((r) => r.id === resIdInput!.value);
        if (orig) { body.from = orig.from; body.to = orig.to; }
      }
    } else {
      if (!flatpickrInstance || flatpickrInstance.selectedDates.length !== 2) return;
      body.from = flatpickrInstance.formatDate(flatpickrInstance.selectedDates[0], 'Y-m-d');
      body.to = flatpickrInstance.formatDate(flatpickrInstance.selectedDates[1], 'Y-m-d');
    }

    const result = await authFetch(url, { method, body: JSON.stringify(body) });
    if (!result) return;

    closeModal('booking-modal');
    if (!isEdit && flatpickrInstance) {
      flatpickrInstance.clear();
      const ci = $('check-in-date-display');
      const co = $('check-out-date-display');
      if (ci) ci.textContent = '- Vyberte -';
      if (co) co.textContent = '- Vyberte -';
      const btn = $('open-booking-modal-button');
      if (btn) btn.style.display = 'none';
    }
    showToast(isEdit ? 'Rezervace upravena.' : 'Rezervace vytvořena.', 'success');
    await loadReservations();
  });

  // Reservation list delegation (edit, delete, assign)
  $('reservations-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    const id = btn.dataset.id!;
    if (btn.classList.contains('edit-btn')) {
      const r = currentReservations.find((x) => x.id === id);
      if (r) openBookingModal(true, r);
    } else if (btn.classList.contains('delete-btn')) {
      openConfirmDelete(id);
    } else if (btn.classList.contains('assign-btn')) {
      openAssignModal(id);
    }
  });

  // Confirm delete
  $('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!reservationIdToDelete) return;
    const result = await authFetch('/api/reservations/delete', {
      method: 'POST',
      body: JSON.stringify({ id: reservationIdToDelete }),
    });
    closeConfirmDelete();
    if (result) {
      showToast('Rezervace smazána.', 'success');
      await loadReservations();
    }
  });
  $('cancel-delete-btn')?.addEventListener('click', closeConfirmDelete);

  // Assign form submit
  $<HTMLFormElement>('assign-reservation-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $<HTMLInputElement>('assign-reservation-id-input')?.value;
    const newOwnerId = $<HTMLSelectElement>('assign-user-select')?.value;
    const errMsg = $('assign-error-message');
    if (!newOwnerId) { if (errMsg) errMsg.textContent = 'Musíte vybrat uživatele.'; return; }

    const result = await authFetch(`/api/reservations/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ newOwnerId }),
    });
    if (result) {
      closeAssignModal();
      showToast('Rezervace přiřazena.', 'success');
      await loadReservations();
    }
  });
  $('cancel-assign-btn')?.addEventListener('click', closeAssignModal);

  // Add shopping list form
  $<HTMLFormElement>('add-item-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = $<HTMLInputElement>('item-name-input');
    const name = nameInput?.value.trim();
    if (!name) return;
    const created = await authFetch<{ id: string }>('/api/shopping-list', {
      method: 'POST',
      body: JSON.stringify({ name, icon: 'fas fa-shopping-basket' }),
    });
    if (nameInput) nameInput.value = '';
    if (created) {
      await openShoppingListModal(created.id);
      await loadShoppingList();
    }
  });

  // Shopping modal add item
  $('shopping-item-add-btn')?.addEventListener('click', async () => {
    const input = $<HTMLInputElement>('shopping-item-input');
    const name = input?.value.trim();
    if (!name || !currentEditingListId) return;
    await authFetch(`/api/shopping-list/${currentEditingListId}/items`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (input) input.value = '';
    await openShoppingListModal(currentEditingListId);
    await loadShoppingList();
  });

  // Shopping modal close
  $('shopping-modal-close')?.addEventListener('click', () => {
    closeModal('shopping-list-modal');
    currentEditingListId = null;
  });

  // Click outside modals to close
  container.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hide(overlay);
    });
  });
}

// ─── Page Module ──────────────────────────────────────────────────────

const reservationsPage: PageModule = {
  async mount(el: HTMLElement) {
    container = el;
    el.innerHTML = getTemplate();
    bindEvents();
    await Promise.all([fetchUsers(), loadReservations(), loadShoppingList()]);
  },
  unmount() {
    if (flatpickrInstance) {
      flatpickrInstance.destroy();
      flatpickrInstance = null;
    }
    currentReservations = [];
    allUsers = [];
    currentEditingListId = null;
  },
};

export default reservationsPage;
