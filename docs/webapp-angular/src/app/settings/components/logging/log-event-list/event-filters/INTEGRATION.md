---
type: feature
---

# Date Range Slider Integration with Event Filters

This document explains how the date range slider component has been integrated with the event filters component.

## Overview

The `EventFiltersComponent` has been enhanced to include date range filtering capabilities using the custom `RangeSliderComponent`. This allows users to filter log events by both event timestamp and recorded timestamp ranges.

## Features Added

### 1. Date Range Selection

- **Event Timestamp Range**: Filter events by when they occurred
- **Recorded Timestamp Range**: Filter events by when they were recorded in the system

### 2. Interactive UI

- Dual-thumb sliders for precise date range selection
- Visual feedback showing selected date ranges
- Responsive design that works on mobile and desktop

### 3. Form Integration

- Date ranges are properly integrated with the reactive form
- Form values are updated automatically when sliders change
- Reset functionality includes date range reset

## Implementation Details

### Component Changes

#### TypeScript (`event-filters.component.ts`)

```typescript
// Added date range properties
eventTimestampMin: Date = new Date();
eventTimestampMax: Date = new Date();
selectedEventTimestampMin: Date = new Date();
selectedEventTimestampMax: Date = new Date();

// Added event handlers
onEventTimestampRangeChange(dateRange: DateRange) {
  this.selectedEventTimestampMin = dateRange.min;
  this.selectedEventTimestampMax = dateRange.max;
  this.form.patchValue({
    eventTimestampRange: { min: dateRange.min, max: dateRange.max }
  });
}
```

#### HTML Template (`event-filters.component.html`)

```html
<!-- Date Range Filters -->
<div class="filter-row date-range-filters" *ngIf="hasDateRanges()">
  <div class="date-range-section" *ngIf="filterOptions?.eventTimestampRange">
    <h4>{{ 'settings.log-events.eventTimestamp' | translate }}</h4>
    <shared-range-slider
      [minValue]="eventTimestampMin"
      [maxValue]="eventTimestampMax"
      [selectedMin]="selectedEventTimestampMin"
      [selectedMax]="selectedEventTimestampMax"
      (valueChange)="onEventTimestampRangeChange($event)">
    </shared-range-slider>
  </div>
</div>
```

#### Styling (`event-filters.component.scss`)

```scss
.date-range-filters {
  flex-direction: column;
  gap: 1.5rem;
  margin: 1rem 0;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
}
```

### Key Features

1. **Conditional Rendering**: Date range filters only appear when date range data is available
2. **Responsive Design**: Layout adapts to different screen sizes
3. **Form Integration**: Properly integrated with Angular reactive forms
4. **Reset Functionality**: Date ranges reset to their initial values when form is reset
5. **Type Safety**: Full TypeScript support with proper type checking

### Data Flow

1. **Initialization**: Date ranges are set up from `FilterOptionsDto` in `setupDateRanges()`
2. **User Interaction**: User moves slider thumbs to select date ranges
3. **Event Handling**: `onEventTimestampRangeChange()` updates form values
4. **Form Updates**: `form.valueChanges` emits the updated filter values
5. **Parent Component**: Receives filter changes through `filtersChanged` event

### Default Behavior

- If no date ranges are provided in `FilterOptionsDto`, defaults to last 30 days
- Date ranges are automatically constrained to prevent invalid selections
- Initial selected ranges match the full available range

### Error Handling

- Null/undefined date ranges are handled gracefully
- Invalid dates are converted to current date
- Missing filter options don't break the component

## Usage Example

```typescript
// Parent component receives filter changes
onFiltersChanged(filters: any) {
  console.log('Event timestamp range:', filters.eventTimestampRange);
  console.log('Recorded timestamp range:', filters.recordedTimestampRange);
  // Apply filters to data source
}
```

## Dependencies

- `@shared/components/range-slider/range-slider.component` - Custom date range slider
- `@angular/forms` - Reactive forms
- `@angular/material` - Material Design components
- `@ngx-translate/core` - Internationalization

## Browser Support

Same as the base `RangeSliderComponent`:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
