/**
 * One-time migration: sync legacy `purchased` boolean → new `status` enum.
 * Run once after the DB schema update:
 *   npx tsx src/scripts/migrateItemStatus.ts
 */
// dotenv/config must be the first import so DATABASE_URL is populated before
// @prisma/adapter-pg is instantiated (which happens at module init time in prisma.ts).
import "dotenv/config";
import prisma from "../utils/prisma.js";

async function run() {
  console.log("Migrating ShoppingListItem.purchased → status...");

  const updated = await prisma.shoppingListItem.updateMany({
    where: { purchased: true, status: "pending" },
    data: { status: "purchased" },
  });

  console.log(`✓ Updated ${updated.count} item(s) to status=purchased`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
