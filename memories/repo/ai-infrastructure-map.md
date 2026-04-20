# AI Infrastructure Map

Verified: 2026-04-19
Scope: active AI customization inventory and operating model

- Global repo guardrails: `.github/copilot-instructions.md`
- File-level instructions: `.github/instructions/*.instructions.md`
- Custom agents: `.github/agents/*.agent.md`
- Custom prompts: `.github/prompts/*.prompt.md`
- Custom skills: `.agents/skills/*/SKILL.md`
- AI validation script: `src/scripts/validateAiAssets.ts`
- AI governance report script: `src/scripts/reportAiGovernance.ts`
- AI runtime hook script: `src/scripts/aiGovernanceHook.ts`
- AI governance CI: `.github/workflows/ai-governance.yml`
- Canonical registry: `docs/AI-INFRASTRUCTURE-REGISTRY.md`
- Canonical stack facts: `memories/repo/stack-facts.md`