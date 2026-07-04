---
type: howto
---

# Translation Debugging Tools

This guide explains how to use the translation debugging tools available in development mode to identify translation keys, track usage, and find missing translations.

## Overview

The translation debugging system provides several tools:

1. **Translation Tooltip Directive** - Shows translation keys on hover
2. **Debug Translate Pipe** - Enhanced translate pipe with missing translation detection
3. **Translation Debug Service** - Tracks usage and provides reports
4. **Global Debug Access** - Browser console access to debugging features

## Quick Start

### 1. Using the Translation Tooltip Directive

Add the `translationTooltip` directive to any element to see translation keys on hover:

```html
<!-- Auto-detect translation keys -->
<div translationTooltip>
  <h1>{{ 'dashboard.title' | translate }}</h1>
  <p>{{ 'dashboard.welcome' | translate }}</p>
</div>

<!-- Specify translation key manually -->
<button [translationTooltip]="'button.save'">{{ 'button.save' | translate }}</button>

<!-- Multiple elements -->
<ul>
  <li *ngFor="let item of items" [translationTooltip]="item.labelKey">
    {{ item.labelKey | translate }}
  </li>
</ul>
```

**Features:**

- Hover to see translation key tooltip
- Click tooltip to copy key to clipboard
- Subtle visual indicator (dotted outline)
- Auto-detects translate pipe usage
- Only active in development mode

### 2. Using the Debug Translate Pipe

Replace `translate` with `translateWithTooltip` for enhanced debugging:

```html
<!-- Regular translate pipe -->
{{ 'user.name' | translate }}

<!-- Debug translate pipe -->
{{ 'user.name' | translateWithTooltip }} {{ 'missing.key' | translateWithTooltip }}
<!-- Shows [MISSING: missing.key] -->
```

**Features:**

- Shows `[MISSING: key]` for missing translations
- Logs translation usage to console
- Behaves like regular translate pipe in production

### 3. Using the Translation Debug Service

Access debugging features programmatically:

```typescript
import { TranslationDebugService } from '@shared/services/translate/translation-debug.service';

constructor(private debugService: TranslationDebugService) {}

// Record translation usage
this.debugService.recordUsage('user.profile.name', false, 'UserComponent');

// Get missing translations
const missing = this.debugService.getMissingTranslations();

// Generate usage report
this.debugService.printReport();

// Export data for analysis
const data = this.debugService.exportData();
```

### 4. Browser Console Access

In development mode, debugging features are available globally:

```javascript
// Print usage report
window.translationDebug.printReport();

// Get missing translations
window.translationDebug.getMissing();

// Export all data
window.translationDebug.exportData();

// Clear tracking data
window.translationDebug.clear();
```

## Component Integration

### Example Component

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationTooltipDirective } from '@shared/directives/translation-tooltip.directive';
import { TranslateWithTooltipPipe } from '@shared/pipes/translate-with-tooltip.pipe';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TranslationTooltipDirective,
    TranslateWithTooltipPipe
  ],
  template: \`
    <!-- Using tooltip directive -->
    <div translationTooltip>
      <h2>{{ 'page.title' | translate }}</h2>
    </div>

    <!-- Using debug pipe -->
    <p>{{ 'page.description' | translateWithTooltip }}</p>

    <!-- Form with tooltips -->
    <form>
      <div [translationTooltip]="'form.email.label'">
        <label>{{ 'form.email.label' | translate }}</label>
        <input [placeholder]="'form.email.placeholder' | translateWithTooltip">
      </div>
    </form>
  \`
})
export class MyComponent {}
```

## Adding to Existing Components

### Method 1: Import and Use Directive

```typescript
// Add to your component imports
imports: [
  // ... other imports
  TranslationTooltipDirective
];
```

```html
<!-- Wrap existing translated content -->
<div translationTooltip>
  <h1>{{ 'existing.title' | translate }}</h1>
</div>
```

### Method 2: Use Debug Pipe

