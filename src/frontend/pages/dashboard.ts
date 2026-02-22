/* ============================================================================
   pages/dashboard.ts — Přehled (Dashboard) — hlavní stránka po přihlášení
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { authFetch, getUsername, getAnimalIcon, saveAnimalIcon, showToast } from '../lib/common';
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

const ANIMAL_EMOJIS = ['🦊', '🐻', '🐸', '🐰', '🐯', '🦁', '🐼', '🐨', '🦉', '🦄', '🦖', '🐢', '🐙', '🦋', '🐞', '🐌', '🐶', '🐱'];

function getTemplate(): string {
  const username = getUsername() || 'uživateli';
  const currentIcon = getAnimalIcon();
  const avatarDisplay = currentIcon ? currentIcon : username.charAt(0).toUpperCase();

  return `
  <div class="dashboard nordic-dashboard">
    <!-- Header: oříznutá fotka přírody na pozadí, malý avatar, Ahoj jméno -->
    <div class="dashboard-mobile-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div id="avatar-picker-btn" class="dashboard-avatar-picker" title="Změnit avatar">
          ${avatarDisplay}
        </div>
        <div class="greeting-text">
          Ahoj, <strong>${username.split(' ')[0]}</strong>!
        </div>
      </div>
    </div>

    <!-- Avatar Modal -->
    <div id="avatar-modal" class="modal-overlay" style="display: none; z-index: 2000;">
      <div class="modal-content" style="max-width: 400px; text-align: center;">
        <h2>Vyberte si svého avatara</h2>
        <p style="margin-bottom: 20px; color: var(--color-text-light);">Tato ikona se bude zobrazovat u vašich rezervací a vzkazů.</p>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px;">
          ${ANIMAL_EMOJIS.map(e => `<div class="avatar-option" data-emoji="${e}" style="font-size: 30px; cursor: pointer; padding: 10px; border-radius: 12px; background: var(--color-bg-alt); transition: all 0.2s; border: 2px solid transparent;">${e}</div>`).join('')}
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="avatar-cancel-btn" class="button-secondary">Zrušit</button>
          <button id="avatar-clear-btn" class="button-secondary" style="border-color: #ef4444; color: #ef4444;">Odebrat ikonu</button>
        </div>
      </div>
    </div>

    <!-- Cards Layout: 1 sloupec, gap 16px na mobilu -->
    <div class="dashboard-grid">
      <!-- Karta 1: Právě na chatě -->
      <div class="dashboard-card card-highlight">
        <div id="dashboard-active-reservation" class="card-body-full">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Karta 2: Počasí na chatě -->
      <div class="dashboard-card card-weather">
        <div id="dashboard-weather" class="card-body-full">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Karta 3: Nadcházející rezervace -->
      <div class="dashboard-card">
        <div id="dashboard-reservations" class="card-body-full">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
        <a href="#/reservations" class="dashboard-card-link-footer">
          Všechny rezervace
        </a>
      </div>

      <!-- Karta 4: K dokoupení -->
      <div class="dashboard-card">
        <div id="dashboard-shopping" class="card-body-full">
          <div class="spinner-container"><div class="spinner"></div></div>
        </div>
        <a href="#/shopping" class="dashboard-card-link-footer">
          Nákupní seznamy
        </a>
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
      <div class="nordic-empty-state">
        <i class="fas fa-cloud-slash" style="font-size: 24px; color: #cbd5e1; margin-bottom: 8px;"></i>
        <p>Nepodařilo se načíst počasí</p>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="nordic-weather-main">
      <div class="nw-primary">
        <i class="fas ${weather.icon} nw-icon"></i>
        <div class="nw-temp">${weather.temp}°C</div>
      </div>
      <div class="nw-desc">${weather.description}</div>
      <div class="nw-city">Třebenice</div>
    </div>
    <div class="nordic-weather-secondary">
      <div class="nw-sec-item">
        <span>Pocitově</span>
        <strong>${weather.feelsLike}°</strong>
      </div>
      <div class="nw-sec-item">
        <span>Vlhkost</span>
        <strong>${weather.humidity}%</strong>
      </div>
      <div class="nw-sec-item">
        <span>Vítr</span>
        <strong>${weather.windSpeed} km/h</strong>
      </div>
    </div>`;
}

function renderActiveReservation(data: DashboardData): void {
  const el = document.getElementById('dashboard-active-reservation');
  if (!el) return;

  if (data.activeReservation) {
    const r = data.activeReservation;
    el.innerHTML = `
      <div class="nordic-active-state">
        <div class="nas-bubble" style="background: ${r.userColor || '#E07A5F'}">
          ${r.username.charAt(0).toUpperCase()}
        </div>
        <p class="nas-text"><strong>${r.username}</strong> je na chatě</p>
        <p class="nas-dates">${formatDate(r.from)} — ${formatDate(r.to)}</p>
      </div>`;
  } else if (data.myNextReservation) {
    const days = daysUntil(data.myNextReservation.from);
    el.innerHTML = `
      <div class="nordic-active-state">
        <div class="nas-bubble" style="background: #a3b18a">
          <i class="fas fa-calendar-day"></i>
        </div>
        <p class="nas-text">Tvoje návštěva za <strong>${days}</strong> ${days === 1 ? 'den' : days < 5 && days > 0 ? 'dny' : 'dní'}</p>
        <p class="nas-dates">${formatDate(data.myNextReservation.from)} — ${formatDate(data.myNextReservation.to)}</p>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="nordic-active-state empty">
        <p class="nas-text" style="font-weight: 600; font-size: 18px;">Chata je momentálně volná</p>
        <a href="#/reservations" class="nas-cta">Zarezervovat</a>
      </div>`;
  }
}

function renderUpcoming(reservations: DashboardData['upcomingReservations']): void {
  const el = document.getElementById('dashboard-reservations');
  if (!el) return;

  if (reservations.length === 0) {
    el.innerHTML = `
      <div class="nordic-empty-state">
        <div class="nordic-icon-wrapper"><i class="fas fa-calendar-alt"></i></div>
        <p>Žádné nadcházející rezervace</p>
      </div>`;
    return;
  }

  const toShow = reservations.slice(0, 3);
  el.innerHTML = toShow.map((r) => {
    return `
    <div class="nordic-list-item">
      <div class="nli-color" style="background: ${r.userColor || '#808080'}"></div>
      <div class="nli-content">
        <div class="nli-title">${r.username}</div>
        <div class="nli-subtitle">${formatDateShort(r.from)} — ${formatDateShort(r.to)}</div>
      </div>
    </div>`;
  }).join('');
}

function renderShopping(items: DashboardData['unpurchasedItems'], count: number): void {
  const el = document.getElementById('dashboard-shopping');
  if (!el) return;

  if (items.length === 0) {
    el.innerHTML = `
      <div class="nordic-empty-state">
        <p style="font-size: 16px; font-weight: 500;">Na chatě nic nechybí!</p>
      </div>`;
    return;
  }

  const toShow = items.slice(0, 3);
  el.innerHTML = toShow.map((item) => `
    <div class="nordic-list-item">
      <div class="nli-dot"></div>
      <div class="nli-content">
        <div class="nli-title">${item.name}</div>
      </div>
    </div>
  `).join('') + (count > 3 ? `<div class="nli-more">a dalších ${count - 3} položek…</div>` : '');
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

  // Setup Avatar Picker Events
  const avatarBtn = document.getElementById('avatar-picker-btn');
  const avatarModal = document.getElementById('avatar-modal');
  const avatarCancelBtn = document.getElementById('avatar-cancel-btn');
  const avatarClearBtn = document.getElementById('avatar-clear-btn');
  const avatarOptions = document.querySelectorAll('.avatar-option');

  if (avatarBtn && avatarModal) {
    avatarBtn.addEventListener('click', () => {
      avatarModal.style.display = 'flex';
      // Highlight current
      const current = getAnimalIcon();
      avatarOptions.forEach(opt => {
        if (opt.getAttribute('data-emoji') === current) {
          (opt as HTMLElement).style.borderColor = 'var(--color-primary)';
          (opt as HTMLElement).style.background = 'var(--color-primary-bg)';
        } else {
          (opt as HTMLElement).style.borderColor = 'transparent';
          (opt as HTMLElement).style.background = 'var(--color-bg-alt)';
        }
      });
    });

    avatarCancelBtn?.addEventListener('click', () => {
      avatarModal.style.display = 'none';
    });

    avatarClearBtn?.addEventListener('click', async () => {
      const res = await authFetch('/api/users/me/icon', {
        method: 'PATCH',
        body: JSON.stringify({ animalIcon: null }),
      });
      if (res) {
        saveAnimalIcon(null);
        showToast('Ikona byla odebrána', 'success');
        const username = getUsername() || 'U';
        avatarBtn.innerHTML = username.charAt(0).toUpperCase();
        avatarModal.style.display = 'none';
      }
    });

    avatarOptions.forEach(opt => {
      opt.addEventListener('click', async () => {
        const emoji = opt.getAttribute('data-emoji');
        if (!emoji) return;

        const res = await authFetch('/api/users/me/icon', {
          method: 'PATCH',
          body: JSON.stringify({ animalIcon: emoji }),
        });

        if (res) {
          saveAnimalIcon(emoji);
          showToast('Ikona úspěšně změněna', 'success');
          avatarBtn.innerHTML = emoji;
          avatarModal.style.display = 'none';
        }
      });
      // Hover effects
      opt.addEventListener('mouseenter', () => {
        (opt as HTMLElement).style.transform = 'scale(1.1)';
      });
      opt.addEventListener('mouseleave', () => {
        (opt as HTMLElement).style.transform = 'scale(1)';
      });
    });

    // Hover effect on main button
    avatarBtn.addEventListener('mouseenter', () => {
      avatarBtn.style.transform = 'scale(1.05)';
    });
    avatarBtn.addEventListener('mouseleave', () => {
      avatarBtn.style.transform = 'scale(1)';
    });
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
