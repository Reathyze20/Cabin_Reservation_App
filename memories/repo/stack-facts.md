# Stack Facts

Verified: 2026-04-19
Scope: canonical short stack facts for AI guidance

- Frontend app lives in `frontend-v2/`.
- Frontend stack: React 19, TypeScript strict, Vite 7, React Router DOM 7, TanStack Query 5, Axios, Tailwind CSS 4, shadcn/ui.
- Frontend routing is path-based in `frontend-v2/src/App.tsx`, not hash-based.
- Frontend features live in `frontend-v2/src/features/`, not `frontend-v2/src/pages/`.
- Backend stack: Node.js 20+, Express 4, Prisma 7, PostgreSQL, JWT auth, Zod validation.
- Multi-tenant key is `cabinId`, not `workspaceId`.
- Primary backend entry is `src/backend/server.new.ts`.
- Dev startup: root `npm run dev` starts backend and frontend together.
- Frontend dev proxy expects backend on `http://localhost:3000`.
- Production deploy uses GitHub Actions SSH deploy, PM2, and `prisma migrate deploy`.
- Production server Node/PM2 tooling lives under `/home/reathyze/.nvm`; server-side helper scripts must source NVM before calling `node`, `npm`, or `pm2`.