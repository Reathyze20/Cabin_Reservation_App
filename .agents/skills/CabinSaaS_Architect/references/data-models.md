# Data Models Reference

Complete Prisma schema models and their frontend TypeScript counterparts. Read this when you need to know data shapes, relations, and constraints.

---

## Models Overview

| Model | Table | Key Relations | Notes |
|---|---|---|---|
| Cabin | `cabins` | users[], reservations[], shoppingLists[], inventory[], notes[], noteThreads[], diaryFolders[], reconstructions[], galleryFolders[], availabilities[], inviteLinks[] | Multi-tenant root entity |
| User | `users` | cabin, reservations[], shoppingLists[], notes[], galleryPhotos[], diaryEntries[], reconstructionItems[] | `role: admin/user/guest` |
| InviteLink | `invite_links` | cabin, createdBy | Token-based join flow |
| Reservation | `reservations` | user, cabin, watchers[] | `status: primary/backup/soft` |
| ShoppingList | `shopping_lists` | createdBy, items[], cabin | `isPantry` flag for inventory |
| ShoppingListItem | `shopping_list_items` | list, addedBy, purchasedBy, splits[] | `ItemStatus enum: pending/bring_from_home/purchased` |
| ShoppingItemSplit | `shopping_item_splits` | item, user | Cost-splitting M:N |
| NoteThread | `note_threads` | createdBy, notes[], cabin | Chat thread / tab |
| Note | `notes` | user, thread?, cabin | `isResolvedAsTask` |
| GalleryFolder | `gallery_folders` | createdBy?, photos[], cabin | `name` is unique |
| GalleryPhoto | `gallery_photos` | folder, uploadedBy?, diaryEntries[] | `src` = file path |
| DiaryFolder | `diary_folders` | createdBy, entries[], cabin | `startDate`, `endDate`, `activityTag` |
| DiaryEntry | `diary_entries` | folder, author, photos[] | M:N with GalleryPhoto |
| DiaryEntryPhoto | `diary_entry_photos` | entry, photo | Join table |
| ReconstructionItem | `reconstruction_items` | createdBy, votes[], cabin | `category: idea/company/task` |
| ReconstructionVote | `reconstruction_votes` | item, user | Like/upvote system |
| ReservationWatcher | `reservation_watchers` | user, reservation | Email on cancellation |
| InventoryItem | `inventory_items` | updatedBy?, cabin | `status: OK/LOW/EMPTY` |
| UserAvailability | `user_availabilities` | user, cabin | Vacation blocks for calendar |
| AppSettings | `app_settings` | — | Singleton (id="singleton"), `pinnedHandoverNote` |

---

## Cabin Model (Multi-Tenant Root)

```
id          String   UUID PK
name        String   "Chalupa pod Kletí"
subdomain   String   UNIQUE, URL-safe slug
features    Json?    Feature flags { reservations: true, shopping: true, ... }
description String?  Text, cabin description
welcomeMessage String? Max 300 chars, greeting
address     String?  Max 300, for navigation
rules       String?  Text, markdown house rules
departureChecklist Json?  String[] custom checklist
coverPhotoUrl String?  URL to cover photo
weatherLocation String?  Max 100, city for weather API
isWinterized Boolean  Default false, frost alerts
lastFrostAlertAt DateTime?
createdAt   DateTime
```

## User Model

```
id               String   UUID PK
username         String   UNIQUE
passwordHash     String
color            String   Hex color for avatar
animalIcon       String?  Emoji animal avatar
email            String?  UNIQUE
isEmailVerified  Boolean  Default false
verificationCode String?  Legacy PIN
isVerified       Boolean  Default false
isSuperAdmin     Boolean  Default false (platform-level)
isBanned         Boolean  Default false
verificationToken String? Email verify link hash
role             String   "admin" | "user" | "guest"
cabinId          String?  FK → Cabin (onDelete: SetNull)
createdAt        DateTime
```

## Reservation Model

```
id           String   UUID PK
userId       String   FK → User (Cascade)
dateFrom     DateTime Date only (YYYY-MM-DD)
dateTo       DateTime Date only
purpose      String
notes        String?  Text
handoverNote String?  Text, "vzkazy pro dalšího"
status       String   "primary" | "backup" | "soft"
isCheckoutCompleted Boolean  Default false
checkoutCompletedBy String?  userId who completed
checkoutCompletedAt DateTime?
cabinId      String?  FK → Cabin (Cascade)
createdAt    DateTime
```

## ShoppingList + Item

```
ShoppingList:
  id, name, createdById(FK), createdAt, isResolved(bool), isPantry(bool), cabinId(FK)

ShoppingListItem:
  id, listId(FK nullable), name, addedById(FK), createdAt
  status     ItemStatus enum: pending | bring_from_home | purchased
  purchased  Boolean (mirrors status for compat)
  purchasedById  String?  FK → User (SetNull)
  purchasedAt    DateTime?
  price          Decimal(10,2)?
  linkedInventoryId String?
  isEssential    Boolean default false
  sourceMessageId String? (from chat context action)

ShoppingItemSplit:
  itemId + userId  composite PK (M:N cost splitting)
```

