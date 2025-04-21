import dotenv from "dotenv";

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "TotoJeVelmiTajneHeslo";

if (JWT_SECRET === "TotoJeVelmiTajneHeslo") {
  console.warn(
    "Používáte výchozí tajný klíč pro JWT. Změňte ho v .env souboru!"
  );
}
