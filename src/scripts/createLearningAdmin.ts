/**
 * Quick helper to create/reset the learning admin account
 * Usage: npm run create-learning-admin
 * 
 * Creates:
 * - Username: admin
 * - Password: tajneheslo123
 * - Role: admin
 * - Auto-verified
 */

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function createLearningAdmin() {
    const username = "admin";
    const password = "tajneheslo123";
    const passwordHash = await bcrypt.hash(password, 10);

    console.log("🔧 Creating/resetting learning admin account...");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);

    // Ensure admin belongs to a cabin (required by requireCabin middleware)
    let cabin = await prisma.cabin.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, subdomain: true },
    });

    if (!cabin) {
        const suffix = crypto.randomBytes(3).toString("hex");
        cabin = await prisma.cabin.create({
            data: {
                name: "Učební chata",
                subdomain: `learning-${suffix}`,
                weatherLocation: "Praha",
            },
        });
        console.log(`✅ Created learning cabin: ${cabin.name} (${cabin.id})`);
    }

    const user = await prisma.user.upsert({
        where: { username },
        update: {
            passwordHash,
            role: "admin",
            cabinId: cabin.id,
            isVerified: true,
            isEmailVerified: true,
            isBanned: false,
            color: "#AB47BC",
        },
        create: {
            username,
            passwordHash,
            color: "#AB47BC",
            animalIcon: "fox",
            role: "admin",
            cabinId: cabin.id,
            isVerified: true,
            isEmailVerified: true,
            isBanned: false,
        },
    });

    console.log(`✅ Learning admin ready!`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Cabin ID: ${user.cabinId}`);
    console.log(`   Role: ${user.role}`);
    console.log("");
    console.log("🎯 Now you can:");
    console.log(`   - Login at http://localhost:5173/login`);
    console.log(`   - Use Postman with: ${username} / ${password}`);
    console.log(`   - Write Playwright tests with these credentials`);
}

createLearningAdmin()
    .catch((error) => {
        console.error("❌ Failed to create learning admin:", error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
