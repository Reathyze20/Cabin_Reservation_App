# AI Infrastructure Audit

Audit aktualni AI/customization vrstvy v repu a navrh, jak ji posunout do stavu, kdy funguje jako next-gen interní nástroj pro programování, analýzu, review, plánování a dokončování práce.

Datum: 2026-04-19

---

## Executive Summary

Aktualni AI vrstva je obsahove silna, ale systemove stale krehka.

Nejvetsi problem dnes neni nedostatek agentu, skillu nebo promptu.
Nejvetsi problem je, ze chybi:

1. jedna kanonicka pravda o stacku, architekture a workflow,
2. evals a benchmarky pro vlastni AI assets,
3. enforcement pres CI/hooks misto pouhych textovych instrukci,
4. jasne oddelene role a trigger hranice,
5. zdrava memory strategie bez driftu.

Pokud tyto body nevyresite, dalsi agenti a prompty budou spis zvetsovat slozitost nez uzitek.

---

## Soucasny Stav

### Co uz mate

- Workspace-level instruction v `.github/copilot-instructions.md`.
- 10+ custom agentu v `.github/agents/`.
- 4 custom skilly v `.agents/skills/`.
- Managed prompty v `.github/prompts/`.
- Repo memory v `memories/repo/app-knowledge-base.md`.
- Session memory pro prubezne analyzy a roadmapy.
- Jeden robustni production workflow v `.github/workflows/deploy.yml`.

### Co funguje dobre

- Silny orchestrator v `.github/agents/team-lead.agent.md`.
- Kvalitni frontend-specific guidance v `.agents/skills/CabinSaaS_Architect/SKILL.md`.
- Solidni business/product vrstva v `.github/agents/business-analyst.agent.md` a `.agents/skills/saas-playbook/SKILL.md`.
- Nadprumerne dobry skill-eval framework v `.agents/skills/skill-creator/SKILL.md`.

### Co chybi

- Zadny `.github/hooks/` enforcement layer.
- Zadna `.github/*.instructions.md` file-scoped instruction vrstva.
- Zadny AI config CI workflow.
- Zadna aktivne pouzivana eval sada pro vlastni skilly nebo agenty.
- Zadna centralni registry AI assets.

---

## Nejvetsi Slaba Mista

### 1. Chybi kanonicka pravda

V repu je vice zdroju, ktere si odporuji.

Priklady:

- `.github/copilot-instructions.md` stale popisuje React 18.
- `memories/repo/app-knowledge-base.md` uz popisuje React 19 a path-based routing.
- `.github/prompts/product-advisor.prompt.md` a `.github/prompts/create-instructions.prompt.md` obsahuji starsi architekturu s Vanilla TS / hash routerem / workspaceId.

Dusledek:

- AI muze generovat technicky korektni, ale architektonicky zastarale navrhy.
- Kontext je bohaty, ale nespolehlivy.

### 2. Prompt layer je nekuratorovany

Problemy:

- duplicita identity `product-advisor`,
- typo ve filename `security-audit.promnt.md.prompt.md`,
- historicke root prompty byly mimo managed vrstvu; byly odstraneny a aktivni prompt layer zustava v `.github/prompts/`.

Dusledek:

- horsi discoverability,
- horsi trigger accuracy,
- vznik shadow knowledge mimo system.

### 3. Agenti maji prekryv rolí

Kolize dnes existuji hlavne mezi:

- `team-lead`,
- `app-analyst`,
- `business-analyst`,
- `saas-builder`,
- `saas-reviewer`.

Dusledek:

- neni vzdy jasne, kdo ma analyzovat, kdo stavet a kdo reviewovat,
- bez evals nejde objektivne poznat, jestli se spousti spravny agent.

### 4. Quality gates jsou popsane, ale nejsou vynucene

Kontroly jsou dobre popsane v agent instrukcich, ale neexistuje system, ktery by je pravidelne validoval pro AI vrstvu samotnou.

Priklad:

- `qa-engineer.agent.md` definuje verify protokol,
- ale `.github/workflows/deploy.yml` resi jen deploy aplikace, ne kondici AI customizations.

Dusledek:

- AI vrstva neni spravovana jako produkt,
- regressions v instrukcich, triggerech nebo naming discipline nikdo automaticky nechyta.

### 5. Memory je moc velka a driftuje

`memories/repo/app-knowledge-base.md` je cenny soubor, ale je prilis siroky.

Obsahuje soucasne:

- feature inventory,
- architekturu,
- maturity stav,
- technologicky snapshot,
- roadmap context.

Dusledek:

- tezko se udrzuje presny,
- stale vic hrozi vnitrni rozpory,
- model nese velky kontextovy blok i tam, kde staci mala verified fakta.

### 6. Eval tooling existuje, ale nepouziva se

`.agents/skills/skill-creator/SKILL.md` obsahuje silny proces pro evals, benchmarky a viewer, ale v repu nejsou videt zive eval sady pro vlastni skilly nebo agenty.

Dusledek:

- vlastni AI assets nemaji regression testing,
- zlepseni se meri pocitove, ne objektivne.

---

## Maturity Model

Skala:

- 0 = neexistuje
- 1 = ad hoc
- 2 = zdokumentovane, ale krehke
- 3 = opakovatelne workflow
- 4 = merene a vynucene
- 5 = self-improving system

| Oblast | Dnes | Cil |
|---|---:|---:|
| Accuracy of Context | 2 | 4 |
| Task Orchestration | 3 | 4 |
| Knowledge Persistence | 2 | 4 |
| Quality Gates | 1 | 4 |
| Discovery / Triggering | 2 | 4 |
| Automation | 1 | 4 |
| Evaluation | 1 | 4 |
| Product / Business Support | 3 | 4 |

Celkem: cca 2/5.

To znamena:

- system uz umi realne pomahat,
- ale jeste neni robustni, mereny ani samoudrzovany.

---

## Target Architecture

Next-gen stav nema znamenat vice promptu.
Ma znamenat jasne oddelene vrstvy s jednoznacnou roli.

### 1. Repo Instruction Layer

Udrzovat jen globalni non-negotiables:

- coding standards,
- bezpečnost,
- verify pravidla,
- pointer na kanonicke zdroje.

Nema obsahovat detailni stack truth, ktera rychle driftuje.

### 2. File-Scoped Instructions Layer

Pridat `.github/instructions/` pro oblasti jako:

- backend routes,
- Prisma schema,
- frontend-v2 React features,
- docs a PRD soubory,
- AI customizations (`.github/**`, `.agents/**`, `memories/**`).

To snizi context bloat a zpresni guidance podle typu souboru.

### 3. Agent Layer

Kazdy agent ma mit jen:

- jasny scope,
- kdy se spousti,
- co vraci,
- koho deleguje,
- jaky quality gate predava dal.

Agenti nemaji duplikovat celou architekturu produktu.

### 4. Skill Layer

Sem patri hluboke playbooky.

Chybejici skilly:

- `Backend_Architect` nebo `CabinBackend_Architect`
- `security-review`
- `release-readiness`
- `knowledge-maintenance`
- `agent-evals` nebo `ai-config-governance`

### 5. Prompt Layer

Prompt ma byt bud:

- jednorazova sablona,
- nebo kratkodoby export artifact.

Evergreen know-how ma byt ve skillech nebo referencich, ne v prompt chaosu.

### 6. Memory Layer

Rozdelit repo memory na mensi verified files, napr.:

- `stack-facts.md`
- `routing-and-auth-facts.md`
- `deploy-facts.md`
- `known-ai-drift-risks.md`
- `feature-map-summary.md`
- `ai-infrastructure-map.md`

Kazdy soubor ma mit:

- datum posledniho overeni,
- scope,
- kratke, stabilni fakty.

### 7. Enforcement Layer

Pridat hooks a CI workflow pro AI vrstvu.

Minimum:

