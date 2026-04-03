import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function reset() {
    const username = process.env.ADMIN_USERNAME || "AdminUser";
    const newPassword = process.env.ADMIN_PASSWORD || "admin123";
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Ensure admin belongs to a cabin (required by requireCabin middleware)
    let cabin = await prisma.cabin.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, subdomain: true, createdAt: true },
    });

    if (!cabin) {
        const suffix = crypto.randomBytes(3).toString("hex");
        cabin = await prisma.cabin.create({
            data: {
                name: "Výchozí chata",
                subdomain: `default-${suffix}`,
            },
        });
        console.log(`Created fallback cabin: ${cabin.name} (${cabin.id})`);
    }

    console.log(`Setting password for ${username} to ${newPassword}...`);

    const user = await prisma.user.upsert({
        where: { username },
        update: {
            passwordHash,
            role: "admin",
            cabinId: cabin.id,
            isVerified: true,
            isEmailVerified: true,
            isBanned: false,
        },
        create: {
            username,
            passwordHash,
            color: "#AB47BC",
            role: "admin",
            cabinId: cabin.id,
            isVerified: true,
            isEmailVerified: true,
            isBanned: false,
        }
    });

    console.log(`Admin reset successfully! userId=${user.id} cabinId=${user.cabinId}`);
}

reset()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
