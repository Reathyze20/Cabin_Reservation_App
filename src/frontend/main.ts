/* ============================================================================
   main.ts — Application entry point
   ============================================================================ */

// CSS
import '@fortawesome/fontawesome-free/css/all.min.css'; // kept for weather icons in dashboard
import './styles/index.css';
import { icons } from './lib/icons';

// PWA — auto-registers service worker via vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Libs
import {
  $, show, hide, showToast,
  isLoggedIn, setAuth, logout, getUsername,
  saveAnimalIcon, getAnimalIcon, getToken, handleSessionExpired,
  validateForm
} from './lib/common';
import { initRouter, destroyRouter } from './lib/router';
import { initGlobalErrorHandlers } from './lib/logger';
import { isVerifyRoute, mountVerifyPage } from './pages/verify';
import { helpDictionary } from './lib/helpContent';

/* ---------- PWA service worker ---------- */

const updateSW = registerSW({
  onNeedRefresh() {
    // New version available — show a toast with update action
    const toast = document.createElement('div');
    toast.className = 'toast toast-info show';
    toast.style.cursor = 'pointer';
    toast.innerHTML = `<span>Nová verze k dispozici — klikněte pro aktualizaci</span>`;
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
  document.querySelectorAll<HTMLElement>('.toggle-password').forEach((btn) => {
    // Initialize with eye icon if empty
    if (!btn.innerHTML.includes('<svg')) btn.innerHTML = icons.eye();
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling as HTMLInputElement | null;
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.innerHTML = isHidden ? icons.eyeOff() : icons.eye();
      btn.title = isHidden ? 'Skrýt heslo' : 'Zobrazit heslo';
    });
  });
}

/* ---------- auth UI ---------- */

function showApp(): void {
  hide($('login-section'));
  hide($('register-section'));
  show($('app-section'));

  const animalEl = $('nav-animal-icon');
  if (animalEl) {
    const icon = getAnimalIcon();
    if (icon) {
      animalEl.textContent = icon;
    } else {
      animalEl.textContent = (getUsername() || 'U').charAt(0).toUpperCase();
    }
  }

  // Update user greeting with typographic contrast
  const greetingEl = $('user-greeting');
  if (greetingEl) {
    const username = getUsername() || 'Uživatel';
    greetingEl.innerHTML = `<span class="greeting">Ahoj, </span><span class="username">${username}!</span>`;
  }

  // ── Mobile Header: menu button → open profile drawer ──
  const mobileMenuBtn = $('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const drawer = document.getElementById('profile-drawer-overlay');
      if (drawer) drawer.classList.remove('hidden');
    });
  }

  // Update mobile header menu icon with user's animal icon
  const mobileMenuIcon = $('mobile-menu-icon');
  if (mobileMenuIcon) {
    const icon = getAnimalIcon();
    if (icon) {
      mobileMenuIcon.textContent = icon;
    } else {
      mobileMenuIcon.textContent = '☰';
    }
  }

  const pageContainer = $('page-container');
  const appNav = $('app-nav');
  if (pageContainer && appNav) {
    initRouter(pageContainer, appNav);
  }

  // Show help FAB when app is visible
  const fabHelp = $('fab-help');
  if (fabHelp) fabHelp.classList.remove('hidden');
}

function showLogin(): void {
  destroyRouter();
  hide($('app-section'));
  hide($('register-section'));
  show($('login-section'));
  // Hide help FAB on login screen
  const fabHelp = $('fab-help');
  if (fabHelp) fabHelp.classList.add('hidden');
}

/* ---------- forms ---------- */

