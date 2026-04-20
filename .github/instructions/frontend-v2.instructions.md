---
description: "Use when editing React frontend-v2 source files. Covers current stack facts, routing, data layer, and anti-drift rules for the active frontend architecture."
applyTo: "frontend-v2/src/**/*.{ts,tsx}"
---

# Frontend-v2 Guidance

- The active frontend is React 19 + Vite 7 + React Router DOM 7.
- Use TanStack Query 5 for server state and Axios API modules.
- Treat `frontend-v2/src/features/` as the primary feature surface.
- Do not introduce hash-router assumptions into active frontend-v2 code.
- Tenant-aware data and auth flows should use `cabinId` terminology.
- For implementation detail and architecture patterns, prefer `.agents/skills/CabinSaaS_Architect/SKILL.md`.