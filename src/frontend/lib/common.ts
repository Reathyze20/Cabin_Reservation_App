/* ============================================================================
   lib/common.ts — Shared utilities (ES-module replacement for Common IIFE)
   ============================================================================ */

// ─── Auth state ──────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem('authToken');
}
export function getUsername(): string | null {
  return localStorage.getItem('username');
}
export function getUserId(): string | null {
  return localStorage.getItem('userId');
}
export function getRole(): string | null {
  return localStorage.getItem('role');
}

export function isLoggedIn(): boolean {
  return !!(getToken() && getUsername());
}

export function isAdmin(): boolean {
  return getRole() === 'admin';
}

/** Store auth data after login */
export function setAuth(data: {
  token: string;
  username: string;
  userId: string;
  role: string;
}): void {
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('username', data.username);
  localStorage.setItem('userId', data.userId);
  localStorage.setItem('role', data.role);
}

/** Clear all auth data and navigate to login */
export function logout(): void {
  localStorage.clear();
  // Let the router handle navigation
  window.location.hash = '#/';
  window.location.reload();
}

/** Handle 401 — session expired */
export function handleSessionExpired(): void {
  localStorage.clear();
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
      const err: { message?: string } = await response.json().catch(() => ({}));
      throw new Error(err.message || response.statusText || 'Chyba serveru');
    }
    if (response.status === 204) return true as unknown as T;
    return (await response.json()) as T;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('API Error:', error);

    const method = (options.method || '').toUpperCase();
    if (!options.silent && ['DELETE', 'POST', 'PATCH', 'PUT'].includes(method)) {
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
      const err: { message?: string } = await response.json().catch(() => ({}));
      throw new Error(err.message || response.statusText || 'Chyba uploadu');
    }
    if (response.status === 204) return true as unknown as T;
    return (await response.json()) as T;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Neznámá chyba';
    console.error('Upload Error:', error);
    showToast(msg, 'error');
    return null;
  }
}

// ─── Toast Notifications ──────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

const ICON_MAP: Record<ToastType, string> = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  info: 'fa-info-circle',
};

export function showToast(message: string, type: ToastType = 'info'): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${ICON_MAP[type]}"></i><span>${message}</span>`;
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
