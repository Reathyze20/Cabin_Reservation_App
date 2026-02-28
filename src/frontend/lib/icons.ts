/* ============================================================================
   lib/icons.ts — Centralized inline SVG icon library
   Usage: import { icons } from '../lib/icons';
          el.innerHTML = `<button>${icons.edit()}</button>`;
   All icons use currentColor and accept optional size (default 16).
   ============================================================================ */

type IconFn = (size?: number) => string;

function svg(path: string, size: number, opts?: { fill?: boolean; viewBox?: string }): string {
  const vb = opts?.viewBox ?? '0 0 24 24';
  const fill = opts?.fill ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}" ${fill} aria-hidden="true" focusable="false">${path}</svg>`;
}

// ─── UI Controls ──────────────────────────────────────────────────────────────

/** Pencil — edit action */
export const edit: IconFn = (s = 16) => svg(
  `<path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/>
   <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
  s,
);

/** × — close / delete */
export const close: IconFn = (s = 16) => svg(
  `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  s,
);

/** Trash — delete / remove */
export const trash: IconFn = (s = 16) => svg(
  `<polyline points="3 6 5 6 21 6"/>
   <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
   <path d="M10 11v6"/><path d="M14 11v6"/>
   <path d="M9 6V4h6v2"/>`,
  s,
);

/** ✓ — checkmark */
export const check: IconFn = (s = 16) => svg(
  `<polyline points="20 6 9 17 4 12"/>`,
  s,
);

/** Check-circle — success / done state */
export const checkCircle: IconFn = (s = 32) => svg(
  `<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>`,
  s,
);

/** + — add / plus */
export const plus: IconFn = (s = 16) => svg(
  `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  s,
);

/** ← left arrow */
export const arrowLeft: IconFn = (s = 16) => svg(
  `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>`,
  s,
);

/** → right arrow */
export const arrowRight: IconFn = (s = 16) => svg(
  `<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`,
  s,
);

/** ↑ up arrow */
export const arrowUp: IconFn = (s = 16) => svg(
  `<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>`,
  s,
);

/** ↗ external link */
export const externalLink: IconFn = (s = 14) => svg(
  `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
   <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>`,
  s,
);

/** Eye — visible / show */
export const eye: IconFn = (s = 18) => svg(
  `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
   <circle cx="12" cy="12" r="3"/>`,
  s,
);

/** Eye off — hidden / hide */
export const eyeOff: IconFn = (s = 18) => svg(
  `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
   <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
   <line x1="1" y1="1" x2="23" y2="23"/>`,
  s,
);

// ─── Status / State Icons ─────────────────────────────────────────────────────

/** Alert / exclamation — important / essential */
export const alertCircle: IconFn = (s = 16) => svg(
  `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
  s,
);

/** House / home — cabin status */
export const house: IconFn = (s = 24) => svg(
  `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
   <polyline points="9 22 9 12 15 12 15 22"/>`,
  s,
);

/** Home (small) — "bring from home" */
export const homeSmall: IconFn = (s = 15) => svg(
  `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
   <polyline points="9 22 9 12 15 12 15 22"/>`,
  s,
);

/** Cloud off — weather unavailable */
export const cloudOff: IconFn = (s = 40) => svg(
  `<path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/>
   <line x1="1" y1="1" x2="23" y2="23"/>`,
  s,
);

// ─── Empty State Icons ────────────────────────────────────────────────────────

/** Lightbulb — ideas empty state */
export const lightbulb: IconFn = (s = 36) => svg(
  `<line x1="9" y1="18" x2="15" y2="18"/>
   <line x1="10" y1="22" x2="14" y2="22"/>
   <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>`,
  s,
);

/** Building — companies empty state */
export const building: IconFn = (s = 36) => svg(
  `<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
   <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
  s,
);

/** List / tasks — tasks empty state */
export const listChecks: IconFn = (s = 36) => svg(
  `<line x1="10" y1="6" x2="21" y2="6"/>
   <line x1="10" y1="12" x2="21" y2="12"/>
   <line x1="10" y1="18" x2="21" y2="18"/>
   <polyline points="3 6 4 7 6 5"/>
   <polyline points="3 12 4 13 6 11"/>
   <polyline points="3 18 4 19 6 17"/>`,
  s,
);

/** Upload cloud — file upload area */
export const cloudUpload: IconFn = (s = 40) => svg(
  `<polyline points="16 16 12 12 8 16"/>
   <line x1="12" y1="12" x2="12" y2="21"/>
   <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>`,
  s,
);

/** Folder open — empty gallery folder */
export const folderOpen: IconFn = (s = 36) => svg(
  `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
   <line x1="12" y1="11" x2="12" y2="17"/>
   <line x1="9" y1="14" x2="15" y2="14"/>`,
  s,
);

/** Shopping basket — shopping list empty */
export const shoppingBasket: IconFn = (s = 36) => svg(
  `<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
   <line x1="3" y1="6" x2="21" y2="6"/>
   <path d="M16 10a4 4 0 0 1-8 0"/>`,
  s,
);

/** Box — pantry empty state */
export const box: IconFn = (s = 36) => svg(
  `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
   <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
   <line x1="12" y1="22.08" x2="12" y2="12"/>`,
  s,
);

// ─── Barrel export (convenient namespace) ────────────────────────────────────

export const icons = {
  edit,
  close,
  trash,
  check,
  checkCircle,
  plus,
  arrowLeft,
  arrowRight,
  externalLink,
  eye,
  eyeOff,
  alertCircle,
  house,
  homeSmall,
  cloudOff,
  lightbulb,
  building,
  listChecks,
  cloudUpload,
  folderOpen,
  shoppingBasket,
  box,
  arrowUp,
} as const;
