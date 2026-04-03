# API Endpoint Reference

Complete map of all backend endpoints. Read this when building API modules or connecting frontend components to the backend.

## Auth (`/api`)

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| POST | `/api/login` | no | `{ username, password }` | `{ token, username, userId, role, color, animalIcon, cabinId }` |
| POST | `/api/register` | no | `{ cabinName, subdomain?, weatherLocation, username, email, password, color? }` | `{ message, requiresVerification? }` |
| GET | `/api/verify-token` | no | `?token=<hash>` | `{ message }` |
| POST | `/api/verify-email` | no | `{ username, code }` | `{ message }` |
| GET | `/api/health` | no | — | `{ status, timestamp, database }` |

## Dashboard (`/api/dashboard`)

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/api/dashboard` | yes | `{ activeReservation, upcomingReservations[], myNextReservation, departingToday, pendingShoppingItems[], totalPendingShoppingCount, essentialWarning, latestNotes[], pinnedHandoverNote, nextFreeWeekend }` |

## Users (`/api/users`)

| Method | Path | Auth | Role | Body | Response |
|---|---|---|---|---|---|
| GET | `/api/users` | yes | all | — | `[{ id, username, color, role, animalIcon }]` |
| POST | `/api/users` | yes | admin | `{ username, password, role? }` | `{ message, user }` |
| GET | `/api/users/me` | yes | all | — | `{ id, username, email, color, animalIcon, role, isEmailVerified }` |
| PATCH | `/api/users/me` | yes | all | `{ email?, color?, animalIcon? }` | `{ message, user }` |
| PATCH | `/api/users/me/password` | yes | all | `{ oldPassword, newPassword }` | `{ message }` |
| PUT | `/api/users/:id/role` | yes | admin | `{ role }` | `{ message }` |
| PUT | `/api/users/:id/password` | yes | admin | `{ password }` | `{ message }` |
| PATCH | `/api/users/:id` | yes | admin | `{ role?, password? }` | `{ message }` |
| DELETE | `/api/users/:id` | yes | admin | — | `{ message }` |
| DELETE | `/api/users/:id/reservations` | yes | admin | — | `{ message }` |

## Reservations (`/api/reservations`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/reservations` | yes | — | `{ reservations[], availabilities[] }` |
| POST | `/api/reservations` | yes | `{ from, to, purpose, notes?, handoverNote?, status? }` | reservation object |
| PUT | `/api/reservations/:id` | yes | `{ from?, to?, purpose?, notes?, handoverNote?, status? }` | reservation object |
| POST | `/api/reservations/delete` | yes | `{ id }` | `{ message }` |
| GET | `/api/reservations/:id/watch` | yes | — | `{ watching }` |
| POST | `/api/reservations/:id/watch` | yes | — | `{ watching: true }` |
| DELETE | `/api/reservations/:id/watch` | yes | — | `{ watching: false }` |
| POST | `/api/reservations/:reservationId/assign` | yes | `{ newOwnerId }` | `{ message }` |
| PATCH | `/api/reservations/:id/checkout` | yes | — | `{ message, isCheckoutCompleted, ... }` |
| GET | `/api/reservations/:id/checkout` | yes | — | `{ isCheckoutCompleted, checkoutCompletedBy, ... }` |

### Availabilities

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/reservations/availabilities` | yes | — | `[{ id, userId, username, userColor, userAnimalIcon, startDate, endDate }]` |
| POST | `/api/reservations/availabilities` | yes | `{ startDate, endDate }` | availability object |
| PATCH | `/api/reservations/availabilities/:id` | yes | `{ startDate, endDate }` | availability object |
| DELETE | `/api/reservations/availabilities/:id` | yes | — | `{ message }` |

## Shopping Lists (`/api/shopping-lists`)

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/api/shopping-lists` | yes | `?isPantry=bool` | `[{ id, name, createdBy, items[], isPantry, isResolved }]` |
| POST | `/api/shopping-lists` | yes | `{ name }` | list object |
| GET | `/api/shopping-lists/pantry` | yes | — | pantry list (auto-creates) |
| DELETE | `/api/shopping-lists/:id` | yes | — | `{ message }` |
| PATCH | `/api/shopping-lists/:id/resolve` | yes | `{ isResolved }` | list object |
| PUT | `/api/shopping-lists/:listId/items/:itemId` | yes | `{ purchased?, status? }` | item object |

## Shopping Items (`/api/shopping-list`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/shopping-list/:listId/items` | yes | `{ name, isEssential?, sourceMessageId? }` | item object |
| PUT | `/api/shopping-list/:itemId/purchase` | yes | `{ status?, purchased?, price?, splitWith? }` | item object |
| PATCH | `/api/shopping-list/:itemId/toggle-essential` | yes | — | `{ id, isEssential }` |
| DELETE | `/api/shopping-list/:itemId` | yes | — | `{ success: true }` |
| POST | `/api/shopping-list/:itemId/move-from-pantry` | yes | — | `{ message, listId }` |

## Notes (`/api/notes`)

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/api/notes` | yes | `?threadId=UUID` | `[{ id, userId, threadId, username, message, createdAt, isResolvedAsTask }]` |
| POST | `/api/notes` | yes | `{ message, threadId? }` | note object |
| PATCH | `/api/notes/:id/resolve` | yes | — | `{ id, isResolvedAsTask }` |
| DELETE | `/api/notes/:id` | yes | — | `{ message }` |

## Note Threads (`/api/note-threads`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/note-threads` | yes | — | `[{ id, name, createdById, cabinId, createdAt }]` |
| POST | `/api/note-threads` | yes | `{ name }` | thread object |
| DELETE | `/api/note-threads/:id` | yes | — | `{ message }` |

