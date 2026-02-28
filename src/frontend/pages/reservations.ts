/* ============================================================================
   pages/reservations.ts — Reservations calendar + booking (from script.js)
   ============================================================================ */
import type { PageModule } from "../lib/router";
import { $, show, hide, showToast, authFetch, getToken, getUserId, getRole, getUsername } from "../lib/common";
import { setupFormValidation, setFieldError } from "../lib/validation";
import type { Reservation, UserAvailability } from "@shared/types";
import "../styles/reservations.css";

// ─── Inventory notify ─────────────────────────────────────────────────────────

interface MissingSummary {
  count: number;
  items: { name: string; status: "LOW" | "EMPTY" }[];
  hasShoppingItems: boolean;
  pendingShoppingCount: number;
}

function showInventoryNotifyDialog(summary: MissingSummary): Promise<boolean> {
  return new Promise((resolve) => {
    document.getElementById("inv-notify-modal")?.remove();

    const countWord = summary.count === 1 ? "položka" : summary.count < 5 ? "položky" : "položek";

    const itemsList = summary.items
      .map(
        (i) =>
          `<li class="inv-notify-item">
        <span class="inv-notify-item-name">${i.name}</span>
        <span class="badge ${i.status === "EMPTY" ? "badge-empty" : "badge-low"}">${i.status === "EMPTY" ? "Došlo" : "Málo"}</span>
      </li>`,
      )
      .join("");

    const invSection =
      summary.count > 0
        ? `<p class="inv-notify-subtitle"><strong>${summary.count} ${countWord}</strong> na chatě chybí nebo dochází:</p>
         <ul class="inv-notify-list">${itemsList}</ul>`
        : "";

    const shopLine = summary.hasShoppingItems ? `<p class="inv-notify-shop-line">V nákupním seznamu je také <strong>${summary.pendingShoppingCount} nekoupených položek</strong>.</p>` : "";

    const modal = document.createElement("div");
    modal.id = "inv-notify-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content inv-notify-content">
        <div class="inv-notify-header">
          <h3>Rezervace uložena!</h3>
        </div>
        <div class="inv-notify-body">
          ${invSection}
          ${shopLine}
          <p class="inv-notify-question">Chcete rovnou přejít do nákupního seznamu?</p>
        </div>
        <div class="inv-notify-actions">
          <button class="button-secondary" id="inv-notify-no">Ne, zůstat v kalendáři</button>
          <button class="button-primary" id="inv-notify-yes">Ano, přejít do nákupů</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("modal-visible"));

    const cleanup = (result: boolean) => {
      modal.classList.remove("modal-visible");
      setTimeout(() => modal.remove(), 200);
      resolve(result);
    };

    document.getElementById("inv-notify-yes")?.addEventListener("click", () => cleanup(true));
    document.getElementById("inv-notify-no")?.addEventListener("click", () => cleanup(false));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cleanup(false);
    });
  });
}

// ─── Module state ────────────────────────────────────────────────────
let container: HTMLElement;
let currentReservations: (Reservation & { userColor?: string; userAnimalIcon?: string | null })[] = [];
let currentAvailabilities: UserAvailability[] = [];
let allUsers: { id: string; username: string; color?: string; role?: string }[] = [];
let reservationIdToDelete: string | null = null;
let activeReservationTab: "all" | "mine" = "all";
let activePeriodFilter: "month" | "3months" | "year" = "month";

let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();
let rangeSelectStart: string | null = null;
let _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
const validationCleanups: Array<() => void> = [];

// ─── Helpers ──────────────────────────────────────────────────────────

