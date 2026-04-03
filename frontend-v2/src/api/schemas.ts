/**
 * schemas.ts — Centrální Zod schémata pro kritické API responses.
 *
 * Použití v query hooks:
 *   queryFn: async () => {
 *     const { data } = await apiClient.get('/endpoint')
 *     return DashboardDataSchema.parse(data)   // throws → React Query → error state
 *   }
 *
 * z.infer<typeof DashboardDataSchema> exportuje TS typ přímo ze schématu.
 */
import { z } from 'zod'

// ─── Dashboard ────────────────────────────────────────────────────────────────

const PendingShoppingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  listId: z.string(),
  listName: z.string(),
  isEssential: z.boolean(),
})

const ActiveReservationSchema = z.object({
  id: z.string(),
  username: z.string(),
  userColor: z.string().nullable(),
  userAnimalIcon: z.string().nullable().optional(),
  from: z.string(),
  to: z.string(),
  purpose: z.string(),
  handoverNote: z.string().nullable().optional(),
  isCheckoutCompleted: z.boolean().optional(),
})

const UpcomingReservationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  userColor: z.string().nullable(),
  userAnimalIcon: z.string().nullable().optional(),
  from: z.string(),
  to: z.string(),
  purpose: z.string(),
  status: z.string().optional(),
})

export const DashboardReservationsSchema = z.object({
  activeReservation: ActiveReservationSchema.nullable(),
  upcomingReservations: z.array(UpcomingReservationSchema),
  myNextReservation: z
    .object({ from: z.string(), to: z.string(), purpose: z.string() })
    .nullable()
    .optional(),
  departingToday: z.boolean(),
  nextFreeWeekend: z
    .object({ start: z.string(), end: z.string() })
    .nullable()
    .optional(),
})

export const DashboardShoppingSchema = z.object({
  pendingShoppingItems: z.array(PendingShoppingItemSchema),
  totalPendingShoppingCount: z.number(),
  essentialWarning: z
    .object({ count: z.number(), items: z.array(z.object({ name: z.string() })) })
    .nullable()
    .optional(),
})

export const DashboardNotesSchema = z.object({
  latestNotes: z.array(
    z.object({ id: z.string(), username: z.string(), message: z.string(), createdAt: z.string() })
  ),
  pinnedHandoverNote: z.string().nullable().optional(),
})

export type DashboardReservationsFromSchema = z.infer<typeof DashboardReservationsSchema>
export type DashboardShoppingFromSchema = z.infer<typeof DashboardShoppingSchema>
export type DashboardNotesFromSchema = z.infer<typeof DashboardNotesSchema>

// ─── Shopping ─────────────────────────────────────────────────────────────────

const ShoppingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'bring_from_home', 'purchased']),
  purchased: z.boolean(),
  addedById: z.string(),
  createdAt: z.string(),
  isEssential: z.boolean(),
  addedBy: z
    .object({ id: z.string(), username: z.string(), animalIcon: z.string().nullable().optional() })
    .optional(),
  purchasedBy: z
    .object({ id: z.string(), username: z.string(), animalIcon: z.string().nullable().optional() })
    .nullable()
    .optional(),
})

export const ShoppingListSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdById: z.string(),
  isResolved: z.boolean(),
  createdBy: z.object({ id: z.string(), username: z.string() }).optional(),
  items: z.array(ShoppingItemSchema),
})

export const ShoppingListArraySchema = z.array(ShoppingListSchema)

export type ShoppingListFromSchema = z.infer<typeof ShoppingListSchema>

// ─── Notes ────────────────────────────────────────────────────────────────────

const NoteReactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
  reacted: z.boolean(),
})

const NoteReplyToSchema = z.object({
  id: z.string(),
  message: z.string(),
  username: z.string(),
})

export const NoteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  message: z.string(),
  threadId: z.string().nullable(),
  createdAt: z.string(),
  isResolvedAsTask: z.boolean().optional(),
  editedAt: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  replyToId: z.string().nullable().optional(),
  replyTo: NoteReplyToSchema.nullable().optional(),
  reactions: z.array(NoteReactionSchema).optional(),
})

export const NoteArraySchema = z.array(NoteSchema)

export const NoteThreadSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  createdById: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  messageCount: z.number().optional(),
  lastMessage: z.string().nullable().optional(),
  lastMessageAt: z.string().nullable().optional(),
  lastMessageBy: z.string().nullable().optional(),
  hasUnread: z.boolean().optional(),
})

export const NoteThreadArraySchema = z.array(NoteThreadSchema)

export type NoteFromSchema = z.infer<typeof NoteSchema>
export type NoteThreadFromSchema = z.infer<typeof NoteThreadSchema>
