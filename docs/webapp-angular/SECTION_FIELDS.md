---
type: feature
---

# Section Fields - Visual Form Organization

## Overview

**Sections** are a new first-class field type that provides prominent visual organization for forms. Unlike groups (which are subtle containers), sections create distinct, visually striking areas with bold headers, gradient backgrounds, and clear visual boundaries.

## Purpose

Sections solve the problem of flat, visually monotonous forms by:

- Creating **clear visual hierarchy** with prominent headers
- Organizing related fields into **distinct areas**
- Providing **strong visual anchors** for navigation
- Improving **form comprehension** and user experience
- Reducing cognitive load through **visual segmentation**

## Visual Design

### Section Header

- **Gradient background** (primary color)
- **White text** for high contrast
- **Large title** (1.75rem, uppercase, letter-spacing)
- **Decorative accent bar** before title
- **Pattern overlay** for visual interest
- **Optional description** text below title

### Section Body

- **White background** with border
- **Gradient accent stripe** at top
- **Elevated shadow** for depth
- **12-column grid** for child fields
- **Generous padding** (32px)

### Visual Hierarchy

```
┌─────────────────────────────────────────────┐
│ ████████ SECTION TITLE ████████████████████ │ ← Gradient header
│ Optional description text                   │
├─────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Accent stripe
│                                             │
│  [Child Field 1]    [Child Field 2]        │
│                                             │
│  [Child Field 3]                            │
│                                             │
└─────────────────────────────────────────────┘
     └─ Elevated shadow creates depth
```

## Usage in Form Builder

### Adding a Section

1. **From Toolbar**: Drag "Section" from the Layout Fields category
2. **Properties**:
   - **Label**: Section title (required)
   - **Placeholder**: Section description (optional)
   - **Width**: Always spans 12 columns (full width)

### Styling in Builder

The section container in the form builder has:

- **Solid border** with thick left accent (8px)
- **Gradient background** to distinguish from groups
- **Enhanced shadow** on hover
- **Success color** when dropping fields into it

### Adding Fields to Sections

Drop fields into section containers just like groups:

- Drag field from toolbar into section body
- Section highlights with success color
- Fields position within 12-column grid

## Usage in Runtime Forms

### Rendering Behavior

Sections render with:

- Full visual prominence (header + body)
- Child fields in 12-column grid layout
- Proper spacing and elevation
- Optional description display

### Empty Sections

When a section has no children:

- **Design Mode**: Shows "Drop fields here to add them to this section"
- **Runtime**: Shows "No content in this section"

## Technical Implementation

### Field Type

```typescript
export enum FormFieldType {
  // ... other types
  GROUP = 'group',
  /**
   * Section container - visually prominent grouping with title, description, and styling
   * Used to organize forms into distinct visual sections
   */
  SECTION = 'section'
}
```

### Template Definition

```typescript
{
  type: FormFieldType.SECTION,
  label: 'Section Title',
  icon: 'view_agenda',
  defaultConfig: {
    label: 'Section Title',
    placeholder: 'Optional section description',
    position: { row: 0, column: 0, width: 12 },
    children: []
  }
}
```

### Component

**File**: `section-field.component.ts`

The component renders:

- Section header with title and description
- Section body with grid for children
- Empty state for sections without children
- Support for all child field types

### Strategy

**File**: `section-field.strategy.ts`

The rendering strategy:

- **Non-interactive**: Sections don't create form controls
- **Handles**: `['Section', 'section']`
- **Children**: Child fields create their own controls
- **Value processing**: Returns `null` (children handle their own values)

## Comparison: Section vs Group

| Feature               | Group                           | Section                          |
| --------------------- | ------------------------------- | -------------------------------- |
| **Visual Prominence** | Subtle border, light background | Bold header, gradient, shadow    |
| **Header Style**      | Simple text, small              | Large title, gradient background |
| **Border**            | 1px, subtle                     | 2px body + gradient header       |
| **Background**        | Light gray gradient             | White body + gradient header     |
| **Use Case**          | Logical grouping                | Major form divisions             |
| **Visual Impact**     | Low                             | High                             |
| **Nesting Level**     | Can nest in sections            | Top-level organization           |

