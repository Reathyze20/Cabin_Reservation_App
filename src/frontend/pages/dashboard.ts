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
  activeShoppingLists: {
    id: string;
    name: string;
    author: string;
    unpurchasedCount: number;
    totalCount: number;
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
  forecast: {
    date: string;
    dayName: string;
    icon: string;
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
    const weatherInfo = mapWMOCode(current.weather_code);

    const forecast = [];
    // Start from index 1 (tomorrow) to 3
    for (let i = 1; i <= 3; i++) {
      if (daily.time[i]) {
        const dateObj = new Date(daily.time[i]);
        const dayName = dateObj.toLocaleDateString('cs-CZ', { weekday: 'short' });
        const fInfo = mapWMOCode(daily.weather_code[i]);
        forecast.push({
          date: daily.time[i],
          dayName: dayName,
          icon: fInfo.icon,
          tempMin: Math.round(daily.temperature_2m_min[i]),
          tempMax: Math.round(daily.temperature_2m_max[i])
        });
      }
    }

    return {
      temp: Math.round(current.temperature_2m),
      description: weatherInfo.description,
      icon: weatherInfo.icon,
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
    <!-- Mobile Header -->
    <div class="dashboard-mobile-header mobile-only">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="dashboard-avatar-picker avatar-picker-btn" title="Změnit avatar">
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

    <!-- Desktop-only: Stats -->
    <div class="dashboard-stats-row desktop-only">
      <a href="#/reservations" class="glass-card stat-card">
        <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
        <div class="stat-info">
          <span class="stat-value" id="stat-reservations">-</span>
          <span class="stat-label">Rezervací</span>
        </div>
      </a>
      <a href="#/gallery" class="glass-card stat-card">
        <div class="stat-icon"><i class="fas fa-camera"></i></div>
        <div class="stat-info">
          <span class="stat-value" id="stat-photos">-</span>
          <span class="stat-label">Fotek</span>
        </div>
      </a>
      <a href="#/diary" class="glass-card stat-card">
        <div class="stat-icon"><i class="fas fa-pen-nib"></i></div>
        <div class="stat-info">
          <span class="stat-value" id="stat-diary">-</span>
          <span class="stat-label">Zápisů</span>
        </div>
      </a>
      <a href="#/shopping" class="glass-card stat-card">
        <div class="stat-icon"><i class="fas fa-shopping-basket"></i></div>
        <div class="stat-info">
          <span class="stat-value" id="stat-shopping">-</span>
          <span class="stat-label">Ke koupi</span>
        </div>
      </a>
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
          <i class="fas ${f.icon} forecast-icon"></i>
          <div class="forecast-temps">${f.tempMax}°<span>${f.tempMin}°</span></div>
        </div>
      `).join('')}
    </div>
  ` : '';

  el.innerHTML = `
    <div class="card-body-full">
      <div class="weather-main">
        <div class="weather-current">
          <i class="fas ${weather.icon} weather-icon-large"></i>
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
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-icon-wrapper">
          <i class="fas fa-home"></i>
        </div>
        <div class="status-text">Nyní zde pobývá:<br>${r.username}</div>
        <div class="status-subtext">${formatDate(r.from)} — ${formatDate(r.to)}</div>
        <a href="#/reservations" class="status-cta">Zobrazit kalendář</a>
      </div>`;
  } else if (data.myNextReservation) {
    const days = daysUntil(data.myNextReservation.from);
    el.className = 'glass-card status-card is-free';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-icon-wrapper">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div class="status-text">Tvoje návštěva za ${days} ${days === 1 ? 'den' : days < 5 && days > 0 ? 'dny' : 'dní'}</div>
        <div class="status-subtext">${formatDate(data.myNextReservation.from)} — ${formatDate(data.myNextReservation.to)}</div>
        <a href="#/reservations" class="status-cta">Upravit rezervaci</a>
      </div>`;
  } else {
    el.className = 'glass-card status-card is-free';
    el.innerHTML = `
      <div class="card-body-full status-content">
        <div class="status-icon-wrapper">
          <i class="fas fa-door-open"></i>
        </div>
        <div class="status-text">Chata je momentálně volná</div>
        <div class="status-subtext">Naplánujte si další pobyt</div>
        <a href="#/reservations" class="status-cta">Zarezervovat</a>
      </div>`;
  }
}

function renderUpcoming(reservations: DashboardData['upcomingReservations']): void {
  const el = document.getElementById('dashboard-reservations');
  if (!el) return;

  if (reservations.length === 0) {
    el.innerHTML = `
      <div class="empty-state-card">
        <i class="fas fa-calendar-alt empty-icon-duotone"></i>
        <p class="empty-text">Žádné nadcházející rezervace</p>
        <a href="#/reservations" class="empty-cta"><i class="fas fa-plus"></i> Naplánovat pobyt</a>
      </div>`;
    return;
  }

  const toShow = reservations.slice(0, 3);
  el.innerHTML = `
    <div class="list-header">
      <span class="list-title">Nadcházející rezervace</span>
      <a href="#/reservations" class="list-link">Všechny</a>
    </div>
    <div class="list-content">
      ${toShow.map((r) => `
        <div class="list-item">
          <div class="list-item-icon" style="background: ${r.userColor || '#808080'}">
            ${r.username.charAt(0).toUpperCase()}
          </div>
          <div class="list-item-content">
            <div class="list-item-title">${r.username}</div>
            <div class="list-item-subtitle">${formatDateShort(r.from)} — ${formatDateShort(r.to)}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderShopping(lists: DashboardData['activeShoppingLists'], count: number): void {
  const el = document.getElementById('dashboard-shopping');
  if (!el) return;

  if (lists.length === 0) {
    el.innerHTML = `
      <div class="empty-state-card">
        <i class="fas fa-shopping-basket empty-icon-duotone"></i>
        <p class="empty-text">Na chatě nic nechybí!</p>
        <a href="#/shopping" class="empty-cta"><i class="fas fa-plus"></i> Přidat položku</a>
      </div>`;
    return;
  }

  const toShow = lists.slice(0, 3);
  el.innerHTML = `
    <div class="list-header">
      <span class="list-title">K dokoupení</span>
      <a href="#/shopping" class="list-link">Všechny (${count})</a>
    </div>
    <div class="list-content">
      ${toShow.map((list) => `
        <div class="list-item">
          <div class="list-item-icon" style="background: var(--color-primary); font-size: 14px;">
            <i class="fas fa-shopping-cart"></i>
          </div>
          <div class="list-item-content">
            <div class="list-item-title">${list.name}</div>
            <div class="list-item-subtitle">Chybí ${list.unpurchasedCount} z ${list.totalCount} položek</div>
          </div>
        </div>
      `).join('')}
    </div>`;
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
    renderShopping(data.activeShoppingLists, data.stats.unpurchasedCount);
    renderStats(data.stats);
  }

  // Setup Avatar Picker Events
  const avatarBtns = document.querySelectorAll('.avatar-picker-btn');
  const avatarModal = document.getElementById('avatar-modal');
  const avatarCancelBtn = document.getElementById('avatar-cancel-btn');
  const avatarClearBtn = document.getElementById('avatar-clear-btn');
  const avatarOptions = document.querySelectorAll('.avatar-option');

  if (avatarBtns.length > 0 && avatarModal) {
    avatarBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
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
    });

    avatarCancelBtn?.addEventListener('click', () => {
      avatarModal.style.display = 'none';
    });

    avatarClearBtn?.addEventListener('click', async () => {
      const res = await authFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ animalIcon: null }),
      });
      if (res) {
        saveAnimalIcon(null);
        showToast('Ikona byla odebrána', 'success');
        const username = getUsername() || 'U';
        avatarBtns.forEach(b => b.innerHTML = username.charAt(0).toUpperCase());
        avatarModal.style.display = 'none';
      }
    });

    avatarOptions.forEach(opt => {
      opt.addEventListener('click', async () => {
        const emoji = opt.getAttribute('data-emoji');
        if (!emoji) return;

        const res = await authFetch('/api/users/me', {
          method: 'PATCH',
          body: JSON.stringify({ animalIcon: emoji }),
        });

        if (res) {
          saveAnimalIcon(emoji);
          showToast('Ikona úspěšně změněna', 'success');
          avatarBtns.forEach(b => b.innerHTML = emoji);
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
    avatarBtns.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        (btn as HTMLElement).style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        (btn as HTMLElement).style.transform = 'scale(1)';
      });
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
