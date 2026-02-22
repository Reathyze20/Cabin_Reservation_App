/* ============================================================================
   main.ts — Application entry point
   ============================================================================ */

// CSS
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/index.css';

// PWA — auto-registers service worker via vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Libs
import {
  $, show, hide, showToast,
  isLoggedIn, setAuth, logout, getUsername,
  saveAnimalIcon, getAnimalIcon
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

  const animalEl = $('nav-animal-icon');
  if (animalEl) {
    const icon = getAnimalIcon();
    if (icon) {
      animalEl.textContent = icon;
    } else {
      animalEl.innerHTML = '<i class="fas fa-user-circle" style="color: var(--color-primary);"></i>';
    }
  }

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
      setAuth({
        token: data.token,
        username: data.username,
        userId: String(data.userId),
        role: data.role,
        animalIcon: data.animalIcon,
        remember: $<HTMLInputElement>('remember-me')?.checked ?? true
      });
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
    const email = $<HTMLInputElement>('register-email')!.value.trim();
    const password = $<HTMLInputElement>('register-password')!.value;
    const color = $<HTMLInputElement>('register-color')!.value;
    const msgEl = $('register-message');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, color, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (msgEl) { msgEl.textContent = data.message || data.error || 'Chyba registrace'; msgEl.style.color = 'var(--color-danger)'; }
        return;
      }

      if (data.message && data.message.includes('ověřovací kód')) {
        // Skrýt registraci, ukázat verify section
        hide($('register-section'));
        show($('verify-section'));
        $<HTMLInputElement>('verify-username')!.value = username;
      } else {
        if (msgEl) { msgEl.textContent = 'Registrace úspěšná, přihlaste se.'; msgEl.style.color = 'var(--color-success)'; }
        setTimeout(() => {
          hide($('register-section'));
          show($('login-section'));
        }, 1500);
      }
    } catch {
      if (msgEl) { msgEl.textContent = 'Chyba sítě'; msgEl.style.color = 'var(--color-danger)'; }
    }
  });
}

