import dotenv from "dotenv";
dotenv.config();
import prisma from "./src/utils/prisma.js";

async function run() {
  const orphaned = await prisma.shoppingListItem.findMany({
    where: { listId: null },
  });
  console.log(`Found ${orphaned.length} orphaned items.`);
  if (orphaned.length > 0) {
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (admin) {
      const list = await prisma.shoppingList.create({
        data: {
          name: "Staré položky (z JSONu)",
          createdById: admin.id,
        },
      });
      await prisma.shoppingListItem.updateMany({
        where: { listId: null },
        data: { listId: list.id },
      });
      console.log(`Migrated ${orphaned.length} items to list ${list.id}`);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