## Best Practices

### When to Use Sections

✅ **Use sections for**:

- Major form divisions (e.g., "Personal Information", "Contact Details")
- Multi-page form steps shown on one page
- Distinct topic areas in long forms
- Primary organizational structure

❌ **Avoid sections for**:

- Minor field groupings (use groups instead)
- Nested subdivisions (use groups)
- Forms with only a few fields
- When visual subtlety is preferred

### Section Naming

- **Clear titles**: "Contact Information", "Payment Details"
- **Uppercase styling** is automatic
- **Action-oriented**: "Tell Us About Yourself"
- **Consistent structure**: All sections at same organizational level

### Section Descriptions

Use placeholder for:

- **Instructions**: "Please provide your current contact information"
- **Requirements**: "All fields are required unless marked optional"
- **Context**: "This information helps us process your request faster"

## Theming

Sections respect CSS custom properties:

```scss
:host {
  --form-primary-color: #2563eb;
  --form-primary-hover: #1d4ed8;
  --form-text-color: #1f2937;
  --form-section-bg: #f9fafb;
}
```

### Customization

Override section styles via component styling or CSS custom properties:

```scss
app-section-field {
  .section-header {
    background: linear-gradient(135deg, #990c2b 0%, #8a0b24 100%);
  }

  .section-title::before {
    background: #f1d554; // Accent color
  }
}
```

## Accessibility

- **Semantic structure**: Uses `<h2>` for titles
- **Color contrast**: White on dark gradient meets WCAG AAA
- **Visual + textual**: Icons supplement text, not replace
- **Clear hierarchy**: Visual design reinforces structure

## Browser Support

All modern browsers support:

- CSS Grid (for child layout)
- Linear gradients
- Box shadows
- Border radius
- Pseudo-elements (::before, ::after)

## Example Form Structure

```typescript
{
  fields: [
    {
      id: 'section-personal',
      type: 'section',
      label: 'Personal Information',
      placeholder: 'Tell us about yourself',
      children: [
        { id: 'firstName', type: 'text', label: 'First Name', ... },
        { id: 'lastName', type: 'text', label: 'Last Name', ... },
        { id: 'birthDate', type: 'date', label: 'Birth Date', ... }
      ]
    },
    {
      id: 'section-contact',
      type: 'section',
      label: 'Contact Details',
      placeholder: 'How can we reach you?',
      children: [
        { id: 'email', type: 'email', label: 'Email', ... },
        { id: 'phone', type: 'text', label: 'Phone', ... }
      ]
    }
  ]
}
```

## Files Modified/Created

### Created

- `field-components/section-field.component.ts` - Section renderer component
- `strategies/section-field.strategy.ts` - Section rendering strategy

### Modified

- `models/form-field.model.ts` - Added SECTION enum value
- `field-toolbar/services/form-template.service.ts` - Added section template
- `field-toolbar/field-toolbar.component.ts` - Added section to layout fields
- `field-components/field-component-registry.service.ts` - Registered section component
- `strategies/index.ts` - Exported section strategy
- `strategies/field-renderer-strategy.registry.ts` - Registered section strategy
- `form-canvas/form-canvas.component.html` - Added section container support
- `form-canvas/form-canvas.component.scss` - Added section styling
- `complex-field-expansion.service.ts` - Added section icon mapping

## Future Enhancements

Potential improvements:

- **Collapsible sections**: Allow users to collapse/expand sections
- **Section icons**: Custom icons for each section
- **Section theming**: Per-section color schemes
- **Progress indicators**: Show completion status per section
- **Section validation**: Highlight sections with errors
- **Sticky headers**: Section headers remain visible while scrolling

## Summary

Sections transform forms from flat field collections into organized, visually hierarchical interfaces. They provide:

- **Clear visual structure** through bold headers and distinct styling
- **Better UX** by organizing related fields
- **Professional appearance** with gradients, shadows, and elevation
- **Flexible content** supporting any child field types
- **Theme integration** respecting parent component styling

Use sections to create forms that guide users naturally through data entry with strong visual anchors and logical organization.
