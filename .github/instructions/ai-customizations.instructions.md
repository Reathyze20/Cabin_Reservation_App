---
description: "Use when creating or editing custom agents, skills, prompt files, hooks, AI governance docs, or repo memory. Covers canonical sources, naming discipline, eval requirements, and drift prevention."
applyTo: ".github/**/*.md, .github/hooks/**/*.json, .agents/**/*.md, memories/repo/**/*.md, docs/AI-INFRASTRUCTURE*.md"
---

# AI Customization Governance

- Treat `memories/repo/stack-facts.md` and `docs/AI-INFRASTRUCTURE-REGISTRY.md` as canonical before editing AI assets.
- Do not restate long stack descriptions in multiple places if a canonical source already exists.
- Keep one concern per file: agent role, skill workflow, prompt task, instruction concern, hook policy, memory facts.
- New active skills must include `evals/evals.json` with at least two realistic prompts.
- New active prompts and agents should have unique names inside their primitive type.
- Active AI assets must not describe this repo as Vanilla TypeScript, hash-based routing, or `workspaceId`-scoped unless the file is explicitly archival.
- After editing AI assets, run `npm run validate:ai`.