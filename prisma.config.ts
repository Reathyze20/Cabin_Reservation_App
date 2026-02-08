// Load .env if exists (skipped in Docker where env vars come from Railway/compose)
import 'dotenv/config';
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Read directly from process.env (set by Docker ENV or Railway vars)
    url: process.env.DATABASE_URL!,
  },
});
