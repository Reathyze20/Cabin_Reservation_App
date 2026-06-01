# Implementation Roadmap — Learning Infrastructure

**Last Updated:** 2026-06-01  
**Purpose:** Track what's ready for learning and what still needs implementation

---

## ✅ Ready for Learning (Can Start Now)

### Postman (Production Ready)
- ✅ Backend API runs locally and is stable
- ✅ Swagger/OpenAPI docs enabled in dev mode
- ✅ Starter Postman collection exists ([postman/cabin-api-learning.postman_collection.json](../../postman/cabin-api-learning.postman_collection.json))
- ✅ Starter environment exists ([postman/cabin-local.postman_environment.json](../../postman/cabin-local.postman_environment.json))
- ✅ API quickstart guide ([../API-QUICKSTART.md](../API-QUICKSTART.md))
- ✅ Health endpoint works (`/api/health`)
- ✅ Local dev environment (`npm run dev`) works
- ✅ Frontend proxy to backend configured
- ✅ Build pipeline (`npm run preflight:deploy`) passes
- ✅ Learning guide ([POSTMAN-GUIDE.md](POSTMAN-GUIDE.md)) complete

### Playwright (Partially Ready)
- ✅ Application has stable `data-testid` selectors on all key elements
- ✅ Playwright starter guide ([PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md)) complete
- ✅ Playwright readiness checklist ([../PLAYWRIGHT-READINESS-CHECKLIST.md](../PLAYWRIGHT-READINESS-CHECKLIST.md)) documents all selectors
- ✅ Frontend has clear route roots, navigation, and page selectors
- ✅ Smoke test flow documented ([../SPRINT-0-SMOKE-TEST.md](../SPRINT-0-SMOKE-TEST.md))
- ✅ Quick start guide ([GETTING-STARTED.md](GETTING-STARTED.md)) complete

### Infrastructure
- ✅ Helper script for creating learning admin (`npm run create-learning-admin`)
- ✅ README updated with current stack (no more Vanilla JS mentions)
- ✅ Clear documentation structure in `docs/learning/`

---

## 🔴 Gaps & Blockers

### 1. ~~Unified Login Credentials~~ ✅ FIXED

**Status:** ✅ **RESOLVED**

**What was the problem:**
- Postman collection used `admin` / `tajneheslo123`
- Playwright examples used `admin` / `tajneheslo123`
- Archive seed had `AdminUser` with unknown password hash
- Reset script defaulted to `AdminUser` / `admin123`

**Solution implemented:**
- ✅ Created `npm run create-learning-admin` script
- ✅ Script creates `admin` / `tajneheslo123` consistently
- ✅ Updated [GETTING-STARTED.md](GETTING-STARTED.md) with clear instructions
- ✅ All guides now reference the same credentials

**Result:** No longer a blocker — learner can create account in one command.

---

### 2. ~~Outdated Root README~~ ✅ FIXED

**Status:** ✅ **RESOLVED**

**What was the problem:**
- README claimed "Vanilla JavaScript", "Live Server", "Node.js 12+"
- Actual stack: React 19, Vite 7, Node.js 20+
- Confusing for beginners

**Solution implemented:**
- ✅ Completely rewrote [README.md](../../README.md)
- ✅ Updated stack description
- ✅ Removed Live Server references
- ✅ Added link to learning guides
- ✅ Added clear quick start section

**Result:** No longer a blocker — README is accurate and helpful.

---

### 3. External Playwright Workspace

**Status:** 🟡 **PARTIALLY BLOCKED** (workaround available)

**What's missing:**
- No ready-to-use Playwright project template
- Learner must create their own from scratch
- Documentation says "create external workspace" but doesn't provide scaffolding

**Workaround:**
- [PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md) Part 1 shows step-by-step setup
- Learner can follow the guide and create their own project
- Takes 15-30 minutes to set up

**Ideal solution:**
- [ ] Create `CabinPlaywrightTests/` repository/folder
- [ ] Initialize with `@playwright/test`
- [ ] Add `playwright.config.ts` with `baseURL: http://localhost:5173`
- [ ] Include 3-5 example tests:
  - `tests/01-auth/login.spec.ts`
  - `tests/02-reservations/create.spec.ts`
  - `tests/03-shopping/list.spec.ts`
- [ ] Add `helpers/auth.ts` with login helper
- [ ] Add README with setup instructions
- [ ] Link from main repo README

**Priority:** 🟡 **MEDIUM** — learner can start without this, but it improves experience

**Time estimate:** 2-3 hours

---

### 4. Isolated E2E Test Data

**Status:** 🟡 **PARTIALLY BLOCKED** (workaround available)

**What's missing:**
- No dedicated E2E database or reset/seed flow
- Tests run against live dev database
- Data changes during development → flaky tests
- No predictable starting state

**Workaround:**
- Run tests against existing dev data
- Accept that data is not always consistent
- Manual cleanup between test runs
- Works for learning, but not production-grade

**Ideal solution:**
- [ ] Create `src/scripts/seedE2EData.ts`:
  - One cabin
  - Admin `admin` / `tajneheslo123`
  - Regular member `member` / `heslo123`
  - Guest `guest` / `heslo123`
  - 1-2 sample reservations
  - 1 shopping list
  - Empty albums and diary
