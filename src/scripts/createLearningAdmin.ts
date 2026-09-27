/**
 * Quick helper to create/reset a local learning admin account (dev only)
 * Usage: npm run create-learning-admin
 *
 * Creates:
 * - Username: LEARNING_ADMIN_USERNAME from .env (default: admin)
 * - Password: LEARNING_ADMIN_PASSWORD from .env, or a random one printed once
 * - Role: admin
 * - Auto-verified
 *
 * Refuses to run with NODE_ENV=production.
 */

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../utils/password";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function createLearningAdmin() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("create-learning-admin is a dev-only helper and must not run in production.");
    }

    const username = process.env.LEARNING_ADMIN_USERNAME || "admin";
    const password = process.env.LEARNING_ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");
    if (password.length < 12) {
        throw new Error("LEARNING_ADMIN_PASSWORD must be at least 12 characters long.");
    }
    const passwordHash = await hashPassword(password);

    console.log("🔧 Creating/resetting learning admin account...");
    console.log(`   Username: ${username}`);
    if (!process.env.LEARNING_ADMIN_PASSWORD) {
        console.log(`   Password (generated, shown only now): ${password}`);
    }

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
    console.log(`   - Use Postman with username "${username}" and the password above`);
    console.log(`   - Write Playwright tests with these credentials`);
}

createLearningAdmin()
    .catch((error) => {
        console.error("❌ Failed to create learning admin:", error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
