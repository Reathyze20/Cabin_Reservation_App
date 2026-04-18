/**
 * lib/utils.ts — Utility funkce
 * cn() = clsx + tailwind-merge (shadcn/ui standard)
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  const normalized = Math.abs(count)

  if (normalized === 1) return one
  if (normalized >= 2 && normalized <= 4) return few

  return many
}

export function formatCount(count: number, one: string, few: string, many: string): string {
  return `${count} ${pluralize(count, one, few, many)}`
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const DAY_NAMES_FULL = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle']

export { MONTH_NAMES, DAY_NAMES, DAY_NAMES_FULL }

/** Formats ISO date "YYYY-MM-DD" → "DD.MM.YYYY" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** Formats ISO timestamp → relative time string */
export function timeAgo(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'Před chvílí'
  if (diff < 3600) return `Před ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Před ${Math.floor(diff / 3600)} hod`
  if (diff < 604800) return `Před ${Math.floor(diff / 86400)} dny`
  return formatDate(isoString.slice(0, 10))
}

/** Escapes HTML entities (for safe innerHTML insertion) */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const ANIMAL_EMOJIS = [
  '🐻','🦊','🐼','🐨','🐯','🦁','🐸','🐧','🦆','🦅',
  '🦉','🦋','🐢','🦎','🐙','🦀','🐬','🐳','🦈','🐘',
  '🦒','🦓','🦏','🦛','🐪','🦘','🦙','🦔','🐿️','🦡',
]

export const SWATCH_COLORS = [
  '#2d6a4f',  // forest green
  '#40916c',  // medium green
  '#52b788',  // light green
  '#bf6c3d',  // terracotta/rust
  '#c68b3f',  // golden amber
  '#7a5b42',  // dark wood brown
  '#a0522d',  // sienna
  '#6b7c47',  // olive
  '#8fa37a',  // sage
  '#c1877a',  // dusty rose/clay
  '#d4956a',  // warm sand/peach
  '#6b7280',  // stone gray
  '#5c7a6b',  // muted teal-green
  '#7d6c5a',  // warm taupe
  '#8b6914',  // dark gold/mustard
  '#4a6741',  // dark olive
]