- validace frontmatter,
- kontrola duplicate `name`,
- kontrola naming discipline,
- kontrola broken references,
- drift warning pri zmene stacku/architektury,
- benchmark run pri zmene skillu/agenta.

---

## Roadmap

## Horizont 1 tyden

### 1. Zavedeni AI registry

Vytvorit centralni registry napr. `docs/AI-INFRASTRUCTURE-REGISTRY.md` nebo `memories/repo/ai-infrastructure-map.md`.

Ma obsahovat:

- seznam agentu,
- seznam skillu,
- seznam promptu,
- owner,
- scope,
- trigger,
- status: active / legacy / archive,
- datum posledni revize.

Dopad: Kriticky
Narocnost: M

### 2. Vyčisteni prompt layer

- prejmenovat nebo archivovat duplicitni `product-advisor`,
- opravit `security-audit.promnt.md.prompt.md`,
- vytridit root prompty na active vs archive.

Dopad: Vysoky
Narocnost: S

### 3. Rozsekani repo memory

Rozdelit `memories/repo/app-knowledge-base.md` na mensi verified memory shards.

Dopad: Vysoky
Narocnost: M

### 4. Trigger mapa pro agenty a skilly

Sepsat presne hranice mezi Team-Lead, App-Analyst, Business-Analyst, SaaS-Builder a SaaS-Reviewer.

Dopad: Vysoky
Narocnost: S

## Horizont 1 mesic

### 5. AI config CI

Pridat workflow, ktery bude kontrolovat:

- syntax a frontmatter customization files,
- duplicate names,
- naming conventions,
- stale registry references.

Dopad: Kriticky
Narocnost: M

### 6. Zavest evals pro vlastni skilly a agenty

Zacit minimalne s:

- `CabinSaaS_Architect`
- `saas-playbook`
- `Team-Lead`
- `App-Analyst`
- `QA-Engineer`

Dopad: Kriticky
Narocnost: L

### 7. Dopsat chybějici repo-specific skilly

Priorita:

1. backend architecture skill,
2. security review skill,
3. release-readiness skill.

Dopad: Vysoky
Narocnost: M

### 8. Zavest hooks

Pre-commit / pre-push hooks pro AI vrstvu:

- validace customizations,
- reference check,
- benchmark subset u zmenenych skillu.

Dopad: Vysoky
Narocnost: M

## Horizont 1 kvartal

### 9. Benchmark dashboard pro AI vrstvu

Mit historii trigger accuracy, quality pass rate a latency/token cost per skill/agent.

Dopad: Vysoky
Narocnost: L

### 10. Uzavreny feedback loop

Po vetsim tasku automaticky nebo poloautomaticky:

- povysit overena fakta do repo memory,
- oznacit stale docs,
- aktualizovat registry,
- vytvorit follow-up backlog item.

Dopad: Vysoky
Narocnost: L

### 11. AI steward workflow

Zavest periodickou udrzbu AI vrstvy:

- mesicni review,
- stale asset cleanup,
- benchmark rerun,
- trigger tuning.

Dopad: Stredni az vysoky
Narocnost: S

---

## Top 5 Zasahu S Nejvyssi Navratnosti

1. Vytvorit jednu kanonickou pravdu o stacku a AI assets.
2. Rozsekat memory a odstranit drift mezi instrukcemi a realitou.
3. Vycistit prompt layer a sjednotit naming discipline.
4. Zavest AI config CI + hooks.
5. Zprovoznit evals a benchmarky pro vlastni skilly a hlavni agenty.

---

## Prakticka Teze

Next-gen AI infrastruktura u vas nevznikne tim, ze pridate dalsiho chytreho agenta.
Vznikne tim, ze z dnesni sbirky dobrych textu udelate:

- kuratorovany system,
- s jednou pravdou,
- s meritelnosti,
- s enforcementem,
- a s pravidelnou udrzbou.

Do te doby je AI vrstva uzitecna, ale porad vic "silny poradce" nez "spolehlivy interní operacni system".