function hexToRgba(hex: string | undefined, alpha = 1): string | null {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return null;
  let c = hex.substring(1).split("");
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  const n = parseInt(c.join(""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function formatDateForDisplay(date: string | Date): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const off = dateObj.getTimezoneOffset() * 60000;
  const corrected = new Date(dateObj.getTime() + off);
  return `${corrected.getDate()}.${corrected.getMonth() + 1}.${corrected.getFullYear()}`;
}

function getUserColor(userId: string): string {
  const user = allUsers.find((u) => u.id === userId);
  return user?.color || "#808080";
}

const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

// ─── Template ─────────────────────────────────────────────────────────

function getTemplate(): string {
  return `
  <div class="main-content reservations-layout">
    <!-- Left Panel: Full Calendar -->
    <div class="card calendar-card full-calendar-card">
      <div class="calendar-header-bar">
        <div class="calendar-nav">
          <button id="cal-prev-month" class="icon-button">←</button>
          <h2 id="cal-month-year-display">Březen 2026</h2>
          <button id="cal-next-month" class="icon-button">→</button>
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

      <div id="range-selection-hint" class="range-hint hidden">
        <div class="range-hint-icon">✓</div>
        <div class="range-hint-body">
          <strong id="range-hint-text">Vyberte datum odjezdu</strong>
          <span>Klikněte na den v kalendáři</span>
        </div>
        <button type="button" id="range-cancel-btn" class="range-hint-cancel" title="Zrušit výběr">
          ×
        </button>
      </div>

      <div class="panel-actions">
        <button id="btn-new-reservation" class="button-primary">Nová rezervace</button>
        <button id="btn-new-availability" class="button-secondary btn-availability" title="Nahlásit osobní volno / dovolenou">Termíny dovolených</button>
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
      <form id="booking-form" class="booking-form-grid">
        <input type="hidden" id="reservation-id" />
        
        <div id="backup-warning-message" class="backup-warning hidden">
          <span style="color:#f59e0b;font-size:18px">⚠</span>
          <div><strong>Pozor:</strong> Vybraný termín je již obsazen.<br>Rezervace bude vytvořena jako <strong>záložní</strong>.</div>
        </div>

        <div class="form-row date-inputs-row">
          <div class="form-group">
            <label for="modal-date-from">Od</label>
            <input type="date" id="modal-date-from" class="booking-input" required data-error-message="Vyberte datum příjezdu." />
          </div>
          <div class="form-group">
            <label for="modal-date-to">Do</label>
            <input type="date" id="modal-date-to" class="booking-input" required data-error-message="Vyberte datum odjezdu." />
          </div>
        </div>

        <div class="form-row purpose-row">
          <div class="form-group">
            <label for="purpose-input">Účel návštěvy</label>
            <input type="text" id="purpose-input" class="booking-input" required maxlength="20" placeholder="např. Relax, Údržba..." data-error-message="Zadejte účel návštěvy (max 20 znaků)." />
          </div>
        </div>

        <div class="form-group soft-res-group">
          <input type="checkbox" id="soft-reservation-checkbox" />
          <label for="soft-reservation-checkbox" title="Ostatní uvidí, že plánujete jet, ale ještě to není 100% jisté.">Předběžný zájem <span class="soft-res-sublabel">(Měkká rezervace)</span></label>
        </div>

        <div class="form-row notes-row">
          <div class="form-group">
            <label for="notes-textarea">Poznámky <span class="label-optional">(volitelně)</span></label>
            <textarea id="notes-textarea" class="booking-input" rows="3" placeholder="např. Ostříhat stromy..."></textarea>
          </div>
          <div class="form-group">
            <label for="handover-notes-textarea">Předávací vzkaz <span class="label-optional">(volitelně)</span></label>
            <textarea id="handover-notes-textarea" class="booking-input" rows="3" placeholder="např. Nechal jsem v lednici pivo..."></textarea>
          </div>
        </div>

        <div class="booking-footer">
          <button type="button" id="modal-delete-button" class="btn-ghost-danger hidden">
            Odstranit rezervaci
          </button>
          <div class="booking-footer-right">
            <button type="submit" id="modal-submit-button" class="button-primary">Potvrdit rezervaci</button>
          </div>
        </div>
        <div class="avail-switch-link">
          <button type="button" id="switch-to-availability" class="btn-link-subtle">Nechci rezervovat chatu, chci si jen zapsat dovolenou</button>
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
      <form id="assign-reservation-form" novalidate>
        <input type="hidden" id="assign-reservation-id-input" />
        <div class="form-group">
          <label for="assign-user-select">Nový vlastník:</label>
          <select id="assign-user-select" required></select>
          <span class="error-message" id="assign-owner-error"></span>
        </div>
        <div class="modal-buttons">
          <button type="submit" class="button-primary">Potvrdit přiřazení</button>
          <button type="button" id="cancel-assign-btn" class="button-secondary">Zrušit</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Availability modal (Osobní volno) -->
  <div id="availability-modal" class="modal-overlay hidden">
    <div class="modal-content availability-modal-content">
      <span class="modal-close-button" data-close="availability-modal">&times;</span>
      <h2 id="avail-modal-title">Nahlásit osobní volno</h2>
      <p class="avail-modal-desc">Zaznač dny, kdy máš dovolenou nebo volno. Ostatní uvidí v kalendáři malé tečky — snáz se najde termín, kdy můžete jet všichni.</p>
      <form id="availability-form">
        <input type="hidden" id="avail-edit-id" value="" />
        <div class="form-row date-inputs-row">
          <div class="form-group">
            <label for="avail-date-from">Od</label>
            <input type="date" id="avail-date-from" class="booking-input" required data-error-message="Vyberte datum začátku volna." />
          </div>
          <div class="form-group">
            <label for="avail-date-to">Do</label>
            <input type="date" id="avail-date-to" class="booking-input" required data-error-message="Vyberte datum konce volna." />
          </div>
        </div>
        <div class="booking-footer">
          <div class="booking-footer-right">
            <button type="submit" id="avail-submit-btn" class="button-primary">Uložit volno</button>
          </div>
        </div>
      </form>
      <div id="my-availabilities-list" class="my-avail-list"></div>
    </div>
  </div>


  `;
}

// ─── Data loading ─────────────────────────────────────────────────────

async function fetchUsers(): Promise<void> {
  const data = await authFetch<typeof allUsers>("/api/users", { silent: true });
  allUsers = data || [];
}

async function loadReservations(): Promise<void> {
  const list = $("reservations-list");
  if (list) list.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  const data = await authFetch<{ reservations: (Reservation & { userColor?: string })[]; availabilities: UserAvailability[] }>("/api/reservations", { silent: true });
  if (!data) return;

  currentReservations = data.reservations;
  currentAvailabilities = data.availabilities || [];

  renderCustomCalendar();
  renderReservationsOverview(currentCalMonth, currentCalYear);
}

// ─── Range selection helpers ──────────────────────────────────────────

function clearRangeSelection(): void {
  rangeSelectStart = null;
  const daysGrid = $("cal-days-grid");
  if (daysGrid) {
    daysGrid.querySelectorAll(".is-range-start, .is-in-range, .is-range-end").forEach((el) => {
      el.classList.remove("is-range-start", "is-in-range", "is-range-end");
    });
    daysGrid.classList.remove("is-selecting");
  }
  const hint = $("range-selection-hint");
  if (hint) hint.classList.add("hidden");
}

function updateRangePreview(hoverDateStr: string): void {
  if (!rangeSelectStart) return;
  const daysGrid = $("cal-days-grid");
  if (!daysGrid) return;

  // Clear previous preview (keep start highlight)
  daysGrid.querySelectorAll(".is-in-range, .is-range-end").forEach((el) => {
    el.classList.remove("is-in-range", "is-range-end");
  });

  if (hoverDateStr <= rangeSelectStart) return;

  daysGrid.querySelectorAll<HTMLElement>(".cal-day[data-date]").forEach((cell) => {
    const d = cell.dataset.date!;
    if (d > rangeSelectStart! && d < hoverDateStr) {
      cell.classList.add("is-in-range");
    } else if (d === hoverDateStr) {
      cell.classList.add("is-range-end");
    }
  });
}

// ─── Custom Calendar ──────────────────────────────────────────────────

function renderCustomCalendar(): void {
  const monthYearDisplay = $("cal-month-year-display");
  const daysGrid = $("cal-days-grid");
  if (!monthYearDisplay || !daysGrid) return;

  monthYearDisplay.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;
  daysGrid.innerHTML = "";

  const firstDay = new Date(currentCalYear, currentCalMonth, 1);
  const lastDay = new Date(currentCalYear, currentCalMonth + 1, 0);

  // Monday-first offset (0 = Mon … 6 = Sun)
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const totalDays = lastDay.getDate();
  // Always 42 cells (6 rows) so the grid never changes height
  const totalCells = 42;

  // Today at midnight for past-date comparison
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // Last day of previous month (for filling leading cells)
  const prevMonthLastDay = new Date(currentCalYear, currentCalMonth, 0).getDate();

  // ── Helper: build one calendar cell ──────────────────────────────
  function buildCell(cellDate: Date, isOtherMonth: boolean): void {
    const dayCell = document.createElement("div");
    dayCell.className = "cal-day";

    const cellYear = cellDate.getFullYear();
    const cellMonth = cellDate.getMonth();
    const cellDay = cellDate.getDate();
    const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(cellDay).padStart(2, "0")}`;
    dayCell.dataset.date = dateStr;

    // Weekend
    const dow = cellDate.getDay();
    if (dow === 0 || dow === 6) dayCell.classList.add("weekend");

    // Other month
    if (isOtherMonth) dayCell.classList.add("other-month");

    // Today
    if (cellDate.getTime() === todayMidnight.getTime()) dayCell.classList.add("today");

    // Past date (strict past — yesterday and earlier)
    const isPast = cellDate < todayMidnight;
    if (isPast) dayCell.classList.add("past-date");

    // Day number
    const dayNum = document.createElement("div");
    dayNum.className = "day-num";
    dayNum.textContent = String(cellDay);
    dayCell.appendChild(dayNum);

    // Reservation bars — shown on all cells including other-month (for cross-month visibility)
    {
      const ts = Date.UTC(cellYear, cellMonth, cellDay);
      const forDay = currentReservations.filter((r) => {
        try {
          const s = new Date(r.from + "T00:00:00Z").getTime();
          const e = new Date(r.to + "T00:00:00Z").getTime();
          return ts >= s && ts <= e;
        } catch {
          return false;
        }
      });

      if (forDay.length > 0) {
        const barsContainer = document.createElement("div");
        barsContainer.className = "cal-bars";

        forDay.forEach((r) => {
          const bar = document.createElement("div");
          bar.className = "cal-bar";
          if (r.status === "backup") bar.classList.add("backup");
          if (r.status === "soft") bar.classList.add("soft");

          const isMine = r.userId === getUserId();
          if (isMine) bar.classList.add("mine");

          const c = r.userColor || "#808080";
          if (r.status === "soft") {
            bar.style.background = `repeating-linear-gradient(45deg, ${hexToRgba(c, 0.15)}, ${hexToRgba(c, 0.15)} 5px, rgba(255,255,255,0.7) 5px, rgba(255,255,255,0.7) 10px)`;
            bar.style.borderColor = c;
            bar.style.color = "#333";
          } else {
            bar.style.backgroundColor = hexToRgba(c, 0.8) || "";
            bar.style.color = "#fff";
          }

          const s = new Date(r.from + "T00:00:00Z").getTime();
          const e = new Date(r.to + "T00:00:00Z").getTime();
          if (ts === s) bar.classList.add("start");
          if (ts === e) bar.classList.add("end");

          bar.textContent = r.username;
          bar.title = `${r.username} (${r.purpose})`;

          bar.addEventListener("click", (ev) => {
            ev.stopPropagation();
            showReservationDetail(r);
          });

          barsContainer.appendChild(bar);
        });

        dayCell.appendChild(barsContainer);
      }
    }

    // ── Availability dots (osobní volno) ──────────────────────────────
    {
      const ts = Date.UTC(cellYear, cellMonth, cellDay);
      const forDay = currentAvailabilities.filter((a) => {
        try {
          const s = new Date(a.startDate + "T00:00:00Z").getTime();
          const e = new Date(a.endDate + "T00:00:00Z").getTime();
          return ts >= s && ts <= e;
        } catch {
          return false;
        }
      });

      if (forDay.length > 0) {
        const dotsContainer = document.createElement("div");
        dotsContainer.className = "cal-avail-dots";

        // Tooltip: "Mají volno: Míša, Admin"
        const names = forDay.map((a) => a.username);
        dotsContainer.title = `Mají dovolenou: ${names.join(", ")}`;

        // Mobile: collapse to single grey dot if too many
        const isMobile = window.innerWidth <= 768;
        if (isMobile && forDay.length > 2) {
          const dot = document.createElement("span");
          dot.className = "cal-avail-dot";
          dot.style.backgroundColor = "#9ca3af";
          dotsContainer.appendChild(dot);
        } else {
          forDay.forEach((a) => {
            const dot = document.createElement("span");
            dot.className = "cal-avail-dot";
            dot.style.backgroundColor = a.userColor || "#808080";
            dotsContainer.appendChild(dot);
          });
        }

        dayCell.appendChild(dotsContainer);
      }
    }

    // Range selection click handler:
    // — Starting a range: only on non-past, current-month cells
    // — Completing a range: on any non-past cell (including other-month trailing/leading cells)
    if (!isPast) {
      dayCell.addEventListener("click", () => {
        if (!rangeSelectStart) {
          // Starting: block other-month cells
          if (isOtherMonth) return;
          rangeSelectStart = dateStr;
          dayCell.classList.add("is-range-start");
          const dGrid = $("cal-days-grid");
          if (dGrid) dGrid.classList.add("is-selecting");
          const hint = $("range-selection-hint");
          if (hint) hint.classList.remove("hidden");
        } else {
          const start = rangeSelectStart;
          if (dateStr < start) {
            // Clicked before start — only restart if on a current-month cell
            if (isOtherMonth) return;
            clearRangeSelection();
            rangeSelectStart = dateStr;
            dayCell.classList.add("is-range-start");
            const dGrid = $("cal-days-grid");
            if (dGrid) dGrid.classList.add("is-selecting");
            const hint = $("range-selection-hint");
            if (hint) hint.classList.remove("hidden");
          } else if (dateStr === start) {
            clearRangeSelection();
          } else {
            // Completing a range — allowed even on other-month cells
            const end = dateStr;
            clearRangeSelection();
            openBookingModal(start, end);
          }
        }
      });
    }

    daysGrid!.appendChild(dayCell);
  }

  // ── 1. Leading cells: days from previous month ────────────────────
  for (let i = 0; i < startDayOfWeek; i++) {
    const dayNum = prevMonthLastDay - startDayOfWeek + i + 1;
    buildCell(new Date(currentCalYear, currentCalMonth - 1, dayNum), true);
  }

  // ── 2. Current month days ─────────────────────────────────────────
  for (let i = 1; i <= totalDays; i++) {
    buildCell(new Date(currentCalYear, currentCalMonth, i), false);
  }

  // ── 3. Trailing cells: days from next month ───────────────────────
  const filledCells = startDayOfWeek + totalDays;
  for (let i = 1; i <= totalCells - filledCells; i++) {
    buildCell(new Date(currentCalYear, currentCalMonth + 1, i), true);
  }

  // ── Restore range-selection UI if user navigated months mid-selection ──
  if (rangeSelectStart) {
    const dGrid = $("cal-days-grid");
    if (dGrid) dGrid.classList.add("is-selecting");
    const hint = $("range-selection-hint");
    if (hint) {
      hint.classList.remove("hidden");
      const hintText = $("range-hint-text");
      if (hintText) hintText.textContent = `Příjezd: ${rangeSelectStart} — nyní vyberte datum odjezdu`;
    }
    // Highlight the start cell if it's visible in this month
    const startCell = dGrid?.querySelector<HTMLElement>(`.cal-day[data-date="${rangeSelectStart}"]`);
    if (startCell) startCell.classList.add("is-range-start");
  }

  updateQuickStats();
}

function updateQuickStats() {
  const statsContainer = $("calendar-quick-stats");
  if (!statsContainer) return;

  const mStart = new Date(currentCalYear, currentCalMonth, 1).getTime();
  const mEnd = new Date(currentCalYear, currentCalMonth + 1, 0).getTime();

  let bookedDays = new Set<number>();

  currentReservations.forEach((r) => {
    if (r.status === "backup") return;
    const s = new Date(r.from + "T00:00:00Z").getTime();
    const e = new Date(r.to + "T00:00:00Z").getTime();

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
    if (date.getDay() === 6) {
      // Sobota
      const satTime = Date.UTC(currentCalYear, currentCalMonth, day);
      const sunTime = Date.UTC(currentCalYear, currentCalMonth, day + 1);

      let satBooked = false;
      let sunBooked = false;

      currentReservations.forEach((r) => {
        if (r.status === "backup") return;
        const s = new Date(r.from + "T00:00:00Z").getTime();
        const e = new Date(r.to + "T00:00:00Z").getTime();
        if (satTime >= s && satTime <= e) satBooked = true;
        if (sunTime >= s && sunTime <= e) sunBooked = true;
      });

      if (!satBooked && !sunBooked) {
        freeWeekends++;
      }
    }
  }

  statsContainer.innerHTML = `
    <span class="stat-badge">Obsazeno: <strong>${bookedDays.size}</strong> dní</span>
    <span class="stat-badge free">Volno: <strong>${freeDays}</strong> dní</span>
    <span class="stat-badge weekend">Volné víkendy: <strong>${freeWeekends}</strong></span>
  `;
}

function showReservationDetail(r: Reservation & { userColor?: string; userAnimalIcon?: string | null }) {
  const detailDiv = $("reservation-detail");
  const listDiv = $("reservations-list");
  if (!detailDiv || !listDiv) return;

  listDiv.classList.add("hidden");
  detailDiv.classList.remove("hidden");

  const isMine = r.userId === getUserId();
  const admin = getRole() === "admin";
  const c = r.userColor || "#808080";

  // Avatar
  const avatarContent = r.userAnimalIcon ? r.userAnimalIcon : r.username.charAt(0).toUpperCase();
  const avatarBg = r.userAnimalIcon ? "background: rgba(0,0,0,0.06);" : `background: ${c};`;

  // Status badge
  const statusMap: Record<string, { label: string; cls: string }> = {
    primary: { label: "Potvrzeno", cls: "badge-success" },
    backup: { label: "Záložní", cls: "badge-warning" },
    soft: { label: "Předběžná", cls: "badge-neutral" },
  };
  const badge = statusMap[r.status as string] ?? statusMap["primary"];

  const canEdit = isMine || admin;

  detailDiv.innerHTML = `
    <div class="res-detail-card" style="--user-color: ${c};">

      <button class="detail-back-btn">
        ← Zpět na seznam
      </button>

      <div class="detail-header">
        <div class="detail-avatar" style="${avatarBg}">${avatarContent}</div>
        <div class="detail-header-text">
          <div class="detail-username">${r.username}</div>
          <span class="detail-badge ${badge.cls}">${badge.label}</span>
        </div>
      </div>

      <div class="detail-meta-block">
        <div class="detail-meta-row">
          <span class="detail-meta-label">Od</span>
          <span class="detail-meta-value">${formatDateForDisplay(r.from)}</span>
        </div>
        <div class="detail-meta-row">
          <span class="detail-meta-label">Do</span>
          <span class="detail-meta-value">${formatDateForDisplay(r.to)}</span>
        </div>
        <div class="detail-meta-row">
          <span class="detail-meta-label">Účel</span>
          <span class="detail-meta-value">${r.purpose || "—"}</span>
        </div>
        ${
          r.notes
            ? `
        <div class="detail-meta-row detail-meta-row--notes">
          <span class="detail-meta-label">Poznámka</span>
          <span class="detail-meta-value detail-notes-text">${r.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
        </div>`
            : ""
        }
        ${
          r.handoverNote
            ? `
        <div class="detail-meta-row detail-meta-row--notes">
          <span class="detail-meta-label">Vzkaz</span>
          <span class="detail-meta-value detail-notes-text">${r.handoverNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
        </div>`
            : ""
        }
      </div>

      ${
        canEdit
          ? `
      <div class="detail-actions">
        <button class="detail-btn detail-btn-primary edit-btn" data-id="${r.id}">
          Upravit
        </button>
        ${
          admin
            ? `<button class="detail-btn detail-btn-secondary assign-btn" data-id="${r.id}">
          Přiřadit jinému
        </button>`
            : ""
        }
        <button class="detail-btn detail-btn-ghost-danger delete-btn" data-id="${r.id}">
          Smazat rezervaci
        </button>
      </div>`
          : ""
      }

      ${
        !isMine
          ? `
      <div class="detail-actions" id="watcher-slot-${r.id}">
        <button class="detail-btn" disabled>
          Načítám…
        </button>
      </div>`
          : ""
      }

    </div>
  `;

  detailDiv.querySelector(".detail-back-btn")?.addEventListener("click", () => {
    detailDiv.classList.add("hidden");
    listDiv.classList.remove("hidden");
  });

  const editBtn = detailDiv.querySelector<HTMLElement>(".edit-btn");
  if (editBtn)
    editBtn.addEventListener("click", () => {
      const id = editBtn.dataset.id;
      if (id) openEditModal(id);
    });

  const delBtn = detailDiv.querySelector<HTMLElement>(".delete-btn");
  if (delBtn)
    delBtn.addEventListener("click", () => {
      const id = delBtn.dataset.id;
      if (id) openConfirmDelete(id);
    });

  const assignBtn = detailDiv.querySelector<HTMLElement>(".assign-btn");
  if (assignBtn)
    assignBtn.addEventListener("click", () => {
      const id = assignBtn.dataset.id;
      if (id) openAssignModal(id);
    });

  // ── Async watcher button ───────────────────────────────────────────────
  if (!isMine) {
    fetchWatchStatus(r.id).then((watching) => {
      const slot = document.getElementById(`watcher-slot-${r.id}`);
      if (!slot) return;
      slot.innerHTML = buildWatchButton(r.id, watching);
      bindWatchButton(slot.querySelector<HTMLButtonElement>(".watch-toggle-btn"));
    });
  }
}

// ─── Reservation rendering ────────────────────────────────────────────

function renderReservationsOverview(month: number, year: number): void {
  const listDiv = $("reservations-list");
  const title = $("reservations-title");
  if (!listDiv || !title) return;

  const mStart = new Date(year, month, 1);
  let mEnd = new Date(year, month + 1, 0);

  if (activePeriodFilter === "month") {
    title.textContent = `Přehled: ${monthNames[month]} ${year}`;
  } else if (activePeriodFilter === "3months") {
    title.textContent = `Výhled na 3 měsíce od: ${monthNames[month]}`;
    mEnd = new Date(year, month + 3, 0);
  } else if (activePeriodFilter === "year") {
    title.textContent = `Výhled na 1 rok od: ${monthNames[month]}`;
    mEnd = new Date(year, month + 12, 0);
  }

  const filtered = currentReservations.filter((r) => {
    try {
      return new Date(r.from) <= mEnd && new Date(r.to) >= mStart;
    } catch {
      return false;
    }
  });
  renderReservationList(filtered, "V tomto období nejsou zadané žádné rezervace.");
}

function renderReservationsForSelection(sel: Date[]): void {
  const listDiv = $("reservations-list");
  const title = $("reservations-title");
  if (!listDiv || !title || sel.length !== 2) return;

  title.textContent = "Konflikty pro Váš výběr";
  const overlapping = currentReservations.filter((r) => {
    try {
      return new Date(r.from) <= sel[1] && new Date(r.to) >= sel[0];
    } catch {
      return false;
    }
  });
  renderReservationList(overlapping, "Ve vybraném termínu nejsou žádné jiné rezervace.");
}

function renderReservationList(reservations: typeof currentReservations, emptyMsg: string): void {
  const listDiv = $("reservations-list");
  if (!listDiv) return;
  listDiv.innerHTML = "";

  const myId = getUserId();
  const admin = getRole() === "admin";

  let filtered = reservations;
  if (activeReservationTab === "mine") {
    filtered = reservations.filter((r) => r.userId === myId);
  }

  if (filtered.length === 0) {
    listDiv.innerHTML = `<p class="empty-state"><i>${emptyMsg}</i></p>`;
    return;
  }

  filtered.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
  const myUserId = getUserId();

  for (const r of filtered) {
    const card = document.createElement("div");
    const isMine = myUserId === r.userId;
    card.className = `res-card ${r.status === "backup" ? "res-backup" : r.status === "soft" ? "res-soft" : "res-approved"} ${isMine ? "res-mine" : ""}`;

    // Získání barev
    const uColor = r.userColor || "#808080";
    const init = r.username.charAt(0).toUpperCase();

    const d1 = new Date(r.from);
    const d2 = new Date(r.to);

    const notesHTML = r.notes ? `<p class="res-notes" style="margin-top: 5px;">${r.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : "";

    const handoverHTML = r.handoverNote
      ? `<div class="res-handover-note" style="margin-top: 10px; background: #fffbeb; padding: 10px; border-radius: 8px; border-left: 4px solid #f59e0b;"><strong>Vzkaz pro další:</strong> ${r.handoverNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
      : "";

    let actions = "";
    if (isMine || admin) {
      actions = `
        <div class="res-card-actions">
          <button class="edit-btn" data-id="${r.id}" title="Upravit">✎</button>
          ${admin ? `<button class="assign-btn" data-id="${r.id}" title="Přiřadit">➤</button>` : ""}
          <button class="delete-btn" data-id="${r.id}" title="Smazat">×</button>
        </div>`;
    }

    let badge = "";
    if (r.status === "backup") {
      badge = '<span class="status-badge backup">Na čekací listině</span>';
    } else if (r.status === "soft") {
      badge = '<span class="status-badge soft">Předběžný zájem</span>';
    } else {
      badge = '<span class="status-badge approved">Potvrzeno</span>';
    }

    card.innerHTML = `
      <div class="res-indicator" style="background-color: ${uColor}"></div>
      <div class="res-content-left">
        <div class="res-user">
          <div class="res-avatar" style="${r.userAnimalIcon ? "background-color: transparent; font-size: 24px;" : `background-color: ${uColor}`}">${r.userAnimalIcon || init}</div>
          <strong title="${r.username}">${r.username}</strong>
        </div>
        <div class="res-date-block-new">
          <span class="res-date-main">${
            d1.getMonth() === d2.getMonth()
              ? `${d1.getDate()}. - ${d2.getDate()}. ${monthNames[d1.getMonth()]}`
              : `${d1.getDate()}. ${monthNames[d1.getMonth()]} - ${d2.getDate()}. ${monthNames[d2.getMonth()]}`
          }</span>
        </div>
        <div class="res-purpose"><strong>Účel:</strong> ${r.purpose || "<em>Nespecifikováno</em>"}</div>
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
  const form = $<HTMLFormElement>("booking-form");
  const title = $("modal-title");
  const submitBtn = $("modal-submit-button");
  const deleteBtn = $("modal-delete-button");
  const resIdInput = $<HTMLInputElement>("reservation-id");
  const purposeInput = $<HTMLInputElement>("purpose-input");
  const notesTa = $<HTMLTextAreaElement>("notes-textarea");
  const handoverTa = $<HTMLTextAreaElement>("handover-notes-textarea");
  const softCheck = $<HTMLInputElement>("soft-reservation-checkbox");
  const backupWarn = $("backup-warning-message");
  const modal = $("booking-modal");

  const dateFromInput = $<HTMLInputElement>("modal-date-from");
  const dateToInput = $<HTMLInputElement>("modal-date-to");

  if (!form || !modal) return;
  form.reset();
  if (resIdInput) resIdInput.value = "";
  hide(deleteBtn);
  hide(backupWarn);

  if (softCheck) softCheck.checked = false;
  if (handoverTa) handoverTa.value = "";

  if (dateFromInput && fromDateStr) dateFromInput.value = fromDateStr;
  if (dateToInput && toDateStr) dateToInput.value = toDateStr;

  if (isEdit && reservation) {
    if (title) title.textContent = "Upravit rezervaci";
    if (submitBtn) submitBtn.textContent = "Uložit změny";
    show(deleteBtn);
    if (deleteBtn) {
      deleteBtn.classList.remove("hidden");
      deleteBtn.onclick = () => {
        closeModal("booking-modal");
        openConfirmDelete(reservation.id);
      };
    }

    if (dateFromInput) dateFromInput.value = reservation.from;
    if (dateToInput) dateToInput.value = reservation.to;

    if (resIdInput) resIdInput.value = reservation.id;

    if (purposeInput) purposeInput.value = reservation.purpose || "";
    if (notesTa) notesTa.value = reservation.notes || "";
    if (handoverTa) handoverTa.value = reservation.handoverNote || "";
    if (softCheck) softCheck.checked = reservation.status === "soft";
  } else {
    if (title) title.textContent = "Nová rezervace";
    if (submitBtn) submitBtn.textContent = "Potvrdit rezervaci";

    if (fromDateStr && toDateStr) {
      const from = new Date(fromDateStr);
      const to = new Date(toDateStr);
      const overlapping = currentReservations.some((r) => {
        if (r.status === "backup") return false;
        return new Date(r.from) <= to && new Date(r.to) >= from;
      });
      if (overlapping) show(backupWarn);
    }
  }
  show(modal);
}

function closeModal(id: string): void {
  const el = $(id);
  if (el) {
    hide(el);
  }
}

function openConfirmDelete(id: string): void {
  reservationIdToDelete = id;
  show($("confirm-delete-modal"));
}

function closeConfirmDelete(): void {
  hide($("confirm-delete-modal"));
  reservationIdToDelete = null;
}

// ─── Assign modal ─────────────────────────────────────────────────────

function openAssignModal(reservationId: string): void {
  const reservation = currentReservations.find((r) => r.id === reservationId);
  if (!reservation) {
    showToast("Rezervace nenalezena.", "error");
    return;
  }

  const modal = $("assign-reservation-modal");
  const idInput = $<HTMLInputElement>("assign-reservation-id-input");
  const text = $("assign-modal-text");
  const select = $<HTMLSelectElement>("assign-user-select");

  if (!modal || !idInput || !select) return;
  idInput.value = reservationId;
  if (text) text.textContent = `Přiřazujete rezervaci: ${formatDateForDisplay(reservation.from)} - ${formatDateForDisplay(reservation.to)}.`;

  // Clear any previous error state
  select.classList.remove("input-error");
  const errSpan = $("assign-owner-error");
  if (errSpan) {
    errSpan.classList.remove("show");
    errSpan.textContent = "";
  }

  select.innerHTML = '<option value="">-- Vyberte uživatele --</option>';
  const eligible = allUsers.filter((u) => u.role !== "admin" && u.id !== reservation.userId);
  for (const u of eligible) {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.username;
    select.appendChild(opt);
  }
  show(modal);
}

function closeAssignModal(): void {
  hide($("assign-reservation-modal"));
}

// ─── Watcher helpers — Hlídácí pes termínů ──────────────────────────────────

const watchingCache = new Map<string, boolean>();

async function fetchWatchStatus(reservationId: string): Promise<boolean> {
  if (watchingCache.has(reservationId)) return watchingCache.get(reservationId)!;
  const data = await authFetch<{ watching: boolean }>(`/api/reservations/${reservationId}/watch`);
  const watching = data?.watching ?? false;
  watchingCache.set(reservationId, watching);
  return watching;
}

async function toggleWatch(reservationId: string, currentlyWatching: boolean): Promise<boolean> {
  const method = currentlyWatching ? "DELETE" : "POST";
  const result = await authFetch<{ watching: boolean; message: string }>(`/api/reservations/${reservationId}/watch`, { method });
  if (!result) return currentlyWatching;
  watchingCache.set(reservationId, result.watching);
  showToast(result.message, "success");
  return result.watching;
}

function buildWatchButton(reservationId: string, watching: boolean): string {
  return watching
    ? `<button class="detail-btn detail-btn-watching watch-toggle-btn" data-res-id="${reservationId}" data-watching="true">
         🐕 Hlídám · Zrušit hlídání
       </button>`
    : `<button class="detail-btn detail-btn-watch watch-toggle-btn" data-res-id="${reservationId}" data-watching="false"
         title="Dostaneš zprávu na nástěnce, pokud bude termín uvolněn">
         🔔 Hlídat termín
       </button>`;
}

function bindWatchButton(btn: HTMLButtonElement | null): void {
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const resId = btn.dataset.resId!;
    const watching = btn.dataset.watching === "true";
    btn.disabled = true;
    btn.innerHTML = "⏳ Ukládám…";
    const newState = await toggleWatch(resId, watching);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildWatchButton(resId, newState);
    const newBtn = wrapper.firstElementChild as HTMLButtonElement;
    btn.replaceWith(newBtn);
    bindWatchButton(newBtn);
  });
}

// ─── Availability helpers (Osobní volno) ──────────────────────────────

function openAvailabilityModal(fromDate?: string, toDate?: string): void {
  const modal = $("availability-modal");
  const fromInput = $<HTMLInputElement>("avail-date-from");
  const toInput = $<HTMLInputElement>("avail-date-to");
  if (!modal) return;

  // Reset to create mode
  const editIdInput = $<HTMLInputElement>("avail-edit-id");
  if (editIdInput) editIdInput.value = "";
  const titleEl = $("avail-modal-title");
  if (titleEl) titleEl.textContent = "Nahlásit osobní volno";
  const submitBtn = $<HTMLButtonElement>("avail-submit-btn");
  if (submitBtn) submitBtn.textContent = "Uložit volno";

  if (fromInput) fromInput.value = fromDate || "";
  if (toInput) toInput.value = toDate || "";

  renderMyAvailabilities();
  show(modal);
}

function openAvailabilityModalForEdit(id: string, startDate: string, endDate: string): void {
  const modal = $("availability-modal");
  if (!modal) return;

  // Set edit mode
  const editIdInput = $<HTMLInputElement>("avail-edit-id");
  if (editIdInput) editIdInput.value = id;
  const titleEl = $("avail-modal-title");
  if (titleEl) titleEl.textContent = "Upravit osobní volno";
  const submitBtn = $<HTMLButtonElement>("avail-submit-btn");
  if (submitBtn) submitBtn.textContent = "Uložit změny";

  const fromInput = $<HTMLInputElement>("avail-date-from");
  const toInput = $<HTMLInputElement>("avail-date-to");
  if (fromInput) fromInput.value = startDate;
  if (toInput) toInput.value = endDate;

  renderMyAvailabilities();
  show(modal);
}

function renderMyAvailabilities(): void {
  const listEl = $("my-availabilities-list");
  if (!listEl) return;

  const myId = getUserId();
  const mine = currentAvailabilities.filter((a) => a.userId === myId);

  if (mine.length === 0) {
    listEl.innerHTML = '<p class="empty-state" style="margin-top:12px;font-size:0.85rem;">Zatím nemáš nahlášené žádné volno.</p>';
    return;
  }

  listEl.innerHTML = `
    <h4 style="margin:16px 0 8px;font-size:0.9rem;color:#374151;">Moje nahlášené dovolené</h4>
    ${mine
      .map(
        (a) => `
      <div class="my-avail-item">
        <span>${formatDateForDisplay(a.startDate)} — ${formatDateForDisplay(a.endDate)}</span>
        <div style="display:flex;gap:4px;">
          <button class="avail-edit-btn" data-avail-id="${a.id}" data-start="${a.startDate}" data-end="${a.endDate}" title="Upravit" style="background:none;border:none;color:#6b7280;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:0.9rem;transition:all 0.15s;">✎</button>
          <button class="btn-ghost-danger avail-delete-btn" data-avail-id="${a.id}" title="Smazat">×</button>
        </div>
      </div>
    `,
      )
      .join("")}
  `;

  // Bind edit buttons
  listEl.querySelectorAll<HTMLButtonElement>(".avail-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.availId;
      const start = btn.dataset.start;
      const end = btn.dataset.end;
      if (!id || !start || !end) return;
      openAvailabilityModalForEdit(id, start, end);
    });
    // Hover effect
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(107, 114, 128, 0.1)";
      btn.style.color = "#374151";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "none";
      btn.style.color = "#6b7280";
    });
  });

  // Bind delete buttons
  listEl.querySelectorAll<HTMLButtonElement>(".avail-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.availId;
      if (!id) return;
      btn.disabled = true;
      const result = await authFetch(`/api/reservations/availabilities/${id}`, { method: "DELETE" });
      if (result) {
        showToast("Volno smazáno.", "success");
        await loadReservations();
        renderMyAvailabilities();
      }
      btn.disabled = false;
    });
  });
}

