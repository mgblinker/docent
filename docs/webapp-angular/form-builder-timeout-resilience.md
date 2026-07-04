---
type: feature
---

# Form Builder Timeout Resilience

## Problem

The form-builder page was timing out when loading, with the error:

```
Request for: https://webapp.processity.dev/app/communication/form-builder was aborted. TimeoutError...
```

This occurred because critical API calls during form-builder initialization had no timeout/retry logic:

1. **Form Definition API** (`FormTemplateApiService`) - Fetches form metadata
2. **Model Discovery API** (`ModelDiscoveryApiService`) - Fetches model/object metadata
3. **Translation API** (already fixed in previous session) - Fetches translations

## Solution

Added timeout and exponential backoff retry logic to all critical API services used during form-builder initialization.

### Changes Made

#### 1. FormTemplateApiService

**File:** `src/app/communication/services/form-template.api.service.ts`

Added:

- 10-second timeout threshold (`REQUEST_TIMEOUT = 10000`)
- Exponential backoff retry strategy (3 retries with 1s→2s→4s delays)
- Applied to all form definition API methods:
  - `getFormDefinitions()` - List forms with pagination
  - `getFormDefinition()` - Load specific form by ID
  - `getFormDefinitionByStringId()` - Alternative form lookup
  - `getFormLayout()` - Public form layout fetch
  - `createFormDefinition()` - Create new form
  - `updateFormDefinition()` - Update form
  - `deleteFormDefinition()` - Delete form

Implementation:

```typescript
private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

private getRetryStrategy() {
  let delayMs = 1000; // Start with 1 second
  return retry({
    delay: () => {
      const current = delayMs;
      delayMs *= 2; // Double the delay for next retry
      return new Promise((resolve) => setTimeout(resolve, current));
    }
  });
}

// Applied to each method:
return from(this.communicationsClient.getFormDefinition(id, '1.0')).pipe(
  timeout(this.REQUEST_TIMEOUT),
  retry(this.getRetryStrategy())
);
```

#### 2. ModelDiscoveryApiService

**File:** `src/shared/services/api/model-discovery.api.service.ts`

Added the same timeout/retry pattern to:

- `listRegisteredModules()` - List available modules
- `listModuleObjects()` - List objects in a module
- `discoverObject()` - Get detailed model information
- `getGatewayOrchestration()` - Get gateway metadata
- `discoverAllModels()` - Get all available models

This ensures model metadata can be resolved even if the discovery service is experiencing temporary slowness.

### Retry Strategy Details

**Exponential Backoff:**

- 1st attempt: Immediate
- 2nd attempt: Wait 1 second after 1st failure
- 3rd attempt: Wait 2 seconds after 2nd failure
- 4th attempt: Wait 4 seconds after 3rd failure
- Final failure: If all 3 retries fail, the error propagates to the UI

**Timeout Window:**

- Each individual request has a 10-second window to complete
- If an API doesn't respond within 10 seconds, it times out and triggers a retry
- The retry logic gives transient failures 3 additional chances to succeed

### Why 10 Seconds for Forms vs 5 Seconds for Translations?

- **Form definitions** are typically larger payloads with nested field data
- **Model discovery** requires dynamic reflection over entity types
- **Translations** are smaller, cached payloads (already configured with 5s timeout in previous session)

## Impact

### Benefits

1. **Prevents cascading timeouts** - If one API call hangs, the retry logic ensures the page load doesn't get stuck indefinitely
2. **Tolerates transient failures** - Temporary network glitches or backend slowness is automatically recovered
3. **Better diagnostics** - Timeout and retry events are logged, making it easier to identify problematic APIs
4. **Consistent behavior** - All critical APIs follow the same retry pattern

### What This Doesn't Fix

- **Backend performance issues** - If the backend API is consistently slow (>10 seconds), the page will still eventually timeout after all retries are exhausted
- **Connection errors** - If the backend is completely unreachable, retries won't help
- **Server errors** (5xx) - These don't trigger retries (HTTP status codes aren't subject to retry logic, only network timeouts)

### Remaining Timeout

If the form-builder page still times out, it indicates the backend form-builder endpoint itself is slow. This would require:

1. **Backend optimization** - Improve API response times
2. **Server-side caching** - Cache form definitions more aggressively
3. **Lazy loading** - Load form fields progressively instead of all at once

## Testing

To verify the changes work:

1. **Normal operation** - Load form-builder page normally; should work as before
2. **Slow backend** - Artificially slow backend APIs (using browser DevTools network throttling); form-builder should retry and eventually load if backend recovers within timeout window
3. **Offline/unavailable backend** - Disable backend API; page should timeout after retries are exhausted with clear error message

## Related Changes

- **Translation API timeout/retry** - Configured in previous session with 5s timeout, 3 retries
  - Files: `api-translate-loader.service.ts`, `translations-wrapper.service.ts`
- **GROUP field drag-drop functionality** - Implemented drag-drop zones in groups
  - Files: `form-canvas.component.ts`, `form-field-renderer.component.ts`
