import { z } from "zod";

// Auth validators
export const loginSchema = z.object({
  username: z.string().min(3, "Uživatelské jméno musí mít alespoň 3 znaky").max(50, "Maximální délka je 50 znaků"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100, "Maximální délka je 100 znaků"),
});

export const registerSchema = z.object({
  // Cabin (workspace) fields
  cabinName: z.string()
    .min(2, "Název chaty musí mít alespoň 2 znaky")
    .max(100, "Název chaty je příliš dlouhý (max 100 znaků)"),
  subdomain: z.string()
    .min(2, "Subdoména musí mít alespoň 2 znaky")
    .max(50, "Subdoména je příliš dlouhá (max 50 znaků)")
    .regex(/^[a-z0-9-]+$/, "Subdoména může obsahovat jen malá písmena, čísla a pomlčky")
    .optional(),
  weatherLocation: z.string()
    .min(2, "Nejbližší město nebo PSČ musí mít alespoň 2 znaky")
    .max(100, "Lokalita je příliš dlouhá (max 100 znaků)"),

  // User fields
  username: z.string()
    .min(2, "Uživatelské jméno musí mít alespoň 2 znaky")
    .max(50, "Maximální délka je 50 znaků"),
  email: z.string()
    .email("Neplatný formát e-mailu")
    .max(255, "E-mail je příliš dlouhý"),
  password: z.string()
    .min(8, "Heslo musí mít alespoň 8 znaků")
    .max(100, "Maximální délka je 100 znaků"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Neplatný formát barvy").optional(),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string()
    .trim()
    .min(2, "Zadejte e-mail nebo uživatelské jméno")
    .max(255, "Zadaná hodnota je příliš dlouhá"),
});

export const resetPasswordSchema = z.object({
  token: z.string()
    .trim()
    .min(20, "Resetovací token je neplatný"),
  password: z.string()
    .min(8, "Heslo musí mít alespoň 8 znaků")
    .max(100, "Maximální délka je 100 znaků"),
});

// Reservation validators
export const createReservationSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  purpose: z.string().min(1, "Účel je povinný").max(100, "Maximální délka je 100 znaků"),
  notes: z.string().max(1000, "Maximální délka je 1000 znaků").optional(),
  handoverNote: z.string().max(1000, "Maximální délka je 1000 znaků").optional(),
}).refine(data => new Date(data.to) >= new Date(data.from), {
  message: "Datum odjezdu nesmí být před příjezdem",
  path: ["to"],
});

export const updateReservationSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data").optional(),
  purpose: z.string().min(1, "Účel je povinný").max(100, "Maximální délka je 100 znaků").optional(),
  notes: z.string().max(1000, "Maximální délka je 1000 znaků").optional(),
  handoverNote: z.string().max(1000, "Maximální délka je 1000 znaků").optional(),
  status: z.enum(["soft", "primary"]).optional(),
}).refine(data => {
  if (data.from && data.to) {
    return new Date(data.to) >= new Date(data.from);
  }
  return true;
}, {
  message: "Datum odjezdu nesmí být před příjezdem",
  path: ["to"],
});

// Shopping list validators
export const createShoppingItemSchema = z.object({
  name: z.string().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
  listName: z.string().max(100, "Maximální délka je 100 znaků").optional(), // Added for dual validation
  isEssential: z.boolean().optional().default(false),
  sourceMessageId: z.string().uuid().optional(),
});

export const updatePurchaseSchema = z.object({
  purchased: z.boolean(),
  price: z.number().positive().optional(),
  splitWith: z.array(z.string().uuid()).optional(),
});

// Inventory validators
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
  category: z.string().optional().default("OSTATNÍ"),
  status: z.enum(["OK", "LOW", "EMPTY"]).optional().default("OK"),
  location: z.string().max(100, "Maximální délka je 100 znaků").optional().nullable(),
  isEssential: z.boolean().optional().default(false),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(100, "Maximální délka je 100 znaků").optional(),
  category: z.string().optional(),
  status: z.enum(["OK", "LOW", "EMPTY"]).optional(),
  location: z.string().max(100, "Maximální délka je 100 znaků").optional().nullable(),
  isEssential: z.boolean().optional(),
});

// Note / Message validators
export const createNoteSchema = z.object({
  message: z.string().min(1, "Zpráva je povinná").max(2000, "Maximální délka je 2000 znaků"),
  threadName: z.string().max(100, "Maximální délka je 100 znaků").optional(),
  replyToId: z.string().uuid("Neplatné ID zprávy").optional().nullable(),
});

