/* ============================================================================
   main.ts — Application entry point
   ============================================================================ */

// CSS
import './styles/legacy.css';
import 'flatpickr/dist/flatpickr.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// PWA — auto-registers service worker via vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Libs
import {
  $, show, hide, showToast,
  isLoggedIn, setAuth, logout, getUsername,
} from './lib/common';
import { initRouter, destroyRouter } from './lib/router';

/* ---------- PWA service worker ---------- */

const updateSW = registerSW({
  onNeedRefresh() {
    // New version available — show a toast with update action
    const toast = document.createElement('div');
    toast.className = 'toast toast-info show';
    toast.style.cursor = 'pointer';
    toast.innerHTML = `<i class="fas fa-arrow-up-from-bracket"></i><span>Nová verze k dispozici — klikněte pro aktualizaci</span>`;
    toast.addEventListener('click', () => {
      updateSW(true);
      toast.remove();
    });
    document.body.appendChild(toast);
    // Auto-dismiss after 15s
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 15000);
  },
  onOfflineReady() {
    showToast('Aplikace je připravena pro offline režim', 'success');
  },
});

/* ---------- offline detection ---------- */

function updateOnlineStatus(): void {
  const banner = $('offline-banner');
  if (!banner) return;
  if (navigator.onLine) {
    banner.classList.add('hidden');
  } else {
    banner.classList.remove('hidden');
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

/* ---------- dark mode ---------- */

function initDarkMode(): void {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  $('dark-mode-toggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
    updateDarkModeIcon();
  });

  updateDarkModeIcon();
}

function updateDarkModeIcon(): void {
  const btn = $('dark-mode-toggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

/* ---------- helpers ---------- */

function setupPasswordToggles(): void {
  document.querySelectorAll<HTMLElement>('.toggle-password').forEach((icon) => {
    icon.addEventListener('click', () => {
      const input = icon.previousElementSibling as HTMLInputElement | null;
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !isHidden);
      icon.classList.toggle('fa-eye-slash', isHidden);
    });
  });
}

/* ---------- auth UI ---------- */

function showApp(): void {
  hide($('login-section'));
  hide($('register-section'));
  show($('app-section'));
  const nameEl = $('logged-in-username');
  if (nameEl) nameEl.textContent = getUsername() || '';

  const pageContainer = $('page-container');
  const appNav = $('app-nav');
  if (pageContainer && appNav) {
    initRouter(pageContainer, appNav);
  }
}

function showLogin(): void {
  destroyRouter();
  hide($('app-section'));
  hide($('register-section'));
  show($('login-section'));
}

/* ---------- forms ---------- */

function bindLoginForm(): void {
  $<HTMLFormElement>('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $<HTMLInputElement>('username')!.value.trim();
    const password = $<HTMLInputElement>('login-password')!.value;
    const errEl = $('login-error');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (errEl) errEl.textContent = data.error || 'Chyba přihlášení';
        return;
      }
      setAuth({ token: data.token, username: data.username, userId: String(data.userId), role: data.role });
      showToast('Přihlášení úspěšné', 'success');
      showApp();
    } catch {
      if (errEl) errEl.textContent = 'Chyba sítě';
    }
  });
}

function bindRegisterForm(): void {
  $<HTMLFormElement>('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $<HTMLInputElement>('register-username')!.value.trim();
    const password = $<HTMLInputElement>('register-password')!.value;
    const color = $<HTMLInputElement>('register-color')!.value;
    const msgEl = $('register-message');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, color }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (msgEl) { msgEl.textContent = data.error || 'Chyba registrace'; msgEl.style.color = 'var(--color-danger)'; }
        return;
      }
      if (msgEl) { msgEl.textContent = 'Registrace úspěšná, přihlaste se.'; msgEl.style.color = 'var(--color-success)'; }
      // Auto-switch to login after short delay
      setTimeout(() => {
        hide($('register-section'));
        show($('login-section'));
      }, 1500);
    } catch {
      if (msgEl) { msgEl.textContent = 'Chyba sítě'; msgEl.style.color = 'var(--color-danger)'; }
    }
  });
}

function bindLinks(): void {
  $('show-register-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    hide($('login-section'));
    show($('register-section'));
  });
  $('show-login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    hide($('register-section'));
    show($('login-section'));
  });
}

function bindLogout(): void {
  $('logout-button')?.addEventListener('click', () => {
    logout();
    showToast('Odhlášení úspěšné', 'info');
    showLogin();
  });
}

/* ---------- init ---------- */

function init(): void {
  setupPasswordToggles();
  bindLoginForm();
  bindRegisterForm();
  bindLinks();
  bindLogout();
  initDarkMode();
  updateOnlineStatus();

  // Expose showLogin globally so common.ts handleSessionExpired can use it
  (window as any).__showLogin = showLogin;

  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
