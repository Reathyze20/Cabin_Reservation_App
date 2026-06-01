# Browser Testing with Playwright — Complete Guide

**Audience:** Beginners in browser automation  
**Prerequisites:** 
- Application running (see [GETTING-STARTED.md](GETTING-STARTED.md))
- Basic understanding of APIs (recommended: complete [POSTMAN-GUIDE.md](POSTMAN-GUIDE.md) first)
**Time Required:** 4-8 hours  
**Goal:** Learn to automate browser testing with Playwright

---

## Why Playwright?

Playwright is a modern browser automation framework that:
- **Supports all major browsers** (Chrome, Firefox, Safari)
- **Fast and reliable** (no flaky tests)
- **Auto-waits** for elements (no manual sleeps)
- **Great developer experience** (TypeScript support, debugging tools)
- **Industry standard** for E2E testing

---

## Important Architecture Decision

**Playwright tests DO NOT belong in this repository.**

Why?
- Separation of concerns: app code vs. test code
- Independent deployment: tests don't affect production build
- Scalability: test project can grow independently

**Solution:** You'll create a separate project called `CabinPlaywrightTests` for all your tests.

---

## Part 1: Quick Preview (Try This Now!)

Even without the full setup, you can try Playwright immediately to see how it works.

### Step 1: Create Test Project

In a **different folder** (not inside CabinReservationProject), create a new directory:

```powershell
# Example: Create on desktop or in your projects folder
cd C:\Users\reath\Projects
New-Item -ItemType Directory -Path "CabinPlaywrightTests"
cd CabinPlaywrightTests
```

### Step 2: Initialize Playwright

```powershell
npm init -y
npm install -D @playwright/test
npx playwright install
```

**What this does:**
- Installs Playwright framework
- Downloads browser binaries (Chrome, Firefox, Safari)

### Step 3: Create Your First Test

Create a file `example.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('basic test - open and login', async ({ page }) => {
  // Navigate to the app (make sure it's running!)
  await page.goto('http://localhost:5173');
  
  // Verify the page loaded
  await expect(page).toHaveTitle(/Chata/);
  
  // Fill in login form
  await page.getByTestId('login-username-input').fill('admin');
  await page.getByTestId('login-password-input').fill('tajneheslo123');
  
  // Click login button
  await page.getByTestId('login-submit-button').click();
  
  // Verify we're on dashboard
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
  
  // Take a screenshot (for fun!)
  await page.screenshot({ path: 'dashboard.png' });
});
```

### Step 4: Run the Test

```powershell
# Headless (no visible browser)
npx playwright test example.spec.ts

# Headed (watch it happen!)
npx playwright test example.spec.ts --headed

# UI Mode (best for debugging)
npx playwright test example.spec.ts --ui

# Debug Mode (step-by-step)
npx playwright test example.spec.ts --debug
```

**What you'll see:**
- Browser opens automatically
- Forms fill themselves
- Clicks happen automatically
- Test passes or fails with clear errors

**🎉 Congratulations! You just automated a browser!**

---

## Part 2: Understanding Selectors

Playwright needs to **find elements** on the page. The app is already prepared with stable selectors.

### Selector Priority (Use in This Order)

#### 1. `getByTestId` — Recommended for Important Elements
```typescript
// Login form
await page.getByTestId('login-username-input').fill('admin');
await page.getByTestId('login-submit-button').click();

// Page roots
await expect(page.getByTestId('dashboard-page')).toBeVisible();
await expect(page.getByTestId('reservations-page')).toBeVisible();

// Navigation
await page.getByTestId('desktop-nav-link').filter({ hasText: 'Rezervace' }).click();
```

**Why use this:** Stable, doesn't break when text changes or UI is redesigned.

#### 2. `getByRole` — Recommended for Semantic Elements
```typescript
// Buttons
await page.getByRole('button', { name: 'Vytvořit rezervaci' }).click();

// Links
await page.getByRole('link', { name: 'Galerie' }).click();

// Form inputs
await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
```

**Why use this:** Accessible, follows web standards.

#### 3. `getByLabel` — Recommended for Form Fields
```typescript
await page.getByLabel('Username').fill('admin');
await page.getByLabel('Password').fill('tajneheslo123');
```

**Why use this:** Works with proper form labels, accessible.

#### 4. `getByText` — Use Only for Stable Text
```typescript
await page.getByText('Vítejte v aplikaci').waitFor();
await page.getByText('Vytvořit novou rezervaci').click();
```

**⚠️ Warning:** Breaks if text changes, not recommended for Czech app (text often changes).

#### 5. CSS Selectors — Last Resort
```typescript
await page.locator('.dashboard-card').first().click();
```

**⚠️ Warning:** Brittle, breaks when CSS changes. Only use when no other option exists.

---

## Part 3: Selector Reference for This App

The app has `data-testid` attributes on all important elements. Here's a quick reference:

