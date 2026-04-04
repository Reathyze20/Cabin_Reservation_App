/**
 * Fix orphaned data: Finds the existing cabin and assigns all orphaned
 * records (cabinId = NULL) to it.
 *
 * This handles the case where the multi-tenant migration ran but the
 * backfill script was not executed, and a cabin was created via onboarding
 * without adopting existing data.
 *
 * Run: npx tsx src/scripts/fixOrphanedData.ts
 *
 * Safe to run multiple times — only updates records where cabinId IS NULL.
 */
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function fix() {
  console.log("🔍 Looking for existing cabins...\n");

  const cabins = await prisma.cabin.findMany({
    select: { id: true, name: true, subdomain: true },
  });

  if (cabins.length === 0) {
    console.error("❌ No cabins found in database. Run onboarding first or use backfillCabin.ts");
    process.exit(1);
  }

  if (cabins.length > 1) {
    console.log("⚠️  Multiple cabins found:");
    cabins.forEach((c) => console.log(`   - ${c.name} (${c.id}, subdomain: ${c.subdomain})`));
    console.log("\nUsing the first one. If this is wrong, edit the script.\n");
  }

  const cabin = cabins[0];
  const cabinId = cabin.id;
  console.log(`🏠 Using cabin: "${cabin.name}" (${cabinId})\n`);

  // Check for orphaned data first
  const [
    orphanedUsers,
    orphanedReservations,
    orphanedShoppingLists,
    orphanedNoteThreads,
    orphanedNotes,
    orphanedGalleryFolders,
    orphanedDiaryFolders,
    orphanedReconstructionItems,
    orphanedInventoryItems,
    orphanedUserAvailabilities,
    orphanedMonthlyNotes,
  ] = await Promise.all([
    prisma.user.count({ where: { cabinId: null } }),
    prisma.reservation.count({ where: { cabinId: null } }),
    prisma.shoppingList.count({ where: { cabinId: null } }),
    prisma.noteThread.count({ where: { cabinId: null } }),
    prisma.note.count({ where: { cabinId: null } }),
    prisma.galleryFolder.count({ where: { cabinId: null } }),
    prisma.diaryFolder.count({ where: { cabinId: null } }),
    prisma.reconstructionItem.count({ where: { cabinId: null } }),
    prisma.inventoryItem.count({ where: { cabinId: null } }),
    prisma.userAvailability.count({ where: { cabinId: null } }),
    prisma.monthlyNote.count({ where: { cabinId: null } }),
  ]);

  console.log("📊 Orphaned records found:");
  console.log(`   Users:               ${orphanedUsers}`);
  console.log(`   Reservations:        ${orphanedReservations}`);
  console.log(`   Shopping Lists:      ${orphanedShoppingLists}`);
  console.log(`   Note Threads:        ${orphanedNoteThreads}`);
  console.log(`   Notes:               ${orphanedNotes}`);
  console.log(`   Gallery Folders:     ${orphanedGalleryFolders}`);
  console.log(`   Diary Folders:       ${orphanedDiaryFolders}`);
  console.log(`   Reconstruction Items:${orphanedReconstructionItems}`);
  console.log(`   Inventory Items:     ${orphanedInventoryItems}`);
  console.log(`   User Availabilities: ${orphanedUserAvailabilities}`);
  console.log(`   Monthly Notes:       ${orphanedMonthlyNotes}`);
  console.log();

  const total =
    orphanedUsers + orphanedReservations + orphanedShoppingLists +
    orphanedNoteThreads + orphanedNotes + orphanedGalleryFolders +
    orphanedDiaryFolders + orphanedReconstructionItems + orphanedInventoryItems +
    orphanedUserAvailabilities + orphanedMonthlyNotes;

  if (total === 0) {
    console.log("✅ No orphaned data found. Everything is already assigned!");
    return;
  }

  console.log(`🔧 Assigning ${total} orphaned records to cabin "${cabin.name}"...\n`);

  // Assign all orphaned data
  const results = await Promise.all([
    prisma.user.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.reservation.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.shoppingList.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.noteThread.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.note.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.galleryFolder.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.diaryFolder.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.reconstructionItem.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.inventoryItem.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.userAvailability.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.monthlyNote.updateMany({ where: { cabinId: null }, data: { cabinId } }),
  ]);

  const labels = [
    "users", "reservations", "shoppingLists", "noteThreads", "notes",
    "galleryFolders", "diaryFolders", "reconstructionItems",
    "inventoryItems", "userAvailabilities", "monthlyNotes",
  ];

  results.forEach((result, i) => {
    if (result.count > 0) {
      console.log(`   ✓ Assigned ${result.count} ${labels[i]}`);
    }
  });

  console.log("\n🎉 All orphaned data has been assigned to the cabin!");
}

fix()
  .catch((e) => {
    console.error("❌ Fix failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
