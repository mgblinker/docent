---
type: feature
---

# Configurable Tooltip System

A comprehensive tooltip system for guiding users through the application with role-based, dismissible, and multi-step tooltips.

## Overview

The tooltip system consists of:

- **Backend**: SettingsService with tooltip configuration storage and user dismissal tracking
- **Frontend**: Angular directive, service, and admin UI for displaying and managing tooltips

## Features

- ✅ Single-step and multi-step guided tours
- ✅ Role-based visibility (configured per tooltip)
- ✅ User dismissal tracking (tooltips won't show again once dismissed)
- ✅ Multiple trigger strategies (OnLoad, FirstVisit, OnClick, OnHover)
- ✅ Translation key support for internationalization
- ✅ Admin UI for creating and editing tooltips
- ✅ Visual positioning and targeting

## Backend Implementation

### Database Entities

#### `TooltipConfig`

- Stores tooltip configuration (content, position, roles, trigger strategy)
- Tenant-scoped via `BaseDbContext`
- Indexed by `TooltipKey` (unique) and `PageId`

#### `UserTooltipDismissal`

- Tracks which tooltips each user has dismissed
- Prevents dismissed tooltips from showing again

### API Endpoints

#### Public Endpoints

- `GET /api/tooltips/page/{pageId}` - Get active tooltips for a page (filtered by dismissals)
- `POST /api/tooltips/dismiss/{tooltipKey}` - Dismiss a tooltip
- `POST /api/tooltips/reset/{tooltipKey}` - Reset dismissal (show again)

#### Admin Endpoints (RequiresRole: Admin)

- `GET /api/tooltips` - Get all tooltips
- `GET /api/tooltips/{id}` - Get tooltip by ID
- `GET /api/tooltips/key/{key}` - Get tooltip by key
- `POST /api/tooltips` - Create new tooltip
- `PUT /api/tooltips/{id}` - Update tooltip
- `DELETE /api/tooltips/{id}` - Delete tooltip

## Frontend Implementation

### Usage in Components

#### Basic Setup

```typescript
import { ConfigurableTooltipDirective } from "@shared/directives/configurable-tooltip.directive";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [ConfigurableTooltipDirective],
  template: `
    <div appConfigurableTooltip [tooltipPageId]="'dashboard'">
      <!-- Your page content -->
    </div>
  `,
})
export class DashboardComponent {}
```

#### Auto-detect Page ID

If you don't specify `tooltipPageId`, it automatically uses the router URL:

```html
<div appConfigurableTooltip>
  <!-- Uses current route as pageId -->
</div>
```

### Admin UI

#### Add Admin FAB (for admins only)

```typescript
import { TooltipAdminFabComponent } from '@shared/components/tooltip-admin-fab/tooltip-admin-fab.component';

@Component({
  template: `
    <app-tooltip-admin-fab *ngIf="isAdmin"></app-tooltip-admin-fab>
  `,
  imports: [TooltipAdminFabComponent]
})
```

### Creating Tooltips

#### Via Admin UI

1. Click the floating edit button (visible to admins)
2. Click "Enter Tooltip Edit Mode"
3. Click on any element to create a tooltip for it
4. Fill in the tooltip editor dialog
5. Save

#### Via Service

```typescript
constructor(private tooltipService: TooltipConfigService) {}

createTooltip() {
  const tooltip: CreateOrUpdateTooltipDto = {
    tooltipKey: 'dashboard.welcome',
    pageId: 'dashboard',
    targetSelector: '.welcome-card',
    content: 'TOOLTIPS.DASHBOARD_WELCOME', // Translation key
    triggerStrategy: 'OnLoad',
    displayOrder: 0,
    isActive: true,
    allowedRoles: null // All roles
  };

  this.tooltipService.createTooltip(tooltip).subscribe();
}
```

### Multi-Step Tooltips

Create a guided tour:

```typescript
const multiStepTooltip: CreateOrUpdateTooltipDto = {
  tooltipKey: "dashboard.tour",
  pageId: "dashboard",
  targetSelector: ".first-element", // Initial target
  content: "Welcome to the dashboard tour!",
  triggerStrategy: "OnLoad",
  displayOrder: 0,
  isActive: true,
  steps: JSON.stringify([
    {
      order: 1,
      targetSelector: ".navigation-menu",
      content: "This is the navigation menu",
      position: { placement: "right" },
    },
    {
      order: 2,
      targetSelector: ".user-profile",
      content: "Click here to access your profile",
      position: { placement: "bottom" },
    },
    {
      order: 3,
      targetSelector: ".settings-button",
      content: "Access settings from here",
      position: { placement: "left" },
    },
  ]),
};
```

## Tooltip Configuration

### CreateOrUpdateTooltipDto Fields

| Field             | Type          | Required | Description                                    |
| ----------------- | ------------- | -------- | ---------------------------------------------- |
| `tooltipKey`      | string        | Yes      | Unique identifier (e.g., "dashboard.welcome")  |
| `pageId`          | string        | Yes      | Page where tooltip appears (e.g., "dashboard") |
| `targetSelector`  | string        | Yes      | CSS selector for target element                |
| `content`         | string        | Yes      | Tooltip content or translation key             |
| `triggerStrategy` | string        | Yes      | OnLoad, FirstVisit, OnClick, OnHover           |
| `displayOrder`    | number        | Yes      | Order for multiple tooltips (0-based)          |
| `isActive`        | boolean       | Yes      | Whether tooltip is active                      |
| `position`        | string (JSON) | No       | Custom position configuration                  |
| `allowedRoles`    | string        | No       | Comma-separated roles (null = all users)       |
| `steps`           | string (JSON) | No       | Multi-step configuration                       |

### Position Configuration

```typescript
{
  "top": 100,      // Fixed top position (px)
  "left": 200,     // Fixed left position (px)
  "placement": "bottom"  // or "top", "left", "right", "auto"
}
```

### Trigger Strategies

- **OnLoad**: Show immediately when page loads
- **FirstVisit**: Show only on first visit (uses dismissal tracking)
- **OnClick**: Show when element is clicked
- **OnHover**: Show when hovering over element

## Translation Support

Tooltips support translation keys:

```typescript
{
  content: "TOOLTIPS.WELCOME_MESSAGE";
}
```

In your translation files:

```json
{
  "TOOLTIPS": {
    "WELCOME_MESSAGE": "Welcome to the dashboard! This is where you'll find...",
    "PROFILE_TIP": "Click here to update your profile information"
  }
}
```

## Role-Based Visibility

Restrict tooltips to specific roles:

```typescript
{
  allowedRoles: "Admin,Manager"; // Only show to Admins and Managers
}
```

Backend automatically filters based on user's roles.

## Dismissal Behavior

- When user dismisses a tooltip, it's saved to the database
- Dismissed tooltips won't show again (unless admin resets dismissal)
- Each user has their own dismissal state

Reset a dismissal:

```typescript
this.tooltipService.resetTooltipDismissal("dashboard.welcome").subscribe();
```

## Migration

To add tooltip support to an existing page:

1. Import and add the directive:

```typescript
import { ConfigurableTooltipDirective } from "@shared/directives/configurable-tooltip.directive";

// In imports array
imports: [ConfigurableTooltipDirective];
```

2. Add to template (typically on root element):

```html
<div
  class="page-container"
  appConfigurableTooltip
  [tooltipPageId]="'your-page-id'"
>
  <!-- existing content -->
</div>
```

3. Create tooltips via admin UI or API

## Database Migration

Run migrations to create the tooltip tables:

```bash
dotnet ef migrations add AddTooltipSupport --project Processity.SettingsService
dotnet ef database update --project Processity.SettingsService
```

## Best Practices

1. **Use translation keys** for content to support internationalization
2. **Keep tooltips concise** - aim for 1-2 sentences per step
3. **Test tooltip positioning** on different screen sizes
4. **Use meaningful tooltip keys** - follow pattern: `{page}.{feature}.{action}`
5. **Set appropriate display order** when showing multiple tooltips
6. **Limit multi-step tours** to 3-5 steps maximum
7. **Use role restrictions sparingly** - only when necessary

## Troubleshooting

### Tooltip not showing

- Check that `isActive` is true
- Verify `pageId` matches the current page
- Check that target element exists with correct selector
- Verify user hasn't dismissed the tooltip
- Check user's roles match `allowedRoles` (if set)

### Target element not found

- Use browser DevTools to verify CSS selector
- Ensure element is present when tooltip loads
- Use more specific selectors if needed

### Multi-step tooltip skips steps

- Verify all target selectors exist in the DOM
- Check console for warnings about missing targets
- Directive auto-skips steps with missing targets

## Future Enhancements

- [ ] Drag-and-drop positioning in edit mode
- [ ] Rich text editor for tooltip content
- [ ] Tooltip analytics (view counts, completion rates)
- [ ] Cross-page guided tours
- [ ] Conditional display based on user actions
- [ ] A/B testing support
