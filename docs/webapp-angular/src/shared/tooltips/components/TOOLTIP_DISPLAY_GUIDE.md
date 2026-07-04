---
type: manual
---

# Tooltip Display System - Usage Guide

## Overview

The tooltip system now has fully functional display components that show beautiful, interactive tooltips to users.

## Components Created

### 1. TooltipDisplayComponent
The main tooltip bubble that displays content and controls.

**Features:**
- Beautiful gradient design with animations
- Close button for dismissal
- Multi-step navigation (Previous/Next/Finish)
- Step indicator (e.g., "2 / 5")
- Escape key support
- Responsive positioning
- Arrow pointers

### 2. TooltipHighlightComponent
Visual highlight overlay for target elements.

**Features:**
- Animated glow effect
- Pulsing animation
- Edit mode with clickable edit button
- Non-intrusive design

### 3. Updated ConfigurableTooltipDirective
Smart directive that orchestrates tooltip display.

**Features:**
- Uses Angular components (no manual DOM manipulation)
- Proper lifecycle management
- Edit mode support with inline editing
- Multi-step tooltip navigation
- Automatic positioning
- Dynamic component creation

## How to Use

### Basic Usage in Any Component

```typescript
import { ConfigurableTooltipDirective } from '@shared/directives/configurable-tooltip.directive';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [ConfigurableTooltipDirective],
  template: `
    <div class="page-container" appConfigurableTooltip [tooltipPageId]="'my-page'">
      <!-- Your page content here -->
      <h1 class="page-title">My Page</h1>
      <button class="important-button">Click Me</button>
    </div>
  `
})
export class MyPageComponent {}
```

### With Admin Controls

```typescript
import { ConfigurableTooltipDirective } from '@shared/directives/configurable-tooltip.directive';
import { TooltipAdminFabComponent } from '@shared/components/tooltip-admin-fab/tooltip-admin-fab.component';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [ConfigurableTooltipDirective, TooltipAdminFabComponent],
  template: `
    <div appConfigurableTooltip [tooltipPageId]="'my-page'">
      <!-- Page content -->
    </div>

    <!-- Admin FAB (only visible to admins) -->
    <app-tooltip-admin-fab></app-tooltip-admin-fab>
  `
})
export class MyPageComponent {}
```

## Creating Tooltips

### Method 1: Via Admin UI (Recommended)

1. Navigate to the page where you want tooltips
2. Click the floating edit button (admin only)
3. Click "Enter Tooltip Edit Mode"
4. Existing tooltip targets will show red highlights with edit icons
5. Click the edit icon to modify an existing tooltip
6. Exit edit mode when done

### Method 2: Via API/Service

```typescript
import { TooltipConfigService } from '@shared/services/tooltip-config.service';
import { CreateOrUpdateTooltipDto } from '@shared/models/tooltip.model';

export class MyComponent {
  constructor(private tooltipService: TooltipConfigService) {}

  createWelcomeTooltip() {
    const tooltip: CreateOrUpdateTooltipDto = {
      tooltipKey: 'my-page.welcome',
      pageId: 'my-page',
      targetSelector: '.page-title',
      content: 'Welcome to this amazing page! Here you can...',
      triggerStrategy: 'FirstVisit',
      displayOrder: 0,
      isActive: true,
      position: JSON.stringify({ placement: 'bottom' })
    };

    this.tooltipService.createTooltip(tooltip).subscribe();
  }
}
```

## Tooltip Display Features

### Single-Step Tooltip
Displays one message with a close button:
- Gradient purple background
- Smooth fade-in animation
- Arrow pointer to target
- Highlighted target element
- ESC key to dismiss

### Multi-Step Tooltip (Guided Tour)
Displays a series of messages:
- Step indicator (e.g., "2 / 5")
- Previous/Next navigation buttons
- "Finish" button on last step
- Auto-skip missing targets
- Smooth transitions between steps

## Visual Design

