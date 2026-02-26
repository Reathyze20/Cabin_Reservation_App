/* ============================================================================
   pages/dashboard.ts — Přehled (Dashboard) — hlavní stránka po přihlášení
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { authFetch, getRole, showToast } from '../lib/common';
import { navigate } from '../lib/router';

// ─── Types ────────────────────────────────────────────────────────────

interface PendingShoppingItem {
  id: string;
  name: string;
  isEssential: boolean;
  listId: string;
  listName: string;
}

interface DashboardData {
  activeReservation: {
    id: string;
    username: string;
    userColor: string;
    userAnimalIcon?: string | null;
    from: string;
    to: string;
    purpose: string;
    handoverNote?: string | null;
  } | null;
  upcomingReservations: {
    id: string;
    userId: string;
    username: string;
    userColor: string;
    userAnimalIcon?: string | null;
    from: string;
    to: string;
    purpose: string;
    status: string;
  }[];
  myNextReservation: {
    from: string;
    to: string;
    purpose: string;
  } | null;
  departingToday: boolean;
  pendingShoppingItems: PendingShoppingItem[];
  totalPendingShoppingCount: number;
  pinnedHandoverNote: string | null;
  essentialWarning: {
    count: number;
    items: { id: string; name: string }[];
  } | null;
  nextFreeWeekend: {
    start: string;
    end: string;
  } | null;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  color: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  city: string;
  forecast: {
    date: string;
    dayName: string;
    icon: string;
    color: string;
    tempMin: number;
    tempMax: number;
  }[];
}

// ─── Module state ─────────────────────────────────────────────────────
let container: HTMLElement;
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let currentHandoverNote: string | null = null;

// Třebenice coordinates (approximate)
const CABIN_LAT = 50.513;
const CABIN_LON = 14.001;

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const MONTH_NAMES_CZ = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

function formatWeekendRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}.\u2013${e.getDate()}. ${MONTH_NAMES_CZ[s.getMonth()]}`;
  }
  return `${s.getDate()}. ${MONTH_NAMES_CZ[s.getMonth()]} \u2013 ${e.getDate()}. ${MONTH_NAMES_CZ[e.getMonth()]}`;
}

function nightsLabel(from: string, to: string): string {
  const d1 = new Date(from + 'T00:00:00');
  const d2 = new Date(to + 'T00:00:00');
  const nights = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  if (nights <= 0) return '1 noc';
  if (nights === 1) return '1 noc';
  if (nights < 5) return `${nights} noci`;
  return `${nights} nocí`;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'právě teď';
  if (mins < 60) return `před ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `před ${hours} hod`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'včera';
  if (days < 7) return `před ${days} dny`;
  return formatDate(dateStr.split('T')[0]);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Dobrou noc';
  if (hour < 12) return 'Dobré ráno';
  if (hour < 18) return 'Dobré odpoledne';
  return 'Dobrý večer';
}

function getWeatherIcon(iconCode: string): string {
  const map: Record<string, string> = {
    '01d': 'fa-sun', '01n': 'fa-moon',
    '02d': 'fa-cloud-sun', '02n': 'fa-cloud-moon',
    '03d': 'fa-cloud', '03n': 'fa-cloud',
    '04d': 'fa-clouds', '04n': 'fa-clouds',
    '09d': 'fa-cloud-showers-heavy', '09n': 'fa-cloud-showers-heavy',
    '10d': 'fa-cloud-sun-rain', '10n': 'fa-cloud-moon-rain',
    '11d': 'fa-bolt', '11n': 'fa-bolt',
    '13d': 'fa-snowflake', '13n': 'fa-snowflake',
    '50d': 'fa-smog', '50n': 'fa-smog',
  };
  return map[iconCode] || 'fa-cloud';
}

// ─── Weather fetch (OpenWeatherMap free tier) ─────────────────────────

async function fetchWeather(): Promise<WeatherData | null> {
  try {
    // Using open-meteo (no API key needed)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CABIN_LAT}&longitude=${CABIN_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Prague&forecast_days=4`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current;
    const daily = data.daily;

    // Map WMO weather codes to descriptions and icons
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 6;
    const weatherInfo = mapWMOCode(current.weather_code, isNight);

    const forecast = [];
    // Start from index 1 (tomorrow) to 3
    for (let i = 1; i <= 3; i++) {
      if (daily.time[i]) {
        const dateObj = new Date(daily.time[i]);
        const dayName = dateObj.toLocaleDateString('cs-CZ', { weekday: 'short' });
        const fInfo = mapWMOCode(daily.weather_code[i], false); // forecast always daytime
        forecast.push({
          date: daily.time[i],
          dayName: dayName,
          icon: fInfo.icon,
          color: fInfo.color,
          tempMin: Math.round(daily.temperature_2m_min[i]),
          tempMax: Math.round(daily.temperature_2m_max[i])
        });
      }
    }

    return {
      temp: Math.round(current.temperature_2m),
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      color: weatherInfo.color,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      feelsLike: Math.round(current.apparent_temperature),
      city: 'Třebenice',
      forecast
    };
  } catch {
    return null;
  }
}

function mapWMOCode(code: number, isNight = false): { description: string; icon: string; color: string } {
  // Night: swap sun → moon, cloud-sun → cloud-moon
  const sun = isNight ? 'fa-moon' : 'fa-sun';
  const cloudSun = isNight ? 'fa-cloud-moon' : 'fa-cloud-sun';
  const rainSun = isNight ? 'fa-cloud-moon-rain' : 'fa-cloud-sun-rain';

  // Colors per condition
  const COL_SUN = isNight ? '#c0c8d8' : '#f59e0b';  // silver night / amber day
  const COL_CLOUD_SUN = isNight ? '#94a3b8' : '#f0ab1f';  // gray-silver / warm yellow
  const COL_CLOUD = '#94a3b8';   // neutral gray
  const COL_FOG = '#b0b8c4';   // light gray-blue
  const COL_DRIZZLE = '#7ab5d8';   // muted blue
  const COL_RAIN = '#4a90c4';   // medium blue
  const COL_SNOW = '#a8c8f0';   // icy light blue
  const COL_SHOWER = '#60a5fa';   // bright blue
  const COL_THUNDER = '#f97316';   // vivid orange

  if (code === 0) return { description: 'Jasno', icon: sun, color: COL_SUN };
  if (code <= 2) return { description: 'Polojasno', icon: cloudSun, color: COL_CLOUD_SUN };
  if (code === 3) return { description: 'Zataženo', icon: 'fa-cloud', color: COL_CLOUD };
  if (code <= 49) return { description: 'Mlha', icon: 'fa-smog', color: COL_FOG };
  if (code <= 59) return { description: 'Mrholení', icon: 'fa-cloud-drizzle', color: COL_DRIZZLE };
  if (code <= 69) return { description: 'Déšť', icon: 'fa-cloud-showers-heavy', color: COL_RAIN };
  if (code <= 79) return { description: 'Sněžení', icon: 'fa-snowflake', color: COL_SNOW };
  if (code <= 84) return { description: 'Přeháňky', icon: rainSun, color: COL_SHOWER };
  if (code <= 94) return { description: 'Sněhové přeháňky', icon: 'fa-snowflake', color: COL_SNOW };
  if (code <= 99) return { description: 'Bouřka', icon: 'fa-bolt', color: COL_THUNDER };
  return { description: 'Neznámé', icon: 'fa-cloud', color: COL_CLOUD };
}

// ─── Template ─────────────────────────────────────────────────────────

const ANIMAL_EMOJIS = ['🦊', '🐻', '🐸', '🐰', '🐯', '🦁', '🐼', '🐨', '🦉', '🦄', '🦖', '🐢', '🐙', '🦋', '🐞', '🐌', '🐶', '🐱'];

function getTemplate(): string {
  return `
  <div class="dashboard nordic-dashboard">
    <!-- Essential items warning banner -->
    <div id="dashboard-essential-warning" class="essential-warning-banner hidden"></div>

    <!-- Cards Layout -->
    <div class="dashboard-grid">
      <!-- Karta 1: Právě na chatě -->
      <div class="glass-card status-card" id="dashboard-active-reservation">
        <div class="card-body-full">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Karta 2: Počasí na chatě -->
      <div class="glass-card weather-card" id="dashboard-weather">
        <div class="card-body-full">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Karta 3: K dokoupení -->
      <div class="glass-card">
        <div class="card-body-full" id="dashboard-shopping">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Karta 5: Vzkaz -->
      <div class="glass-card dashboard-handover-card" id="dashboard-handover-note">
        <div class="card-body-full">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Vzkaz -->
  <div id="handover-modal" class="modal-overlay hidden">
    <div class="modal-content handover-modal-content">
      <div class="modal-header">
        <h2>Vzkaz</h2>
        <button class="modal-close-button" id="btn-handover-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p class="modal-subtitle">Zanechte vzkaz pro ostatní návštěvníky (max 300 znaků).</p>
        <textarea id="handover-modal-textarea" class="handover-textarea" maxlength="300"
          placeholder="Napište vzkaz…" rows="5"></textarea>
        <div class="handover-char-counter"><span id="handover-modal-char-count">0</span>/300</div>
      </div>
      <div class="modal-buttons">
        <button class="button-secondary" id="btn-handover-modal-cancel">Zrušit</button>
        <button class="button-primary" id="btn-handover-modal-save">Uložit vzkaz</button>
      </div>
    </div>
  </div>
  
  <!-- Modal: Odjezdový protokol -->
  <div id="departure-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Odjezdový protokol</h2>
        <button class="modal-close" id="close-departure-modal">&times;</button>
      </div>
      <div class="modal-body">
        <p class="modal-subtitle">Před odjezdem, prosím, zkontrolujte:</p>
        <div class="departure-checklist">
          <label class="checklist-item"><input type="checkbox" /> Vypnuto a vypuštěno topení/voda</label>
          <label class="checklist-item"><input type="checkbox" /> Zavřené okenice</label>
          <label class="checklist-item"><input type="checkbox" /> Vybraný popel z kamen</label>
          <label class="checklist-item"><input type="checkbox" /> Vyprázdněná lednice</label>
          <label class="checklist-item"><input type="checkbox" /> Zamčeno</label>
        </div>
        <div class="form-group" style="margin-top: 15px;">
          <label>Vzkaz dalšímu návštěvníkovi (a na nástěnku):</label>
          <textarea id="departure-note" class="form-control" rows="3" placeholder="Např.: Vše ok, dřevo je připravené pod plachtou..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="button-primary" id="btn-submit-departure" style="width: 100%;">
          Odeslat a uzavřít pobyt
        </button>
      </div>
    </div>
  </div>`;
}

// ─── Render helpers ───────────────────────────────────────────────────

function renderWeather(weather: WeatherData | null): void {
  const el = document.getElementById('dashboard-weather');
  if (!el) return;

  if (!weather) {
    el.innerHTML = `
      <div class="card-body-full empty-state-card">
        <i class="fas fa-cloud-slash empty-icon-duotone"></i>
        <p class="empty-text">Nepodařilo se načíst počasí</p>
      </div>`;
    return;
  }

  // Set gradient based on weather — removed, using unified glass card
  // el.style.background = gradient;

  const forecastHtml = weather.forecast && weather.forecast.length > 0 ? `
    <div class="weather-divider"></div>
    <div class="weather-forecast">
      ${weather.forecast.map(f => `
        <div class="forecast-day">
          <span class="forecast-day-name">${f.dayName}</span>
          <i class="fas ${f.icon} forecast-icon" style="color:${f.color}"></i>
          <div class="forecast-temps">${f.tempMax}°<span>/ ${f.tempMin}°</span></div>
        </div>
      `).join('')}
    </div>
  ` : '';

  el.innerHTML = `
    <div class="card-body-full">
      <div class="weather-main">
        <div class="weather-current">
          <i class="fas ${weather.icon} weather-icon-large" style="color:${weather.color}"></i>
          <div class="weather-temp-box">
            <span class="weather-temp">${weather.temp}°C</span>
            <span class="weather-desc">${weather.description}</span>
          </div>
        </div>
        <div class="weather-details">
          <div class="weather-detail-item">Pocitově <strong>${weather.feelsLike}°</strong></div>
          <div class="weather-detail-item">Vlhkost <strong>${weather.humidity}%</strong></div>
          <div class="weather-detail-item">Vítr <strong>${weather.windSpeed} km/h</strong></div>
        </div>
      </div>
      ${forecastHtml}
    </div>`;
}

function renderActiveReservation(data: DashboardData): void {
  const el = document.getElementById('dashboard-active-reservation');
  if (!el) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const active = data.activeReservation;

  // Odvoz nextReservation z upcomingReservations (první, která není aktivní)
  const nextRes = active
    ? data.upcomingReservations.find(r => r.id !== active.id) ?? null
    : data.upcomingReservations[0] ?? null;

  // Free weekend hint (shown in all states)
  const freeWeekendHtml = data.nextFreeWeekend
    ? `<div class="next-free-weekend"><span class="free-weekend-dot"></span> Nejbližší volný víkend: <strong>${formatWeekendRange(data.nextFreeWeekend.start, data.nextFreeWeekend.end)}</strong></div>`
    : '';

  if (active) {
    // ── Stav C: Chata obsazena ────────────────────────────────────────
    const departingToday = active.to === todayStr;
    const avatarContent = active.userAnimalIcon ?? active.username.charAt(0).toUpperCase();
    const avatarStyle = active.userAnimalIcon
      ? 'background:rgba(255,255,255,0.35)'
      : `background:${active.userColor || '#ea580c'}`;

    const title = departingToday
      ? `Dnes odjíždí ${active.username}`
      : `Obsazeno — ${active.username}`;
    const subtitle = departingToday
      ? `Rezervace do ${formatDate(active.to)} · ${active.purpose}`
      : `Do ${formatDate(active.to)} · ${active.purpose}`;

    const nextHint = nextRes
      ? `<div class="status-next-hint">Dále: ${nextRes.username} · ${formatDateShort(nextRes.from)} — ${formatDateShort(nextRes.to)}</div>`
      : '';

    el.className = 'glass-card status-card is-occupied';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-split-row">
          <div class="status-avatar-block" style="${avatarStyle}">${avatarContent}</div>
          <div class="status-text-block">
            <div class="status-label">Stav chaty</div>
            <div class="status-name">${title}</div>
            <div class="status-dates">${subtitle}</div>
          </div>
        </div>
        ${nextHint}
        <div class="status-cta-row">
          ${freeWeekendHtml}
          <a href="#/reservations" class="status-cta status-cta-neutral">Kalendář rezervací</a>
        </div>
      </div>`;

  } else if (nextRes) {
    // ── Stav B: Volná, ale existuje příští rezervace ──────────────────
    const days = daysUntil(nextRes.from);
    const daysChip = days === 0 ? 'dnes' : days === 1 ? 'zítra' : `za ${days} d.`;
    const statusBadge = nextRes.status === 'soft'
      ? ' <span class="res-status-badge res-badge-soft">Předběžná</span>'
      : nextRes.status === 'backup'
        ? ' <span class="res-status-badge res-badge-backup">Záložní</span>'
        : '';

    el.className = 'glass-card status-card is-free';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-split-row">
          <div class="status-avatar-block" style="background:#059669">
            <i class="fas fa-house-chimney" style="font-size:24px;color:#fff"></i>
          </div>
          <div class="status-text-block">
            <div class="status-label">Stav chaty</div>
            <div class="status-name">Volná!</div>
            <div class="status-dates">Další pobyt: ${nextRes.username}${statusBadge} · ${formatDateShort(nextRes.from)} — ${formatDateShort(nextRes.to)}</div>
          </div>
          <span class="upcoming-days-chip">${daysChip}</span>
        </div>
        <div class="status-cta-row">
          ${freeWeekendHtml}
          <a href="#/reservations" class="status-cta status-cta-neutral">Kalendář rezervací</a>
        </div>
      </div>`;

  } else {
    // ── Stav A: Volná, nic neplánováno ───────────────────────────────
    el.className = 'glass-card status-card is-free is-available';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-split-row">
          <div class="status-avatar-block" style="background:#059669">
            <i class="fas fa-house-chimney" style="font-size:24px;color:#fff"></i>
          </div>
          <div class="status-text-block">
            <div class="status-label">Stav chaty</div>
            <div class="status-name">Volná!</div>
            <div class="status-dates">Žádný plánovaný pobyt. Ideální čas vyrazit.</div>
          </div>
        </div>
        <div class="status-cta-row">
          ${freeWeekendHtml}
          <button class="status-cta status-cta-primary" id="btn-go-reserve">
            + Zarezervovat termín
          </button>
        </div>
      </div>`;
    document.getElementById('btn-go-reserve')
      ?.addEventListener('click', () => navigate('/reservations'));
  }
}

function renderShopping(items: PendingShoppingItem[], totalCount: number): void {
  const el = document.getElementById('dashboard-shopping');
  if (!el) return;

  const header = `
    <div class="dashboard-card-header">
      <span class="dashboard-card-header-title">K nakoupení</span>
      <a href="#/shopping" class="dashboard-card-header-link">Seznamy →</a>
    </div>`;

  if (totalCount === 0) {
    el.innerHTML = `
      ${header}
      <div class="empty-state-card">
        <i class="fas fa-check-circle empty-icon-duotone" style="color:#10b981;opacity:0.4"></i>
        <p class="empty-text">Na chatě nic nechybí!</p>
        <a href="#/shopping" class="empty-cta">Nový seznam</a>
      </div>`;
    return;
  }

  const shownItems = items.slice(0, 5);
  const remaining = totalCount - shownItems.length;

  const itemsHtml = shownItems.map(item => {
    const essentialMark = item.isEssential ? '<span class="shopping-essential-mark" title="Nutné">❗</span>' : '';
    return `
      <label class="dashboard-shopping-item">
        <input type="checkbox" class="shopping-item-check" data-list-id="${item.listId}" data-item-id="${item.id}" />
        <span class="shopping-item-name">${essentialMark}${item.name}</span>
        <span class="shopping-item-list">${item.listName}</span>
      </label>`;
  }).join('');

  const moreHtml = remaining > 0
    ? `<a href="#/shopping" class="shopping-widget-more">+ ${remaining} dalších položek →</a>`
    : '';

  el.innerHTML = `
    ${header}
    <div class="list-content shopping-widget-list">${itemsHtml}</div>
    ${moreHtml}`;

  // Bind checkbox clicks with optimistic update
  el.querySelectorAll<HTMLInputElement>('.shopping-item-check').forEach(cb => {
    cb.addEventListener('change', async () => {
      const listId = cb.dataset.listId!;
      const itemId = cb.dataset.itemId!;
      const purchased = cb.checked;
      const labelEl = cb.closest('label');

      // Optimistic: dim the item
      if (labelEl) labelEl.style.opacity = '0.4';

      const result = await authFetch<{ id: string }>(
        `/api/shopping-lists/${listId}/items/${itemId}`,
        { method: 'PUT', body: JSON.stringify({ purchased }) }
      );

      if (result) {
        // Remove item from list (it's now purchased)
        if (labelEl) {
          labelEl.style.transition = 'opacity 0.3s';
          labelEl.style.opacity = '0';
          setTimeout(() => {
            labelEl.remove();
            // Pokud nezbyly žádné položky → zobraz empty state
            const list = el.querySelector('.shopping-widget-list');
            if (list && list.querySelectorAll('label').length === 0) {
              el.innerHTML = `
                <div class="dashboard-card-header">
                  <span class="dashboard-card-header-title">K nakoupení</span>
                  <a href="#/shopping" class="dashboard-card-header-link">Seznamy →</a>
                </div>
                <div class="empty-state-card">
                  <i class="fas fa-check-circle empty-icon-duotone" style="color:#10b981;opacity:0.4"></i>
                  <p class="empty-text">Na chatě nic nechybí!</p>
                  <a href="#/shopping" class="empty-cta">Nový seznam</a>
                </div>`;
            }
          }, 300);
        }
      } else {
        // Rollback
        cb.checked = !purchased;
        if (labelEl) labelEl.style.opacity = '1';
      }
    });
  });
}

// ─── Vzkaz na lednici ─────────────────────────────────────────────────

// Inicializuje listenery modalu JEDNOU — voláno z mount()
function initHandoverModal(): void {
  const modal = document.getElementById('handover-modal');
  const textarea = document.getElementById('handover-modal-textarea') as HTMLTextAreaElement | null;
  const charCount = document.getElementById('handover-modal-char-count');
  const saveBtn = document.getElementById('btn-handover-modal-save') as HTMLButtonElement | null;

  if (!modal || !textarea || !saveBtn) return;

  // Char counter
  textarea.addEventListener('input', () => {
    if (charCount) charCount.textContent = String(textarea.value.length);
  });

  // Escape zavírá
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });

  // Klik mimo modal zavírá
  modal.addEventListener('click', (e: MouseEvent) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  document.getElementById('btn-handover-modal-close')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('btn-handover-modal-cancel')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Uložit — listener JEDNOU, bez { once: true }
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    const newText = textarea.value;

    const result = await authFetch<{ pinnedHandoverNote: string | null }>(
      '/api/workspace/handover-note',
      { method: 'PATCH', body: JSON.stringify({ note: newText }) }
    );

    if (result) {
      showToast('Vzkaz uložen', 'success');
      modal.classList.add('hidden');
      renderHandoverNote(result.pinnedHandoverNote);
    }
    saveBtn.disabled = false;
  });
}

function renderHandoverNote(note: string | null): void {
  currentHandoverNote = note;
  const el = document.getElementById('dashboard-handover-note');
  if (!el) return;

  const role = getRole();
  const isGuest = role === 'guest';

  // ── Render karta (read-only) ──────────────────────────────────
  const noteText = note?.trim() || '';
  const displayHtml = noteText
    ? `<p class="handover-note-text">${noteText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`
    : `<p class="handover-note-empty">${isGuest ? 'Zatím žádný vzkaz.' : 'Žádný vzkaz — klikněte na tužku a napište.'}</p>`;

  const editBtnHtml = isGuest ? '' : `
    <button class="handover-edit-btn" id="btn-edit-handover" title="Upravit vzkaz">✎</button>`;

  el.innerHTML = `
    <div class="card-body-full handover-card-content">
      <div class="dashboard-card-header">
        <span class="dashboard-card-header-title">Vzkaz</span>
        ${editBtnHtml}
      </div>
      ${displayHtml}
    </div>`;

  if (isGuest) return;

  // ── Otevřít modal ─────────────────────────────────────────────
  document.getElementById('btn-edit-handover')?.addEventListener('click', () => {
    const modal = document.getElementById('handover-modal');
    const textarea = document.getElementById('handover-modal-textarea') as HTMLTextAreaElement | null;
    const charCount = document.getElementById('handover-modal-char-count');
    const saveBtn = document.getElementById('btn-handover-modal-save') as HTMLButtonElement | null;
    if (!modal || !textarea) return;

    // Nastav aktuální text + reset stavu tlačítka
    textarea.value = currentHandoverNote?.trim() || '';
    if (charCount) charCount.textContent = String(textarea.value.length);
    if (saveBtn) saveBtn.disabled = false;
    modal.classList.remove('hidden');
    textarea.focus();
  });
}



// ─── Essential items warning ──────────────────────────────────────────

function renderEssentialWarning(warning: DashboardData['essentialWarning']): void {
  const el = document.getElementById('dashboard-essential-warning');
  if (!el) return;

  if (!warning || warning.count === 0) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }

  // Zobrazíme maximálně 5 položek, zbytek shrneme
  const itemNames = warning.items.slice(0, 5).map(i => i.name).join(', ');
  const remaining = warning.items.length > 5 ? ` a ${warning.items.length - 5} dalších` : '';

  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="essential-warning-content">
      <div class="essential-warning-text">
        <span class="essential-warning-icon"></span>
        <div class="essential-warning-message-block">
          <span class="essential-warning-message">Na chatě chybí a čekají na dokoupení důležité položky:</span>
          <span class="essential-warning-items">${itemNames}${remaining}.</span>
        </div>
      </div>
      <button class="btn-alert" id="btn-go-shopping">Otevřít nákupy</button>
    </div>`;

  document.getElementById('btn-go-shopping')?.addEventListener('click', () => {
    navigate('/shopping');
  });
}

// ─── Data loading ─────────────────────────────────────────────────────

async function loadDashboard(): Promise<void> {
  // Load weather and dashboard data in parallel
  const [weather, data] = await Promise.all([
    fetchWeather(),
    authFetch<DashboardData>('/api/dashboard'),
  ]);

  renderWeather(weather);

  if (!data) {
    // Fallback: API selhalo
    const statusCard = document.getElementById('dashboard-active-reservation');
    if (statusCard) {
      statusCard.innerHTML = `
        <div class="card-body-full status-content">
          <div class="status-split-row">
            <div class="status-avatar-block" style="background:#9ca3af">
              <i class="fas fa-exclamation" style="font-size:24px;color:#fff"></i>
            </div>
            <div class="status-text-block">
              <div class="status-label">Stav chaty</div>
              <div class="status-name">Neznámý</div>
              <div class="status-dates">Nepodařilo se načíst data.</div>
            </div>
          </div>
          <div class="status-cta-row">
            <button class="status-cta status-cta-neutral" id="btn-retry-dashboard">Zkusit znovu</button>
          </div>
        </div>`;
      document.getElementById('btn-retry-dashboard')?.addEventListener('click', loadDashboard);
    }
    return;
  }

  renderActiveReservation(data);

  // Departure mode hook
  if (data.departingToday) {
    initDepartureMode();
  }

  renderShopping(data.pendingShoppingItems, data.totalPendingShoppingCount);
  renderHandoverNote(data.pinnedHandoverNote);
  renderEssentialWarning(data.essentialWarning);
}

// ─── Departure Mode ───────────────────────────────────────────────────

function initDepartureMode(): void {
  // Přidáme nápadný banner nad kalendář nebo mezi sekce (nebo využijeme modál)
  const appNav = document.querySelector('.dashboard-grid');
  if (appNav && !document.getElementById('departure-banner')) {
    const banner = document.createElement('div');
    banner.id = 'departure-banner';
    banner.className = 'glass-card status-card';
    banner.style.gridColumn = '1 / -1'; // roztáhnout přes celou šířku
    banner.style.background = 'linear-gradient(135deg, rgba(254, 240, 138, 0.9), rgba(253, 224, 71, 0.8))';
    banner.style.borderColor = '#eab308';

    banner.innerHTML = `
      <div class="card-body-full">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:15px; align-items:center;">
             <div style="background:#ca8a04; color:white; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:26px;">
               ⏱
             </div>
             <div>
               <h3 style="margin:0; font-size:1.1rem; color:#854d0e;">Dnes odjíždíte!</h3>
               <p style="margin:4px 0 0 0; color:#a16207; font-size:0.9rem;">Nezapomeňte vyplnit odjezdový protokol a nechat vzkaz.</p>
             </div>
          </div>
          <button id="btn-open-departure" class="button-primary" style="background:#ca8a04; border:none; box-shadow:none;">
            Vyplnit protokol
          </button>
        </div>
      </div>
    `;
    // Vložit hned na začátek gridu
    appNav.insertBefore(banner, appNav.firstChild);

    // Event listenery pro modal
    document.getElementById('btn-open-departure')?.addEventListener('click', () => {
      document.getElementById('departure-modal')?.classList.remove('hidden');
    });

    document.getElementById('close-departure-modal')?.addEventListener('click', () => {
      document.getElementById('departure-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-submit-departure')?.addEventListener('click', async () => {
      const noteInput = document.getElementById('departure-note') as HTMLTextAreaElement;

      const note = noteInput.value.trim();
      let fullMessage = '**Odjezd z chaty:**\n';
      const checkboxes = document.querySelectorAll('.departure-checklist input[type="checkbox"]');

      let allChecked = true;
      checkboxes.forEach((cb: any) => {
        const label = cb.parentElement.innerText.trim();
        if (cb.checked) {
          fullMessage += `- [x] ${label}\n`;
        } else {
          fullMessage += `- [ ] ${label}\n`;
          allChecked = false;
        }
      });

      if (!allChecked) {
        if (!confirm('Některé položky nejsou odškrtnuté. Opravdu chcete protokol odeslat?')) {
          return;
        }
      }

      if (note) {
        fullMessage += `\n**Vzkaz:** ${note}`;
      }

      try {
        const res = await authFetch('/api/notes', {
          method: 'POST',
          body: JSON.stringify({ message: fullMessage })
        });
        if (res) {
          document.getElementById('departure-modal')?.classList.add('hidden');
          banner.remove(); // odstranit banner po odeslání
          loadDashboard(); // refresh
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
}

// ─── Module state ─────────────────────────────────────────────────────

// ─── Page module ──────────────────────────────────────────────────────

const page: PageModule = {
  async mount(el) {
    container = el;
    container.innerHTML = getTemplate();
    initHandoverModal();
    loadDashboard();

    // Auto-refresh every 5 minutes
    refreshInterval = setInterval(loadDashboard, 5 * 60 * 1000);
  },
  unmount() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  },
};

export default page;
