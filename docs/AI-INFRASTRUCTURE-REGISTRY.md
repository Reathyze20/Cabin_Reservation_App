# AI Infrastructure Registry

Centralni registry aktivnich AI assets pro tento repozitar.

Datum posledni revize: 2026-04-19
Owner: repo
Status: active

---

## Canonical Sources

Tyto soubory jsou prioritni zdroje pravdy pro AI vrstvu:

1. `memories/repo/stack-facts.md`
2. `memories/repo/ai-infrastructure-map.md`
3. `memories/repo/known-ai-drift-risks.md`
4. `.github/copilot-instructions.md`
5. `docs/AI-INFRASTRUCTURE-AUDIT.md`

Pravidlo:

- Kdyz se starsi prompt, agent nebo doc rozchazi s `stack-facts.md`, plati `stack-facts.md`.
- Dlouhe analyzy a plany nejsou samy o sobe kanonicka stack truth.

---

## Active Asset Inventory

### Workspace Instructions

| File | Scope | Status | Purpose |
|---|---|---|---|
| `.github/copilot-instructions.md` | repo-wide | active | global non-negotiables |
| `.github/instructions/ai-customizations.instructions.md` | AI assets | active | governance for prompts, agents, skills, hooks, memory |
| `.github/instructions/frontend-v2.instructions.md` | frontend-v2 source | active | current React frontend facts |
| `.github/instructions/backend.instructions.md` | backend + prisma | active | backend/API/schema guardrails |
| `.github/instructions/docs-memory.instructions.md` | docs + memories | active | doc and memory hygiene |

### Agents

| File | Name | Status | Primary Role |
|---|---|---|---|
| `.github/agents/team-lead.agent.md` | Team-Lead | active | orchestration |
| `.github/agents/app-analyst.agent.md` | App-Analyst | active | deep analysis |
| `.github/agents/business-analyst.agent.md` | Business-Analyst | active | product strategy |
| `.github/agents/backend-engineer.agent.md` | Backend-Engineer | active | backend implementation |
| `.github/agents/frontend-designer.agent.md` | Frontend-Designer | active | UI design |
| `.github/agents/mobile-ux.agent.md` | SaaS-Mobile-UX | active | mobile audit |
| `.github/agents/qa-engineer.agent.md` | QA-Engineer | active | verification |
| `.github/agents/saas-builder.agent.md` | SaaS-Builder | active | SaaS build + product thinking |
| `.github/agents/saas-reviewer.agent.md` | SaaS-Reviewer | active | read-only quality audit |
| `.github/agents/devops-engineer.agent.md` | DevOps-Engineer | active | infrastructure/deploy |
| `.github/agents/instructions-generator.agent.md` | Instructions Generator | active | generate/update AI customization files |

### Skills

| Folder | Skill Name | Status | Primary Role |
|---|---|---|---|
| `.agents/skills/CabinSaaS_Architect/` | CabinSaaS_Architect | active | repo-specific frontend architecture |
| `.agents/skills/frontend-design/` | frontend-design | active | high-polish UI work |
| `.agents/skills/saas-playbook/` | saas-playbook | active | product/launch/business checklists |
| `.agents/skills/skill-creator/` | skill-creator | active | skill creation and benchmarking |

### Prompts

| File | Name | Status | Notes |
|---|---|---|---|
| `.github/prompts/product-advisor.prompt.md` | product-advisor | active | current SaaS product guidance |
| `.github/prompts/ship-feature.prompt.md` | ship-feature | active | direct implementation entrypoint for build-first work |
| `.github/prompts/ship-frontend-feature.prompt.md` | ship-frontend-feature | active | focused frontend-v2 build entrypoint |
| `.github/prompts/ship-backend-feature.prompt.md` | ship-backend-feature | active | focused backend/API/schema build entrypoint |
| `.github/prompts/ship-full-stack-feature.prompt.md` | ship-full-stack-feature | active | explicit end-to-end DB/API/UI feature delivery entrypoint |
| `.github/prompts/deploy-incident.prompt.md` | deploy-incident | active | focused deploy, CI/CD and production incident entrypoint |
| `.github/prompts/hotfix.prompt.md` | hotfix | active | minimal-diff incident and regression repair entrypoint |
| `.github/prompts/create-instructions.prompt.md` | create-instructions | active | AI customization generation |
| `.github/prompts/security-audit.prompt.md` | security-audit | active | security audit task template |

### Hooks and Validation

| File | Status | Purpose |
|---|---|---|
| `.github/hooks/ai-governance.json` | active | runtime governance for AI asset edits |
| `src/scripts/aiGovernanceHook.ts` | active | hook logic |
| `src/scripts/validateAiAssets.ts` | active | static validation of AI assets |
| `src/scripts/reportAiGovernance.ts` | active | inventory and audit report for AI layer |
| `.github/workflows/ai-governance.yml` | active | CI validation and report artifact for AI layer |

---

## Lifecycle Rules

### Naming

- One active prompt/agent/skill name per primitive.
- No spaces in file names for agents, prompts, instructions, hooks.
- Use kebab-case file names where practical.

### Freshness

- Every active AI asset should be reviewed after major stack changes.
- `stack-facts.md` must be updated whenever routing, tenant key, framework major version, or runtime model changes.

### Eval Readiness

- Every active custom skill must have `evals/evals.json`.
- New high-value agents should eventually get prompt-routing eval coverage.

### Drift Prevention

- Do not duplicate long stack sections into prompts and agents unless necessary.
- Prefer linking or pointing to canonical facts instead of restating them.

---

## Current Governance Priorities

1. Keep stack facts synchronized.
2. Keep prompt/agent naming clean and unique.
3. Run `npm run validate:ai` after AI asset edits.
4. Expand eval coverage.
5. Move stable facts from long docs into concise repo memory shards.