function bindLoginForm(): void {
  $<HTMLFormElement>('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    if (!validateForm(form)) return;

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
        if (errEl) {
          // ── Token-based verification needed (new SaaS flow) ───────────
          if (data.needsVerification) {
            errEl.innerHTML = `
              <span style="color:var(--color-warning);">
                ✉️ ${data.message}
              </span>`;
            return;
          }

          if (data.testCode) {
            errEl.innerHTML = `${data.message || data.error}<br><br><strong>Nouzový kód (login) pro testování: <span style="font-size:1.2em; letter-spacing:2px; color:var(--color-primary);">${data.testCode}</span></strong>`;

            // Automaticky ukázat verify section po chvíli
            setTimeout(() => {
              hide($('login-section'));
              show($('verify-section'));
              $<HTMLInputElement>('verify-username')!.value = username;
              $<HTMLInputElement>('verify-code')!.value = data.testCode;
            }, 4000);
          } else {
            errEl.textContent = data.message || data.error || 'Chyba přihlášení';
          }
        }
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
    const form = e.currentTarget as HTMLFormElement;
    if (!validateForm(form)) return;

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

      // ── New token-based flow: don't login, show activation message ─────
      if (data.requiresVerification) {
        // ✨ AUTO-VERIFY: Pokud máme testToken (e-mail se nepodařilo odeslat), automaticky spustíme verify
        if (data.testToken) {
          showToast('E-mail se nepodařil odeslat — automaticky aktivujeme váš účet...', 'info');
          setTimeout(() => {
            window.location.hash = `#/verify?token=${data.testToken}`;
            window.location.reload();
          }, 1500);
          return;
        }

        // Standardní flow: e-mail byl odeslán, čekáme na kliknutí na odkaz
        const registerSection = $('register-section');
        if (registerSection) {
          registerSection.innerHTML = `
            <div style="text-align:center;padding:40px 24px;">
              <div style="font-size:48px;margin-bottom:16px;color:var(--color-primary);">✉</div>
              <h2 style="margin:0 0 12px;color:var(--color-text, #e5e7eb);">Zkontrolujte svůj e-mail</h2>
              <p style="color:var(--color-text-light, #9ca3af);line-height:1.6;margin:0 0 24px;">
                Děkujeme za registraci!<br>
                Poslali jsme vám e-mail s odkazem pro aktivaci účtu na adresu <strong>${email}</strong>.
              </p>
              <a href="#" id="back-to-login-from-verify"
                 style="color:var(--color-primary);text-decoration:underline;cursor:pointer;">
                ← Vrátit se na přihlášení
              </a>
            </div>
          `;
          registerSection.querySelector('#back-to-login-from-verify')?.addEventListener('click', (ev) => {
            ev.preventDefault();
            window.location.hash = '#';
            window.location.reload();
          });
        }
        showToast('Registrace úspěšná — zkontrolujte e-mail', 'success');
        return;
      }

      // ── Legacy PIN-based flow (backward compat) ─────────────────────────
      if (data.message && (data.message.includes('ověřovací kód') || data.message.includes('e-mail s kódem se nepodařilo odeslat'))) {
        // Zobrazit informativní hlášku, popř. s nouzovým kódem
        if (msgEl) {
          if (data.testCode) {
            msgEl.innerHTML = `${data.message}<br><br><strong>Nouzový kód pro testování: <span style="font-size:1.2em; letter-spacing:2px; color:var(--color-primary);">${data.testCode}</span></strong>`;
            msgEl.style.color = 'var(--color-warning)';
          } else {
            msgEl.textContent = data.message;
            msgEl.style.color = data.message.includes('nepodařilo') ? 'var(--color-danger)' : 'var(--color-success)';
          }
        }

        setTimeout(() => {
          hide($('register-section'));
          show($('verify-section'));
          $<HTMLInputElement>('verify-username')!.value = username;
          // Pokusíme-li se usnadnit práci, můžeme kód rovnou vypsat
          if (data.testCode) {
            $<HTMLInputElement>('verify-code')!.value = data.testCode;
          }
        }, data.testCode || data.message.includes('nepodařilo') ? 4000 : 1000); // Necháme chybu svítit déle
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
    const form = e.currentTarget as HTMLFormElement;
    if (!validateForm(form)) return;

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
        headers: { 'Authorization': `Bearer ${getToken()}` }
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
          'Authorization': `Bearer ${getToken()}`
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
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        handleSessionExpired();
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
            navIcon.textContent = (getUsername() || 'U').charAt(0).toUpperCase();
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
    const form = e.currentTarget as HTMLFormElement;
    if (!validateForm(form)) return;

    const oldPassword = $<HTMLInputElement>('profile-old-password')!.value;
    const newPassword = $<HTMLInputElement>('profile-new-password')!.value;
    const newPasswordConfirm = $<HTMLInputElement>('profile-new-password-confirm')!.value;
    const msg = $('profile-security-message')!;

    if (newPassword !== newPasswordConfirm) {
      msg.textContent = 'Hesla se neshodují.';
      msg.style.color = 'var(--color-danger)';

      const newPwdInput = $<HTMLInputElement>('profile-new-password-confirm');
      if (newPwdInput) {
        newPwdInput.classList.add('is-invalid');
      }
      return;
    }

    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
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

/* ---------- help system ---------- */

function initHelpSystem(): void {
  const fab = $('fab-help');
  const overlay = $('help-modal-overlay') as HTMLElement | null;
  const content = $('help-modal-content');
  const closeBtn = $('close-help-modal');
  if (!fab || !overlay || !content || !closeBtn) return;

  function openHelp() {
    // Extract route key from hash, e.g. "#/shopping" -> "shopping"
    const hash = window.location.hash.replace('#/', '').split('?')[0];
    const key = hash || 'dashboard';
    const helpHtml = helpDictionary[key] || helpDictionary['default'];
    content!.innerHTML = helpHtml;
    overlay!.style.display = 'flex';
  }

  function closeHelp() {
    overlay!.style.display = 'none';
  }

  fab.addEventListener('click', openHelp);
  closeBtn.addEventListener('click', closeHelp);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeHelp();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay!.style.display === 'flex') closeHelp();
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

  // ── Token-based email verification route (works without login) ─────
  if (isVerifyRoute()) {
    hide($('login-section'));
    hide($('register-section'));
    hide($('app-section'));
    // Use the body as container for the standalone verify page
    const verifyContainer = document.createElement('div');
    verifyContainer.id = 'verify-page-container';
    document.body.appendChild(verifyContainer);
    mountVerifyPage(verifyContainer);
    return;
  }

  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }

  initHelpSystem();
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initGlobalErrorHandlers();
    init();
  });
} else {
  initGlobalErrorHandlers();
  init();
}
