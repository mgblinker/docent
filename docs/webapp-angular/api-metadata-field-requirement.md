---
type: feature
---

# API Requirement: Metadata Field for FormFieldLayoutDto

## Issue

The generic form renderer cannot properly handle the `requireEndDate` setting for timeframe fields because the API's `FormFieldLayoutDto` is missing a `metadata` field.

## Current State

**Frontend Model** (`form-field.model.ts`):

```typescript
export interface FormField {
  // ... other fields
  metadata?: {
    propertyName?: string;
    propertyType?: string;
    isModelField?: boolean;
    displayStyle?: 'checkboxes' | 'chips' | 'list' | 'dropdown';
    requireEndDate?: boolean; // For timeframe fields
    [key: string]: any;
  };
}
```

**API DTOs** (both `communications-client.ts` and `communications-public-client.ts`):

```typescript
export interface FormFieldLayoutDto {
  id?: string | undefined;
  type?: FormFieldType;
  label?: string | undefined;
  placeholder?: string | undefined;
  defaultValue?: any | undefined;
  required?: boolean;
  hidden?: boolean;
  validation?: FormFieldValidation;
  options?: FormFieldOption[] | undefined;
  displayStyle?: string | undefined;
  displayMode?: string | undefined;
  optionsMetadata?: FormFieldOptionsMetadata;
  position?: FormFieldPosition;
  cssClass?: string | undefined;
  style?: { [key: string]: any } | undefined;
  // ❌ MISSING: metadata field
}
```

## Required Change

Add a `metadata` field to `FormFieldLayoutDto` in the backend API:

```csharp
public class FormFieldLayoutDto
{
    // ... existing properties

    /// <summary>
    /// Gets additional metadata for field behavior and mapping.
    /// </summary>
    public Dictionary<string, object>? Metadata { get; init; }
}
```

The metadata should be populated from the form definition and include:

- `requireEndDate` (bool) - For timeframe fields, determines if end date is required (default: true)
- `propertyName` (string) - Target property name for data mapping
- `displayStyle` (string) - Display style hints for multi-select fields
- Any other field-specific configuration

## Impact

### Components Currently Affected:

1. ✅ **Form Builder** - Already uses metadata (works because it uses internal `FormField` model)
2. ❌ **Generic Form Renderer** - Cannot access metadata (uses API DTO directly)

### Specific Features Blocked:

- **Timeframe fields**: Cannot conditionally render/require end date based on `requireEndDate` setting
- **Future metadata-driven features**: Any field behavior controlled by metadata

## Workaround

Temporary workaround in place using type casting:

```typescript
const requireEndDate = (field as any).metadata?.['requireEndDate'] !== false;
```

This will work once the API is updated, but currently `metadata` will be undefined.

## Implementation Checklist

### Backend (Required):

- [ ] Add `Metadata` property to `FormFieldLayoutDto` class
- [ ] Populate metadata from `FormField.Metadata` during DTO conversion
- [ ] Update API documentation
- [ ] Regenerate TypeScript client (NSwag)

### Frontend (After API Update):

- [ ] Remove `(field as any)` type casts once proper types are regenerated
- [ ] Verify timeframe field behavior in generic form renderer
- [ ] Test single-date mode (requireEndDate = false)
- [ ] Test date-range mode (requireEndDate = true, default)

## Testing

Once implemented, test these scenarios:

1. **Timeframe with end date required** (default):
   - Should render Start + End date inputs
   - Both dates required for validation
   - Submission includes both start and end

2. **Timeframe with end date optional** (requireEndDate = false):
   - Should render single "Date" input
   - Only start date required
   - Submission includes only start date

## Related Files

- `/src/shared/services/api/clients/communications-public-client.ts` - Public API client (auto-generated)
- `/src/shared/services/api/clients/communications-client.ts` - Full API client (auto-generated)
- `/src/app/communication/components/generic-form-renderer/strategies/timeframe-field.strategy.ts` - Strategy implementation
- `/src/app/communication/components/generic-form-renderer/field-components/timeframe-field.component.ts` - Component template
- `/src/app/communication/components/form-builder/models/form-field.model.ts` - Frontend model
