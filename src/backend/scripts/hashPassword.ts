import bcrypt from "bcrypt";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Zadej heslo k zahashování: ", async (password) => {
  if (!password) {
    console.log("Heslo nesmí být prázdné.");
    rl.close();
    return;
  }
  try {
    const saltRounds = 10; // Počet kol pro generování soli
    const hash = await bcrypt.hash(password, saltRounds);
    console.log("Zahashované heslo: (zkopírujte do users.json):");
    console.log(hash);
    console.log("Heslo bylo úspěšně zahashováno.");
  } catch (error) {
    console.error("Chyba při hashování hesla:", error);
  } finally {
    rl.close();
  }
});