### Colors
- Primary gradient: Purple to blue (#667eea → #764ba2)
- Highlight: Bright blue (#3498db)
- Edit mode: Red (#e74c3c)

### Animations
- Fade in on display (0.3s)
- Pulsing glow on highlight
- Smooth transitions

### Positioning
- Auto-positions based on target location
- Supports: top, bottom, left, right
- Prevents overflow off-screen
- Adapts to viewport

## Edit Mode

When an admin enters edit mode:

1. **Visual Changes:**
   - Existing tooltips show red highlights
   - Edit icons appear on highlights
   - Tooltips are not displayed (only highlights)

2. **Editing Flow:**
   - Click edit icon on highlight
   - Editor dialog opens
   - Make changes
   - Save
   - Tooltips reload with new configuration

3. **Creating New Tooltips:**
   - Currently requires using the API
   - Future: Click any element to create tooltip

## Testing the Display

### 1. Create a Test Page

Use the `TooltipDemoComponent` provided:

```typescript
import { TooltipDemoComponent } from '@shared/components/tooltip-demo/tooltip-demo.component';

// In your routing:
{
  path: 'tooltip-demo',
  component: TooltipDemoComponent
}
```

### 2. Create Sample Tooltips

```typescript
// Welcome tooltip
{
  tooltipKey: 'tooltip-demo.welcome',
  pageId: 'tooltip-demo',
  targetSelector: '.page-title',
  content: 'Welcome to the tooltip demo! This shows how tooltips guide users.',
  triggerStrategy: 'OnLoad',
  displayOrder: 0,
  isActive: true
}

// Multi-step tour
{
  tooltipKey: 'tooltip-demo.tour',
  pageId: 'tooltip-demo',
  targetSelector: '.welcome-card',
  content: 'Let\\'s take a tour!',
  triggerStrategy: 'FirstVisit',
  displayOrder: 1,
  isActive: true,
  steps: JSON.stringify([
    {
      order: 1,
      targetSelector: '.feature-card',
      content: 'This is an important feature users should know about.'
    },
    {
      order: 2,
      targetSelector: '.action-button',
      content: 'Click here to perform the main action.'
    },
    {
      order: 3,
      targetSelector: '.settings-card',
      content: 'Configure your preferences in settings.'
    }
  ])
}
```

### 3. Navigate and Test

1. Navigate to the page
2. Tooltips should display automatically
3. Click close or ESC to dismiss
4. For multi-step: use Previous/Next buttons
5. Click Finish to complete tour
6. Refresh page - dismissed tooltips won't show again

## Styling Customization

To customize tooltip appearance, override these CSS classes:

```css
/* In your global styles */
app-tooltip-display {
  /* Change max width */
  max-width: 500px;
}

app-tooltip-display .tooltip-container {
  /* Change colors */
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
}

app-tooltip-highlight .highlight-overlay {
  /* Change highlight color */
  border-color: #your-highlight-color;
}
```

## Troubleshooting

### Tooltips Not Appearing
1. Check browser console for errors
2. Verify directive is imported in component
3. Check that target selectors exist in DOM
4. Verify tooltip is active (isActive = true)
5. Check user hasn't dismissed the tooltip
6. Verify user has required role (if allowedRoles is set)

### Positioning Issues
1. Ensure target element has proper dimensions
2. Try different placement values (top/bottom/left/right)
3. Check for CSS conflicts (z-index, overflow)
4. Test on different viewport sizes

### Edit Mode Not Working
1. Verify user has Admin role
2. Check that TooltipAdminFabComponent is included
3. Ensure TooltipEditorDialogService is provided

## Best Practices

1. **Keep tooltips concise** - Maximum 2-3 sentences
2. **Use translation keys** for internationalization
3. **Test on mobile** - Ensure tooltips are readable
4. **Limit multi-step tours** - 3-5 steps maximum
5. **Use meaningful selectors** - Prefer classes over IDs
6. **Set appropriate trigger strategies** - FirstVisit for tours, OnLoad for hints
7. **Test dismissal flow** - Verify persistence works

## Next Steps

1. Test the tooltip display on your pages
2. Create initial tooltips for key features
3. Gather user feedback on tooltip helpfulness
4. Iterate on content and positioning
5. Add analytics to track tooltip effectiveness (future enhancement)
