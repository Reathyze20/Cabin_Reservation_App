# KDY NA CHATU - Canonical Repo Guardrails

- Canonical stack facts live in `memories/repo/stack-facts.md`. If other docs disagree, prefer that file.
- Current frontend stack: React 19, Vite 7, TypeScript strict, React Router DOM 7, TanStack Query 5, Axios, Tailwind CSS 4, shadcn/ui.
- Current backend stack: Node.js 20+, Express 4, Prisma 7, PostgreSQL, JWT auth, Zod validation.
- Tenant scoping uses `cabinId`, never `workspaceId`.
- For `frontend-v2/` implementation work, always prefer `.agents/skills/CabinSaaS_Architect/SKILL.md`.
- For AI customization work in `.github/`, `.agents/`, `memories/` or `docs/AI-INFRASTRUCTURE*`, always consult `docs/AI-INFRASTRUCTURE-REGISTRY.md` and run `npm run validate:ai` after edits.
- Do not introduce new active AI assets that describe the app as Vanilla TS, hash-based router, or `workspaceId` based.