// Used by POST /api/channels/messages and POST /api/channels/:id/messages
export const createMessageSchema = z.object({
  message: z.string().trim().min(1, "Zpráva nesmí být prázdná").max(2000, "Maximální délka je 2000 znaků"),
  replyToId: z.string().uuid("Neplatné ID zprávy").optional().nullable(),
});

export const editNoteSchema = z.object({
  message: z.string().min(1, "Zpráva je povinná").max(2000, "Maximální délka je 2000 znaků"),
});

export const createChannelSchema = z.object({
  name: z.string().trim().min(1, "Název kanálu nesmí být prázdný").max(100, "Název kanálu je příliš dlouhý (max 100 znaků)"),
});

const ALLOWED_REACTION_EMOJI = ["👍", "❤️", "😂", "✅"] as const;
export const noteReactionSchema = z.object({
  emoji: z.enum(ALLOWED_REACTION_EMOJI, { message: "Nepovolený emoji" }),
});

// Gallery validators
export const createFolderSchema = z.object({
  name: z.string().min(1, "Název složky je povinný").max(100, "Maximální délka je 100 znaků"),
});

export const uploadPhotoSchema = z.object({
  folderId: z.string().uuid("Neplatné ID složky"),
  imageBase64: z.string().min(1, "Chybí obrázek"),
  title: z.string().max(100, "Maximální délka je 100 znaků").optional(),
  description: z.string().max(500, "Maximální délka je 500 znaků").optional(),
});

export const updatePhotoSchema = z.object({
  description: z.string().max(500, "Maximální délka je 500 znaků").optional(),
});

// Diary validators
export const createDiaryFolderSchema = z.object({
  name: z.string().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
});

export const createDiaryEntrySchema = z.object({
  folderId: z.string().uuid("Neplatné ID složky"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  title: z.string().max(100, "Maximální délka je 100 znaků").optional(),
  content: z.string().min(1, "Obsah je povinný").max(20000, "Maximální délka je 20000 znaků"),
  galleryPhotoIds: z.array(z.string().uuid()).optional(),
});

// Reconstruction validators
const reconstructionStatusSchema = z.enum([
  "pending",
  "contacted",
  "approved",
  "rejected",
  "done",
]);

export const createReconstructionItemSchema = z.object({
  category: z.enum(["idea", "company", "task"], {
    error: "Kategorie musí být idea, company nebo task",
  }),
  title: z.string().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
  description: z.string().max(2000, "Maximální délka je 2000 znaků").optional(),
  link: z.string().url("Neplatný formát URL").max(1000, "Maximální délka je 1000 znaků").optional().or(z.literal("")),
  thumbnail: z.string().max(1000, "Maximální délka je 1000 znaků").optional(),
  cost: z.number().positive().max(999999999, "Maximální hodnota je 999 999 999").optional(),
  status: reconstructionStatusSchema.optional(),
  sourceMessageId: z.string().uuid().optional(),
});

export const updateReconstructionStatusSchema = z.object({
  status: reconstructionStatusSchema,
});

// User management validators
export const changeRoleSchema = z.object({
  role: z.enum(["admin", "user", "guest"]),
});

export const changePasswordSchema = z.object({
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100, "Maximální délka je 100 znaků"),
});

// Reservation — monthly note
export const upsertMonthlyNoteSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  text: z.string().max(2000, "Maximální délka je 2000 znaků"),
});

// Reservation — delete body
export const deleteReservationSchema = z.object({
  id: z.string().uuid("Neplatné ID rezervace"),
});

// Reservation — checkout
export const completeCheckoutSchema = z.object({
  reservationId: z.string().uuid("Neplatné ID rezervace"),
});

// Shopping list item — status update
export const updateItemStatusSchema = z.object({
  status: z.enum(["pending", "bring_from_home", "purchased"]).optional(),
  purchased: z.boolean().optional(),
  price: z.coerce.number().positive().optional().nullable(),
  splitWith: z.array(z.string().uuid()).optional(),
});

// Shopping lists
export const createShoppingListSchema = z.object({
  name: z.string().trim().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
});

export const renameShoppingListSchema = z.object({
  name: z.string().trim().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
});

// Gallery — rename folder
export const renameFolderSchema = z.object({
  name: z.string().trim().min(1, "Název složky je povinný").max(100, "Maximální délka je 100 znaků"),
});

// Gallery — update photo description
export const updatePhotoDescriptionSchema = z.object({
  description: z.string().max(500, "Maximální délka je 500 znaků").optional().nullable(),
});

// Gallery — bulk delete photos
export const bulkDeletePhotosSchema = z.object({
  photoIds: z.array(z.string().uuid("Neplatné ID fotky")).min(1, "Žádné fotky k vymazání").max(100, "Maximálně 100 fotek najednou"),
});

