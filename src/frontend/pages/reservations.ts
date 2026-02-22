/* ============================================================================
   pages/reservations.ts — Reservations calendar + booking (from script.js)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import {
  $, show, hide, showToast, authFetch,
  getToken, getUserId, getRole, getUsername,
} from '../lib/common';
import type { Reservation } from '@shared/types';

// ─── Module state ────────────────────────────────────────────────────
let container: HTMLElement;
let currentReservations: (Reservation & { userColor?: string; userAnimalIcon?: string | null })[] = [];
let allUsers: { id: string; username: string; color?: string; role?: string }[] = [];
let reservationIdToDelete: string | null = null;
let activeReservationTab: 'all' | 'mine' = 'all';
let activePeriodFilter: 'month' | '3months' | 'year' = 'month';


let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();

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
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

// ─── Template ─────────────────────────────────────────────────────────

function getTemplate(): string {
  return `
  <div class="main-content reservations-layout">
    <!-- Left Panel: Full Calendar -->
    <div class="card calendar-card full-calendar-card">
      <div class="calendar-header-bar">
        <div class="calendar-nav">
          <button id="cal-prev-month" class="icon-button"><i class="fas fa-chevron-left"></i></button>
          <h2 id="cal-month-year-display">Březen 2026</h2>
          <button id="cal-next-month" class="icon-button"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="calendar-stats" id="calendar-quick-stats">
          <!-- Quick stats will be injected here -->
        </div>
      </div>
      
      <div class="custom-calendar">
        <div class="cal-weekdays">
          <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
        </div>
        <div class="cal-days" id="cal-days-grid">
          <!-- Days will be injected here -->
        </div>
      </div>

      <div class="panel-actions">
        <button id="btn-new-reservation" class="button-primary"><i class="fas fa-plus"></i> Nová rezervace</button>
      </div>
    </div>

    <!-- Right Panel: Reservations list / Detail -->
    <div class="reservations-list-container card">
      <div class="reservations-header-tabs">
        <h2 id="reservations-title">Přehled: Březen 2026</h2>
        <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
          <select id="period-filter-select" class="period-select">
            <option value="month">Tento měsíc</option>
            <option value="3months">Výhled 3 měsíce</option>
            <option value="year">Výhled 1 rok</option>
          </select>
          <div class="res-tabs">
            <button id="tab-all" class="res-tab active">Všechny</button>
            <button id="tab-mine" class="res-tab">Moje</button>
          </div>
        </div>
      </div>
      <div id="reservations-list">Načítám rezervace...</div>
      <div id="reservation-detail" class="hidden">
        <!-- Detail of clicked reservation will be shown here -->
      </div>
    </div>
  </div>

  <!-- Booking modal -->
  <div id="booking-modal" class="modal-overlay hidden">
    <div class="modal-content booking-modal-content">
      <span class="modal-close-button" data-close="booking-modal">&times;</span>
      <h2 id="modal-title">Nová rezervace</h2>
      <div id="backup-warning-message" class="backup-warning hidden">
        <p><strong>Upozornění:</strong> Vámi vybraný termín je již obsazen. Vaše rezervace bude vytvořena jako <strong>záložní</strong>.</p>
      </div>
      <form id="booking-form" class="booking-form-grid">
        <input type="hidden" id="reservation-id" />
        
        <div class="form-row date-inputs-row">
          <div class="form-group">
            <label for="modal-date-from">Od:</label>
            <input type="date" id="modal-date-from" required />
          </div>
          <div class="form-group">
            <label for="modal-date-to">Do:</label>
            <input type="date" id="modal-date-to" required />
          </div>
        </div>

        <div class="form-row purpose-row">
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
        </div>

        <div class="form-group checkbox-group soft-res-group">
          <input type="checkbox" id="soft-reservation-checkbox" />
          <label for="soft-reservation-checkbox" title="Ostatní uvidí, že plánujete jet, ale ještě to není 100% jisté.">Předběžný zájem (Měkká rezervace)</label>
        </div>

        <div class="form-row notes-row">
          <div class="form-group">
            <label for="notes-textarea">Poznámky (pro Vás):</label>
            <textarea id="notes-textarea" rows="3" placeholder="např. Ostříhat stromy..."></textarea>
          </div>
          <div class="form-group">
            <label for="handover-notes-textarea">Odjezdový vzkaz pro další turnus <i class="fas fa-info-circle" title="Tento vzkaz je určený pro ty, kteří přijedou po vás."></i>:</label>
            <textarea id="handover-notes-textarea" rows="3" placeholder="např. Nechal jsem v lednici pivo..."></textarea>
          </div>
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

  renderCustomCalendar();
  renderReservationsOverview(currentCalMonth, currentCalYear);
}

// ─── Custom Calendar ──────────────────────────────────────────────────

function renderCustomCalendar(): void {
  const monthYearDisplay = $('cal-month-year-display');
  const daysGrid = $('cal-days-grid');
  if (!monthYearDisplay || !daysGrid) return;

  monthYearDisplay.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;
  daysGrid.innerHTML = '';

  const firstDay = new Date(currentCalYear, currentCalMonth, 1);
  const lastDay = new Date(currentCalYear, currentCalMonth + 1, 0);
  
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const totalDays = lastDay.getDate();

  // Empty cells before start of month
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day empty';
    daysGrid.appendChild(emptyCell);
  }

  // Days of the month
  for (let i = 1; i <= totalDays; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'cal-day';
    
    // Determine day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const currentDayOfWeek = new Date(currentCalYear, currentCalMonth, i).getDay();
    if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
      dayCell.classList.add('weekend');
    }
    
    const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    dayCell.dataset.date = dateStr;

    const dayNum = document.createElement('div');
    dayNum.className = 'day-num';
    dayNum.textContent = String(i);
    
    // Check if today
    const today = new Date();
    if (today.getDate() === i && today.getMonth() === currentCalMonth && today.getFullYear() === currentCalYear) {
      dayCell.classList.add('today');
    }

    dayCell.appendChild(dayNum);

    // Find reservations for this day
    const ts = Date.UTC(currentCalYear, currentCalMonth, i);
    const forDay = currentReservations.filter((r) => {
      try {
        const s = new Date(r.from + 'T00:00:00Z').getTime();
        const e = new Date(r.to + 'T00:00:00Z').getTime();
        return ts >= s && ts <= e;
      } catch { return false; }
    });

    // Render reservation bars
    const barsContainer = document.createElement('div');
    barsContainer.className = 'cal-bars';
    
    forDay.forEach(r => {
      const bar = document.createElement('div');
      bar.className = 'cal-bar';
      if (r.status === 'backup') bar.classList.add('backup');
      if (r.status === 'soft') bar.classList.add('soft');
      
      const isMine = r.userId === getUserId();
      if (isMine) bar.classList.add('mine');
      
      const c = r.userColor || '#808080';
      if (r.status === 'soft') {
        bar.style.background = `repeating-linear-gradient(45deg, ${hexToRgba(c, 0.15)}, ${hexToRgba(c, 0.15)} 5px, rgba(255,255,255,0.7) 5px, rgba(255,255,255,0.7) 10px)`;
        bar.style.borderColor = c;
        bar.style.color = '#333';
      } else {
        bar.style.backgroundColor = hexToRgba(c, 0.8) || '';
        bar.style.color = '#fff';
      }

      // Check if it's start or end of reservation to round corners
      const s = new Date(r.from + 'T00:00:00Z').getTime();
      const e = new Date(r.to + 'T00:00:00Z').getTime();
      if (ts === s) bar.classList.add('start');
      if (ts === e) bar.classList.add('end');

      bar.textContent = r.username;
      bar.title = `${r.username} (${r.purpose})`;
      
      // Click on bar to show detail
      bar.addEventListener('click', (e) => {
        e.stopPropagation();
        showReservationDetail(r);
      });

      barsContainer.appendChild(bar);
    });

    dayCell.appendChild(barsContainer);

    // Click on day to create new reservation
    dayCell.addEventListener('click', () => {
      openBookingModal(dateStr, dateStr);
    });

    daysGrid.appendChild(dayCell);
  }

  // Empty cells after end of month to always have 42 cells (6 rows)
  const totalCells = startDayOfWeek + totalDays;
  const remainingCells = 42 - totalCells;
  for (let i = 0; i < remainingCells; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day empty';
    daysGrid.appendChild(emptyCell);
  }

  updateQuickStats();
}

function updateQuickStats() {
  const statsContainer = $('calendar-quick-stats');
  if (!statsContainer) return;

  const mStart = new Date(currentCalYear, currentCalMonth, 1).getTime();
  const mEnd = new Date(currentCalYear, currentCalMonth + 1, 0).getTime();

  let bookedDays = new Set<number>();
  
  currentReservations.forEach(r => {
    if (r.status === 'backup') return;
    const s = new Date(r.from + 'T00:00:00Z').getTime();
    const e = new Date(r.to + 'T00:00:00Z').getTime();
    
    for (let d = s; d <= e; d += 86400000) {
      if (d >= mStart && d <= mEnd) {
        bookedDays.add(d);
      }
    }
  });

  const totalDays = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const freeDays = totalDays - bookedDays.size;

  let freeWeekends = 0;
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(currentCalYear, currentCalMonth, day);
    if (date.getDay() === 6) { // Sobota
      const satTime = Date.UTC(currentCalYear, currentCalMonth, day);
      const sunTime = Date.UTC(currentCalYear, currentCalMonth, day + 1);
      
      let satBooked = false;
      let sunBooked = false;

      currentReservations.forEach(r => {
        if (r.status === 'backup') return;
        const s = new Date(r.from + 'T00:00:00Z').getTime();
        const e = new Date(r.to + 'T00:00:00Z').getTime();
        if (satTime >= s && satTime <= e) satBooked = true;
        if (sunTime >= s && sunTime <= e) sunBooked = true;
      });

      if (!satBooked && !sunBooked) {
        freeWeekends++;
      }
    }
  }

  statsContainer.innerHTML = `
    <span class="stat-badge"><i class="fas fa-bed"></i> Obsazeno: <strong>${bookedDays.size}</strong> dní</span>
    <span class="stat-badge free"><i class="fas fa-door-open"></i> Volno: <strong>${freeDays}</strong> dní</span>
    <span class="stat-badge weekend"><i class="fas fa-calendar-check"></i> Volné víkendy: <strong>${freeWeekends}</strong></span>
  `;
}

function showReservationDetail(r: Reservation & { userColor?: string }) {
  const detailDiv = $('reservation-detail');
  const listDiv = $('reservations-list');
  if (!detailDiv || !listDiv) return;

  listDiv.classList.add('hidden');
  detailDiv.classList.remove('hidden');

  const isMine = r.userId === getUserId();
  const admin = getRole() === 'admin';
  const c = r.userColor || '#808080';

  let actions = '';
  if (isMine || admin) {
    actions = `
      <div class="res-actions" style="margin-top: 15px;">
        <button class="button-secondary edit-btn" data-id="${r.id}"><i class="fas fa-pencil-alt"></i> Upravit</button>
        ${admin ? `<button class="button-secondary assign-btn" data-id="${r.id}"><i class="fas fa-user-plus"></i> Přiřadit</button>` : ''}
        <button class="button-danger delete-btn" data-id="${r.id}"><i class="fas fa-trash-alt"></i> Smazat</button>
      </div>`;
  }

  detailDiv.innerHTML = `
    <div class="res-detail-card" style="border-left: 4px solid ${c};">
      <button class="button-secondary back-to-list-btn" style="margin-bottom: 15px;"><i class="fas fa-arrow-left"></i> Zpět na seznam</button>
      <h3>Rezervace: ${r.username}</h3>
      <p><strong>Od:</strong> ${formatDateForDisplay(r.from)}</p>
      <p><strong>Do:</strong> ${formatDateForDisplay(r.to)}</p>
      <p><strong>Účel:</strong> ${r.purpose}</p>
      ${r.notes ? `<p><strong>Poznámka:</strong> ${r.notes}</p>` : ''}
      ${r.handoverNote ? `<div class="res-handover-note" style="margin-top: 10px; background: #fffbeb; padding: 10px; border-radius: 8px; border-left: 4px solid #f59e0b;"><i class="fas fa-handshake"></i> <strong>Vzkaz pro další:</strong> ${r.handoverNote}</div>` : ''}
      ${actions}
    </div>
  `;

  // Bind events for detail view
  const backBtn = detailDiv.querySelector('.back-to-list-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      detailDiv.classList.add('hidden');
      listDiv.classList.remove('hidden');
    });
  }

  const editBtn = detailDiv.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const id = (editBtn as HTMLElement).dataset.id;
      if (id) openEditModal(id);
    });
  }

  const delBtn = detailDiv.querySelector('.delete-btn');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      const id = (delBtn as HTMLElement).dataset.id;
      if (id) openConfirmDelete(id);
    });
  }

  const assignBtn = detailDiv.querySelector('.assign-btn');
  if (assignBtn) {
    assignBtn.addEventListener('click', () => {
      const id = (assignBtn as HTMLElement).dataset.id;
      if (id) openAssignModal(id);
    });
  }
}

// ─── Reservation rendering ────────────────────────────────────────────

function renderReservationsOverview(month: number, year: number): void {
  const listDiv = $('reservations-list');
  const title = $('reservations-title');
  if (!listDiv || !title) return;

  const mStart = new Date(year, month, 1);
  let mEnd = new Date(year, month + 1, 0);

  if (activePeriodFilter === 'month') {
    title.textContent = `Přehled: ${monthNames[month]} ${year}`;
  } else if (activePeriodFilter === '3months') {
    title.textContent = `Výhled na 3 měsíce od: ${monthNames[month]}`;
    mEnd = new Date(year, month + 3, 0);
  } else if (activePeriodFilter === 'year') {
    title.textContent = `Výhled na 1 rok od: ${monthNames[month]}`;
    mEnd = new Date(year, month + 12, 0);
  }

  const filtered = currentReservations.filter((r) => {
    try {
      return new Date(r.from) <= mEnd && new Date(r.to) >= mStart;
    } catch { return false; }
  });
  renderReservationList(filtered, 'V tomto období nejsou zadané žádné rezervace.');
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

  const myId = getUserId();
  const admin = getRole() === 'admin';

  let filtered = reservations;
  if (activeReservationTab === 'mine') {
    filtered = reservations.filter(r => r.userId === myId);
  }

  if (filtered.length === 0) {
    listDiv.innerHTML = `<p class="empty-state"><i>${emptyMsg}</i></p>`;
    return;
  }

  filtered.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
  const myUserId = getUserId();

  for (const r of filtered) {
    const card = document.createElement('div');
    const isMine = myUserId === r.userId;
    card.className = `res-card ${r.status === 'backup' ? 'res-backup' : r.status === 'soft' ? 'res-soft' : 'res-approved'} ${isMine ? 'res-mine' : ''}`;

    // Získání barev
    const uColor = r.userColor || '#808080';
    const init = r.username.charAt(0).toUpperCase();

    const d1 = new Date(r.from);
    const d2 = new Date(r.to);

    const notesHTML = r.notes
      ? `<p class="res-notes" style="margin-top: 5px;"><i class="fas fa-sticky-note"></i> ${r.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
      : '';

    const handoverHTML = r.handoverNote
      ? `<div class="res-handover-note" style="margin-top: 10px; background: #fffbeb; padding: 10px; border-radius: 8px; border-left: 4px solid #f59e0b;"><i class="fas fa-handshake"></i> <strong>Vzkaz pro další:</strong> ${r.handoverNote.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
      : '';

    let actions = '';
    if (isMine || admin) {
      actions = `
        <div class="res-card-actions">
          <button class="edit-btn" data-id="${r.id}" title="Upravit"><i class="fas fa-pencil-alt"></i></button>
          ${admin ? `<button class="assign-btn" data-id="${r.id}" title="Přiřadit"><i class="fas fa-user-plus"></i></button>` : ''}
          <button class="delete-btn" data-id="${r.id}" title="Smazat"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }

    let badge = '';
    if (r.status === 'backup') {
      badge = '<span class="status-badge backup">Na čekací listině</span>';
    } else if (r.status === 'soft') {
      badge = '<span class="status-badge soft">Předběžný zájem</span>';
    } else {
      badge = '<span class="status-badge approved">Potvrzeno</span>';
    }

    card.innerHTML = `
      <div class="res-indicator" style="background-color: ${uColor}"></div>
      <div class="res-content-left">
        <div class="res-user">
          <div class="res-avatar" style="background-color: ${uColor}">${r.userAnimalIcon || init}</div>
          <strong title="${r.username}">${r.username}</strong>
        </div>
        <div class="res-date-block-new">
          <span class="res-date-main">${d1.getDate()}. - ${d2.getDate()}. ${monthNames[d1.getMonth()]}</span>
        </div>
        <div class="res-purpose"><strong>Účel:</strong> ${r.purpose || '<em>Nespecifikováno</em>'}</div>
        ${notesHTML}
        ${handoverHTML}
      </div>
      <div class="res-content-right">
        <div class="res-status-container">
          ${badge}
        </div>
        ${actions}
      </div>
    `;
    listDiv.appendChild(card);
  }
}

// ─── Booking modal ────────────────────────────────────────────────────

function openBookingModal(fromDateStr?: string, toDateStr?: string, isEdit = false, reservation?: Reservation): void {
  const form = $<HTMLFormElement>('booking-form');
  const title = $('modal-title');
  const submitBtn = $('modal-submit-button');
  const deleteBtn = $('modal-delete-button');
  const resIdInput = $<HTMLInputElement>('reservation-id');
  const purposeSel = $<HTMLSelectElement>('purpose-select');
  const otherGroup = $('other-purpose-group');
  const otherInput = $<HTMLInputElement>('other-purpose-input');
  const notesTa = $<HTMLTextAreaElement>('notes-textarea');
  const handoverTa = $<HTMLTextAreaElement>('handover-notes-textarea');
  const softCheck = $<HTMLInputElement>('soft-reservation-checkbox');
  const backupWarn = $('backup-warning-message');
  const modal = $('booking-modal');
  
  const dateFromInput = $<HTMLInputElement>('modal-date-from');
  const dateToInput = $<HTMLInputElement>('modal-date-to');

  if (!form || !modal) return;
  form.reset();
  hide(otherGroup);
  if (resIdInput) resIdInput.value = '';
  hide(deleteBtn);
  hide(backupWarn);

  if (softCheck) softCheck.checked = false;
  if (handoverTa) handoverTa.value = '';

  if (dateFromInput && fromDateStr) dateFromInput.value = fromDateStr;
  if (dateToInput && toDateStr) dateToInput.value = toDateStr;

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
    
    if (dateFromInput) dateFromInput.value = reservation.from;
    if (dateToInput) dateToInput.value = reservation.to;
    
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
    if (handoverTa) handoverTa.value = reservation.handoverNote || '';
    if (softCheck) softCheck.checked = reservation.status === 'soft';

  } else {
    if (title) title.textContent = 'Nová rezervace';
    if (submitBtn) submitBtn.textContent = 'Potvrdit rezervaci';
    
    if (fromDateStr && toDateStr) {
      const from = new Date(fromDateStr);
      const to = new Date(toDateStr);
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



// ─── Event Binding ────────────────────────────────────────────────────

function bindEvents(): void {
  // Close buttons (data-close attribute)
  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close!));
  });

  // Calendar navigation
  $('cal-prev-month')?.addEventListener('click', () => {
    currentCalMonth--;
    if (currentCalMonth < 0) {
      currentCalMonth = 11;
      currentCalYear--;
    }
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  $('cal-next-month')?.addEventListener('click', () => {
    currentCalMonth++;
    if (currentCalMonth > 11) {
      currentCalMonth = 0;
      currentCalYear++;
    }
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  $('btn-new-reservation')?.addEventListener('click', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    openBookingModal(todayStr, todayStr);
  });

  // Tabs logic
  $('tab-all')?.addEventListener('click', (e) => {
    activeReservationTab = 'all';
    $('tab-all')?.classList.add('active');
    $('tab-mine')?.classList.remove('active');
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  // Period select
  $<HTMLSelectElement>('period-filter-select')?.addEventListener('change', (e) => {
    activePeriodFilter = (e.target as HTMLSelectElement).value as any;
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  $('tab-mine')?.addEventListener('click', (e) => {
    activeReservationTab = 'mine';
    $('tab-mine')?.classList.add('active');
    $('tab-all')?.classList.remove('active');
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
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
    const handoverTa = $<HTMLTextAreaElement>('handover-notes-textarea');
    const softCheck = $<HTMLInputElement>('soft-reservation-checkbox');
    const resIdInput = $<HTMLInputElement>('reservation-id');
    const dateFromInput = $<HTMLInputElement>('modal-date-from');
    const dateToInput = $<HTMLInputElement>('modal-date-to');

    let purpose = purposeSel?.value || 'Relax';
    if (purpose === 'Jiný') purpose = otherInput?.value.trim() || '';
    const notes = notesTa?.value.trim() || '';
    const handoverNote = handoverTa?.value.trim() || '';
    const status = softCheck?.checked ? 'soft' : 'primary';

    const isEdit = !!resIdInput?.value;
    const url = isEdit ? `/api/reservations/${resIdInput!.value}` : '/api/reservations';
    const method = isEdit ? 'PUT' : 'POST';

    const body: Record<string, string> = { purpose, notes, handoverNote, status };
    
    if (dateFromInput && dateToInput) {
      body.from = dateFromInput.value;
      body.to = dateToInput.value;
    } else {
      return; // Should not happen
    }

    const result = await authFetch(url, { method, body: JSON.stringify(body) });
    if (!result) return;

    closeModal('booking-modal');
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
      if (r) openBookingModal(undefined, undefined, true, r);
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

    const result = await authFetch(`/ api / reservations / ${id}/assign`, {
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
    await Promise.all([fetchUsers(), loadReservations()]);
  },
  unmount() {
    currentReservations = [];
    allUsers = [];
  },
};

export default reservationsPage;
function openEditModal(id: string): void {
  const reservation = currentReservations.find((r) => r.id === id);
  if (!reservation) {
    showToast('Rezervace nenalezena.', 'error');
    return;
  }
  openBookingModal(undefined, undefined, true, reservation);
}