## Notes + Threads

```
NoteThread:
  id, name, createdById(FK), cabinId(FK), createdAt

Note:
  id, userId(FK), threadId(FK nullable → NoteThread, null = main board)
  message(Text), createdAt, isResolvedAsTask(bool), cabinId(FK)
```

## Gallery

```
GalleryFolder:
  id, name(UNIQUE), createdById(FK nullable, SetNull), cabinId(FK), createdAt

GalleryPhoto:
  id, folderId(FK → Folder, Cascade), src(String path)
  uploadedById(FK nullable, SetNull), description(Text?), createdAt
```

## Diary

```
DiaryFolder:
  id, name, createdById(FK), startDate(Date?), endDate(Date?), activityTag(String?)
  cabinId(FK), createdAt

DiaryEntry:
  id, folderId(FK → Folder, Cascade), authorId(FK), entryDate(Date)
  content(Text), createdAt

DiaryEntryPhoto:  (M:N join table)
  entryId + photoId  composite PK
```

## Reconstruction

```
ReconstructionItem:
  id, category("idea"|"company"|"task"), title, description(Text)
  link?, cost(Decimal?), status("pending"|"approved"|"done")
  thumbnail?, tag?, specialization?, email?, phone?, deadline(Date?)
  createdById(FK), cabinId(FK), sourceMessageId?, createdAt

ReconstructionVote:
  itemId + userId  composite PK (upvoting)
```

## Inventory

```
InventoryItem:
  id, name, category(default "OSTATNÍ"), status("OK"|"LOW"|"EMPTY")
  location(String?), inCart(bool), isEssential(bool)
  updatedById(FK?, SetNull), cabinId(FK)
  createdAt, updatedAt(@updatedAt)
```

## UserAvailability

```
UserAvailability:
  id, userId(FK), startDate(Date), endDate(Date), cabinId(FK), createdAt
```

---

## Frontend Type Interfaces

These are the main interfaces used in `frontend-v2/src/api/` modules:

```typescript
// Auth context
interface AuthUser {
  userId: string
  username: string
  role: 'admin' | 'user' | 'guest'
  animalIcon: string | null
  cabinId: string | null
}

// Reservations
interface Reservation {
  id: string; userId: string; username: string
  from: string; to: string; purpose: string
  notes?: string; handoverNote?: string
  status?: 'primary' | 'backup' | 'soft'
  userColor?: string; userAnimalIcon?: string | null
  isCheckoutCompleted?: boolean
}

// Shopping
type ItemStatus = 'pending' | 'bring_from_home' | 'purchased'
interface ShoppingItem {
  id: string; name: string; listId: string
  addedBy: string; status: ItemStatus; purchased: boolean
  purchasedBy?: string; price?: number
  isEssential: boolean; sourceMessageId?: string
}
interface ShoppingList {
  id: string; name: string; isPantry: boolean
  isResolved: boolean; createdBy: { id: string; username: string }
  items: ShoppingItem[]
}

// Inventory
interface InventoryItem {
  id: string; name: string; category: string
  status: 'OK' | 'LOW' | 'EMPTY'
  location?: string; isEssential: boolean; inCart: boolean
  updatedBy?: { id: string; username: string }
}

// Notes
interface Note {
  id: string; userId: string; threadId?: string
  username: string; message: string; createdAt: string
  isResolvedAsTask: boolean
}
interface NoteThread {
  id: string; name: string; createdById: string; createdAt: string
}

// Gallery
interface GalleryFolder { id: string; name: string; createdAt: string; createdBy?: string }
interface GalleryPhoto {
  id: string; folderId: string; src: string; thumb?: string
  uploadedBy?: string; description?: string; createdAt: string
}

// Diary
interface DiaryFolder {
  id: string; name: string; activityTag?: string
  startDate?: string; endDate?: string; createdBy: string
  stats: { entries: number; photos: number }
}
interface DiaryEntry {
  id: string; folderId: string; date: string; content: string
  author: string; authorId: string; createdAt: string
  galleryPhotoIds: string[]
}

// Reconstruction
type RecCategory = 'idea' | 'company' | 'task'
interface RecItem {
  id: string; category: RecCategory; title: string
  description: string; link?: string; cost?: number
  status: string; thumbnail?: string; tag?: string
  specialization?: string; email?: string; phone?: string
  deadline?: string; votes: string[]
  createdBy: string; createdAt: string
}

// Cabin Settings
interface CabinConfig {
  id: string; name: string; subdomain: string
  description?: string; welcomeMessage?: string
  rules?: string; departureChecklist?: string[]
  coverPhotoUrl?: string; weatherLocation?: string
  isWinterized: boolean; features?: Record<string, boolean>
}
```
