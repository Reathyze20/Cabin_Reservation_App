---
name: create-instructions
description: Create or refactor workspace instructions, prompts, agents, skills, hooks, or AI governance docs for this repository. Use when you want to improve the AI customization layer, reduce drift, or package reusable working patterns.
agent: "Instructions Generator"
argument-hint: "Popis AI customization, kterou mam vytvorit nebo upravit"
---

Vytvor nebo uprav AI customization soubor(y) pro tento repozitar.

Postupuj takto:

1. Pouzij `docs/AI-INFRASTRUCTURE-REGISTRY.md` a `memories/repo/stack-facts.md` jako kanonicke zdroje.
2. Urcuj spravne primitivum: instruction vs prompt vs agent vs skill vs hook.
3. Neopakuj dlouhe stack truth v kazdem souboru; odkazuj na kanonicke zdroje.
4. Udrzuj naming disciplinu a vyhybej se duplicitnim aktivnim jmenum.
5. Kdyz vytvaris skill, pridej i `evals/evals.json` scaffold.
6. Aktivni customization files musi zustat v souladu s aktualnim kanonickym frontendem, tenant namingem a routing modelem z registry a stack facts.
7. Na konci vzdy vypis:
	- co bylo vytvoreno nebo upraveno,
	- jaka governance pravidla to resi,
	- co zvalidovat pres `npm run validate:ai`.

Preferovany vystup:

### Navrhovane soubory

- seznam souboru k vytvoreni/uprave

### Governance rationale

- proc je zvolene primitivum spravne
- jak to snizuje drift nebo zvysuje discoverability

### Validation

- co zkontrolovat pres `npm run validate:ai`