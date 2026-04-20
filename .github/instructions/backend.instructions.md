---
description: "Use when editing backend routes, validators, auth flows, Prisma schema, or API contracts. Covers tenant scoping, validation, auth, and backend anti-drift rules."
applyTo: "src/backend/**/*.ts, src/validators/**/*.ts, prisma/schema.prisma"
---

# Backend Guidance

- Backend tenant scope uses `cabinId`, never `workspaceId`.
- Protected routes should use the existing auth and cabin middleware patterns.
- Validate public and mutating inputs with Zod before business logic.
- Keep Czech user-facing error messages and structured logging.
- Prefer minimal, additive schema changes and document new env vars.