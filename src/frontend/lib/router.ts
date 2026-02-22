/* ============================================================================
   lib/router.ts — Minimal hash-based SPA router
   ============================================================================ */

export interface Route {
  /** Hash path, e.g. "/reservations" */
  path: string;
  /** Human-readable label for nav */
  label: string;
  /** Font Awesome icon class */
  icon: string;
  /** Lazy-load the page module */
  loader: () => Promise<PageModule>;
  /** Only show in nav when this returns true */
  guard?: () => boolean;
  /** CSS class added to the nav link */
  navClass?: string;
}

export interface PageModule {
  /** Called when the route becomes active. Receives the container element. */
  mount(container: HTMLElement): void | Promise<void>;
  /** Called when navigating away. Clean up event listeners, timers, etc. */
  unmount?(): void;
}

// ─── Route Table ──────────────────────────────────────────────────────

const isAdmin = () => localStorage.getItem('role') === 'admin';

export const routes: Route[] = [
  {
    path: '/dashboard',
    label: 'Přehled',
    icon: 'fa-home',
    loader: () => import('../pages/dashboard').then((m) => m.default),
  },
  {
    path: '/reservations',
    label: 'Rezervace',
    icon: 'fa-calendar-alt',
    loader: () => import('../pages/reservations').then((m) => m.default),
  },
  {
    path: '/notes',
    label: 'Chat',
    icon: 'fa-comments',
    loader: () => import('../pages/notes').then((m) => m.default),
  },
  {
    path: '/shopping',
    label: 'Nákupy',
    icon: 'fa-shopping-cart',
    loader: () => import('../pages/shopping').then((m) => m.default),
  },
  {
    path: '/gallery',
    label: 'Galerie',
    icon: 'fa-images',
    loader: () => import('../pages/gallery').then((m) => m.default),
  },
  {
    path: '/diary',
    label: 'Deník',
    icon: 'fa-book-open',
    loader: () => import('../pages/diary').then((m) => m.default),
  },
  {
    path: '/reconstruction',
    label: 'Rekonstrukce',
    icon: 'fa-hammer',
    loader: () => import('../pages/reconstruction').then((m) => m.default),
  },
  {
    path: '/admin',
    label: 'Admin',
    icon: 'fa-cog',
    loader: () => import('../pages/admin').then((m) => m.default),
    guard: isAdmin,
  },
];

// ─── Router State ─────────────────────────────────────────────────────

let currentModule: PageModule | null = null;
let currentPath: string = '';
let appContainer: HTMLElement | null = null;
let navContainer: HTMLElement | null = null;
let mobileNavContainer: HTMLElement | null = null;

/** Routes to show in mobile bottom nav (limited space) */
const MOBILE_NAV_PATHS = ['/dashboard', '/reservations', '/shopping', '/gallery', '/diary'];

