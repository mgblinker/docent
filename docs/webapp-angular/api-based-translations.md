---
type: feature
---

# API-Based Translations System

This document describes the new API-based translations system that replaces the file-based approach with a dynamic translation service using ngx-translate and our backend API.

## Overview

The new system consists of:

1. **ApiTranslateLoader**: Custom TranslateLoader that fetches translations from the API
2. **TranslationsWrapperService**: Service providing convenient methods for working with translations
3. **CoreDataNavigationSectionService**: Example of service-based navigation sections with reactive translations

## Components

### ApiTranslateLoader

Located at: `src/shared/services/translate/api-translate-loader.service.ts`

This service implements the `TranslateLoader` interface from ngx-translate and fetches translations from the backend API using the `TranslationsClient`. It loads translations for all modules in parallel and merges them into a single object.

**Key features:**

- Loads translations from multiple modules simultaneously
- Handles API errors gracefully with fallbacks
- Organizes translations by module namespace to avoid conflicts

### TranslationsWrapperService

Located at: `src/shared/services/translate/translations-wrapper.service.ts`

This service wraps the ngx-translate `TranslateService` and provides additional functionality for working with API-based translations.

**Key methods:**

```typescript
// Get reactive translation
get(key: string, params?: any): Observable<string>

// Get instant (synchronous) translation
instant(key: string, params?: any): string

// Get multiple translations at once
getMultiple(keys: string[], params?: any): Observable<{[key: string]: string}>

// Set current language
setLanguage(language: string): Observable<any>

// Get current language
getCurrentLanguage(): string

// Listen to language changes
onLanguageChange(): Observable<string>

// Get navigation translations with fallback
getNavigationTranslation(key: string, fallback?: string): Observable<string>

// Check if translation exists
hasTranslation(key: string): boolean

// Reload translations from API
reloadTranslations(): Observable<any>
```

### CoreDataNavigationSectionService

Located at: `src/app/core-data/components/core-data-navigation-section.ts`

Example service that demonstrates how to create reactive navigation sections using the translations wrapper service.

## Migration Guide

### Before (File-based)

```typescript
// Old approach using TranslateService directly
import { TranslateService } from '@ngx-translate/core';

constructor(private translate: TranslateService) {}

ngOnInit() {
  this.translate.get('core-data.navigation.section-title').subscribe(title => {
    // Handle translation
  });
}
```

### After (API-based)

```typescript
// New approach using TranslationsWrapperService
import { TranslationsWrapperService } from '@shared/services/translate/translations-wrapper.service';

constructor(private translationsService: TranslationsWrapperService) {}

ngOnInit() {
  this.translationsService.get('core-data.navigation.section-title').subscribe(title => {
    // Handle translation
  });
}
```

### Navigation Sections

**Before:**

```typescript
// Static configuration
export const coreDataNavigationSection = {
  title: 'core-data.navigation.section-title',
  items: [...]
};
```

**After:**

```typescript
// Service-based with reactive translations
@Injectable()
export class CoreDataNavigationSectionService {
  getNavigationSection(): Observable<MenuSection> {
    return combineLatest([
      this.translationsService.getNavigationTranslation('core-data.navigation.section-title')
      // ... other translations
    ]).pipe(
      map(([title, ...labels]) => ({
        title,
        items: [
          /* translated items */
        ]
      }))
    );
  }
}
```

## Template Updates

### Before

```html
<!-- Using translate pipe -->
<span>{{ 'core-data.navigation.section-title' | translate }}</span>
```

### After

```html
<!-- Using reactive service (for dynamically translated content) -->
<span>{{ pageTitle$ | async }}</span>

<!-- Or still using translate pipe for static translations -->
<span>{{ 'core-data.navigation.section-title' | translate }}</span>
```

## Configuration

The system is configured in `app.config.ts`:

```typescript
import { ApiTranslateLoader } from '@shared/services/translate/api-translate-loader.service';
import { TranslationsClient } from '@shared/services/api/clients/translations-client';

export function ApiLoaderFactory(translationsClient: TranslationsClient) {
  return new ApiTranslateLoader(translationsClient);
}

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'de',
        loader: {
          provide: TranslateLoader,
          useFactory: ApiLoaderFactory,
          deps: [TranslationsClient]
        }
      })
    )
  ]
};
```

## Benefits

1. **Dynamic Content**: Translations can be updated in the backend without redeploying the frontend
2. **Centralized Management**: All translations are managed through a single API
3. **Real-time Updates**: Changes to translations can be reflected immediately
4. **Better Error Handling**: Graceful fallbacks when translations are not available
5. **Module Organization**: Translations are organized by module namespace
6. **Reactive**: Translation changes automatically update the UI

## Example Usage

See `src/shared/components/translations-example/translations-example.component.ts` for a comprehensive example of how to use the new translations system.

## API Endpoints

The system uses the following API endpoints via `TranslationsClient`:

- `GET /translations/v1.0/translations/module/{module}/{language}` - Get translations for a specific module and language
- `POST /translations/v1.0/translations` - Create or update a translation
- `GET /translations/v1.0/translations/{id}` - Get a specific translation
- `DELETE /translations/v1.0/translations/{id}` - Delete a translation

## Error Handling

The system includes comprehensive error handling:

- API failures fall back to empty translation objects
- Missing translations can provide fallback text
- Network errors are logged but don't break the application
- Invalid JSON responses are handled gracefully

## Performance Considerations

- Translations for all modules are loaded in parallel on application startup
- Translations are cached by ngx-translate
- Language changes trigger a reload of all translations
- The system is optimized for minimal API calls
