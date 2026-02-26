/* ============================================================================
   pages/dashboard.ts — Přehled (Dashboard) — hlavní stránka po přihlášení
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { authFetch } from '../lib/common';
import { navigate } from '../lib/router';

// ─── Types ────────────────────────────────────────────────────────────

interface ShoppingListWidget {
  id: string;
  name: string;
  pendingItems: { id: string; name: string }[];
  totalCount: number;
  doneCount: number;
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
  shoppingListWidget: ShoppingListWidget | null;
  latestNotes: {
    id: string;
    username: string;
    message: string;
    createdAt: string;
  }[];
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

      <!-- Karta 3: Nadcházející rezervace -->
      <div class="glass-card">
        <div class="card-body-full" id="dashboard-reservations">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Karta 4: K dokoupení -->
      <div class="glass-card">
        <div class="card-body-full" id="dashboard-shopping">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>
    </div>

    <!-- Karta 5: Co se děje na chatě (nástěnka) -->
    <div class="glass-card dashboard-notes-card" id="dashboard-notes">
      <div class="card-body-full">
        <div class="spinner-container"><div class="spinner"></div></div>
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

  // Set gradient based on weather
  let gradient = 'linear-gradient(135deg, rgba(240, 249, 255, 0.9), rgba(224, 242, 254, 0.85))'; // default clear
  if (weather.icon.includes('rain') || weather.icon.includes('showers')) {
    gradient = 'linear-gradient(135deg, rgba(226, 232, 240, 0.9), rgba(203, 213, 225, 0.85))'; // rain
  } else if (weather.icon.includes('sun')) {
    gradient = 'linear-gradient(135deg, rgba(254, 252, 232, 0.9), rgba(254, 240, 138, 0.85))'; // sun
  } else if (weather.icon.includes('cloud')) {
    gradient = 'linear-gradient(135deg, rgba(241, 245, 249, 0.9), rgba(226, 232, 240, 0.85))'; // clouds
  }
  el.style.background = gradient;

  const forecastHtml = weather.forecast && weather.forecast.length > 0 ? `
    <div class="weather-divider"></div>
    <div class="weather-forecast">
      ${weather.forecast.map(f => `
        <div class="forecast-day">
          <span class="forecast-day-name">${f.dayName}</span>
          <i class="fas ${f.icon} forecast-icon" style="color:${f.color}"></i>
          <div class="forecast-temps">${f.tempMax}°<span>${f.tempMin}°</span></div>
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

  if (data.activeReservation) {
    const r = data.activeReservation;
    el.className = 'glass-card status-card is-occupied';
    const avatarContent = r.userAnimalIcon ?? r.username.charAt(0).toUpperCase();
    const avatarStyle = r.userAnimalIcon
      ? 'background:rgba(255,255,255,0.35)'
      : `background:${r.userColor || '#6b7280'}`;
    // Remaining days
    const daysLeft = daysUntil(r.to);
    const daysLeftLabel = daysLeft === 0 ? 'Odjezd dnes'
      : daysLeft === 1 ? 'Ještě 1 den' : `Ještě ${daysLeft} ${daysLeft < 5 ? 'dny' : 'dní'}`;
    // Handover note
    const handoverHtml = r.handoverNote
      ? `<div class="status-handover">${r.handoverNote}</div>`
      : '';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-split-row">
          <div class="status-avatar-block" style="${avatarStyle}">${avatarContent}</div>
          <div class="status-text-block">
            <div class="status-label">Právě na chatě</div>
            <div class="status-name">${r.username}</div>
            <div class="status-dates">${formatDate(r.from)} — ${formatDate(r.to)} · ${r.purpose}</div>
            <div class="status-remaining">${daysLeftLabel}</div>
          </div>
        </div>
        ${handoverHtml}
        <div class="status-cta-row">
          <a href="#/reservations" class="status-cta status-cta-neutral">
            Zobrazit kalendář
          </a>
        </div>
      </div>`;

  } else if (data.myNextReservation) {
    const days = daysUntil(data.myNextReservation.from);
    const daysLabel = days === 1 ? 'den' : days < 5 && days > 0 ? 'dny' : 'dní';
    el.className = 'glass-card status-card is-free';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-split-row">
          <div class="status-avatar-block" style="background:#059669">
            <span style="font-size:28px">✓</span>
          </div>
          <div class="status-text-block">
            <div class="status-label">Tvoje příští návštěva</div>
            <div class="status-name">Za ${days} ${daysLabel}</div>
            <div class="status-dates">${formatDate(data.myNextReservation.from)} — ${formatDate(data.myNextReservation.to)}</div>
          </div>
        </div>
        <div class="status-cta-row">
          <a href="#/reservations" class="status-cta status-cta-neutral">
            Upravit rezervaci
          </a>
        </div>
      </div>`;

  } else {
    el.className = 'glass-card status-card is-free is-available';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-split-row">
          <div class="status-avatar-block" style="background:#10b981">
            <span style="font-size:32px">●</span>
          </div>
          <div class="status-text-block">
            <div class="status-label">Stav chaty</div>
            <div class="status-name">Volná!</div>
            <div class="status-dates">Žádná plánovaná rezervace</div>
          </div>
        </div>
        <div class="status-cta-row">
          <button class="status-cta status-cta-primary" id="btn-go-reserve">
            + Zarezervovat termín
          </button>
        </div>
      </div>`;
    document.getElementById('btn-go-reserve')
      ?.addEventListener('click', () => navigate('/reservations'));
  }
}

function renderUpcoming(reservations: DashboardData['upcomingReservations']): void {
  const el = document.getElementById('dashboard-reservations');
  if (!el) return;

  const header = `
    <div class="dashboard-card-header">
      <span class="dashboard-card-header-title">
        Nadcházející rezervace
      </span>
      ${reservations.length > 0 ? '<a href="#/reservations" class="dashboard-card-header-link">Všechny →</a>' : ''}
    </div>`;

  if (reservations.length === 0) {
    el.innerHTML = `
      ${header}
      <div class="empty-state-card">
        <i class="fas fa-calendar-alt empty-icon-duotone" style="color:#9ca3af;opacity:0.4"></i>
        <p class="empty-text">Žádné plánované pobyty</p>
        <a href="#/reservations" class="empty-cta">+ Naplánovat pobyt</a>
      </div>`;
    return;
  }

  const toShow = reservations.slice(0, 3);
  el.innerHTML = `
    ${header}
    <div class="list-content">
      ${toShow.map((r) => {
    const avatarContent = r.userAnimalIcon
      ? `<span style="font-size:18px">${r.userAnimalIcon}</span>`
      : r.username.charAt(0).toUpperCase();
    const avatarBg = r.userAnimalIcon
      ? 'background:rgba(0,0,0,0.05)'
      : `background:${r.userColor || '#808080'}`;
    const days = daysUntil(r.from);
    const daysChip = days === 0 ? 'dnes' : days === 1 ? 'zítra' : `za ${days} d.`;
    const statusBadge = r.status === 'soft'
      ? ' <span class="res-status-badge res-badge-soft">Předběžná</span>'
      : r.status === 'backup'
        ? ' <span class="res-status-badge res-badge-backup">Záložní</span>'
        : '';
    const nights = nightsLabel(r.from, r.to);
    return `
          <div class="list-item">
            <div class="list-item-icon" style="${avatarBg}">${avatarContent}</div>
            <div class="list-item-content">
              <div class="list-item-title">${r.username}${statusBadge}</div>
              <div class="list-item-subtitle">${formatDateShort(r.from)} — ${formatDateShort(r.to)} · ${nights} · ${r.purpose}</div>
            </div>
            <span class="upcoming-days-chip">${daysChip}</span>
          </div>`;
  }).join('')}
    </div>`;
}

function renderShopping(widget: ShoppingListWidget | null): void {
  const el = document.getElementById('dashboard-shopping');
  if (!el) return;

  const header = `
    <div class="dashboard-card-header">
      <span class="dashboard-card-header-title">
        K nakoupení
      </span>
      <a href="#/shopping" class="dashboard-card-header-link">Seznamy →</a>
    </div>`;

  if (!widget || widget.totalCount === 0) {
    el.innerHTML = `
      ${header}
      <div class="empty-state-card">
        <i class="fas fa-check-circle empty-icon-duotone" style="color:#10b981;opacity:0.4"></i>
        <p class="empty-text">Na chatě nic nechybí!</p>
        <a href="#/shopping" class="empty-cta">+ Nový seznam</a>
      </div>`;
    return;
  }

  const pendingCount = widget.totalCount - widget.doneCount;
  const progressPct = widget.totalCount > 0
    ? Math.round((widget.doneCount / widget.totalCount) * 100)
    : 0;
  const allDone = pendingCount === 0;

  const itemsHtml = allDone
    ? `<div class="shopping-done-msg">Vše nakoupeno!</div>`
    : widget.pendingItems.map(item => `
        <div class="list-item" style="padding:5px 0;border-bottom:none;gap:10px">
          <div style="width:6px;height:6px;border-radius:50%;background:#d1d5db;flex-shrink:0;margin-top:8px"></div>
          <div class="list-item-content">
            <div class="list-item-title" style="font-weight:500">${item.name}</div>
          </div>
        </div>`).join('')
    + (pendingCount > widget.pendingItems.length
      ? `<div class="shopping-widget-more">+${pendingCount - widget.pendingItems.length} dalších položek →</div>`
      : '');

  el.innerHTML = `
    ${header}
    <div class="shopping-list-name">${widget.name}</div>
    <div class="shopping-progress-wrap">
      <div class="shopping-progress-bar">
        <div class="shopping-progress-fill" style="width:${progressPct}%;background:${allDone ? '#10b981' : 'var(--color-primary)'}"></div>
      </div>
      <span class="shopping-progress-label">${widget.doneCount} / ${widget.totalCount}</span>
    </div>
    <div class="list-content shopping-widget-list">${itemsHtml}</div>`;
}



function renderNotes(notes: DashboardData['latestNotes']): void {
  const el = document.getElementById('dashboard-notes');
  if (!el) return;

  const header = `
    <div class="dashboard-card-header">
      <span class="dashboard-card-header-title">
        Co se děje na chatě
      </span>
      ${notes.length > 0 ? '<a href="#/notes" class="dashboard-card-header-link">Chat →</a>' : ''}
    </div>`;

  if (notes.length === 0) {
    el.innerHTML = `
      <div class="card-body-full">
        ${header}
        <div class="empty-state-card">
          <i class="fas fa-comment-slash empty-icon-duotone" style="color:#9ca3af;opacity:0.4"></i>
          <p class="empty-text">Zatím žádné zprávy</p>
          <a href="#/notes" class="empty-cta">+ Napsat první zprávu</a>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="card-body-full">
      ${header}
      <div class="dashboard-notes-feed">
        ${notes.map(n => {
    const avatarContent = (n as any).userAnimalIcon ?? n.username.charAt(0).toUpperCase();
    const avatarStyle = (n as any).userAnimalIcon
      ? 'background:rgba(0,0,0,0.05)'
      : `background:${(n as any).userColor || '#6b7280'}`;
    return `
            <div class="dashboard-note-item">
              <div class="note-avatar" style="${avatarStyle}">${avatarContent}</div>
              <div class="note-content">
                <div class="note-meta">
                  <span class="note-author">${n.username}</span>
                  <span class="note-time">${timeAgo(n.createdAt)}</span>
                </div>
                <p class="note-preview">${renderMarkdown(n.message)}</p>
              </div>
            </div>`;
  }).join('')}
      </div>
    </div>`;
}

// ─── Data loading ─────────────────────────────────────────────────────

async function loadDashboard(): Promise<void> {
  // Load weather and dashboard data in parallel
  const [weather, data] = await Promise.all([
    fetchWeather(),
    authFetch<DashboardData>('/api/dashboard'),
  ]);

  renderWeather(weather);

  if (data) {
    renderActiveReservation(data);

    // Departure mode hook
    if (data.departingToday) {
      initDepartureMode();
    }

    // Pokud je někdo na chatě, vyfiltruj jeho aktivní rezervaci z nadcházejících
    const upcoming = data.activeReservation
      ? data.upcomingReservations.filter(r => r.id !== data.activeReservation!.id)
      : data.upcomingReservations;
    renderUpcoming(upcoming);
    renderShopping(data.shoppingListWidget);
    renderNotes(data.latestNotes);
  }
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
