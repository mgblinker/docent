---
type: manual
---

# Quick Start: Adding Tooltips to Your Page

## Step 1: Import the Directive

Add `ConfigurableTooltipDirective` to your component:

```typescript
import { Component } from '@angular/core';
import { ConfigurableTooltipDirective } from '@shared/directives/configurable-tooltip.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    // ... other imports
    ConfigurableTooltipDirective
  ],
  template: `
    <div class="dashboard-container" appConfigurableTooltip [tooltipPageId]="'dashboard'">
      <!-- Your existing page content -->
    </div>
  `
})
export class DashboardComponent {}
```

## Step 2: Create Your First Tooltip

### Option A: Via API (Postman, Swagger, etc.)

```http
POST /api/tooltips
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "tooltipKey": "dashboard.welcome",
  "pageId": "dashboard",
  "targetSelector": ".dashboard-header",
  "content": "Welcome to your dashboard! This is your central hub for all activities.",
  "triggerStrategy": "FirstVisit",
  "displayOrder": 0,
  "isActive": true,
  "position": "{\"placement\":\"bottom\"}"
}
```

### Option B: Via TypeScript Service

```typescript
import { Component, OnInit } from '@angular/core';
import { TooltipConfigService } from '@shared/services/tooltip-config.service';

@Component({...})
export class DashboardComponent implements OnInit {
  constructor(private tooltipService: TooltipConfigService) {}

  ngOnInit() {
    // Only create if you're seeding initial data
    this.createInitialTooltip();
  }

  private createInitialTooltip() {
    this.tooltipService.createTooltip({
      tooltipKey: 'dashboard.welcome',
      pageId: 'dashboard',
      targetSelector: '.dashboard-header',
      content: 'Welcome to your dashboard! This is your central hub.',
      triggerStrategy: 'FirstVisit',
      displayOrder: 0,
      isActive: true,
      position: '{"placement":"bottom"}'
    }).subscribe();
  }
}
```

## Step 3: Test It!

1. Navigate to your page (e.g., `/dashboard`)
2. The tooltip should appear automatically if:
   - Target element `.dashboard-header` exists
   - Tooltip trigger is `OnLoad` or `FirstVisit`
   - User hasn't dismissed it before
   - User has the required role (if set)

## Step 4: Add Admin Controls (Optional)

If you want admins to edit tooltips:

```typescript
import { TooltipAdminFabComponent } from '@shared/components/tooltip-admin-fab/tooltip-admin-fab.component';

@Component({
  imports: [
    ConfigurableTooltipDirective,
    TooltipAdminFabComponent  // Add this
  ],
  template: `
    <div appConfigurableTooltip [tooltipPageId]="'dashboard'">
      <!-- Content -->
    </div>
    
    <!-- Floating edit button for admins -->
    <app-tooltip-admin-fab *ngIf="isAdmin"></app-tooltip-admin-fab>
  `
})
export class DashboardComponent {
  isAdmin = true; // Get from auth service
}
```

## Step 5: Create a Multi-Step Tour

```http
POST /api/tooltips
Content-Type: application/json

{
  "tooltipKey": "dashboard.tour",
  "pageId": "dashboard",
  "targetSelector": ".dashboard-header",
  "content": "Welcome! Let's take a quick tour.",
  "triggerStrategy": "FirstVisit",
  "displayOrder": 1,
  "isActive": true,
  "steps": "[{\"order\":1,\"targetSelector\":\".navigation\",\"content\":\"Use the navigation to move around.\"},{\"order\":2,\"targetSelector\":\".recent-items\",\"content\":\"See your recent activity here.\"},{\"order\":3,\"targetSelector\":\".quick-actions\",\"content\":\"Quick actions for common tasks.\"}]"
}
```

## Common Target Selectors

```typescript
// CSS Classes (preferred)
targetSelector: '.my-class'
targetSelector: '.card.feature-card'

// IDs
targetSelector: '#welcome-section'

// Data attributes
targetSelector: '[data-tour="step-1"]'

// Nested
targetSelector: '.dashboard .header .title'
```

## Complete Example

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigurableTooltipDirective } from '@shared/directives/configurable-tooltip.directive';
import { TooltipAdminFabComponent } from '@shared/components/tooltip-admin-fab/tooltip-admin-fab.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ConfigurableTooltipDirective,
    TooltipAdminFabComponent
  ],
  template: `
    <!-- Wrap your content with the directive -->
    <div class="dashboard" appConfigurableTooltip [tooltipPageId]="'dashboard'">
      
      <header class="dashboard-header">
        <h1>Dashboard</h1>
      </header>

      <section class="recent-activity">
        <h2>Recent Activity</h2>
        <!-- Content -->
      </section>

      <section class="quick-actions">
        <h2>Quick Actions</h2>
        <button class="action-btn primary">Create New</button>
      </section>

    </div>

    <!-- Admin controls -->
    <app-tooltip-admin-fab *ngIf="isAdmin$ | async"></app-tooltip-admin-fab>
  `,
  styles: [`
    .dashboard-header { padding: 20px; }
    .recent-activity { margin: 20px; }
    .quick-actions { margin: 20px; }
  `]
})
export class DashboardComponent {
  isAdmin$ = this.authService.isAdmin$; // From your auth service
  
  constructor(private authService: AuthService) {}
}
```

## What Happens?

1. **Page loads** → Directive activates
2. **Directive queries API** → Gets active tooltips for "dashboard"
3. **Backend filters** → Only returns tooltips user can see (role-based, not dismissed)
4. **Tooltips display** → Beautiful gradient bubbles appear
5. **User interacts** → Can dismiss, navigate multi-step tours
6. **Dismissal persists** → Won't show again after dismissal

## Troubleshooting

### "Tooltip not showing"
- Check console for warnings about missing selectors
- Verify the element exists: `document.querySelector('.your-selector')`
- Check if tooltip is active in database
- Verify user hasn't already dismissed it

### "Wrong position"
Try different placement values:
```json
{"placement": "top"}     // Above element
{"placement": "bottom"}  // Below element (default)
{"placement": "left"}    // Left side
{"placement": "right"}   // Right side
```

### "Tooltip shows every time"
- Change `triggerStrategy` from `OnLoad` to `FirstVisit`
- `FirstVisit` shows once, `OnLoad` shows every time until dismissed

## Next Steps

1. ✅ Add directive to your page
2. ✅ Create a test tooltip via API
3. ✅ Navigate to page and see it
4. ✅ Dismiss it and verify persistence
5. ✅ Create multi-step tour
6. ✅ Add admin controls
7. ✅ Customize styling (optional)

That's it! Your tooltips are now working! 🎉
