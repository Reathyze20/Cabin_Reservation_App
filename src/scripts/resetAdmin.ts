import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function reset() {
    const username = "AdminUser";
    const newPassword = "admin123";
    const passwordHash = await bcrypt.hash(newPassword, 10);

    console.log(`Setting password for ${username} to ${newPassword}...`);

    await prisma.user.upsert({
        where: { username },
        update: { passwordHash },
        create: {
            username,
            passwordHash,
            color: "#AB47BC",
            role: "admin"
        }
    });

    console.log("Password reset successfully!");
}

reset()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
