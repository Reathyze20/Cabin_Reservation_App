/**
 * Backfill script: Creates the default "Chata Třebenice" cabin
 * and assigns all existing data (users, reservations, etc.) to it.
 *
 * Run: npx tsx src/scripts/backfillCabin.ts
 *
 * Safe to run multiple times — skips if cabin already exists.
 */
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CABIN = {
  name: "Chata Třebenice",
  subdomain: "trebenice",
};

async function backfill() {
  console.log("🏠 Starting cabin backfill...");

  // 1. Create or find default cabin
  let cabin = await prisma.cabin.findUnique({
    where: { subdomain: DEFAULT_CABIN.subdomain },
  });

  if (cabin) {
    console.log(`✓ Cabin "${cabin.name}" already exists (${cabin.id})`);
  } else {
    cabin = await prisma.cabin.create({
      data: {
        name: DEFAULT_CABIN.name,
        subdomain: DEFAULT_CABIN.subdomain,
      },
    });
    console.log(`✓ Created cabin "${cabin.name}" (${cabin.id})`);
  }

  const cabinId = cabin.id;

  // 2. Assign all users without a cabin
  const usersUpdated = await prisma.user.updateMany({
    where: { cabinId: null },
    data: { cabinId },
  });
  console.log(`✓ Assigned ${usersUpdated.count} users to cabin`);

  // 3. Assign all entities without cabinId
  const updates = await Promise.all([
    prisma.reservation.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.shoppingList.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.noteThread.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.note.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.galleryFolder.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.diaryFolder.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.reconstructionItem.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.inventoryItem.updateMany({ where: { cabinId: null }, data: { cabinId } }),
    prisma.userAvailability.updateMany({ where: { cabinId: null }, data: { cabinId } }),
  ]);

  const labels = [
    "reservations", "shoppingLists", "noteThreads", "notes",
    "galleryFolders", "diaryFolders", "reconstructionItems",
    "inventoryItems", "userAvailabilities",
  ];

  updates.forEach((result, i) => {
    if (result.count > 0) {
      console.log(`✓ Assigned ${result.count} ${labels[i]} to cabin`);
    }
  });

  console.log("\n🎉 Backfill complete!");
}

backfill()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
