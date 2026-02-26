import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const prisma = new PrismaClient({ adapter });

async function main() {
    const emailToDelete = "tomasq.rambousek@seznam.cz";

    try {
        const user = await prisma.user.findFirst({
            where: {
                email: emailToDelete
            }
        });

        if (user) {
            await prisma.user.delete({
                where: {
                    id: user.id
                }
            });
            console.log(`User with email ${emailToDelete} successfully deleted.`);
        } else {
            console.log(`User with email ${emailToDelete} not found.`);
        }
    } catch (error) {
        console.error(`Error deleting user:`, error);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
