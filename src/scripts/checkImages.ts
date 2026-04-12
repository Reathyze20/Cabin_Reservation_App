import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });

const photos = await p.galleryPhoto.findMany({ take: 3, select: { id: true, src: true } });
console.log("=== Photos ===");
console.log(JSON.stringify(photos, null, 2));

const folders = await p.galleryFolder.findMany({ take: 3, select: { id: true, name: true } });
console.log("=== Folders ===");
console.log(JSON.stringify(folders, null, 2));

await p.$disconnect();