### Authentication
```typescript
// Login page
page.getByTestId('login-form')
page.getByTestId('login-username-input')
page.getByTestId('login-password-input')
page.getByTestId('login-submit-button')
page.getByTestId('login-forgot-password-link')

// Register flow
page.getByTestId('register-form')
page.getByTestId('register-submit-button')
```

### Shell Navigation
```typescript
// Desktop
page.getByTestId('desktop-topbar')
page.getByTestId('desktop-primary-nav')
page.getByTestId('desktop-nav-link').filter({ hasText: 'Dashboard' })
page.getByTestId('profile-menu-button')
page.getByTestId('profile-menu')

// Mobile
page.getByTestId('mobile-header')
page.getByTestId('mobile-nav')
page.getByTestId('mobile-nav-link').filter({ hasText: 'Nákupy' })
```

### Page Roots
```typescript
page.getByTestId('dashboard-page')
page.getByTestId('reservations-page')
page.getByTestId('notes-page')
page.getByTestId('shopping-page')
page.getByTestId('gallery-page')
page.getByTestId('diary-page')
page.getByTestId('admin-page')
```

### Reservations
```typescript
page.getByTestId('reservation-create-button')
page.getByTestId('reservation-list-item') // Repeatable
  .filter({ has: page.getByText('2026-06-12') })
```

### Shopping Lists
```typescript
page.getByTestId('shopping-list-create-button')
page.getByTestId('shopping-list-row') // Repeatable
page.getByTestId('shopping-item-row') // Repeatable
```

**Full selector inventory:** See [../PLAYWRIGHT-READINESS-CHECKLIST.md](../PLAYWRIGHT-READINESS-CHECKLIST.md)

---

## Part 4: Common Testing Patterns

### Pattern 1: Login Helper

Instead of repeating login code in every test, create a helper:

```typescript
// helpers/auth.ts
import { Page, expect } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-username-input').fill('admin');
  await page.getByTestId('login-password-input').fill('tajneheslo123');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
}
```

Then use it:
```typescript
test('create reservation', async ({ page }) => {
  await loginAsAdmin(page);
  // Now you're on dashboard, ready to test
});
```

### Pattern 2: Navigation

```typescript
// Navigate to a page
await page.getByTestId('desktop-nav-link')
  .filter({ hasText: 'Rezervace' })
  .click();

// Wait for page to load
await expect(page.getByTestId('reservations-page')).toBeVisible();
```

### Pattern 3: Filling Forms

```typescript
// Simple form
await page.getByTestId('reservation-from-input').fill('2026-07-01');
await page.getByTestId('reservation-to-input').fill('2026-07-03');
await page.getByTestId('reservation-purpose-input').fill('Víkend');
await page.getByTestId('reservation-submit-button').click();

// Wait for success
await expect(page.getByText('Rezervace vytvořena')).toBeVisible();
```

### Pattern 4: Assertions

```typescript
// Element is visible
await expect(page.getByTestId('dashboard-page')).toBeVisible();

// Element has text
await expect(page.getByTestId('welcome-message')).toHaveText(/Vítejte/);

// Element has class
await expect(page.getByTestId('nav-link-active')).toHaveClass(/active/);

// Count elements
await expect(page.getByTestId('reservation-list-item')).toHaveCount(3);

// URL check
await expect(page).toHaveURL(/\/dashboard/);
```

### Pattern 5: Wait for Network

```typescript
// Wait for API call to complete
const responsePromise = page.waitForResponse(
  response => response.url().includes('/api/reservations') && response.status() === 201
);

await page.getByTestId('reservation-submit-button').click();
await responsePromise; // Wait for API

// Now you can assert on the result
```

---

## Part 5: Complete Test Examples

### Example 1: Login Flow

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('login-username-input').fill('admin');
    await page.getByTestId('login-password-input').fill('tajneheslo123');
    await page.getByTestId('login-submit-button').click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('login-username-input').fill('admin');
    await page.getByTestId('login-password-input').fill('wrongpassword');
    await page.getByTestId('login-submit-button').click();
    
    // Should stay on login page with error
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('login-error-message')).toBeVisible();
  });
});
```

### Example 2: Create Reservation

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Reservations', () => {
  test('admin can create reservation', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate to reservations
    await page.getByTestId('desktop-nav-link')
      .filter({ hasText: 'Rezervace' })
      .click();
    await expect(page.getByTestId('reservations-page')).toBeVisible();
    
    // Open create dialog
    await page.getByTestId('reservation-create-button').click();
    
    // Fill form
    await page.getByTestId('reservation-from-input').fill('2026-07-01');
    await page.getByTestId('reservation-to-input').fill('2026-07-03');
    await page.getByTestId('reservation-purpose-input').fill('Test reservation');
    
    // Submit
    await page.getByTestId('reservation-submit-button').click();
    
    // Verify success
    await expect(page.getByText('Rezervace vytvořena')).toBeVisible();
    
    // Verify it appears in list
    const reservationItem = page.getByTestId('reservation-list-item')
      .filter({ hasText: 'Test reservation' });
    await expect(reservationItem).toBeVisible();
  });
});
```