// Diary — rename folder / update activityTag
export const renameDiaryFolderSchema = z.object({
  name: z.string().trim().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
  activityTag: z.string().max(50).optional().nullable(),
});

// Diary — update entry
export const updateDiaryEntrySchema = z.object({
  content: z.string().min(1, "Obsah je povinný").max(20000, "Maximální délka je 20000 znaků"),
  galleryPhotoIds: z.array(z.string().uuid()).optional(),
});

// Reconstruction — full update (extends create schema with all optional fields)
export const updateReconstructionItemSchema = z.object({
  category: z.enum(["idea", "company", "task"]),
  title: z.string().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
  description: z.string().max(2000, "Maximální délka je 2000 znaků").optional(),
  link: z.string().url("Neplatný formát URL").max(1000).optional().or(z.literal("")).or(z.literal(null)),
  thumbnail: z.string().max(1000).optional().nullable(),
  cost: z.coerce.number().positive().max(999999999).optional().nullable(),
  status: reconstructionStatusSchema.optional(),
  tag: z.string().max(50).optional().nullable(),
  specialization: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().or(z.literal("")).or(z.literal(null)),
  phone: z.string().max(30).optional().nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// Workspace — handover note
export const updateHandoverNoteSchema = z.object({
  note: z.string().max(300, "Maximální délka je 300 znaků"),
});

// Inventory — add to cart
export const addToCartSchema = z.object({
  listId: z.string().uuid().optional(),
  newListName: z.string().trim().max(100).optional(),
});

// Cabin settings
export const updateCabinSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  welcomeMessage: z.string().max(300).optional().nullable(),
  rules: z.string().max(5000).optional().nullable(),
  departureChecklist: z.array(z.string().max(100)).max(15).optional().nullable(),
  coverPhotoUrl: z.string().max(1000).optional().nullable(),
  weatherLocation: z.string().max(100).optional().nullable(),
  isWinterized: z.boolean().optional(),
  features: z.record(z.string(), z.boolean()).optional().nullable(),
});

// Cabin create
export const createCabinSchema = z.object({
  name: z.string().trim().min(2, "Název chaty musí mít alespoň 2 znaky").max(100, "Maximální délka je 100 znaků"),
});

// Note threads
export const createNoteThreadSchema = z.object({
  name: z.string().trim().min(1, "Název vlákna je povinný").max(100, "Maximální délka je 100 znaků"),
});

// Users — admin create
export const createUserSchema = z.object({
  username: z.string().trim().min(2, "Jméno musí mít alespoň 2 znaky").max(50, "Maximální délka je 50 znaků"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100),
  role: z.enum(["admin", "user", "guest"]).optional().default("user"),
});

// Users — update profile
export const updateProfileSchema = z.object({
  email: z.string().email("Neplatný e-mail").optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Neplatná barva").optional(),
  animalIcon: z.string().max(50).optional(),
});

// Users — change own password
export const changeMyPasswordSchema = z.object({
  oldPassword: z.string().min(1, "Staré heslo je povinné"),
  newPassword: z.string().min(8, "Nové heslo musí mít alespoň 8 znaků").max(100),
});

// Users — admin update user
export const adminUpdateUserSchema = z.object({
  role: z.enum(["admin", "user", "guest"]).optional(),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100).optional(),
});

// Auth — verify email
export const verifyEmailSchema = z.object({
  username: z.string().trim().min(1, "Uživatelské jméno je povinné"),
  code: z.string().trim().min(1, "Kód je povinný"),
});

// Invites — create
export const createInviteSchema = z.object({
  role: z.enum(["admin", "user", "guest"]).default("user"),
  maxUses: z.number().int().min(1).max(100).nullable().optional(),
  expiresInDays: z.number().int().min(1).max(365).default(7),
});

export const sendInviteEmailSchema = z.object({
  email: z.string().trim().email("Neplatná e-mailová adresa").max(255, "E-mail je příliš dlouhý"),
});

// Invites — accept
export const acceptInviteSchema = z.object({
  username: z.string().trim().min(2, "Jméno musí mít alespoň 2 znaky").max(50),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100),
  email: z.string().email("Neplatný e-mail").optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Neplatná barva").optional(),
  animalIcon: z.string().max(50).optional(),
});

// Superadmin — create user
export const superadminCreateUserSchema = z.object({
  username: z.string().trim().min(2, "Jméno musí mít alespoň 2 znaky").max(50),
  email: z.string().email("Neplatný e-mail"),
  role: z.enum(["admin", "user", "guest"]).optional().default("user"),
});
