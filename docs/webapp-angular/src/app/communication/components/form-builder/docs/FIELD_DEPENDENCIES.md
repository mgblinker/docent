---
type: feature
---

# Field Dependencies Feature

## Overview

The form builder now supports field dependencies, allowing fields to dynamically appear, change, or repeat based on values in other fields. This feature enables complex, dynamic forms that adapt to user input.

## Dependency Types

### 1. Repeat on Number (Implemented)

Dynamically creates multiple instances of fields based on a numeric field value.

**Use Case Example**: A form asking "How many children do you have?" and then displaying name/age fields for each child.

**Configuration**:

- `type`: `FieldDependencyType.REPEAT_ON_NUMBER`
- `sourceFieldId`: The ID of the numeric field that controls repetition
- `config`:
  - `minRepetitions`: Minimum number of field sets to show (default: 0)
  - `maxRepetitions`: Maximum number of field sets (optional)
  - `templateFields`: Array of field IDs to repeat

### 2. Conditional Visibility (Planned)

Show or hide fields based on another field's value.

**Use Case Example**: Show "Other" text field only when "Other" is selected in a dropdown.

### 3. Cascading Options (Planned)

Dynamically populate field options based on another field's selection.

**Use Case Example**: Country/State/City dropdowns where options cascade based on previous selections.

## How to Configure Dependencies

### In the Form Builder UI

1. **Select a Field**: Click on the field you want to make dependent
2. **Open Dependencies Tab**: In the field properties panel, click the "Dependencies" tab
3. **Add Dependency**: Click the "+" button to add a new dependency
4. **Configure**:
   - Select the dependency type
   - Choose the source field (the field that controls this dependency)
   - Configure type-specific settings

### For Repeat on Number:

1. Set **Minimum Repetitions**: The minimum number of field groups to display
2. Set **Maximum Repetitions**: Optional cap on the number of repetitions
3. **Add Template Fields**: Select which fields should be repeated for each count

## Example: Children Information Form

### Setup

1. Create a numeric field:
   - **ID**: `numberOfChildren`
   - **Label**: "How many children do you have?"
   - **Type**: Number

2. Create template fields (these will be repeated):
   - **Field 1**:
     - **ID**: `childName`
     - **Label**: "Child Name"
     - **Type**: Text
   - **Field 2**:
     - **ID**: `childAge`
     - **Label**: "Child Age"
     - **Type**: Number
   - **Field 3**:
     - **ID**: `childSchool`
     - **Label**: "School Name"
     - **Type**: Text

3. Create a container/heading field:
   - **ID**: `childrenSection`
   - **Label**: "Children Information"
   - **Type**: Heading
   - **Dependencies Tab**:
     - Add Dependency:
       - **Type**: Repeat on Number
       - **Source Field**: `numberOfChildren`
       - **Min Repetitions**: 0
       - **Max Repetitions**: 10
       - **Template Fields**: Select `childName`, `childAge`, and `childSchool`

### Runtime Behavior

When a user enters "3" in the "numberOfChildren" field:

- 3 sets of child information fields appear
- Each set is labeled: "Child Name 1", "Child Age 1", "School Name 1", etc.
- Each dynamic field has a unique ID: `childName_childrenSection_0`, `childName_childrenSection_1`, etc.

If the user changes the number to "5":

- The form dynamically adds 2 more sets of fields
- Previous values are preserved

If the user changes the number to "2":

- The form removes the extra field set
- Values from removed fields are lost

## Technical Implementation

### Data Model

Dependencies are stored in the `FormField` interface:

```typescript
interface FormField {
  // ... other properties
  dependencies?: FieldDependencyConfig[];
}

interface FieldDependencyConfig {
  type: FieldDependencyType;
  sourceFieldId: string;
  config?: {
    minRepetitions?: number;
    maxRepetitions?: number;
    templateFields?: (string | FormField)[];
    // ... type-specific config
  };
}
```

### Services

- **FieldDependencyResolverService**: Resolves dependencies and generates dynamic fields
  - `resolveFields()`: Processes form fields and returns resolved fields including dynamic ones
  - `shouldShowField()`: Determines if a field should be visible (for conditional visibility)

### Form Renderer Integration

The form renderer automatically:

1. Resolves field dependencies on initial load
2. Subscribes to form value changes
3. Dynamically adds/removes form controls as dependencies change
4. Maintains form state across dynamic field changes

### Dynamic Field IDs

Dynamic fields are assigned unique IDs using the pattern:

```
{templateFieldId}_{sourceFieldId}_{repetitionIndex}
```

Example: `childName_childrenSection_2`

### Metadata

Dynamic fields include metadata:

- `isDynamic`: true
- `repetitionIndex`: The index in the repetition (0-based)
- `templateFieldId`: The original template field ID
- `dependencySourceFieldId`: The source field that controls this field

## Best Practices

1. **Keep Template Groups Logical**: Group related fields together (e.g., all child-related fields)

2. **Set Reasonable Limits**: Always set `maxRepetitions` to prevent performance issues

3. **Consider UX**:
   - Use clear labels that indicate repetition (automatically handled)
   - Consider using headings or dividers to separate repeated groups

4. **Field Naming**:
   - Use descriptive IDs for template fields
   - Avoid circular dependencies

5. **Validation**:
   - Apply validation rules to template fields
   - They will be applied to all dynamic instances

## Form Submission

When submitting a form with dynamic fields:

- Dynamic fields are included in the submission with their generated IDs
- The backend can identify dynamic fields by checking for the naming pattern
- Template field metadata is preserved in the `templateFieldId` field

## API Persistence

Dependencies are serialized and stored with the form definition:

```json
{
  "id": "childrenSection",
  "type": "heading",
  "label": "Children Information",
  "dependencies": [
    {
      "type": "repeat-on-number",
      "sourceFieldId": "numberOfChildren",
      "config": {
        "minRepetitions": 0,
        "maxRepetitions": 10,
        "templateFields": ["childName", "childAge", "childSchool"]
      }
    }
  ]
}
```

## Future Enhancements

1. **Conditional Visibility**:
   - Show/hide fields based on conditions
   - Support complex boolean expressions

2. **Cascading Options**:
   - Dynamic option loading
   - API integration for option sources

3. **Field Value Dependencies**:
   - Calculate field values based on other fields
   - Formula support

4. **Group Dependencies**:
   - Apply dependencies to entire field groups
   - Nested repetition support

5. **UI Enhancements**:
   - Visual indicators for dependent fields
   - Drag-and-drop for template field ordering
   - Preview mode in form builder

## Troubleshooting

### Dynamic Fields Not Appearing

1. Check that the source field value is a valid number
2. Verify template field IDs exist in the form
3. Check browser console for errors
4. Ensure `minRepetitions` and `maxRepetitions` are properly configured

### Performance Issues

1. Limit `maxRepetitions` to a reasonable number (< 20)
2. Reduce the number of template fields in large forms
3. Consider using pagination for very large forms

### Values Lost on Field Count Change

This is expected behavior when reducing the count. To preserve data:

1. Set `minRepetitions` higher to prevent complete removal
2. Warn users before reducing count
3. Implement draft saving functionality