### Example 3: Shopping List

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Shopping', () => {
  test('create list and add items', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Go to shopping
    await page.goto('/shopping');
    await expect(page.getByTestId('shopping-page')).toBeVisible();
    
    // Create list
    await page.getByTestId('shopping-list-create-button').click();
    await page.getByTestId('list-name-input').fill('Weekend groceries');
    await page.getByTestId('list-create-submit').click();
    
    // Add item
    await page.getByTestId('shopping-item-input').fill('Mléko');
    await page.getByTestId('shopping-item-add-button').click();
    
    // Verify item appears
    const item = page.getByTestId('shopping-item-row')
      .filter({ hasText: 'Mléko' });
    await expect(item).toBeVisible();
    
    // Mark as purchased
    await item.getByTestId('item-checkbox').click();
    await expect(item).toHaveClass(/purchased/);
  });
});
```

---

## Part 6: Advanced Features

### Fixtures (Shared Setup)

```typescript
// fixtures/auth.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByTestId('login-username-input').fill('admin');
    await page.getByTestId('login-password-input').fill('tajneheslo123');
    await page.getByTestId('login-submit-button').click();
    await page.waitForURL(/\/dashboard/);
    
    await use(page);
  },
});
```

Use it:
```typescript
import { test } from './fixtures/auth';

test('logged in test', async ({ authenticatedPage }) => {
  // Already logged in!
  await expect(authenticatedPage.getByTestId('dashboard-page')).toBeVisible();
});
```

### Storage State (Skip Login)

```typescript
// setup/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-username-input').fill('admin');
  await page.getByTestId('login-password-input').fill('tajneheslo123');
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL(/\/dashboard/);
  
  // Save storage state
  await page.context().storageState({ path: 'auth/admin.json' });
});
```

Configure in `playwright.config.ts`:
```typescript
export default defineConfig({
  use: {
    storageState: 'auth/admin.json',
  },
});
```

Now all tests start already logged in!

### Visual Testing

```typescript
test('dashboard looks correct', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Take screenshot and compare with baseline
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

First run creates baseline, next runs compare against it.

---

## Part 7: What's Still Missing (Not Your Fault!)

According to [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md), these are not yet implemented:

1. **External Playwright project template** — you created your own, which is fine!
2. **E2E seed data script** — tests run against live dev DB (can be unpredictable)
3. **Login helpers in a shared package** — you'll create your own
4. **StorageState setup** — you'll implement this yourself

**This is okay for learning!** The app is ready to be tested, you just need to set up the test infrastructure yourself.

---

## Part 8: Best Practices

### ✅ DO
- Use `getByTestId` for important stable elements
- Use `getByRole` for semantic HTML
- Write descriptive test names
- Keep tests independent (each test should work alone)
- Use helpers for repeated actions (login, navigation)
- Add comments for complex interactions
- Run tests often while developing

### ❌ DON'T
- Use CSS selectors unless absolutely necessary
- Hard-code waits (`page.waitForTimeout(5000)`) — use auto-waiting instead
- Test implementation details — test user behavior
- Make tests dependent on each other
- Leave `--headed` or `--debug` in CI config
- Ignore flaky tests — fix them!

---

## Part 9: Debugging Tips

### Use UI Mode
```powershell
npx playwright test --ui
```
Best way to develop tests interactively.

### Use Debug Mode
```powershell
npx playwright test --debug
```
Steps through your test line-by-line.

### Use Codegen
```powershell
npx playwright codegen http://localhost:5173
```
Generates Playwright code as you click around!

### Console Logs
```typescript
test('debug test', async ({ page }) => {
  page.on('console', msg => console.log('Browser:', msg.text()));
  
  await page.goto('/dashboard');
  // You'll see all browser console.log messages
});
```

### Screenshots on Failure
Already automatic! Playwright saves screenshots when tests fail.

---

## Part 10: Next Steps

1. **Create a proper Playwright project:**
   - Organize tests in folders (`auth/`, `reservations/`, `shopping/`)
   - Add `playwright.config.ts` with proper settings
   - Set up CI (GitHub Actions)

2. **Write comprehensive test suite:**
   - Cover all critical user flows
   - Test edge cases and error states
   - Add accessibility tests

3. **Advanced topics:**
   - API mocking (intercept network requests)
   - Multi-browser testing
   - Parallel execution
   - Visual regression testing

---

## Reference Documentation

- **Playwright Docs:** https://playwright.dev/
- **App Selector Inventory:** [../PLAYWRIGHT-READINESS-CHECKLIST.md](../PLAYWRIGHT-READINESS-CHECKLIST.md)
- **App Flow Guide:** [../PLAYWRIGHT-STARTER-GUIDE.md](../PLAYWRIGHT-STARTER-GUIDE.md)
- **Manual Test Scenarios:** [../SPRINT-0-SMOKE-TEST.md](../SPRINT-0-SMOKE-TEST.md)

---

**🎉 Congratulations! You now know how to automate browser testing with Playwright. This is a highly valuable skill in modern web development!**