/** Get the hash path, e.g. "#/gallery" → "/gallery" */
function getHashPath(): string {
  const hash = window.location.hash.slice(1); // remove "#"
  return hash || '/dashboard'; // default route
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────

function buildSkeleton(path: string): string {
  switch (path) {
    case '/dashboard':
      return `<div class="skeleton-page">
        <div class="skeleton skeleton-title" style="width:60%"></div>
        <div class="skeleton skeleton-text short" style="margin-bottom:1rem"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
          <div class="skeleton" style="height:180px;border-radius:12px"></div>
          <div class="skeleton" style="height:180px;border-radius:12px"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="skeleton" style="height:200px;border-radius:12px"></div>
          <div class="skeleton" style="height:200px;border-radius:12px"></div>
          <div class="skeleton" style="height:200px;border-radius:12px"></div>
          <div class="skeleton" style="height:200px;border-radius:12px"></div>
        </div>
      </div>`;
    case '/reservations':
      return `<div class="skeleton-page">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-calendar"></div>
        <div class="skeleton skeleton-text long"></div>
        <div class="skeleton skeleton-text medium"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>`;
    case '/gallery':
      return `<div class="skeleton-page">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton-grid">
          ${Array(8).fill('<div class="skeleton skeleton-photo"></div>').join('')}
        </div>
      </div>`;
    case '/diary':
      return `<div class="skeleton-page">
        <div class="skeleton skeleton-title"></div>
        ${Array(3).fill(`<div class="skeleton-card skeleton">
          <div class="skeleton skeleton-text long"></div>
          <div class="skeleton skeleton-text medium"></div>
        </div>`).join('')}
      </div>`;
    default:
      return `<div class="skeleton-page">
        <div class="skeleton skeleton-title"></div>
        ${Array(4).fill(`<div class="skeleton-list-item">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-list-text">
            <div class="skeleton skeleton-text long"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>`).join('')}
      </div>`;
  }
}

// ─── Navigation ───────────────────────────────────────────────────────

export function navigate(path: string): void {
  window.location.hash = `#${path}`;
}

async function handleRouteChange(): Promise<void> {
  const path = getHashPath();

  // Don't re-mount if same route
  if (path === currentPath && currentModule) return;

  const route = routes.find((r) => r.path === path);
  if (!route) {
    // fallback to dashboard
    navigate('/dashboard');
    return;
  }

  // Check guard
  if (route.guard && !route.guard()) {
    navigate('/dashboard');
    return;
  }

  // Unmount current page
  if (currentModule?.unmount) {
    currentModule.unmount();
  }

  // Clear container — show skeleton loader while page loads
  if (appContainer) {
    appContainer.innerHTML = buildSkeleton(path);
  }

  // Update active nav link
  updateActiveNav(path);

  try {
    const mod = await route.loader();
    currentModule = mod;
    currentPath = path;

    if (appContainer) {
      appContainer.innerHTML = '';
      await mod.mount(appContainer);
    }
  } catch (err) {
    console.error('Failed to load page:', err);
    if (appContainer) {
      appContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #999;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>Nepodařilo se načíst stránku.</p>
        </div>`;
    }
  }
}

function updateActiveNav(path: string): void {
  // Desktop nav
  if (navContainer) {
    navContainer.querySelectorAll('.nav-link').forEach((link) => {
      const href = link.getAttribute('data-route');
      link.classList.toggle('active', href === path);
    });
  }
  // Mobile nav
  if (mobileNavContainer) {
    mobileNavContainer.querySelectorAll('.mobile-nav-link').forEach((link) => {
      const href = link.getAttribute('data-route');
      link.classList.toggle('active', href === path);
    });
  }
}

// ─── Build Nav ────────────────────────────────────────────────────────

function buildNav(): void {
  // Desktop nav
  if (navContainer) {
    navContainer.innerHTML = '';
    for (const route of routes) {
      if (route.guard && !route.guard()) continue;
      const a = document.createElement('a');
      a.className = `nav-link${route.navClass ? ' ' + route.navClass : ''}`;
      a.setAttribute('data-route', route.path);
      a.href = `#${route.path}`;
      a.innerHTML = `<i class="fas ${route.icon}"></i> ${route.label}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(route.path);
      });
      a.addEventListener('mouseenter', () => {
        route.loader().catch(() => { });
      }, { once: true });
      navContainer.appendChild(a);
    }
  }

  // Mobile bottom nav
  if (mobileNavContainer) {
    mobileNavContainer.innerHTML = '';
    for (const route of routes) {
      if (route.guard && !route.guard()) continue;
      if (!MOBILE_NAV_PATHS.includes(route.path)) continue;
      const a = document.createElement('a');
      a.className = 'mobile-nav-link';
      a.setAttribute('data-route', route.path);
      a.href = `#${route.path}`;
      a.innerHTML = `<i class="fas ${route.icon}"></i><span>${route.label}</span>`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(route.path);
      });
      mobileNavContainer.appendChild(a);
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────

export function initRouter(
  container: HTMLElement,
  nav: HTMLElement,
): void {
  appContainer = container;
  navContainer = nav;
  mobileNavContainer = document.getElementById('mobile-nav');

  buildNav();

  window.addEventListener('hashchange', handleRouteChange);
  // Initial route
  handleRouteChange();
}

/** Rebuild nav (e.g. after login when role becomes known) */
export function refreshNav(): void {
  buildNav();
}

/** Destroy the router (cleanup) */
export function destroyRouter(): void {
  window.removeEventListener('hashchange', handleRouteChange);
  if (currentModule?.unmount) {
    currentModule.unmount();
  }
  currentModule = null;
  currentPath = '';
}
