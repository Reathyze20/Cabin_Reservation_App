import { z } from "zod";

// Auth validators
export const loginSchema = z.object({
  username: z.string().min(1, "Uživatelské jméno je povinné"),
  password: z.string().min(1, "Heslo je povinné"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Uživatelské jméno musí mít alespoň 3 znaky"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Neplatný formát barvy"),
});

// Reservation validators
export const createReservationSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  purpose: z.string().min(1, "Účel je povinný"),
  notes: z.string().optional(),
});

export const updateReservationSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data").optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

// Shopping list validators
export const createShoppingItemSchema = z.object({
  name: z.string().min(1, "Název je povinný"),
});

export const updatePurchaseSchema = z.object({
  purchased: z.boolean(),
  price: z.number().positive().optional(),
  splitWith: z.array(z.string().uuid()).optional(),
});

// Note validators
export const createNoteSchema = z.object({
  message: z.string().min(1, "Zpráva je povinná"),
});

// Gallery validators
export const createFolderSchema = z.object({
  name: z.string().min(1, "Název složky je povinný"),
});

export const uploadPhotoSchema = z.object({
  folderId: z.string().uuid("Neplatné ID složky"),
  imageBase64: z.string().min(1, "Chybí obrázek"),
});

export const updatePhotoSchema = z.object({
  description: z.string().optional(),
});

// Diary validators
export const createDiaryFolderSchema = z.object({
  name: z.string().min(1, "Název je povinný"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
});

export const createDiaryEntrySchema = z.object({
  folderId: z.string().uuid("Neplatné ID složky"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatný formát data"),
  content: z.string().min(1, "Obsah je povinný"),
  galleryPhotoIds: z.array(z.string().uuid()).optional(),
});

// Reconstruction validators
export const createReconstructionItemSchema = z.object({
  category: z.enum(["idea", "company", "task"], {
    error: "Kategorie musí být idea, company nebo task",
  }),
  title: z.string().min(1, "Název je povinný"),
  description: z.string().optional(),
  link: z.string().url("Neplatný formát URL").optional().or(z.literal("")),
  cost: z.number().positive().optional(),
  status: z.enum(["pending", "approved", "done"]).optional(),
});

export const updateReconstructionStatusSchema = z.object({
  status: z.enum(["pending", "approved", "done"]),
});

// User management validators
export const changeRoleSchema = z.object({
  role: z.enum(["admin", "user", "guest"]),
});

export const changePasswordSchema = z.object({
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
});
