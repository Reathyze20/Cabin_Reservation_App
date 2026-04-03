/**
 * Shopping feature constants — shared across PantryView, EditInventoryModal, etc.
 */

export const CATEGORY_ORDER = ['TRVANLIVÉ', 'NÁPOJE', 'HYGIENA', 'KOŘENÍ', 'OSTATNÍ'] as const
export type InventoryCategory = typeof CATEGORY_ORDER[number]

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  'TRVANLIVÉ': 'Trvanlivé',
  'NÁPOJE': 'Nápoje',
  'HYGIENA': 'Hygiena',
  'KOŘENÍ': 'Koření',
  'OSTATNÍ': 'Ostatní',
}
