---
type: feature
---

# Availability Override Backend Logic

## Overview

All availability override logic is now handled in the backend. The frontend should only send user intent, and the backend will handle all create/update/delete operations intelligently.

## Key Changes

### 1. Explicit IsAvailable Property on Availability Entity

The `Availability` entity now has an explicit `IsAvailable` boolean property that reflects the current availability status. This property is:

- **Computed by backend logic** based on current date/time, work schedule, absences, and overrides
- **Updated automatically** when overrides are created, updated, or cleared
- **Will be managed by recurring jobs/workflows** in the future to keep it current

### 2. Backend Override Logic

#### CreateAvailabilityOverrideCommandHandler

The backend now handles:

- **Duplicate Prevention**: Automatically removes any existing override for the same date before creating a new one
- **Conflict Resolution**: Truncates any existing active overrides (no EndDate) or overrides that extend beyond the new override date
- **Availability Computation**: Automatically computes and updates the `IsAvailable` property after any override changes

#### ClearAvailabilityOverridesCommandHandler

- Clears all overrides for an employee
- Automatically computes and updates the `IsAvailable` property

### 3. Frontend Simplification

The frontend (e.g., `set-availability-dialog.component.ts`) should:

**DO:**

- Send user intent directly to the backend via `createAvailabilityOverride` API
- Send date, isAvailable flag, and optionally adjusted time windows
- Let the backend handle all override management logic

**DON'T:**

- Clear existing overrides before creating new ones (backend handles this)
- Manually set EndDate on overrides (backend manages this)
- Try to delete and re-create overrides (backend handles duplicates)

## Example Frontend Patterns

### Setting Unavailable Status

```typescript
// Simple - just send the intent
const unavailableOverride = {
  date: isoDate,
  isAvailable: false,
};
await this.availabilityService.createAvailabilityOverride(
  employeeId,
  unavailableOverride
);
```

### Setting Available with Schedule

```typescript
// Send each time slot as a separate override with adjusted windows
const overrides = buildAvailabilityOverrides(isoDate, this.scheduleValue);
for (const overrideDto of overrides) {
  await this.availabilityService.createAvailabilityOverride(
    employeeId,
    overrideDto
  );
}
```

### Setting Available without Schedule

```typescript
// Just mark as available - backend will use default work schedule
const availableOverride = {
  date: isoDate,
  isAvailable: true,
};
await this.availabilityService.createAvailabilityOverride(
  employeeId,
  availableOverride
);
```

## Backend Methods

### Availability.ComputeAndUpdateCurrentAvailability()

Computes the current availability status based on:

- Current date and time (UTC)
- Work schedule
- Overrides (including adjusted windows and isAvailable flags)
- Absences

This method updates the `IsAvailable` property and should be called:

- After any override is created, updated, or deleted
- By recurring jobs/workflows to keep availability current
- When work schedule changes

### Availability.IsAvailableAt(DateTime dateTime)

Checks if the staff member is available at a specific date and time. This method:

- First checks overrides for the date
- Falls back to work schedule if no override exists
- Returns false if no schedule is defined for that time

## Migration Notes

### For Frontend Developers

1. **Remove clearAvailabilityOverrides calls** before creating new overrides - the backend handles this
2. **Don't set EndDate** on new overrides - the backend manages this automatically
3. **Simplify logic** - just send user intent, let backend handle the rest

### For Backend Developers

1. **Future Work**: Implement recurring jobs/workflows to call `ComputeAndUpdateCurrentAvailability()` periodically
2. **Consider**: Calling `ComputeAndUpdateCurrentAvailability()` when absences are created/updated
3. **Consider**: Calling `ComputeAndUpdateCurrentAvailability()` when work schedules are updated

## API Response Changes

The `EmployeeAvailabilityResponseDto` now includes:

- `isAvailable` (boolean): The current availability status from the entity's `IsAvailable` property
- This reflects the **current** status, not a projection based on the returned time slots

## Future Enhancements

1. **Recurring Jobs**: Implement background jobs to update `IsAvailable` based on time progression
2. **Workflow Integration**: Trigger availability updates when related entities (absences, work schedules) change
3. **Real-time Updates**: Consider SignalR notifications when availability status changes
4. **Audit Trail**: Track when and why `IsAvailable` changes for compliance/reporting