// ─── Event Binding ────────────────────────────────────────────────────

function bindEvents(): void {
  // Close buttons (data-close attribute)
  container.querySelectorAll<HTMLElement>("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close!));
  });

  // Calendar navigation
  $("cal-prev-month")?.addEventListener("click", () => {
    // Do NOT clear rangeSelectStart — user may be picking end date in prev month
    currentCalMonth--;
    if (currentCalMonth < 0) {
      currentCalMonth = 11;
      currentCalYear--;
    }
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  $("cal-next-month")?.addEventListener("click", () => {
    // Do NOT clear rangeSelectStart — user may be picking end date in next month
    currentCalMonth++;
    if (currentCalMonth > 11) {
      currentCalMonth = 0;
      currentCalYear++;
    }
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  // Range selection cancel button
  $("range-cancel-btn")?.addEventListener("click", () => clearRangeSelection());

  // Range selection hover preview (event delegation on the grid)
  const daysGrid = $("cal-days-grid");
  if (daysGrid) {
    daysGrid.addEventListener("mouseover", (e) => {
      if (!rangeSelectStart) return;
      const cell = (e.target as HTMLElement).closest<HTMLElement>(".cal-day[data-date]");
      if (cell?.dataset.date) updateRangePreview(cell.dataset.date);
    });
    daysGrid.addEventListener("mouseleave", () => {
      if (!rangeSelectStart) return;
      daysGrid.querySelectorAll(".is-in-range, .is-range-end").forEach((el) => {
        el.classList.remove("is-in-range", "is-range-end");
      });
    });
  }

  $("btn-new-reservation")?.addEventListener("click", () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    openBookingModal(todayStr, todayStr);
  });

  // Availability button
  $("btn-new-availability")?.addEventListener("click", () => {
    openAvailabilityModal();
  });

  // Availability form submit
  const _availForm = $<HTMLFormElement>("availability-form");
  if (_availForm) {
    validationCleanups.push(
      setupFormValidation(
        _availForm,
        async () => {
          const fromInput = $<HTMLInputElement>("avail-date-from");
          const toInput = $<HTMLInputElement>("avail-date-to");
          const submitBtn = $<HTMLButtonElement>("avail-submit-btn");
          const editIdInput = $<HTMLInputElement>("avail-edit-id");

          if (toInput?.value && fromInput?.value && toInput.value < fromInput.value) {
            setFieldError(toInput, 'Datum "Do" nemůže být před "Od".');
            return;
          }

          if (submitBtn) submitBtn.disabled = true;

          const isEdit = editIdInput?.value;
          const url = isEdit ? `/api/reservations/availabilities/${editIdInput!.value}` : "/api/reservations/availabilities";
          const method = isEdit ? "PATCH" : "POST";

          const result = await authFetch(url, {
            method,
            body: JSON.stringify({ startDate: fromInput!.value, endDate: toInput!.value }),
          });

          if (submitBtn) submitBtn.disabled = false;

          if (result) {
            showToast(isEdit ? "Volno upraveno!" : "Volno nahlášeno!", "success");
            if (fromInput) fromInput.value = "";
            if (toInput) toInput.value = "";
            if (editIdInput) editIdInput.value = "";
            const titleEl = $("avail-modal-title");
            if (titleEl) titleEl.textContent = "Nahlásit osobní volno";
            if (submitBtn) submitBtn.textContent = "Uložit volno";
            await loadReservations();
            renderMyAvailabilities();
          }
        },
        { scrollToError: false },
      ),
    );
  }

  // Switch from booking modal to availability modal
  $("switch-to-availability")?.addEventListener("click", () => {
    const fromInput = $<HTMLInputElement>("modal-date-from");
    const toInput = $<HTMLInputElement>("modal-date-to");
    const fromVal = fromInput?.value || "";
    const toVal = toInput?.value || "";
    closeModal("booking-modal");
    openAvailabilityModal(fromVal, toVal);
  });

  // Tabs logic
  $("tab-all")?.addEventListener("click", (e) => {
    activeReservationTab = "all";
    $("tab-all")?.classList.add("active");
    $("tab-mine")?.classList.remove("active");
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  // Period select
  $<HTMLSelectElement>("period-filter-select")?.addEventListener("change", (e) => {
    activePeriodFilter = (e.target as HTMLSelectElement).value as any;
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  $("tab-mine")?.addEventListener("click", (e) => {
    activeReservationTab = "mine";
    $("tab-mine")?.classList.add("active");
    $("tab-all")?.classList.remove("active");
    renderCustomCalendar();
    renderReservationsOverview(currentCalMonth, currentCalYear);
  });

  // Booking form submit
  const _bookingForm = $<HTMLFormElement>("booking-form");
  if (_bookingForm) {
    validationCleanups.push(
      setupFormValidation(_bookingForm, async () => {
        const purposeInput = $<HTMLInputElement>("purpose-input");
        const notesTa = $<HTMLTextAreaElement>("notes-textarea");
        const handoverTa = $<HTMLTextAreaElement>("handover-notes-textarea");
        const softCheck = $<HTMLInputElement>("soft-reservation-checkbox");
        const resIdInput = $<HTMLInputElement>("reservation-id");
        const dateFromInput = $<HTMLInputElement>("modal-date-from");
        const dateToInput = $<HTMLInputElement>("modal-date-to");

        const purpose = purposeInput?.value.trim() || "";
        const notes = notesTa?.value.trim() || "";
        const handoverNote = handoverTa?.value.trim() || "";
        const status = softCheck?.checked ? "soft" : "primary";

        if (dateFromInput && dateToInput && dateToInput.value < dateFromInput.value) {
          setFieldError(dateToInput, 'Datum "Do" nemůže být před "Od".');
          return;
        }

        const isEdit = !!resIdInput?.value;
        const url = isEdit ? `/api/reservations/${resIdInput!.value}` : "/api/reservations";
        const method = isEdit ? "PUT" : "POST";

        const body: Record<string, string> = { purpose, notes, handoverNote, status };
        if (dateFromInput && dateToInput) {
          body.from = dateFromInput.value;
          body.to = dateToInput.value;
        } else {
          return;
        }

        const result = await authFetch(url, { method, body: JSON.stringify(body) });
        if (!result) return;

        closeModal("booking-modal");
        await loadReservations();

        if (isEdit) {
          showToast("Rezervace upravena.", "success");
          return;
        }

        showToast("Rezervace uložena! Kontroluji zásoby…", "info");
        const summary = await authFetch<MissingSummary>("/api/inventory/missing-summary");
        if (!summary || (summary.count === 0 && !summary.hasShoppingItems)) {
          showToast("Rezervace uložena! Zásoby jsou v pořádku.", "success");
          return;
        }
        const goShopping = await showInventoryNotifyDialog(summary);
        if (goShopping) window.location.hash = "#/shopping";
      }),
    );
  }

  // Reservation list delegation (edit, delete, assign)
  $("reservations-list")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!btn) return;
    const id = btn.dataset.id!;
    if (btn.classList.contains("edit-btn")) {
      const r = currentReservations.find((x) => x.id === id);
      if (r) openBookingModal(undefined, undefined, true, r);
    } else if (btn.classList.contains("delete-btn")) {
      openConfirmDelete(id);
    } else if (btn.classList.contains("assign-btn")) {
      openAssignModal(id);
    }
  });

  // Confirm delete
  $("confirm-delete-btn")?.addEventListener("click", async () => {
    if (!reservationIdToDelete) return;
    const result = await authFetch("/api/reservations/delete", {
      method: "POST",
      body: JSON.stringify({ id: reservationIdToDelete }),
    });
    closeConfirmDelete();
    if (result) {
      showToast("Rezervace smazána.", "success");
      await loadReservations();
    }
  });
  $("cancel-delete-btn")?.addEventListener("click", closeConfirmDelete);

  // Assign form submit
  const _assignForm = $<HTMLFormElement>("assign-reservation-form");
  if (_assignForm) {
    validationCleanups.push(
      setupFormValidation(_assignForm, async () => {
        const id = $<HTMLInputElement>("assign-reservation-id-input")?.value;
        const select = $<HTMLSelectElement>("assign-user-select");
        const newOwnerId = select?.value;

        if (!newOwnerId) {
          setFieldError(select!, "Vyberte prosím nového vlastníka ze seznamu.");
          return;
        }

        const result = await authFetch(`/api/reservations/${id}/assign`, {
          method: "POST",
          body: JSON.stringify({ newOwnerId }),
        });
        if (result) {
          closeAssignModal();
          showToast("Rezervace přiřazena.", "success");
          await loadReservations();
        }
      }),
    );
  }

  // Clear assign error on change (handled by setupFormValidation clearOnInput)

  $("cancel-assign-btn")?.addEventListener("click", closeAssignModal);

  // Escape key cancels range selection
  _keydownHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && rangeSelectStart) clearRangeSelection();
  };
  document.addEventListener("keydown", _keydownHandler);
}

// ─── Page Module ──────────────────────────────────────────────────────

const reservationsPage: PageModule = {
  async mount(el: HTMLElement) {
    container = el;
    currentCalMonth = new Date().getMonth();
    currentCalYear = new Date().getFullYear();
    el.innerHTML = getTemplate();
    bindEvents();
    await Promise.all([fetchUsers(), loadReservations()]);
  },
  unmount() {
    validationCleanups.forEach((fn) => fn());
    validationCleanups.length = 0;
    if (_keydownHandler) {
      document.removeEventListener("keydown", _keydownHandler);
      _keydownHandler = null;
    }
    rangeSelectStart = null;
    currentReservations = [];
    currentAvailabilities = [];
    allUsers = [];
  },
};

export default reservationsPage;
function openEditModal(id: string): void {
  const reservation = currentReservations.find((r) => r.id === id);
  if (!reservation) {
    showToast("Rezervace nenalezena.", "error");
    return;
  }
  openBookingModal(undefined, undefined, true, reservation);
}
