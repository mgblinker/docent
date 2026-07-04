---
type: howto
---

# Test Flow Guide

## Overview

This document describes the clean, consolidated test flow for Cucumber/Playwright tests.

## Architecture

### Separation of Concerns

1. **Navigation** - All page navigation is handled in `support/hooks.ts`
2. **Authentication** - Credential filling and login actions are in `helpers/authentication.helper.ts`
3. **Step Definitions** - Business logic and test assertions in `step_definitions/`

### Navigation Layer (`support/hooks.ts`)

All navigation logic is centralized in hooks with helper functions:

```typescript
// Core navigation function with error handling
navigate(url: string, options?: { timeout?: number; waitUntil?: any })

// Get base URL from environment
getBaseUrl(): string

// Navigate to login page
navigateToLogin(returnUrl?: string)

// Navigate to app routes
navigateToRoute(route: string)
```

**Usage in step definitions:**

```typescript
// Navigate to login
await hooks.navigateToLogin();

// Navigate to any route
await hooks.navigateToRoute('/profile');
await hooks.navigateToRoute('/app/dashboard');
await hooks.navigateToRoute('/gruppentreffen');
```

### Authentication Layer (`helpers/authentication.helper.ts`)

The `AuthenticationHelper` class handles **only** credential filling and login button clicking:

```typescript
// Get the login URL (for reference only)
getLoginUrl(): string

// Fill credentials and click login (does NOT navigate)
async login(): Promise<void>
```

**Important:** `login()` does NOT navigate to the login page. Navigation must be handled separately using `hooks.navigateToLogin()`.

### Test Flow Pattern

#### 1. Authentication Flow

```typescript
// In step definitions (authentication.steps.ts)
Given(
  'ich bin angemeldet als {word} in der Umgebung {TestEnvironment}',
  async function (username: string, environment: TestEnvironment) {
    const auth = new AuthenticationHelper(hooks.ensurePage(), environment, username);

    // Step 1: Navigate to login page
    await hooks.navigateToLogin();

    // Step 2: Fill credentials and login
    await auth.login();

    // Store helper for later use
    (this as any).authenticationHelper = auth;
  }
);
```

#### 2. Navigation in Step Definitions

```typescript
// Use navigateToRoute for app routes
When('ich die Profilseite besuche', async () => {
  await hooks.navigateToRoute('/profile');
});

When('der Nutzer die Übersicht der Gruppentreffen öffnet', async function () {
  await hooks.navigateToRoute('/gruppentreffen');
});
```

#### 3. Page Object Pattern

For complex interactions, use the `ensurePage()` helper:

```typescript
When('ich auf den Verfügbarkeits-Button klicke', async function () {
  await hooks.ensurePage().locator('staff-management-availability-button button').click();
});
```

## Benefits

### 1. **Single Responsibility**

- Navigation: `hooks.ts`
- Authentication: `authentication.helper.ts`
- Business Logic: Step definitions

### 2. **Consistency**

- All URLs constructed the same way
- All navigation goes through the same error handling
- Predictable behavior across all tests

### 3. **Maintainability**

- Change base URL? Update `.env` only
- Change navigation logic? Update `hooks.ts` only
- Change login selectors? Update `authentication.helper.ts` only

### 4. **Error Handling**

- Centralized HTTP error detection (4xx/5xx)
- Client-side 404 detection
- Consistent timeout configuration
- Fast failure on navigation errors

## Migration Guide

### Before (Mixed Flow)

```typescript
// ❌ Navigation mixed with authentication
async login() {
  const loginUrl = `${this.baseUrl}/login`;
  await this.page.goto(loginUrl);  // Navigation in helper
  await this.page.fill('[name="email"]', this.username);
  // ...
}

// ❌ Manual URL construction
When('ich die Profilseite besuche', async () => {
  const base = process.env['TEST_URL_DEVELOPMENT'] ?? '';
  await page.goto(`${base}/profile`);
});
```

### After (Clean Flow)

```typescript
// ✅ Authentication only fills credentials
async login() {
  // Assumes caller navigated to login page
  await this.page.fill('[name="email"]', this.username);
  // ...
}

// ✅ Centralized navigation
When('ich die Profilseite besuche', async () => {
  await hooks.navigateToRoute('/profile');
});
```

## Environment Configuration

Set these variables in `test/helpers/.env`:

```env
TEST_URL_DEVELOPMENT=https://dev.example.com
TEST_URL_UAT=https://uat.example.com

TEST_USERNAME_DEVELOPMENT_ADMIN=admin@example.com
TEST_PASSWORD_DEVELOPMENT_ADMIN=password123

TEST_USERNAME_UAT_ADMIN=admin@example.com
TEST_PASSWORD_UAT_ADMIN=password123
```

## Best Practices

1. **Always use `hooks.navigateToRoute()`** instead of `page.goto()`
2. **Navigate before authenticating** - Call `navigateToLogin()` before `auth.login()`
3. **Use `hooks.ensurePage()`** to safely access the page object
4. **Keep step definitions focused** - Use helpers for complex logic
5. **Don't construct URLs manually** - Use `getBaseUrl()` and `navigateToRoute()`

## Common Patterns

### Pattern 1: Login and Navigate

```typescript
Given('ich bin angemeldet und auf der Dashboard-Seite', async function () {
  const auth = new AuthenticationHelper(hooks.ensurePage(), 'development', 'admin');
  await hooks.navigateToLogin('/app/dashboard');
  await auth.login();
});
```

### Pattern 2: Navigate to Protected Route

```typescript
When('ich besuche die geschützte Seite {string}', async function (route: string) {
  await hooks.navigateToRoute(route);
  // Authentication will redirect to login if needed
});
```

### Pattern 3: Multi-step Navigation

```typescript
When('ich navigiere durch das Menü zu Einstellungen', async function () {
  await hooks.ensurePage().locator('[data-menu="settings"]').click();
  // Wait for navigation to complete
  await hooks.ensurePage().waitForURL(/\/settings/);
});
```

## Troubleshooting

### Issue: "Playwright page not initialized"

**Solution:** Ensure `Before` hook in `hooks.ts` ran. Check hook execution order.

### Issue: "Navigation timeout"

**Solution:** Increase timeout in `navigateToLogin()` or `navigate()` call:

```typescript
await hooks.navigate(url, { timeout: 300_000 });
```

### Issue: "Login selectors not found"

**Solution:** Check `authentication.helper.ts` selectors match your login form.

### Issue: "404 not found"

**Solution:** Verify route exists and base URL is correct in `.env`.
