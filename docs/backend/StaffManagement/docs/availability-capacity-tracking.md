---
type: feature
---

# Availability and Project Capacity Tracking

## Overview

The `Availability` entity has been enhanced to support comprehensive project capacity tracking alongside schedule management. This allows staff members to:

1. Define a **default work schedule** (recurring weekly pattern)
2. Set a **default project capacity** (how many projects they can handle simultaneously)
3. Create **general overrides** for schedule and/or capacity exceptions on specific dates
4. Add **task-focused exceptions** to indicate project-specific capacity adjustments

## Key Concepts

### 1. Default Work Schedule

Staff members have a recurring weekly schedule defined using the `RecurringSchedule` model from SharedKernel. This schedule supports:

- **WeekDays**: List of days the staff member works
- **TimeSlots**: Flat list of time ranges (for uniform schedules across all work days)
- **TimeSlotsByDay**: Dictionary mapping specific days to different time ranges (for varied schedules)

### 2. Default Project Capacity

The `DefaultProjectCapacity` property indicates how many projects a staff member can work on simultaneously under normal circumstances.

- **Type**: `int`
- **Default Value**: `1`
- **Validation**: Cannot be negative
- **Purpose**: Establishes baseline capacity for project allocation across modules

### 3. General Overrides (AvailabilityOverride)

General overrides represent exceptions to the usual schedule and/or capacity on specific dates. Each override includes:

- **Date**: The specific date for the override
- **IsAvailable**: Whether the staff member is available on this date
- **AdjustedWindow**: Optional adjusted time window (if schedule changes)
- **AdjustedProjectCapacity**: Optional adjusted capacity (overrides default for this date)

**Example Use Cases**:

- "I'm on vacation this day" → `IsAvailable = false`
- "I'm working half-day" → `IsAvailable = true`, `AdjustedWindow = 9am-1pm`
- "I can handle 3 projects today" → `IsAvailable = true`, `AdjustedProjectCapacity = 3`
- "I'm unavailable but can still manage my 2 ongoing projects" → `IsAvailable = false`, `AdjustedProjectCapacity = 2`

### 4. Task-Focused Exceptions (TaskAvailability)

Task-focused exceptions indicate project-specific capacity adjustments. These are particularly important because:

- **Capacity information is relevant even without schedule changes**
- Staff can signal "I can take an additional project" without modifying their schedule
- Useful for project selection across different modules

Each TaskAvailability includes:

- **TaskName**: Name/description of the task or project
- **StartDate**: When this capacity exception begins
- **Schedule**: Optional recurring schedule (if project requires specific times)
- **Purpose**: Signals capacity for project allocation, not just schedule availability

**Example Use Cases**:

- "I can take an additional project starting next week" → TaskName = "Available for new project", StartDate = next Monday
- "Project X is ending, freeing up capacity" → TaskName = "Project X completion", indicates reduced workload
- "I need dedicated time for Project Y" → TaskName = "Project Y", Schedule = specific time blocks

## Entity Structure

```csharp
public class Availability : BaseEntity<AvailabilityId>
{
    public StaffMemberId StaffMemberId { get; private set; }
    public RecurringSchedule WorkSchedule { get; private set; }
    public int DefaultProjectCapacity { get; private set; } = 1;

    public IReadOnlyCollection<AvailabilityOverride> Overrides { get; }
    public IReadOnlyCollection<TaskAvailability> TaskAvailabilities { get; }

    // Status, approval, and audit fields...
}
```

## DTO Structure

```csharp
public record AvailabilityDto(
    Guid? Id,
    Guid? EmployeeId,
    RecurringScheduleDto? WorkSchedule,
    int DefaultProjectCapacity = 1,
    List<AvailabilityOverrideDto>? Overrides = null,
    List<TaskAvailabilityDto>? TaskAvailabilities = null
);

public record AvailabilityOverrideDto(
    DateTime Date,
    bool IsAvailable,
    TimeRangeDto? AdjustedWindow,
    int? AdjustedProjectCapacity = null
);
```

## Database Schema Changes

### New Columns

1. **Availability.DefaultProjectCapacity**

   - Type: `integer`
   - Default: `1`
   - NOT NULL

2. **AvailabilityOverride.AdjustedProjectCapacity**
   - Type: `integer` (nullable)
   - Purpose: Override default capacity for specific date

### Migration Required

A database migration is required to add these columns to existing tables:

```sql
-- Add DefaultProjectCapacity to Availability table
ALTER TABLE "Availability"
ADD COLUMN "DefaultProjectCapacity" integer NOT NULL DEFAULT 1;

-- Add AdjustedProjectCapacity to AvailabilityOverride table
ALTER TABLE "AvailabilityOverride"
ADD COLUMN "AdjustedProjectCapacity" integer NULL;
```

## API Usage Examples

### Creating Availability with Capacity

```csharp
var availability = Availability.CreateWithWorkSchedule(
    staffMemberId: StaffMemberId.From(Guid.NewGuid()),
    workSchedule: new RecurringSchedule
    {
        WeekDays = new List<DayOfWeek> { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday },
        TimeSlots = new List<TimeSpanRange>
        {
            new TimeSpanRange(new TimeSpan(9, 0, 0), new TimeSpan(17, 0, 0))
        }
    },
    defaultProjectCapacity: 2 // Can handle 2 projects simultaneously
);
```

### Adding General Override

```csharp
// Reduce capacity on a specific date
availability.AddOverride(
    date: new DateTime(2024, 6, 15),
    isAvailable: true,
    adjustedWindow: null, // No schedule change
    adjustedProjectCapacity: 1 // Can only handle 1 project this day
);

// Half-day with normal capacity
availability.AddOverride(
    date: new DateTime(2024, 6, 20),
    isAvailable: true,
    adjustedWindow: new TimeRange(new TimeSpan(9, 0, 0), new TimeSpan(13, 0, 0)),
    adjustedProjectCapacity: null // Keep default capacity
);
```

### Adding Task-Focused Exception

```csharp
// Signal capacity for new project
var taskAvailability = availability.AddTaskAvailability(
    taskName: "Available for urgent project",
    startDate: DateTime.UtcNow.AddDays(7),
    schedule: null // No specific schedule, just capacity signal
);
```

## Querying for Available Staff

When selecting staff for projects, consider:

1. **Check default capacity**: Does the staff member have capacity under normal circumstances?
2. **Apply date-specific overrides**: Does the target date have an adjusted capacity?
3. **Review task-focused exceptions**: Has the staff member signaled additional capacity?
4. **Calculate current workload**: How many projects are they currently on?
5. **Determine available slots**: `(BaseCapacity or AdjustedCapacity) - CurrentProjects`

## Benefits

### For Staff Members

- Clear communication of capacity constraints
- Flexibility to signal availability without schedule changes
- Explicit tracking of project workload limits

### For Project Managers

- Visibility into staff capacity across modules
- Better resource allocation decisions
- Understanding of both schedule and workload constraints

### For the System

- Unified capacity tracking model
- Distinction between schedule exceptions and capacity signals
- Support for complex availability scenarios

## Migration Path

### For Existing Data

1. All existing `Availability` records will default to `DefaultProjectCapacity = 1`
2. Existing `AvailabilityOverride` records will have `AdjustedProjectCapacity = NULL` (no capacity override)
3. No data transformation required
4. Staff can update their capacity values through the UI post-migration

### For New Code

- Always provide `defaultProjectCapacity` when creating new Availability records
- Consider including capacity information in TaskAvailability for project signals
- Update UI components to display and edit capacity information
