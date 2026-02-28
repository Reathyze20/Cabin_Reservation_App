import { z } from "zod";

// Auth validators
export const loginSchema = z.object({
  username: z.string().min(3, "Uživatelské jméno musí mít alespoň 3 znaky").max(50, "Maximální délka je 50 znaků"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100, "Maximální délka je 100 znaků"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Uživatelské jméno musí mít alespoň 3 znaky").max(50, "Maximální délka je 50 znaků"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100, "Maximální délka je 100 znaků"),
  email: z.string().email("Neplatný e-mail").max(255, "Maximální délka je 255 znaků").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Neplatný formát barvy"),
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

// Note validators
export const createNoteSchema = z.object({
  message: z.string().min(1, "Zpráva je povinná").max(2000, "Maximální délka je 2000 znaků"),
  threadName: z.string().max(100, "Maximální délka je 100 znaků").optional(), // Added for dual validation
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
export const createReconstructionItemSchema = z.object({
  category: z.enum(["idea", "company", "task"], {
    error: "Kategorie musí být idea, company nebo task",
  }),
  title: z.string().min(1, "Název je povinný").max(100, "Maximální délka je 100 znaků"),
  description: z.string().max(2000, "Maximální délka je 2000 znaků").optional(),
  link: z.string().url("Neplatný formát URL").max(1000, "Maximální délka je 1000 znaků").optional().or(z.literal("")),
  thumbnail: z.string().max(1000, "Maximální délka je 1000 znaků").optional(),
  cost: z.number().positive().max(999999999, "Maximální hodnota je 999 999 999").optional(),
  status: z.enum(["pending", "approved", "done"]).optional(),
  sourceMessageId: z.string().uuid().optional(),
});

export const updateReconstructionStatusSchema = z.object({
  status: z.enum(["pending", "approved", "done"]),
});

// User management validators
export const changeRoleSchema = z.object({
  role: z.enum(["admin", "user", "guest"]),
});

export const changePasswordSchema = z.object({
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(100, "Maximální délka je 100 znaků"),
});
