---
name: deploy-incident
description: Resolve a deployment failure, production incident, PM2 issue, CI/CD breakage, 502 error, server outage, or infrastructure problem in this repository. Use when the user says deploy, nasazeni, production problem, server nejede, 502, PM2, pipeline selhala, GitHub Actions, VPS, nebo potrebuje rychle obnovit beh aplikace.
agent: "DevOps-Engineer"
argument-hint: "Popis deploy problemu, produkcniho incidentu nebo CI/CD selhani k vyreseni"
---

Vyres deployment nebo produkcni incident jako operational build-first task.

Pracuj takto:

1. Priorita cislo jedna je obnovit beh aplikace. Downtime je horsi nez nedokonceny cleanup.
2. Nejdriv si nacti `memories/repo/stack-facts.md`, `docs/AI-INFRASTRUCTURE-REGISTRY.md` a relevantni deploy nebo infra soubory (`.github/workflows/*.yml`, `manual-deploy.ps1`, `docker-compose.yml`, `nginx-chata.conf`) podle problemu.
3. Zacni rychlym operational triage: co je rozbite, kde je signal selhani, jestli je postizeny build, app process, DB migrace, proxy nebo server runtime.
4. Pri produkcnim incidentu preferuj nejmensi bezpecny zasah, ktery obnovi funkcnost. Nedelej velky redesign pipeline, pokud neni nutny pro fix.
5. Kdyz menis deploy workflow nebo skripty, zachovej failsafe restart, NVM sourcing, `npm ci`, additive Prisma pristup a pravidlo ze aplikace nesmi zustat dole.
6. Kdyz je potreba manualni operational krok, uved ho presne a bezpecne. Pokud jde problem vyresit primo v repu, udelej to.
7. Overeni ma odpovidat incidentu: napriklad lint nebo TS check u workflow skriptu, lokalni build, `npm run validate:ai` pro AI asset zmeny, nebo health-check prikaz kdyz pracujes s runtime/deploy flow.
8. Finalni odpoved ma byt striktne prakticka: co bylo rozbite, co bylo opraveno, co overit po deployi a jaky zbyva operational risk.

Priorita rozhodovani:

- Obnovit dostupnost a bezpecne nasazeni
- Minimalni diff a co nejmensi operational risk
- Az potom cleanup a ergonomie pipeline

Tento prompt je urceny pro deploy a production praci, ne pro bezne feature implementace.