---
type: feature
---

# StaffManagement Form Integration

## Overview

The StaffManagement module has been integrated with the Communications module's form system to enable zero-knowledge routing of form field data. This integration allows forms to collect absence/booking requests and automatically store them in the StaffManagement database without Communications needing to know about StaffManagement.

## How It Works

### 1. **Form Configuration**

In the Communications module, a form template is configured with field mappings:

```json
{
  "FormId": "absence-request-form",
  "FieldMappings": [
    {
      "FieldId": "staffMemberId",
      "TargetModule": "StaffManagement",
      "TargetEntity": "Absence",
      "TargetProperty": "EmployeeId"
    },
    {
      "FieldId": "startDate",
      "TargetModule": "StaffManagement",
      "TargetEntity": "Absence",
      "TargetProperty": "StartDate"
    },
    {
      "FieldId": "endDate",
      "TargetModule": "StaffManagement",
      "TargetEntity": "Absence",
      "TargetProperty": "EndDate"
    },
    {
      "FieldId": "absenceType",
      "TargetModule": "StaffManagement",
      "TargetEntity": "Absence",
      "TargetProperty": "Type",
      "TransformationRules": {
        "type": "enum",
        "enumType": "AbsenceType"
      }
    },
    {
      "FieldId": "reason",
      "TargetModule": "StaffManagement",
      "TargetEntity": "Absence",
      "TargetProperty": "Reason"
    }
  ]
}
```

### 2. **Form Submission**

When a user submits the absence request form:

1. **Communications** receives the form submission
2. **ProcessFormSubmissionHandler** reads the field mappings
3. For each field, it creates a `StoreFormFieldDataCommand`:
   ```csharp
   new StoreFormFieldDataCommand(
       TargetModule: "StaffManagement",
       TargetEntity: "Absence",
       TargetProperty: "EmployeeId",
       Value: "a1b2c3d4-...",
       EntityId: null,  // New entity
       SubmissionId: "sub-12345",
       Metadata: new Dictionary<string, object>()
   )
   ```
4. **Communications** sends the command via mediator: `await mediator.Send(command)`

### 3. **Zero-Knowledge Routing**

The mediator calls **ALL** registered handlers for `IRequestHandler<StoreFormFieldDataCommand, Result<Guid>>`:

- `StaffManagementFormDataHandler` (in StaffManagement module)
- `CourseManagementFormDataHandler` (in CourseManagement module)
- `CareManagementFormDataHandler` (in CareManagement module)
- ... (any other module handlers)
- `DefaultStoreFormFieldDataHandler` (fallback in Communications)

Each handler checks the `TargetModule` property:

```csharp
if (!string.Equals(command.TargetModule, "StaffManagement", StringComparison.OrdinalIgnoreCase))
{
    // Not for us - return Fail and let other handlers try
    return Result<Guid>.Fail($"Module '{command.TargetModule}' not handled by this handler.");
}

// This IS for us - process the command
// ... create/update Absence entity ...
```

### 4. **Entity Creation**

`StaffManagementFormDataHandler` processes the command:

1. **Get or Create Entity**: Checks if `EntityId` is provided
   - If yes → fetch existing `Absence` from database
   - If no → create new empty `Absence` entity

2. **Set Property**: Uses type-safe property mapping
   ```csharp
   case "employeeid":
   case "staffmemberid":
       if (value is string strId && Guid.TryParse(strId, out var guidId))
       {
           absence.EmployeeId = new StaffMemberId(guidId);
       }
       break;
   
   case "startdate":
       if (value is string startStr && DateTime.TryParse(startStr, out var parsedStart))
       {
           absence.StartDate = parsedStart;
       }
       break;
   ```

3. **Validate Entity**: Ensures business rules are met
   - EmployeeId is required
   - StartDate is required
   - EndDate is required
   - StartDate must be before EndDate

4. **Save Entity**: Persists to database
   ```csharp
   var created = Absence.Create(
       absence.EmployeeId,
       absence.StartDate,
       absence.EndDate,
       absence.Type,
       absence.Reason
   );
   
   await _absenceRepository.CreateAsync(created, cancellationToken);
   ```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Communications Module                         │