## Gallery (`/api/gallery`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/gallery/folders` | yes | — | `[{ id, name, createdAt, createdBy }]` |
| POST | `/api/gallery/folders` | yes | `{ name }` | folder object |
| PATCH | `/api/gallery/folders/:id` | yes | `{ name }` | `{ message, folder }` |
| DELETE | `/api/gallery/folders/:id` | yes | — | `{ message }` |
| GET | `/api/gallery/photos` | yes | `?folderId=UUID&ids=csv` | `[{ id, folderId, src, thumb, uploadedBy, createdAt, description }]` |
| POST | `/api/gallery/photos` | yes | `multipart: { photos: File[], folderId }` | photo object(s) |
| PATCH | `/api/gallery/photos/:id` | yes | `{ description }` | photo object |
| DELETE | `/api/gallery/photos/:id` | yes | — | `{ message }` |
| DELETE | `/api/gallery/photos` | yes | `{ photoIds: UUID[] }` | `{ message }` |

## Diary (`/api/diary`)

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/api/diary/folders` | yes | — | `[{ id, name, activityTag, createdAt, createdBy, startDate, endDate, stats }]` |
| POST | `/api/diary/folders` | yes | `{ name, startDate, endDate, activityTag? }` | folder object |
| PATCH | `/api/diary/folders/:id` | yes | `{ name, activityTag? }` | `{ message, folder }` |
| DELETE | `/api/diary/folders/:id` | yes | — | `{ message }` |
| GET | `/api/diary/entries` | yes | `?folderId=UUID` | `[{ id, folderId, date, content, author, authorId, createdAt, galleryPhotoIds }]` |
| POST | `/api/diary/entries` | yes | `{ folderId, date, content, galleryPhotoIds? }` | entry object |
| PUT | `/api/diary/entries/:id` | yes | `{ content, galleryPhotoIds? }` | entry object |
| DELETE | `/api/diary/entries/:id` | yes | — | `{ message }` |

## Inventory (`/api/inventory`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/inventory` | yes | — | `[{ id, name, category, status, location, isEssential, inCart, updatedBy }]` |
| POST | `/api/inventory` | yes | `{ name, category?, status?, location?, isEssential? }` | item object |
| PUT | `/api/inventory/:id` | yes | `{ name?, category?, status?, location?, isEssential? }` | item object |
| PATCH | `/api/inventory/:id/toggle-essential` | yes | — | `{ id, isEssential }` |
| DELETE | `/api/inventory/:id` | yes | — | `{ message }` |
| POST | `/api/inventory/:id/add-to-cart` | yes | `{ listId? }` or `{ newListName? }` | `{ message }` |
| GET | `/api/inventory/missing-summary` | yes | — | `{ count, items[], hasShoppingItems, pendingShoppingCount }` |

## Reconstruction (`/api/reconstruction`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/reconstruction` | yes | — | `[{ id, category, title, description, link, cost, status, thumbnail, tag, specialization, email, phone, deadline, votes[], createdBy, createdAt }]` |
| POST | `/api/reconstruction` | yes | `{ category, title, description?, link?, cost?, status?, ... }` | item object |
| PUT | `/api/reconstruction/:id` | yes | full update body | item object |
| DELETE | `/api/reconstruction/:id` | yes | — | `{ message }` |
| PATCH | `/api/reconstruction/:id/vote` | yes | — | `{ id, votes[] }` |
| PATCH | `/api/reconstruction/:id/status` | yes | `{ status }` | item object |

## Cabin Settings (`/api/cabin`)

| Method | Path | Auth | Role | Body | Response |
|---|---|---|---|---|---|
| GET | `/api/cabin` | yes | all | — | `{ id, name, subdomain, description, welcomeMessage, rules, departureChecklist, coverPhotoUrl, weatherLocation, isWinterized, features }` |
| PATCH | `/api/cabin` | yes | admin | `{ name?, description?, welcomeMessage?, rules?, departureChecklist?, ... }` | cabin object |
| POST | `/api/cabin/create` | yes | — | `{ name }` | `{ token, cabinId, cabinName, ... }` |

## Invites (`/api/invites`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/invites` | yes/admin | `{ role?, maxUses?, expiresInDays? }` | invite object |
| GET | `/api/invites` | yes/admin | — | `[invite objects]` |
| DELETE | `/api/invites/:id` | yes/admin | — | 204 |
| GET | `/api/invites/validate/:token` | no | — | `{ valid, cabinName, welcomeMessage, role, invitedBy }` |
| POST | `/api/invites/accept/:token` | no | `{ username, password, email?, color?, animalIcon? }` | `{ token, username, userId, role, ... }` |

## Workspace (`/api/workspace`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| PATCH | `/api/workspace/handover-note` | yes | `{ note }` (max 300 chars) | `{ pinnedHandoverNote }` |

## Logs (`/api/logs`)

| Method | Path | Auth | Query / Body | Response |
|---|---|---|---|---|
| GET | `/api/logs` | yes/admin | `?date=&lines=&level=&userId=&module=&source=` | `{ date, count, logs[] }` |
| GET | `/api/logs/files` | yes/admin | — | `{ files[] }` |
| POST | `/api/logs/client` | yes | `{ message, stack?, url?, component?, context? }` | 204 |
| POST | `/api/logs/client/anon` | no | `{ message, stack?, url? }` | 204 |
