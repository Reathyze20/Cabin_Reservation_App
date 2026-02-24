import prisma from "./src/utils/prisma.js";

async function main() {
    try {
        const user = await prisma.user.findFirst();
        console.log("Success:", user);
    } catch (e) {
        console.error("Full Error:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
