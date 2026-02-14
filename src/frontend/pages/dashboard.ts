/* ============================================================================
   pages/dashboard.ts — Přehled (Dashboard) — hlavní stránka po přihlášení
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { authFetch, getUsername } from '../lib/common';
import { navigate } from '../lib/router';

// ─── Types ────────────────────────────────────────────────────────────

interface DashboardData {
  activeReservation: {
    id: string;
    username: string;
    userColor: string;
    from: string;
    to: string;
    purpose: string;
  } | null;
  upcomingReservations: {
    id: string;
    userId: string;
    username: string;
    userColor: string;
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
  unpurchasedItems: {
    id: string;
    name: string;
    addedBy: string;
  }[];
  latestNotes: {
    id: string;
    username: string;
    message: string;
    createdAt: string;
  }[];
  recentDiary: {
    id: string;
    folderName: string;
    author: string;
    date: string;
    content: string;
  }[];
  stats: {
    totalReservations: number;
    totalPhotos: number;
    totalDiaryEntries: number;
    unpurchasedCount: number;
  };
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  city: string;
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CABIN_LAT}&longitude=${CABIN_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Europe/Prague`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current;

    // Map WMO weather codes to descriptions and icons
    const weatherInfo = mapWMOCode(current.weather_code);

    return {
      temp: Math.round(current.temperature_2m),
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      feelsLike: Math.round(current.apparent_temperature),
      city: 'Třebenice',
    };
  } catch {
    return null;
  }
}

function mapWMOCode(code: number): { description: string; icon: string } {
  if (code === 0) return { description: 'Jasno', icon: 'fa-sun' };
  if (code <= 3) return { description: 'Oblačno', icon: 'fa-cloud-sun' };
  if (code <= 49) return { description: 'Mlha', icon: 'fa-smog' };
  if (code <= 59) return { description: 'Mrholení', icon: 'fa-cloud-rain' };
  if (code <= 69) return { description: 'Déšť', icon: 'fa-cloud-showers-heavy' };
  if (code <= 79) return { description: 'Sněžení', icon: 'fa-snowflake' };
  if (code <= 84) return { description: 'Přeháňky', icon: 'fa-cloud-sun-rain' };
  if (code <= 94) return { description: 'Sněhové přeháňky', icon: 'fa-snowflake' };
  if (code <= 99) return { description: 'Bouřka', icon: 'fa-bolt' };
  return { description: 'Neznámé', icon: 'fa-cloud' };
}

// ─── Template ─────────────────────────────────────────────────────────

function getTemplate(): string {
  const username = getUsername() || 'uživateli';
  return `
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h1 class="dashboard-greeting">
        <i class="fas fa-home"></i>
        ${getGreeting()}, <strong>${username}</strong>!
      </h1>
      <p class="dashboard-subtitle">Zde je přehled vaší chaty</p>
    </div>

    <!-- Weather + Active reservation row -->
    <div class="dashboard-top-row">
      <!-- Weather card -->
      <div class="dashboard-card dashboard-weather-card">
        <div class="dashboard-card-header">
          <i class="fas fa-cloud-sun"></i>
          <span>Počasí na chatě</span>
        </div>
        <div id="dashboard-weather" class="dashboard-weather-content">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Active / next reservation -->
      <div class="dashboard-card dashboard-active-card">
        <div class="dashboard-card-header">
          <i class="fas fa-house-user"></i>
          <span>Právě na chatě</span>
        </div>
        <div id="dashboard-active-reservation" class="dashboard-active-content">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>
    </div>

    <!-- Main content grid -->
    <div class="dashboard-grid">
      <!-- Upcoming reservations -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <i class="fas fa-calendar-alt"></i>
          <span>Nadcházející rezervace</span>
        </div>
        <div id="dashboard-reservations" class="dashboard-card-body">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
        <div class="dashboard-card-footer">
          <a href="#/reservations" class="dashboard-link">
            <i class="fas fa-arrow-right"></i> Všechny rezervace
          </a>
        </div>
      </div>

      <!-- Shopping needs -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <i class="fas fa-shopping-cart"></i>
          <span>K dokoupení</span>
        </div>
        <div id="dashboard-shopping" class="dashboard-card-body">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
        <div class="dashboard-card-footer">
          <a href="#/reservations" class="dashboard-link">
            <i class="fas fa-arrow-right"></i> Nákupní seznamy
          </a>
        </div>
      </div>

      <!-- Latest notes -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <i class="fas fa-thumbtack"></i>
          <span>Poslední vzkazy</span>
        </div>
        <div id="dashboard-notes" class="dashboard-card-body">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
        <div class="dashboard-card-footer">
          <a href="#/notes" class="dashboard-link">
            <i class="fas fa-arrow-right"></i> Nástěnka
          </a>
        </div>
      </div>

      <!-- Recent diary -->
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <i class="fas fa-book-open"></i>
          <span>Deník</span>
        </div>
        <div id="dashboard-diary" class="dashboard-card-body">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
        <div class="dashboard-card-footer">
          <a href="#/diary" class="dashboard-link">
            <i class="fas fa-arrow-right"></i> Celý deník
          </a>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="dashboard-stats">
      <div class="dashboard-stat">
        <i class="fas fa-calendar-check"></i>
        <span class="dashboard-stat-value" id="stat-reservations">-</span>
        <span class="dashboard-stat-label">Rezervací</span>
      </div>
      <div class="dashboard-stat">
        <i class="fas fa-camera"></i>
        <span class="dashboard-stat-value" id="stat-photos">-</span>
        <span class="dashboard-stat-label">Fotek</span>
      </div>
      <div class="dashboard-stat">
        <i class="fas fa-pen-nib"></i>
        <span class="dashboard-stat-value" id="stat-diary">-</span>
        <span class="dashboard-stat-label">Zápisů</span>
      </div>
      <div class="dashboard-stat">
        <i class="fas fa-shopping-basket"></i>
        <span class="dashboard-stat-value" id="stat-shopping">-</span>
        <span class="dashboard-stat-label">Ke koupi</span>
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
      <div class="dashboard-empty">
        <i class="fas fa-cloud-slash"></i>
        <p>Nepodařilo se načíst počasí</p>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="weather-main">
      <div class="weather-temp">
        <i class="fas ${weather.icon} weather-icon"></i>
        <span class="weather-temp-value">${weather.temp}°C</span>
      </div>
      <div class="weather-desc">${weather.description}</div>
      <div class="weather-location">
        <i class="fas fa-map-marker-alt"></i> ${weather.city}
      </div>
    </div>
    <div class="weather-details">
      <div class="weather-detail">
        <i class="fas fa-temperature-low"></i>
        <span>Pocitově ${weather.feelsLike}°C</span>
      </div>
      <div class="weather-detail">
        <i class="fas fa-tint"></i>
        <span>Vlhkost ${weather.humidity}%</span>
      </div>
      <div class="weather-detail">
        <i class="fas fa-wind"></i>
        <span>Vítr ${weather.windSpeed} km/h</span>
      </div>
    </div>`;
}

function renderActiveReservation(data: DashboardData): void {
  const el = document.getElementById('dashboard-active-reservation');
  if (!el) return;

  if (data.activeReservation) {
    const r = data.activeReservation;
    el.innerHTML = `
      <div class="active-reservation">
        <div class="active-reservation-badge" style="background: ${r.userColor || '#E07A5F'}">
          <i class="fas fa-house-chimney"></i>
        </div>
        <div class="active-reservation-info">
          <strong>${r.username}</strong> je na chatě
          <div class="active-reservation-dates">
            ${formatDate(r.from)} — ${formatDate(r.to)}
          </div>
          ${r.purpose ? `<div class="active-reservation-purpose">${r.purpose}</div>` : ''}
        </div>
      </div>`;
  } else if (data.myNextReservation) {
    const days = daysUntil(data.myNextReservation.from);
    el.innerHTML = `
      <div class="active-reservation next-reservation">
        <div class="active-reservation-badge next" style="background: #E07A5F">
          <i class="fas fa-calendar-day"></i>
        </div>
        <div class="active-reservation-info">
          <strong>Tvoje příští návštěva</strong>
          <div class="active-reservation-dates">
            ${formatDate(data.myNextReservation.from)} — ${formatDate(data.myNextReservation.to)}
          </div>
          <div class="active-reservation-countdown">
            za <strong>${days}</strong> ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}
          </div>
        </div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="dashboard-empty">
        <i class="fas fa-house"></i>
        <p>Chata je momentálně volná</p>
        <a href="#/reservations" class="dashboard-empty-action">Zarezervovat</a>
      </div>`;
  }
}

function renderUpcoming(reservations: DashboardData['upcomingReservations']): void {
  const el = document.getElementById('dashboard-reservations');
  if (!el) return;

  if (reservations.length === 0) {
    el.innerHTML = `
      <div class="dashboard-empty">
        <i class="fas fa-calendar-plus"></i>
        <p>Žádné nadcházející rezervace</p>
      </div>`;
    return;
  }

  el.innerHTML = reservations.map((r) => {
    const days = daysUntil(r.from);
    const statusBadge = r.status === 'backup'
      ? '<span class="badge badge-backup">záloha</span>'
      : '';

    return `
    <div class="dashboard-list-item">
      <div class="dashboard-list-color" style="background: ${r.userColor || '#808080'}"></div>
      <div class="dashboard-list-content">
        <div class="dashboard-list-title">
          ${r.username} ${statusBadge}
        </div>
        <div class="dashboard-list-subtitle">
          ${formatDateShort(r.from)} — ${formatDateShort(r.to)}
          ${r.purpose ? `· ${r.purpose}` : ''}
        </div>
      </div>
      <div class="dashboard-list-badge">
        za ${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}
      </div>
    </div>`;
  }).join('');
}

function renderShopping(items: DashboardData['unpurchasedItems'], count: number): void {
  const el = document.getElementById('dashboard-shopping');
  if (!el) return;

  if (items.length === 0) {
    el.innerHTML = `
      <div class="dashboard-empty">
        <i class="fas fa-check-circle"></i>
        <p>Vše nakoupeno!</p>
      </div>`;
    return;
  }

  el.innerHTML = items.map((item) => `
    <div class="dashboard-list-item">
      <div class="dashboard-list-icon"><i class="fas fa-circle"></i></div>
      <div class="dashboard-list-content">
        <div class="dashboard-list-title">${item.name}</div>
        <div class="dashboard-list-subtitle">Přidal: ${item.addedBy}</div>
      </div>
    </div>
  `).join('') + (count > items.length
    ? `<div class="dashboard-list-more">a dalších ${count - items.length} položek…</div>`
    : '');
}

function renderNotes(notes: DashboardData['latestNotes']): void {
  const el = document.getElementById('dashboard-notes');
  if (!el) return;

  if (notes.length === 0) {
    el.innerHTML = `
      <div class="dashboard-empty">
        <i class="fas fa-sticky-note"></i>
        <p>Žádné vzkazy</p>
      </div>`;
    return;
  }

  el.innerHTML = notes.map((note) => `
    <div class="dashboard-list-item">
      <div class="dashboard-list-icon"><i class="fas fa-comment"></i></div>
      <div class="dashboard-list-content">
        <div class="dashboard-list-title">${note.username}</div>
        <div class="dashboard-list-subtitle">${note.message.substring(0, 80)}${note.message.length > 80 ? '…' : ''}</div>
        <div class="dashboard-list-meta">${timeAgo(note.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

function renderDiary(entries: DashboardData['recentDiary']): void {
  const el = document.getElementById('dashboard-diary');
  if (!el) return;

  if (entries.length === 0) {
    el.innerHTML = `
      <div class="dashboard-empty">
        <i class="fas fa-feather-alt"></i>
        <p>Zatím žádné zápisky</p>
      </div>`;
    return;
  }

  el.innerHTML = entries.map((entry) => `
    <div class="dashboard-list-item">
      <div class="dashboard-list-icon"><i class="fas fa-pen-nib"></i></div>
      <div class="dashboard-list-content">
        <div class="dashboard-list-title">${entry.folderName} · ${entry.author}</div>
        <div class="dashboard-list-subtitle">${entry.content}${entry.content.length >= 150 ? '…' : ''}</div>
        <div class="dashboard-list-meta">${formatDate(entry.date)}</div>
      </div>
    </div>
  `).join('');
}

function renderStats(stats: DashboardData['stats']): void {
  const statRes = document.getElementById('stat-reservations');
  const statPhotos = document.getElementById('stat-photos');
  const statDiary = document.getElementById('stat-diary');
  const statShopping = document.getElementById('stat-shopping');

  if (statRes) statRes.textContent = String(stats.totalReservations);
  if (statPhotos) statPhotos.textContent = String(stats.totalPhotos);
  if (statDiary) statDiary.textContent = String(stats.totalDiaryEntries);
  if (statShopping) statShopping.textContent = String(stats.unpurchasedCount);
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
    renderUpcoming(data.upcomingReservations);
    renderShopping(data.unpurchasedItems, data.stats.unpurchasedCount);
    renderNotes(data.latestNotes);
    renderDiary(data.recentDiary);
    renderStats(data.stats);
  }
}

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
