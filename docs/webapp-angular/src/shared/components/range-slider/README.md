---
type: feature
---

# Date Range Slider Component

A customizable Angular component for selecting date ranges with two independently movable thumbs.

## Features

- **Dual Thumbs**: Two independently movable thumbs for min and max date selection
- **Date Range Support**: Works with JavaScript Date objects for precise date handling
- **Accessibility**: Keyboard navigation support with arrow keys
- **Responsive Design**: Mobile-friendly with touch support
- **Customizable**: Configurable date ranges and styling
- **Events**: Emits events for value changes and individual thumb movements
- **Disabled State**: Support for disabled/readonly mode

## Usage

### Basic Implementation

```typescript
import { Component } from '@angular/core';
import { RangeSliderComponent, DateRange } from './range-slider.component';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [RangeSliderComponent],
  template: `
    <shared-range-slider
      [minValue]="minDate"
      [maxValue]="maxDate"
      [selectedMin]="selectedMinDate"
      [selectedMax]="selectedMaxDate"
      (valueChange)="onDateRangeChange($event)"
      (minChange)="onMinDateChange($event)"
      (maxChange)="onMaxDateChange($event)">
    </shared-range-slider>
  `
})
export class ExampleComponent {
  minDate = new Date('2024-01-01');
  maxDate = new Date('2024-12-31');
  selectedMinDate = new Date('2024-06-01');
  selectedMaxDate = new Date('2024-06-30');

  onDateRangeChange(dateRange: DateRange) {
    console.log('Selected range:', dateRange);
  }

  onMinDateChange(date: Date) {
    this.selectedMinDate = date;
  }

  onMaxDateChange(date: Date) {
    this.selectedMaxDate = date;
  }
}
```

## API Reference

### Inputs

| Property      | Type      | Default      | Description                               |
| ------------- | --------- | ------------ | ----------------------------------------- |
| `minValue`    | `Date`    | `new Date()` | The minimum selectable date               |
| `maxValue`    | `Date`    | `new Date()` | The maximum selectable date               |
| `selectedMin` | `Date`    | `new Date()` | The currently selected minimum date       |
| `selectedMax` | `Date`    | `new Date()` | The currently selected maximum date       |
| `step`        | `number`  | `1`          | Step size in days for keyboard navigation |
| `disabled`    | `boolean` | `false`      | Whether the slider is disabled            |

### Outputs

| Event         | Type                      | Description                         |
| ------------- | ------------------------- | ----------------------------------- |
| `valueChange` | `EventEmitter<DateRange>` | Emits when either thumb moves       |
| `minChange`   | `EventEmitter<Date>`      | Emits when the minimum date changes |
| `maxChange`   | `EventEmitter<Date>`      | Emits when the maximum date changes |

### Types

```typescript
export interface DateRange {
  min: Date;
  max: Date;
}
```

## Keyboard Navigation

- **Arrow Left/Down**: Move thumb backwards (earlier date)
- **Arrow Right/Up**: Move thumb forwards (later date)
- **Focus**: Use Tab to focus on individual thumbs

## Styling

The component uses CSS custom properties and classes for easy customization:

### CSS Classes

- `.range-slider-container`: Main container
- `.date-labels`: Date labels container
- `.slider-track`: Slider track container
- `.track-background`: Background track
- `.track-active`: Active range indicator
- `.thumb`: Thumb elements
- `.thumb-min`: Minimum value thumb
- `.thumb-max`: Maximum value thumb
- `.selected-range`: Selected range display

### Customization Example

```scss
shared-range-slider {
  .track-active {
    background: linear-gradient(90deg, #your-color-1, #your-color-2);
  }

  .thumb-handle {
    border-color: #your-accent-color;
  }
}
```

## Accessibility Features

- **ARIA Labels**: Descriptive labels for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus indicators
- **High Contrast**: Support for high contrast mode

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Examples

### Custom Date Range

```typescript
// Last 30 days
const now = new Date();
const thirtyDaysAgo = new Date(now);
thirtyDaysAgo.setDate(now.getDate() - 30);

minDate = thirtyDaysAgo;
maxDate = now;
selectedMinDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
selectedMaxDate = now;
```

### Disabled State

```html
<shared-range-slider
  [minValue]="minDate"
  [maxValue]="maxDate"
  [selectedMin]="selectedMinDate"
  [selectedMax]="selectedMaxDate"
  [disabled]="true">
</shared-range-slider>
```

## Notes

- Dates are handled in the user's local timezone
- The component automatically prevents invalid ranges (min > max)
- Date formatting uses the browser's `toLocaleDateString()` method
- The component is fully responsive and works on mobile devices