│                                                                  │
│  ┌─────────────────────────────────────────┐                   │
│  │  ProcessFormSubmissionHandler           │                   │
│  │                                          │                   │
│  │  1. Read form field mappings            │                   │
│  │  2. Create StoreFormFieldDataCommand    │                   │
│  │  3. Send via mediator                   │                   │
│  └─────────────────┬───────────────────────┘                   │
│                    │                                             │
└────────────────────┼─────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│                         Mediator                                │
│                                                                 │
│  Calls ALL handlers for IRequestHandler<                       │
│      StoreFormFieldDataCommand, Result<Guid>>                  │
└─────┬───────────┬───────────┬──────────────┬──────────────────┘
      │           │           │              │
      ▼           ▼           ▼              ▼
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐
│  Staff  │ │ Course  │ │   Care   │ │    Default     │
│   Mgmt  │ │  Mgmt   │ │   Mgmt   │ │   (Fallback)   │
│ Handler │ │ Handler │ │ Handler  │ │    Handler     │
└─────┬───┘ └─────┬───┘ └────┬─────┘ └────────┬───────┘
      │           │           │                │
      │ Check TargetModule    │                │
      │ =="StaffManagement"?  │                │
      │           │           │                │
      ▼           ▼           ▼                ▼
     YES         NO          NO               NO
      │           │           │                │
      ▼           ▼           ▼                ▼
   Process    Return Fail Return Fail     Return Fail
   & Save                                 with warning
```

## Supported Entities

### Absence

Maps form fields to `Absence` entity properties:

| Form Property     | Entity Property | Type            | Validation                    |
|------------------|-----------------|-----------------|-------------------------------|
| EmployeeId       | EmployeeId      | StaffMemberId   | Required, must be valid GUID  |
| StaffMemberId    | EmployeeId      | StaffMemberId   | Alias for EmployeeId          |
| StartDate        | StartDate       | DateTime        | Required, must be before End  |
| EndDate          | EndDate         | DateTime        | Required, must be after Start |
| Type             | Type            | AbsenceType     | Optional, defaults to Other   |
| AbsenceType      | Type            | AbsenceType     | Alias for Type                |
| Reason           | Reason          | string          | Optional                      |

**Supported Absence Types** (enum):
- `Sick`
- `Vacation`
- `PersonalLeave`
- `TrainingLeave`
- `MaternityLeave`
- `PaternityLeave`
- `BereavementLeave`
- `Other`

### Adding More Entities

To support additional entity types (e.g., `AbsenceRequest`, `Leave Balance`):

1. Add case to `GetOrCreateEntityAsync()` in `StaffManagementFormDataHandler.cs`:
   ```csharp
   case "LeaveBalance":
       return await GetOrCreateLeaveBalanceAsync(entityId, cancellationToken);
   ```

2. Add property mappings to `SetPropertyValueAsync()`:
   ```csharp
   if (entity is LeaveBalance leaveBalance)
   {
       // Handle LeaveBalance properties
   }
   ```

3. Add validation logic to `ValidateEntityAsync()`
4. Add save logic to `SaveEntityAsync()`

## Example: Absence Request Form

### Form Template HTML

```html
<form id="absence-request-form">
  <div class="form-group">
    <label for="staffMemberId">Staff Member ID</label>
    <input type="text" id="staffMemberId" name="staffMemberId" required>
  </div>
  
  <div class="form-group">
    <label for="startDate">Start Date</label>
    <input type="date" id="startDate" name="startDate" required>
  </div>
  
  <div class="form-group">
    <label for="endDate">End Date</label>
    <input type="date" id="endDate" name="endDate" required>
  </div>
  
  <div class="form-group">
    <label for="absenceType">Absence Type</label>
    <select id="absenceType" name="absenceType">
      <option value="Sick">Sick Leave</option>
      <option value="Vacation">Vacation</option>
      <option value="PersonalLeave">Personal Leave</option>
      <option value="Other">Other</option>
    </select>
  </div>
  
  <div class="form-group">
    <label for="reason">Reason (Optional)</label>
    <textarea id="reason" name="reason"></textarea>
  </div>
  
  <button type="submit">Submit Absence Request</button>
