/**
 * common.js — Shared utilities for all pages
 * Include via <script src="common.js"></script> BEFORE page-specific JS
 */

// ─── Register Service Worker ────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}

const Common = (() => {
  // ─── Auth state ──────────────────────────────────────────────
  const token = localStorage.getItem("authToken");
  const username = localStorage.getItem("username");
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  /**
   * Check login and toggle app/auth containers.
   * Returns true if user is logged in, false otherwise.
   */
  function checkAuth(appContainer, authContainer, usernameEl) {
    if (username && token) {
      if (appContainer) appContainer.classList.remove("hidden");
      if (authContainer) authContainer.classList.add("hidden");
      if (usernameEl) usernameEl.textContent = username;
      return true;
    } else {
      if (appContainer) appContainer.classList.add("hidden");
      if (authContainer) authContainer.classList.remove("hidden");
      return false;
    }
  }

  /**
   * Attach logout handler to a button.
   */
  function setupLogout(button) {
    if (!button) return;
    button.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  }

  /**
   * Handle 401 — session expired.
   */
  function handleSessionExpired() {
    localStorage.clear();
    window.location.href = "index.html";
  }

  /**
   * Authenticated fetch wrapper.
   * Automatically adds Authorization header, handles 401 redirect,
   * parses JSON, and shows toast on errors for mutating methods.
   *
   * @param {string} url
   * @param {RequestInit & { silent?: boolean }} options
   * @returns {Promise<any|null>}
   */
  async function authFetch(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        handleSessionExpired();
        return null;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || response.statusText || "Chyba serveru");
      }
      // DELETE with 200 often returns a message, but some return 204
      if (response.status === 204) return true;
      return response.json();
    } catch (error) {
      console.error("API Error:", error);
      // Only show toast for mutating actions unless caller opts out
      if (!options.silent && ["DELETE", "POST", "PATCH", "PUT"].includes((options.method || "").toUpperCase())) {
        showToast(error.message, "error");
      }
      return null;
    }
  }

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {"success"|"error"|"info"} type
   */
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const iconClass =
      type === "success"
        ? "fa-check-circle"
        : type === "error"
        ? "fa-exclamation-circle"
        : "fa-info-circle";
    toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => toast.classList.add("show"));

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── sessionStorage Cache ────────────────────────────────────
  const _cache = {};

  /**
   * Cached GET fetch. Returns cached data if within TTL, otherwise fetches fresh.
   * Only caches GET requests. Mutating requests auto-invalidate related keys.
   *
   * @param {string} url - API URL (also used as cache key)
   * @param {number} ttlMs - Time-to-live in ms (default 60 s)
   * @returns {Promise<any|null>}
   */
  async function cachedFetch(url, ttlMs = 60_000) {
    const now = Date.now();
    const cached = _cache[url];
    if (cached && now - cached.ts < ttlMs) {
      return cached.data;
    }
    const data = await authFetch(url);
    if (data !== null) {
      _cache[url] = { data, ts: now };
    }
    return data;
  }

  /**
   * Invalidate cache entries matching a prefix.
   * Call after POST/PUT/DELETE to ensure stale data is cleared.
   * @param {string} prefix - URL prefix to match (e.g. "/api/gallery")
   */
  function invalidateCache(prefix) {
    for (const key of Object.keys(_cache)) {
      if (key.startsWith(prefix) || key.includes(prefix)) {
        delete _cache[key];
      }
    }
  }

  // Public API
  return {
    token,
    username,
    userId,
    role,
    checkAuth,
    setupLogout,
    authFetch,
    cachedFetch,
    invalidateCache,
    showToast,
    handleSessionExpired,
  };
})();
