---
name: saas-playbook
description: "SaaS launch playbook and checklists for kdynachatu.cz. USE THIS SKILL when: planning launch, running pre-launch audits, evaluating pricing models, designing onboarding flows, planning monetization strategy, preparing marketing, setting up analytics/error tracking, optimizing conversion funnels, planning multi-tenant architecture, running security audits, checking accessibility compliance, or when the user asks for a 'checklist', 'playbook', 'launch plan', 'audit', or 'roadmap'. Contains actionable checklists, competitive analysis frameworks, and revenue models specific to the cabin management SaaS niche."
---

# SaaS Playbook — kdynachatu.cz Launch & Growth Skill

This skill is the **strategic brain** behind transforming a hobby project into a profitable SaaS business. It contains battle-tested checklists, frameworks, and strategies specifically tailored for **kdynachatu.cz** — a multi-tenant cabin management platform.

## When to Use This Skill

- Planning what to build next (MVP scope, V2 features)
- Preparing for public launch
- Designing pricing and monetization
- Auditing the app for launch readiness
- Competitive positioning and marketing strategy
- Setting up analytics, error tracking, and monitoring

## Reference Documents

Load the appropriate reference file based on the task:

| Reference | When to load | Path |
|---|---|---|
| **MVP Checklist** | Planning what to ship first, prioritizing features | `references/mvp-checklist.md` |
| **Launch Readiness** | Pre-launch audit — everything that must work before going live | `references/launch-readiness.md` |
| **Pricing & Monetization** | Designing pricing tiers, free vs. paid features, billing | `references/pricing-strategy.md` |
| **Onboarding Playbook** | Designing the first-time user experience, activation metrics | `references/onboarding.md` |
| **Security Audit Checklist** | Running a security review of backend/frontend/infra | `references/security-audit.md` |
| **UX Heuristics** | Evaluating interface quality with Nielsen's heuristics + SaaS-specific rules | `references/ux-heuristics.md` |
| **Analytics & Monitoring** | Setting up tracking, dashboards, alerts | `references/analytics.md` |
| **Growth & Marketing** | SEO, content strategy, landing page optimization, acquisition channels | `references/growth.md` |

## Core Principle

Every decision must pass the **"would a cabin owner pay for this?"** test. The target user is:

- **Non-technical** — doesn't know what "SaaS" means
- **Family-oriented** — manages a cabin with 5-15 family members
- **Mobile-first** — uses the app on a phone, often with poor connectivity
- **Price-sensitive** — won't pay for something that doesn't clearly save time or prevent conflicts
- **Czech/Slovak** — primary market, Czech UX and language

## How to Apply Checklists

When the user asks for a checklist or audit:

1. **Load the relevant reference file**
2. **Walk through each item** — check current state of the codebase
3. **Report status** for each item: ✅ Done, ⚠️ Partial, ❌ Missing
4. **Prioritize** the missing items by business impact
5. **Estimate effort** as T-shirt sizes (XS, S, M, L, XL)
6. **Suggest an implementation order** that maximizes value/effort ratio