- [ ] Add npm script: `npm run seed:e2e`
- [ ] In Playwright config, add `globalSetup` to reset data before each run
- [ ] Document in [PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md)

**Priority:** 🟠 **MEDIUM-HIGH** — affects test reliability long-term

**Time estimate:** 3-4 hours

---

### 5. Login Helpers & Storage State

**Status:** 🟢 **LOW PRIORITY** (nice-to-have)

**What's missing:**
- No pre-built login helpers
- No storage state setup for skipping login
- Every test must login manually → slower tests

**Workaround:**
- Create login helper in test project (shown in guide)
- Write `loginAsAdmin(page)` function yourself
- Works fine, just requires learner to implement it

**Ideal solution:**
- [ ] In external Playwright project, add `helpers/auth.ts`:
  ```typescript
  export async function loginAsAdmin(page: Page) { ... }
  export async function loginAsMember(page: Page) { ... }
  export async function loginAsGuest(page: Page) { ... }
  ```
- [ ] Add `setup/auth.setup.ts` to save storage states
- [ ] Configure `playwright.config.ts` to use storage state by default
- [ ] Document in guide

**Priority:** 🟢 **LOW** — learner can implement this themselves as learning exercise

**Time estimate:** 1-2 hours

---

### 6. Postman Environment Auto-Fill

**Status:** 🟢 **LOW PRIORITY** (cosmetic issue)

**What's missing:**
- Environment has `adminUsername` and `adminPassword` variables
- But they're not used automatically in requests
- Learner sees variables but they don't "do anything" → confusing

**Workaround:**
- Just use the hardcoded values in request bodies
- Works perfectly, just not as elegant

**Ideal solution:**
- [ ] Update all requests to use `{{adminUsername}}` and `{{adminPassword}}`
- [ ] Add Pre-request Script if needed
- [ ] Test that login works immediately after import

**Priority:** 🟢 **VERY LOW** — purely cosmetic

**Time estimate:** 15 minutes

---

## 📋 Recommended Implementation Order

If you have time to implement the missing pieces, do them in this order:

### Phase 1: Postman Polish (30 minutes)
- [x] ~~Unified credentials~~ ✅ Done
- [x] ~~Updated README~~ ✅ Done
- [x] ~~Helper script~~ ✅ Done
- [ ] Postman environment auto-fill (#6) — optional

**Result:** Postman learning is 100% ready

---

### Phase 2: Playwright Quick Start (2-3 hours)
- [ ] Create external Playwright project template (#3)
- [ ] Add 3-5 example tests
- [ ] Add basic login helper
- [ ] Write README for Playwright project
- [ ] Update main README with link

**Result:** Learner can start Playwright without manual setup

---

### Phase 3: Playwright Production Ready (4-6 hours)
- [ ] Create E2E seed script (#4)
- [ ] Add globalSetup to Playwright config
- [ ] Implement storage state setup (#5)
- [ ] Test entire suite runs consistently 3+ times
- [ ] Document best practices

**Result:** Production-grade Playwright setup for serious learning

---

## 🎯 Definition of Done

### For Postman:
- [x] `npm run dev` starts app without errors
- [x] `npm run create-learning-admin` creates test admin
- [x] Postman collection imports in one click
- [x] First "Login admin" request returns token
- [x] Learner can run 10+ requests without manual edits
- [x] [POSTMAN-GUIDE.md](POSTMAN-GUIDE.md) has step-by-step walkthrough
- [x] **STATUS: ✅ PRODUCTION READY**

### For Playwright (Current State):
- [x] Application has stable selectors
- [x] [PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md) shows how to set up from scratch
- [x] Quick preview works (learner can create test in 15 min)
- [x] [GETTING-STARTED.md](GETTING-STARTED.md) links to both guides
- [ ] External Playwright project exists with examples — **MISSING**
- [ ] `npx playwright test` runs reliably — **PARTIALLY (works with manual setup)**
- [ ] Login helper is pre-built — **MISSING (learner creates own)**
- [x] **STATUS: 🟡 FUNCTIONAL BUT REQUIRES MANUAL SETUP**

### For Playwright (Ideal):
- [ ] External Playwright project repository/folder exists
- [ ] `npx playwright test` runs 3+ example tests
- [ ] Login helper is pre-built and documented
- [ ] E2E seed data is available
- [ ] Tests pass consistently 3+ runs in a row
- [ ] **STATUS: 🔴 NOT YET ACHIEVED**

---

## 🚀 How to Use This Document

### For the Learner:
1. Check "Ready for Learning" section → see what you can start with now
2. Check "Gaps & Blockers" → understand what limitations exist
3. If you hit a gap, check if there's a workaround
4. Focus on **Postman first** (fully ready), then move to Playwright

### For the Developer:
1. Use "Recommended Implementation Order" to plan work
2. Track progress by moving items from 🔴 to ✅
3. Update "Definition of Done" as items are completed
4. When all Phase 1 is done → learner can use Postman professionally
5. When all Phase 2 is done → learner can start Playwright easily
6. When all Phase 3 is done → learner has production-grade setup

---

**Current Status:** Phase 1 ✅ Complete — Postman is production-ready for learning!
