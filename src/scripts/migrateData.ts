/**
 * Migration script: JSON files → PostgreSQL
 *
 * This script reads all JSON data files and migrates them to PostgreSQL database.
 * Run with: npx ts-node src/scripts/migrateData.ts
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// JSON file paths
const __dirname = import.meta.dirname;
const dataDir = path.join(__dirname, "../../data/archive");
const usersFile = path.join(dataDir, "users.json");
const reservationsFile = path.join(dataDir, "reservations.json");
const shoppingListFile = path.join(dataDir, "shopping-list.json");
const notesFile = path.join(dataDir, "notes.json");
const galleryFile = path.join(dataDir, "gallery.json"); // Combined file
const galleryFoldersFile = path.join(dataDir, "gallery-folders.json");
const galleryPhotosFile = path.join(dataDir, "gallery-photos.json");
const diaryFoldersFile = path.join(dataDir, "diary-folders.json");
const diaryEntriesFile = path.join(dataDir, "diary-entries.json");
const reconstructionFile = path.join(dataDir, "reconstruction.json");

// Helper to read JSON
function readJSON(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath} - skipping`);
    return [];
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);
  return Array.isArray(data) ? data : [];
}

// Main migration function
async function migrate() {
  console.log("🚀 Starting migration from JSON to PostgreSQL...\n");

  try {
    // ========================================================================
    // 1. MIGRATE USERS
    // ========================================================================
    console.log("1️⃣  Migrating users...");
    const users = readJSON(usersFile);
    const userIdMap = new Map<string, string>(); // old username -> new UUID

    for (const user of users) {
      // Replace "admin" string ID with UUID
      const newId = user.id === "admin" ? uuidv4() : user.id;
      userIdMap.set(user.username.toLowerCase(), newId);

      await prisma.user.upsert({
        where: { id: newId },
        update: {},
        create: {
          id: newId,
          username: user.username,
          passwordHash: user.passwordHash,
          color: user.color || "#808080",
          role: user.role || "user",
        },
      });
    }
    console.log(`   ✅ Migrated ${users.length} users\n`);

    // ========================================================================
    // 2. MIGRATE RESERVATIONS
    // ========================================================================
    console.log("2️⃣  Migrating reservations...");
    const reservations = readJSON(reservationsFile);

    for (const res of reservations) {
      // Resolve userId from username (denormalized data)
      const userId = userIdMap.get(res.username?.toLowerCase()) || res.userId;

      await prisma.reservation.create({
        data: {
          id: res.id,
          userId,
          dateFrom: new Date(res.from),
          dateTo: new Date(res.to),
          purpose: res.purpose || "",
          notes: res.notes,
          status: res.status || "primary",
        },
      });
    }
    console.log(`   ✅ Migrated ${reservations.length} reservations\n`);

    // ========================================================================
    // 3. MIGRATE SHOPPING LIST
    // ========================================================================
    console.log("3️⃣  Migrating shopping list...");
    let shoppingItems = readJSON(shoppingListFile);

    // Handle old format (array of lists)
    if (shoppingItems.length > 0 && shoppingItems[0].items) {
      shoppingItems = shoppingItems.flatMap((list: any) => list.items || []);
    }

    for (const item of shoppingItems) {
      const addedById = userIdMap.get(item.addedBy?.toLowerCase()) || item.addedById;
      const purchasedById = item.purchasedById
        ? userIdMap.get(item.purchasedBy?.toLowerCase()) || item.purchasedById
        : null;

      const createdItem = await prisma.shoppingListItem.create({
        data: {
          id: item.id,
          name: item.name,
          addedById,
          purchased: item.purchased || false,
          purchasedById,
          purchasedAt: item.purchasedAt ? new Date(item.purchasedAt) : null,
          price: item.price ? parseFloat(item.price) : null,
        },
      });

      // Create splits
      if (item.splitWith && Array.isArray(item.splitWith)) {
        for (const userId of item.splitWith) {
          await prisma.shoppingItemSplit.create({
            data: {
              itemId: createdItem.id,
              userId,
            },
          });
        }
      }
    }
    console.log(`   ✅ Migrated ${shoppingItems.length} shopping items\n`);

    // ========================================================================
    // 4. MIGRATE NOTES
    // ========================================================================
    console.log("4️⃣  Migrating notes...");
    const notes = readJSON(notesFile);

    for (const note of notes) {
      const userId = userIdMap.get(note.username?.toLowerCase()) || note.userId;

      await prisma.note.create({
        data: {
          id: note.id,
          userId,
          message: note.message,
          createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
        },
      });
    }
    console.log(`   ✅ Migrated ${notes.length} notes\n`);

    // ========================================================================
    // 5. MIGRATE GALLERY FOLDERS
    // ========================================================================
    console.log("5️⃣  Migrating gallery folders...");
    let galleryFolders = readJSON(galleryFoldersFile);
    
    // Check if data is in combined gallery.json file
    if (galleryFolders.length === 0 && fs.existsSync(galleryFile)) {
      const galleryData = JSON.parse(fs.readFileSync(galleryFile, "utf-8"));
      galleryFolders = galleryData.folders || [];
    }

    for (const folder of galleryFolders) {
      const createdById = folder.createdBy
        ? userIdMap.get(folder.createdBy.toLowerCase())
        : null;

      await prisma.galleryFolder.create({
        data: {
          id: folder.id,
          name: folder.name,
          createdById,
          createdAt: folder.createdAt ? new Date(folder.createdAt) : new Date(),
        },
      });
    }
    console.log(`   ✅ Migrated ${galleryFolders.length} gallery folders\n`);

    // ========================================================================
    // 6. MIGRATE GALLERY PHOTOS
    // ========================================================================
    console.log("6️⃣  Migrating gallery photos...");
    let galleryPhotos = readJSON(galleryPhotosFile);
    
    // Check if data is in combined gallery.json file
    if (galleryPhotos.length === 0 && fs.existsSync(galleryFile)) {
      const galleryData = JSON.parse(fs.readFileSync(galleryFile, "utf-8"));
      galleryPhotos = galleryData.photos || [];
    }

    for (const photo of galleryPhotos) {
      const uploadedById = photo.uploadedBy
        ? userIdMap.get(photo.uploadedBy.toLowerCase())
        : null;

      await prisma.galleryPhoto.create({
        data: {
          id: photo.id,
          folderId: photo.folderId,
          src: photo.src,
          uploadedById,
          description: photo.description || "",
          createdAt: photo.createdAt ? new Date(photo.createdAt) : new Date(),
        },
      });
    }
    console.log(`   ✅ Migrated ${galleryPhotos.length} gallery photos\n`);

    // ========================================================================
    // 7. MIGRATE DIARY FOLDERS
    // ========================================================================
    console.log("7️⃣  Migrating diary folders...");
    const diaryFolders = readJSON(diaryFoldersFile);

    for (const folder of diaryFolders) {
      const createdById = folder.createdBy
        ? userIdMap.get(folder.createdBy.toLowerCase()) || folder.createdBy
        : userIdMap.values().next().value; // Fallback to first user

      await prisma.diaryFolder.create({
        data: {
          id: folder.id,
          name: folder.name,
          createdById,
          startDate: folder.startDate ? new Date(folder.startDate) : null,
          endDate: folder.endDate ? new Date(folder.endDate) : null,
          createdAt: folder.createdAt ? new Date(folder.createdAt) : new Date(),
        },
      });
    }
    console.log(`   ✅ Migrated ${diaryFolders.length} diary folders\n`);

    // ========================================================================
    // 8. MIGRATE DIARY ENTRIES
    // ========================================================================
    console.log("8️⃣  Migrating diary entries...");
    const diaryEntries = readJSON(diaryEntriesFile);

    for (const entry of diaryEntries) {
      const authorId = userIdMap.get(entry.author?.toLowerCase()) || entry.authorId;

      const createdEntry = await prisma.diaryEntry.create({
        data: {
          id: entry.id,
          folderId: entry.folderId,
          authorId,
          entryDate: new Date(entry.date),
          content: entry.content,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
        },
      });

      // Create photo associations
      if (entry.galleryPhotoIds && Array.isArray(entry.galleryPhotoIds)) {
        for (const photoId of entry.galleryPhotoIds) {
          await prisma.diaryEntryPhoto.create({
            data: {
              entryId: createdEntry.id,
              photoId,
            },
          });
        }
      }
    }
    console.log(`   ✅ Migrated ${diaryEntries.length} diary entries\n`);

    // ========================================================================
    // 9. MIGRATE RECONSTRUCTION ITEMS
    // ========================================================================
    console.log("9️⃣  Migrating reconstruction items...");
    const reconstructionItems = readJSON(reconstructionFile);

    for (const item of reconstructionItems) {
      const createdById = item.createdBy
        ? userIdMap.get(item.createdBy.toLowerCase()) || item.createdBy
        : userIdMap.values().next().value;

      const createdItem = await prisma.reconstructionItem.create({
        data: {
          id: item.id,
          category: item.category,
          title: item.title,
          description: item.description || "",
          link: item.link,
          cost: item.cost ? parseFloat(item.cost) : null,
          status: item.status || "pending",
          createdById,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        },
      });

      // Create votes
      if (item.votes && Array.isArray(item.votes)) {
        for (const userId of item.votes) {
          await prisma.reconstructionVote.create({
            data: {
              itemId: createdItem.id,
              userId,
            },
          });
        }
      }
    }
    console.log(`   ✅ Migrated ${reconstructionItems.length} reconstruction items\n`);

    console.log("✨ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log("\n🎉 All data migrated successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration error:", error);
    process.exit(1);
  });
