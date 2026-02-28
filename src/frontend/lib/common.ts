/* ============================================================================
   lib/common.ts — Shared utilities (ES-module replacement for Common IIFE)
   ============================================================================ */

// ─── Auth state (dual storage: sessionStorage for session, localStorage for persistent) ─

/** Helper: read from sessionStorage first, fallback to localStorage */
function getAuthItem(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

export function getToken(): string | null {
  return getAuthItem('authToken');
}
export function getUsername(): string | null {
  return getAuthItem('username');
}
export function getUserId(): string | null {
  return getAuthItem('userId');
}
export function getRole(): string | null {
  return getAuthItem('role');
}

export function isLoggedIn(): boolean {
  return !!(getToken() && getUsername());
}

export function isAdmin(): boolean {
  return getRole() === 'admin';
}

export function getAnimalIcon(): string | null {
  return localStorage.getItem('animalIcon') || sessionStorage.getItem('animalIcon');
}

export function saveAnimalIcon(icon: string | null): void {
  // Save to whichever storage currently holds the username
  const store = localStorage.getItem('username') ? localStorage : sessionStorage;
  if (icon) {
    store.setItem('animalIcon', icon);
  } else {
    store.removeItem('animalIcon');
  }
}

/** Store auth data after login.
 *  If `remember` is true, persists in localStorage (survives browser close).
 *  Otherwise uses sessionStorage (cleared when tab/browser closes). */
export function setAuth(data: {
  token: string;
  username: string;
  userId: string;
  role: string;
  animalIcon?: string | null;
  remember?: boolean;
}): void {
  const store = data.remember ? localStorage : sessionStorage;
  // Clear the other storage to avoid stale data
  const otherStore = data.remember ? sessionStorage : localStorage;
  ['authToken', 'username', 'userId', 'role', 'animalIcon'].forEach((k) => otherStore.removeItem(k));

  store.setItem('authToken', data.token);
  store.setItem('username', data.username);
  store.setItem('userId', data.userId);
  store.setItem('role', data.role);
  if (data.animalIcon) store.setItem('animalIcon', data.animalIcon);
}

/** Clear all auth data from both storages */
function clearAuth(): void {
  const savedTheme = localStorage.getItem('theme');
  ['authToken', 'username', 'userId', 'role', 'animalIcon'].forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  // Preserve theme preference
  if (savedTheme) localStorage.setItem('theme', savedTheme);
}

/** Clear all auth data and navigate to login */
export function logout(): void {
  clearAuth();
  // Let the router handle navigation
  window.location.hash = '#/';
  window.location.reload();
}

/** Handle 401 — session expired */
export function handleSessionExpired(): void {
  clearAuth();
  showToast('Relace vypršela, přihlaste se znovu', 'error');
  // Use global callback set by main.ts to avoid circular imports
  if (typeof (window as any).__showLogin === 'function') {
    (window as any).__showLogin();
  } else {
    window.location.hash = '#/';
    window.location.reload();
  }
}

// ─── Authenticated Fetch ──────────────────────────────────────────────

interface AuthFetchOptions extends RequestInit {
  silent?: boolean;
}

/**
 * Authenticated JSON fetch wrapper.
 * Auto-adds Authorization + Content-Type, handles 401, parses JSON,
 * shows toast on mutating-method errors.
 */
export async function authFetch<T = unknown>(
  url: string,
  options: AuthFetchOptions = {},
  _retryCount = 0,
): Promise<T | null> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      handleSessionExpired();
      return null;
    }
    if (!response.ok) {
      const err: { message?: string; errorId?: string } = await response.json().catch(() => ({}));
      let errMsg = err.message || response.statusText || 'Chyba serveru';
      if (err.errorId) {
        errMsg += ` (ID: ${err.errorId})`;
      }
      throw new Error(errMsg);
    }
    if (response.status === 204) return true as unknown as T;
    return (await response.json()) as T;
  } catch (error: unknown) {
    const isNetworkError = error instanceof TypeError &&
      (error.message === 'Failed to fetch' || error.message.includes('Network'));

    // Auto-retry once on network error when online (handles PM2 restart gap)
    if (isNetworkError && navigator.onLine && _retryCount < 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return authFetch<T>(url, options, _retryCount + 1);
    }

    let msg = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('API Error:', error);

    const method = (options.method || '').toUpperCase();
    const isMutation = ['DELETE', 'POST', 'PATCH', 'PUT'].includes(method);

    if (isNetworkError) {
      if (!navigator.onLine) {
        msg = isMutation
          ? 'Akci nelze provést: Jste offline.'
          : 'Jste offline. Zobrazuji uložená data.';
      } else {
        msg = 'Chyba připojení k serveru.';
      }
    }

    if (!options.silent && isMutation) {
      showToast(msg, 'error');
    } else if (!options.silent && !isMutation && msg.includes('offline')) {
      // Show info toast for GET requests if offline
      showToast(msg, 'info');
    } else if (!options.silent && msg.includes('(ID:')) {
      // Always show toast for 500 errors with ID, even on GET requests
      showToast(msg, 'error');
    }
    return null;
  }
}