</form>
```

### Form Submission Flow

1. User fills out form and clicks "Submit"
2. Form data is sent to Communications API endpoint
3. Communications creates mapping entries for each field
4. Communications sends commands via mediator
5. StaffManagementFormDataHandler receives commands
6. New `Absence` entity is created with all properties set
7. Entity is validated and saved to StaffManagement database
8. Success response is returned with new Absence ID

## Testing

### Manual Testing

1. **Create Form Template** in Communications:
   ```http
   POST /api/communications/templates
   {
     "name": "Absence Request Form",
     "formLayoutJson": "...",
     "formDataMappingJson": "{ ... field mappings ... }"
   }
   ```

2. **Submit Form**:
   ```http
   POST /api/communications/submissions
   {
     "templateId": "template-guid",
     "formData": {
       "staffMemberId": "a1b2c3d4-...",
       "startDate": "2025-10-15",
       "endDate": "2025-10-20",
       "absenceType": "Vacation",
       "reason": "Family trip"
     }
   }
   ```

3. **Verify in Database**:
   ```sql
   SELECT * FROM StaffManagement.Absences
   WHERE EmployeeId = 'a1b2c3d4-...'
   ORDER BY CreatedAt DESC;
   ```

### Integration Test Example

```csharp
[Fact]
public async Task SubmitAbsenceRequestForm_CreatesAbsenceInStaffManagement()
{
    // Arrange
    var staffId = Guid.NewGuid();
    var command = new StoreFormFieldDataCommand(
        TargetModule: "StaffManagement",
        TargetEntity: "Absence",
        TargetProperty: "EmployeeId",
        Value: staffId.ToString(),
        EntityId: null,
        SubmissionId: "test-submission-1",
        Metadata: null
    );

    // Act
    var result = await _mediator.Send(command);

    // Assert
    Assert.True(result.IsSuccess);
    var absence = await _absenceRepository.GetByIdAsync(new AbsenceId(result.Value));
    Assert.NotNull(absence);
    Assert.Equal(staffId, absence.EmployeeId.Value);
}
```

## Benefits of This Architecture

### 1. **Zero Coupling**
- Communications doesn't reference StaffManagement
- StaffManagement doesn't reference Communications
- Each module compiles independently

### 2. **Dynamic Discovery**
- Add new modules → zero changes to Communications
- Remove modules → zero changes to Communications
- Modules opt-in by registering handlers

### 3. **Type Safety**
- Handler uses type-safe property mapping
- Validation ensures data integrity
- Compiler catches property mismatches

### 4. **Extensibility**
- Add new entity types → update handler only
- Add new properties → add case to switch
- No changes to Communications or mediator

### 5. **Testability**
- Mock mediator for Communications tests
- Mock repository for handler tests
- Integration tests verify end-to-end flow

## Troubleshooting

### Command Not Processed

**Symptom**: Form submission succeeds but no Absence created

**Possible Causes**:
1. `TargetModule` mismatch (check spelling/casing)
2. Handler not registered (check DI configuration)
3. Validation failure (check logs for validation errors)

**Solution**: Check logs for:
```
Skipping command for module 'StaffMangement' (this handler processes 'StaffManagement')
```

### Validation Errors

**Symptom**: `Result.Fail("EmployeeId is required for Absence.")`

**Cause**: Required field not set or invalid format

**Solution**: Ensure form sends all required fields with correct names:
- `EmployeeId` or `StaffMemberId`
- `StartDate`
- `EndDate`

### Property Not Set

**Symptom**: Absence created but some properties are null/default

**Cause**: Property name mismatch in mapping

**Solution**: Check `TargetProperty` matches case in `SetPropertyValueAsync()`:
- Properties are case-insensitive in handler
- Check for typos in field mappings

## Future Enhancements

1. **Add AbsenceRequest Support**
   - Separate entity for pending requests
   - Approval workflow integration
   - Status tracking (Pending → Approved → Recorded)

2. **Add Leave Balance Integration**
   - Validate against available leave balance
   - Automatic balance deduction on approval
   - Warning if insufficient balance

3. **Add Conflict Detection**
   - Check for overlapping absences
   - Team coverage validation
   - Manager notification for conflicts

4. **Add File Attachments**
   - Medical certificates for sick leave
   - Integration with FileService
   - Attachment validation rules

## Related Documentation

- [Zero-Knowledge Routing Architecture](../../Communications/src/Communications/Templates/Features/FormDefinitions/Handlers/ZERO_KNOWLEDGE_ROUTING.md)
- [Module Integration Guide](../../Communications/src/Communications/Templates/Features/FormDefinitions/Handlers/README_MODULE_INTEGRATION.md)
- [Base Handler Pattern](../../Communications/src/Communications/Templates/Features/FormDefinitions/Handlers/BASE_HANDLER_IMPLEMENTATION_SUMMARY.md)