function bindVerifyForm(): void {
  $<HTMLFormElement>('verify-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $<HTMLInputElement>('verify-username')!.value;
    const code = $<HTMLInputElement>('verify-code')!.value.trim();
    const msgEl = $('verify-message');

    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (msgEl) { msgEl.textContent = data.message || 'Nesprávný kód.'; msgEl.style.color = 'var(--color-danger)'; }
        return;
      }

      if (msgEl) { msgEl.textContent = 'Ověření úspěšné, můžete se přihlásit.'; msgEl.style.color = 'var(--color-success)'; }
      setTimeout(() => {
        hide($('verify-section'));
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
  $('show-login-link-from-verify')?.addEventListener('click', (e) => {
    e.preventDefault();
    hide($('verify-section'));
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

function initProfileDrawer(): void {
  const btn = $('profile-button');
  const overlay = $('profile-drawer-overlay');
  if (!btn || !overlay) return;

  const ANIMAL_ICONS = ['🐞', '🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🐸', '🦉', '🐯', '🦁', '🦄', '🐷'];
  const SWATCH_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#8BB88B', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  btn.addEventListener('click', async () => {
    show(overlay);
    renderColorGrid();
    renderAvatarGrid();

    // Načtení profilu
    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const user = await res.json();
        $<HTMLInputElement>('profile-email')!.value = user.email || '';
        $<HTMLInputElement>('profile-color')!.value = user.color || '#8BB88B';
        $<HTMLInputElement>('profile-animal-icon')!.value = user.animalIcon || '';
        updateColorSelection();
        updateAvatarSelection();
      }
    } catch (e) {
      console.warn('Nelze načíst profil', e);
    }
  });

  $('close-profile-drawer')?.addEventListener('click', () => hide(overlay));
  // Allow clicking outside the drawer content to close it
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide(overlay);
  });

  // Segmented Control
  document.querySelectorAll('.segmented-btn').forEach(tBtn => {
    tBtn.addEventListener('click', (e) => {
      document.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
      const t = e.currentTarget as HTMLElement;
      t.classList.add('active');

      document.querySelectorAll('.drawer-tab-content').forEach(c => {
        c.classList.remove('active-tab');
        c.classList.add('hidden');
      });
      const targetContent = $(t.dataset.target!);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active-tab');
      }
    });
  });

  // Email Validation on blur
  const emailInput = $<HTMLInputElement>('profile-email');
  const emailError = $('profile-email-error');
  emailInput?.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.style.borderColor = 'var(--color-danger)';
      if (emailError) show(emailError);
    } else {
      emailInput.style.borderColor = '';
      if (emailError) hide(emailError);
    }
  });

  // Změnit E-mail tlačítko
  $('btn-change-email')?.addEventListener('click', async () => {
    const email = emailInput?.value.trim();
    const msg = $('profile-email-message');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (msg) { msg.textContent = 'Nesprávný formát e-mailu.'; msg.style.color = 'var(--color-danger)'; }
      return;
    }

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        if (msg) { msg.textContent = ''; }
        showToast('E-mail změněn', 'success');
      } else {
        const data = await res.json();
        if (msg) { msg.textContent = data.message || 'Chyba.'; msg.style.color = 'var(--color-danger)'; }
      }
    } catch {
      if (msg) { msg.textContent = 'Síťová chyba.'; msg.style.color = 'var(--color-danger)'; }
    }
  });

  // Auto-save logic
  async function autoSaveProfile(payload: { color?: string, animalIcon?: string }, oldVal: string) {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        showToast('Relace vypršela. Prosím přihlaste se znovu.', 'error');
        if (typeof (window as any).__showLogin === 'function') {
          (window as any).__showLogin();
        }
        throw new Error('Unauthorized');
      }
      if (!res.ok) throw new Error('Failed');

      if (payload.animalIcon !== undefined) {
        saveAnimalIcon(payload.animalIcon);
        const navIcon = $('nav-animal-icon');
        if (navIcon) {
          if (payload.animalIcon) {
            navIcon.textContent = payload.animalIcon;
          } else {
            navIcon.innerHTML = '<i class="fas fa-user-circle" style="color: var(--color-primary);"></i>';
          }
        }
        const dashIcon = $('avatar-picker-btn');
        if (dashIcon) {
          dashIcon.textContent = payload.animalIcon ? payload.animalIcon : (getUsername() || 'U').charAt(0).toUpperCase();
        }
      }

      showToast('Změny uloženy', 'success');
    } catch (e: any) {
      if (e.message !== 'Unauthorized') {
        showToast('Nepodařilo se uložit, zkuste to prosím znovu.', 'error');
      }
      // Revert UI
      if (payload.color) {
        $<HTMLInputElement>('profile-color')!.value = oldVal;
        updateColorSelection();
      }
      if (payload.animalIcon) {
        $<HTMLInputElement>('profile-animal-icon')!.value = oldVal;
        updateAvatarSelection();
      }
    }
  }

  function renderColorGrid() {
    const grid = $('profile-color-grid')!;
    grid.innerHTML = '';
    SWATCH_COLORS.forEach(color => {
      const d = document.createElement('div');
      d.className = 'color-swatch';
      d.style.backgroundColor = color;
      d.tabIndex = 0;
      d.setAttribute('role', 'button');

      const onSelect = () => {
        const input = $<HTMLInputElement>('profile-color')!;
        const old = input.value;
        if (old === color) return;
        input.value = color;
        updateColorSelection();
        autoSaveProfile({ color }, old);
      };

      d.addEventListener('click', onSelect);
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      });
      grid.appendChild(d);
    });
  }

  function updateColorSelection() {
    const grid = $('profile-color-grid');
    if (!grid) return;
    const current = $<HTMLInputElement>('profile-color')!.value.toLowerCase();
    Array.from(grid.children).forEach(child => {
      const el = child as HTMLElement;
      el.classList.remove('active');
    });
    Array.from(grid.children).forEach((child, idx) => {
      if (SWATCH_COLORS[idx].toLowerCase() === current) {
        child.classList.add('active');
      }
    });
  }

  function renderAvatarGrid() {
    const grid = $('profile-avatar-grid')!;
    grid.innerHTML = '';
    ANIMAL_ICONS.forEach(icon => {
      const d = document.createElement('div');
      d.className = 'avatar-icon';
      d.textContent = icon;
      d.tabIndex = 0;
      d.setAttribute('role', 'button');

      const onSelect = () => {
        const input = $<HTMLInputElement>('profile-animal-icon')!;
        const old = input.value;
        if (old === icon) return;
        input.value = icon;
        updateAvatarSelection();
        autoSaveProfile({ animalIcon: icon }, old);
      };

      d.addEventListener('click', onSelect);
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      });
      grid.appendChild(d);
    });
  }

  function updateAvatarSelection() {
    const grid = $('profile-avatar-grid');
    if (!grid) return;
    const current = $<HTMLInputElement>('profile-animal-icon')!.value;
    Array.from(grid.children).forEach(child => {
      const el = child as HTMLElement;
      if (el.textContent === current) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // Security form submit
  $<HTMLFormElement>('profile-security-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = $<HTMLInputElement>('profile-old-password')!.value;
    const newPassword = $<HTMLInputElement>('profile-new-password')!.value;
    const newPasswordConfirm = $<HTMLInputElement>('profile-new-password-confirm')!.value;
    const msg = $('profile-security-message')!;

    if (newPassword !== newPasswordConfirm) {
      msg.textContent = 'Hesla se neshodují.';
      msg.style.color = 'var(--color-danger)';
      return;
    }

    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        msg.textContent = '';
        $<HTMLFormElement>('profile-security-form')!.reset();
        showToast('Heslo úspěšně změněno', 'success');
      } else {
        msg.textContent = data.message || 'Chyba.';
        msg.style.color = 'var(--color-danger)';
        showToast('Nepodařilo se změnit heslo', 'error');
      }
    } catch {
      msg.textContent = 'Síťová chyba.';
      msg.style.color = 'var(--color-danger)';
    }
  });
}

/* ---------- init ---------- */

function init(): void {
  setupPasswordToggles();
  bindLoginForm();
  bindRegisterForm();
  bindVerifyForm();
  bindLinks();
  bindLogout();
  initProfileDrawer();
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
