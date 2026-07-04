---
type: feature
---

# GROUP Field Type - Feature Documentation

## Overview

The GROUP field type allows you to create container fields that behave like partial forms integrated into the overall form. Groups support:
- Nested drag-and-drop of fields
- Movement of entire groups (including all children) via drag-and-drop
- Field-driven repetition through dependencies

## Features

### 1. Drag and Drop Fields into Groups

Groups act as drop zones that accept fields from the toolbar or from other parts of the form. When you drag a field over a group, it will be highlighted and the field will be added to the group's `children` array.

**Implementation Details:**
- Groups have a `cdkDropList` directive that makes them valid drop targets
- The `form-field-renderer` component handles `cdkDropListDropped` events
- Children are stored in `FormField.children?: FormField[]`
- Children can be recursively nested (groups within groups)

**Usage:**
1. Add a GROUP field to your form from the toolbar
2. Drag any field from the toolbar or canvas onto the group
3. The field becomes a child of the group and renders inside it

### 2. Group Movement with All Children

Groups can be moved on the form canvas via drag-and-drop. When a group is moved, all its children move with it automatically.

**Implementation Details:**
- Groups are marked with `cdkDrag` directive
- The `form-canvas` component detects group movement
- When a group is repositioned, its position is updated but children maintain their relative positions
- The group's children array is preserved during movement

**Usage:**
1. Click and drag a group field on the canvas
2. Drop it in a new position
3. All children automatically move with the group

### 3. Field-Driven Group Repetition

Groups support the `REPEAT_ON_NUMBER` dependency type, which allows dynamic creation of multiple group instances based on a numeric field value.

**Example Use Case:**
A form has a "Number of Children" field. Based on this number, the form should dynamically create multiple "Child Information" groups - one for each child.

**Implementation Details:**
- Dependencies are configured in `FormField.dependencies`
- The `FieldDependencyResolverService` resolves dependencies at runtime
- When a numeric field changes, the resolver creates/removes group instances
- Each group instance includes all children cloned with unique IDs
- The `form-renderer` automatically adds form controls for dynamic groups and their children

**Configuration Example:**

```typescript
// Numeric field that drives the repetition
const numberOfChildrenField: FormField = {
  id: 'numberOfChildren',
  type: FormFieldType.NUMBER,
  label: 'Number of Children',
  placeholder: 'Enter number of children',
  required: true,
  position: { row: 0, column: 0, width: 12 }
};

// Group template field
const childInfoGroup: FormField = {
  id: 'childInfo',
  type: FormFieldType.GROUP,
  label: 'Child Information',
  position: { row: 1, column: 0, width: 12 },
  dependencies: [
    {
      type: FieldDependencyType.REPEAT_ON_NUMBER,
      sourceFieldId: 'numberOfChildren',
      config: {
        minRepetitions: 0,
        maxRepetitions: 10,
        // The group itself is the template - no need to specify templateFields
        // The dependency resolver will clone the entire group including children
      }
    }
  ],
  children: [
    {
      id: 'childName',
      type: FormFieldType.TEXT,
      label: 'Child Name',
      required: true,
      position: { row: 0, column: 0, width: 6 }
    },
    {
      id: 'childAge',
      type: FormFieldType.NUMBER,
      label: 'Child Age',
      required: true,
      position: { row: 0, column: 6, width: 6 }
    }
  ]
};
```

**Runtime Behavior:**
1. User enters "3" in the "Number of Children" field
2. The dependency resolver creates 3 instances of the childInfo group:
   - `childInfo_numberOfChildren_0` (Child Information 1)
   - `childInfo_numberOfChildren_1` (Child Information 2)
   - `childInfo_numberOfChildren_2` (Child Information 3)
3. Each group instance contains cloned children:
   - Group 1: `childName_numberOfChildren_0`, `childAge_numberOfChildren_0`
   - Group 2: `childName_numberOfChildren_1`, `childAge_numberOfChildren_1`
   - Group 3: `childName_numberOfChildren_2`, `childAge_numberOfChildren_2`