```html
<!-- Replace existing translate pipes -->
{{ 'key' | translate }}
<!-- Before -->
{{ 'key' | translateWithTooltip }}
<!-- After -->
```

### Method 3: Via Translations Wrapper Service

```typescript
// If using TranslationsWrapperService
constructor(private translationsWrapper: TranslationsWrapperService) {}

ngOnInit() {
  // Access debug service
  const debugService = this.translationsWrapper.getDebugService();

  // Print report after component loads
  setTimeout(() => {
    this.translationsWrapper.printDebugReport();
  }, 2000);
}
```

## Best Practices

### 1. Gradual Adoption

Start by adding the directive to key components:

```html
<!-- High-priority pages -->
<main translationTooltip>
  <!-- All content here will show translation tooltips -->
</main>
```

### 2. Form Fields

Use specific keys for form elements:

```html
<div class="form-group">
  <label [translationTooltip]="'user.form.name.label'">
    {{ 'user.form.name.label' | translate }}
  </label>
  <input
    [placeholder]="'user.form.name.placeholder' | translate"
    [translationTooltip]="'user.form.name.placeholder'" />
  <small [translationTooltip]="'user.form.name.help'">
    {{ 'user.form.name.help' | translate }}
  </small>
</div>
```

### 3. Navigation and Menus

```html
<nav>
  <ul>
    <li *ngFor="let item of menuItems">
      <a [routerLink]="item.route" [translationTooltip]="item.translationKey">
        {{ item.translationKey | translate }}
      </a>
    </li>
  </ul>
</nav>
```

### 4. Data Tables

```html
<table>
  <thead>
    <tr>
      <th *ngFor="let column of columns" [translationTooltip]="column.headerKey">
        {{ column.headerKey | translate }}
      </th>
    </tr>
  </thead>
</table>
```

## Monitoring and Reports

### Console Logging

The system automatically logs:

- ✅ Translation usage: `🔤 Translation: key → value`
- ❌ Missing translations: `🚨 Missing translation: key`

### Usage Reports

Generate reports to identify:

- Most frequently used translations
- Missing translations by module
- Translation coverage percentage
- Unused translation keys

```javascript
// In browser console
window.translationDebug.printReport();
```

### Export Data

Export translation usage data for analysis:

```javascript
const data = window.translationDebug.exportData();
console.log('Translation Data:', data);

// Save to file
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'translation-usage.json';
a.click();
```

## Production Mode

All debugging features are automatically disabled in production mode:

- No visual indicators
- No tooltips
- No console logging
- No performance impact

The system checks `environment.production` to determine behavior.

## Troubleshooting

### Tooltips Not Showing

1. Ensure you're in development mode (`environment.production === false`)
2. Check that directive is imported in component
3. Verify translation keys are detected (check browser console)

### Performance Issues

1. Use tooltips selectively on key components
2. Avoid adding directive to frequently updated elements
3. Clear debug data periodically: `window.translationDebug.clear()`

### Missing Imports

```typescript
// Ensure these imports in your component
import { TranslationTooltipDirective } from '@shared/directives/translation-tooltip.directive';
import { TranslateWithTooltipPipe } from '@shared/pipes/translate-with-tooltip.pipe';

// Add to component imports array
imports: [
  TranslationTooltipDirective,
  TranslateWithTooltipPipe
  // ... other imports
];
```

## Configuration

### Environment Setup

Ensure your environment files have the production flag:

```typescript
// environment.ts (development)
export const environment = {
  production: false
  // ... other settings
};

// environment.prod.ts (production)
export const environment = {
  production: true
  // ... other settings
};
```

### Customization

You can customize the debug service behavior:

```typescript
// Adjust tracking limits
private readonly MAX_CONTEXTS = 10; // Default: 5

// Change console log levels
console.debug() // Default for usage
console.warn()  // Default for missing
```

This debugging system will help you identify translation issues, track usage patterns, and ensure complete internationalization coverage in your Angular application.