/**
 * Authenticated fetch for file uploads (FormData).
 * Does NOT set Content-Type so the browser can add multipart boundary.
 */
export async function authUpload<T = unknown>(
  url: string,
  formData: FormData,
  method: 'POST' | 'PUT' | 'PATCH' = 'POST',
): Promise<T | null> {
  const token = getToken();
  try {
    const response = await fetch(url, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (response.status === 401) {
      handleSessionExpired();
      return null;
    }
    if (!response.ok) {
      const err: { message?: string; errorId?: string } = await response.json().catch(() => ({}));
      let errMsg = err.message || response.statusText || 'Chyba uploadu';
      if (err.errorId) {
        errMsg += ` (ID: ${err.errorId})`;
      }
      throw new Error(errMsg);
    }
    if (response.status === 204) return true as unknown as T;
    return (await response.json()) as T;
  } catch (error: unknown) {
    let msg = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('Upload Error:', error);

    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('Network')) && !navigator.onLine) {
      msg = 'Nahrávání selhalo: Jste offline.';
    }

    showToast(msg, 'error');
    return null;
  }
}

// ─── Toast Notifications ──────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

const ICON_MAP: Record<ToastType, string> = {
  success: '✓',
  error: '!',
  info: '',
};

export function showToast(message: string, type: ToastType = 'info'): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = ICON_MAP[type] ? `<span style="font-weight: 600; margin-right: 8px;">${ICON_MAP[type]}</span>` : '';
  toast.innerHTML = `${icon}<span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─── In-Memory Cache ──────────────────────────────────────────────────

const _cache: Record<string, { data: unknown; ts: number }> = {};

/**
 * Cached GET fetch. Returns cached data if within TTL, otherwise fetches fresh.
 */
export async function cachedFetch<T = unknown>(
  url: string,
  ttlMs: number = 60_000,
): Promise<T | null> {
  const now = Date.now();
  const cached = _cache[url];
  if (cached && now - cached.ts < ttlMs) {
    return cached.data as T;
  }
  const data = await authFetch<T>(url);
  if (data !== null) {
    _cache[url] = { data, ts: now };
  }
  return data;
}

/**
 * Invalidate cache entries matching a prefix / substring.
 */
export function invalidateCache(prefix: string): void {
  for (const key of Object.keys(_cache)) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      delete _cache[key];
    }
  }
}

// ─── DOM Helpers ──────────────────────────────────────────────────────

/** Shorthand for getElementById with type assertion */
export function $<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Shorthand for querySelector with type assertion */
export function $$<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: Document | HTMLElement = document,
): T | null {
  return root.querySelector<T>(selector);
}

/** Show an element (remove .hidden) */
export function show(el: HTMLElement | null): void {
  el?.classList.remove('hidden');
}

/** Hide an element (add .hidden) */
export function hide(el: HTMLElement | null): void {
  el?.classList.add('hidden');
}

/** Toggle .hidden */
export function toggle(el: HTMLElement | null, visible?: boolean): void {
  if (!el) return;
  if (visible !== undefined) {
    el.classList.toggle('hidden', !visible);
  } else {
    el.classList.toggle('hidden');
  }
}

// ─── Modal Helpers ────────────────────────────────────────────────────

export function openModal(overlay: HTMLElement | null): void {
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.classList.add('open');
  }
}

export function closeModal(overlay: HTMLElement | null): void {
  if (overlay) {
    overlay.classList.remove('open');
    overlay.classList.add('hidden');
  }
}

// ─── Date / Format Helpers ────────────────────────────────────────────

/** Format ISO date string to localized Czech date */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format ISO date string to short date */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ');
}

/** Simple Czech pluralization helper */
export function pluralizeCzech(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count);
  if (abs === 1) return one;
  if (abs >= 2 && abs <= 4) return few;
  return many;
}

/** Simple JWT payload decoder (no signature verification) */
export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string,
): T | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// ─── Utility: Počítadlo znaků ─────────────────────────────────────────

export function setupCharCounters(container: HTMLElement | Document = document) {
  const textareas = container.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>('textarea[maxlength], input[type="text"][maxlength]');
  textareas.forEach(el => {
    // Umožníme mít counter rovnou za inputem (na stejné úrovni), nebo obalený
    const counterEl = el.parentElement?.querySelector('.char-counter') || el.nextElementSibling;
    if (counterEl && counterEl.classList.contains('char-counter')) {
      const update = () => {
        counterEl.textContent = `${el.value.length} / ${el.maxLength}`;
      };
      // Zabráníme vícenásobnému event listeneru při opětovném volání
      el.removeEventListener('input', update);
      el.addEventListener('input', update);
      update();
    }
  });
}

// ─── Utility: České skloňování ────────────────────────────────────────

/**
 * Czech pluralization helper.
 * Returns form1 for count=1, form2 for count=2–4, form5 for count=0 or 5+.
 * Example: pluralize(3, 'Rezervace', 'Rezervace', 'Rezervací') → 'Rezervace'
 */
export function pluralize(count: number, form1: string, form2: string, form5: string): string {
  const abs = Math.abs(count);
  if (abs === 1) return form1;
  if (abs >= 2 && abs <= 4) return form2;
  return form5;
}

// ─── Utility: Custom UI Form Validation ───────────────────────────────────

/**
 * Validuje formulář a vykresluje vlastní chybové hlášky místo HTML5 bublin.
 * @returns true pokud je formulář validní a odeslání může pokračovat.
 */
export function validateForm(form: HTMLFormElement): boolean {
  // 1. Vypnutí nativní validace
  form.setAttribute('novalidate', 'true');

  // 2. Kontrola platnosti
  if (form.checkValidity()) {
    // Odstranění předchozích chyb (pro jistotu)
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
    return true;
  }

  // Zpracování chyb - projít všechny inputy
  let firstInvalid: HTMLElement | null = null;
  for (const element of Array.from(form.elements)) {
    const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    // Ignorujeme elementy, které nepodporují validaci
    if (!('validity' in el)) continue;

    if (el.validity.valid) {
      el.classList.remove('is-invalid');
      const existingError = el.parentElement?.querySelector('.field-error-msg');
      if (existingError) existingError.remove();
      continue;
    }

    // Aplikace chybového stavu
    el.classList.add('is-invalid');
    if (!firstInvalid) firstInvalid = el;

    // Změna textu podle typu chyby (lokalizace HTML5 zpráv)
    let errorMsg = el.validationMessage;
    if (el.validity.valueMissing) errorMsg = 'Toto pole je povinné.';
    else if (el.validity.tooLong && 'maxLength' in el && el.maxLength > 0) errorMsg = `Maximální délka je ${el.maxLength} znaků.`;
    else if (el.validity.tooShort && 'minLength' in el && el.minLength > 0) errorMsg = `Minimální délka je ${el.minLength} znaků.`;
    else if (el.validity.typeMismatch && el.type === 'email') errorMsg = 'Zadejte platný e-mail.';

    // Vložení/Aktualizace elementu s chybou
    let errorDiv = el.parentElement?.querySelector('.field-error-msg') as HTMLElement;
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'field-error-msg';
      el.insertAdjacentElement('afterend', errorDiv);
    }
    errorDiv.textContent = errorMsg;

    // Pridani listeneru pro odstranění chyby při psaní
    const removeError = () => {
      el.classList.remove('is-invalid');
      if (errorDiv && errorDiv.parentNode) errorDiv.remove();
      el.removeEventListener('input', removeError);
      el.removeEventListener('change', removeError);
    };
    el.addEventListener('input', removeError);
    el.addEventListener('change', removeError);
  }

  // Focus na pole a zatřepání formulářem
  if (firstInvalid) {
    firstInvalid.focus();
    form.classList.remove('form-shake');
    // malý timeout pro re-trigger animace
    setTimeout(() => {
      form.classList.add('form-shake');
    }, 10);
  }

  return false;
}