4. Form controls are automatically created for all dynamic fields
5. If the user changes the number to "2", the third group is removed

## API Reference

### FormField.children

```typescript
interface FormField {
  // ... other properties
  
  /**
   * If this field is a group container, it may contain children fields
   */
  children?: FormField[];
}
```

### FieldDependencyType.REPEAT_ON_NUMBER

```typescript
enum FieldDependencyType {
  /** Dynamically repeat fields/groups based on a numeric field value */
  REPEAT_ON_NUMBER = 'repeat-on-number',
  // ...
}
```

### FieldDependencyConfig for Groups

```typescript
interface FieldDependencyConfig {
  type: FieldDependencyType.REPEAT_ON_NUMBER;
  sourceFieldId: string; // ID of the numeric field
  config?: {
    minRepetitions?: number; // Minimum instances (default: 0)
    maxRepetitions?: number; // Maximum instances (optional)
    // For GROUP fields, templateFields is typically omitted
    // The group itself serves as the template
  };
}
```

## Components Modified

### 1. form-field-renderer.component.html
- Added GROUP case with `cdkDropList` for accepting drops
- Renders children recursively using `app-form-field-renderer`
- Shows "Drop fields here" placeholder when empty

### 2. form-field-renderer.component.ts
- Added `onGroupFieldDropped()` handler
- Added `DragDropModule` import
- Emits events to parent components for drop handling

### 3. form-canvas.component.ts
- Added `handleGroupFieldDropped()` to process drops into groups
- Updated internal drop handler to preserve group hierarchy
- Group movements automatically include all children

### 4. field-dependency-resolver.service.ts
- Enhanced `createDynamicField()` to recursively clone children
- GROUP fields with children are fully cloned during repetition
- Each child receives a unique ID based on repetition index

### 5. form-renderer.component.ts
- Added `addControlsForChildren()` recursive helper
- Dynamically creates form controls for group children
- Handles nested group structures

## Testing Scenarios

### Scenario 1: Basic Group with Fields
1. Create a new form
2. Drag a GROUP field onto the canvas
3. Drag TEXT and NUMBER fields into the group
4. Verify fields render inside the group container
5. Save and preview the form

### Scenario 2: Moving Groups
1. Create a group with 2-3 child fields
2. Drag the group to a different position on the canvas
3. Verify all children move with the group
4. Verify field data is preserved

### Scenario 3: Nested Groups
1. Create a parent GROUP field
2. Drag a child GROUP field into the parent
3. Add fields to both parent and child groups
4. Test movement and editing

### Scenario 4: Group Repetition
1. Add a NUMBER field labeled "Number of Items"
2. Add a GROUP field with dependency on the number field
3. Add 2-3 child fields to the group
4. Preview the form
5. Enter different numbers in the number field
6. Verify correct number of group instances appear
7. Fill out fields in each group instance
8. Submit and verify data structure

### Scenario 5: Complex Nested Repetition
1. Create a "Number of Families" field
2. Create a "Family Info" GROUP with dependency
3. Inside "Family Info", add "Number of Children" field
4. Add a "Child Info" GROUP with dependency on "Number of Children"
5. Add fields to the child group
6. Test nested dynamic repetition in preview mode

## Known Limitations

1. **Maximum Nesting Depth**: While technically unlimited, deep nesting (>3 levels) may impact performance
2. **Repetition Limits**: Set reasonable `maxRepetitions` to prevent performance issues
3. **Layout Complexity**: Very complex group layouts may require manual position adjustment
4. **Drag-and-Drop UX**: Dropping into deeply nested groups requires precise targeting

## Future Enhancements

1. **Group Templates**: Pre-defined group templates in the toolbar
2. **Group Styling**: Customizable borders, backgrounds, and spacing
3. **Collapse/Expand**: Allow groups to be collapsible in preview mode
4. **Group Validation**: Aggregate validation across all children
5. **Conditional Groups**: Show/hide entire groups based on conditions
6. **Group-Level Dependencies**: More complex dependency types specific to groups
