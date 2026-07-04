---
type: howto
---

# Quick Reference: Adding Form Integration to a Module

## For Module Developers

Follow these steps to enable your module to receive form field data from Communications.

### Step 1: Define the Command Locally

Since your module cannot reference Communications, create a local command definition:

```csharp
// In YourModule/Features/FormIntegration/YourModuleFormDataHandler.cs
using Processity.SharedKernel.EventHandling.CQRS.Interfaces;
using Processity.SharedKernel.Results.Models;

public record StoreFormFieldDataCommand(
    string TargetModule,
    string TargetEntity,
    string TargetProperty,
    object? Value,
    Guid? EntityId,
    string SubmissionId,
    Dictionary<string, object>? Metadata
) : IRequest<Result<Guid>>;
```

### Step 2: Create the Handler

```csharp
public class YourModuleFormDataHandler 
    : IRequestHandler<StoreFormFieldDataCommand, Result<Guid>>
{
    private readonly IYourRepository _repository;
    private readonly ILogger<YourModuleFormDataHandler> _logger;

    public YourModuleFormDataHandler(
        IYourRepository repository,
        ILogger<YourModuleFormDataHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(
        StoreFormFieldDataCommand command,
        CancellationToken cancellationToken)
    {
        // 1. Check module name
        if (!string.Equals(command.TargetModule, "YourModuleName", 
            StringComparison.OrdinalIgnoreCase))
        {
            return Result<Guid>.Fail($"Not for {GetType().Name}");
        }

        // 2. Get or create entity
        var entityResult = await GetOrCreateEntityAsync(
            command.TargetEntity, 
            command.EntityId, 
            cancellationToken);
        
        if (!entityResult.IsSuccess)
            return Result<Guid>.Fail(entityResult.Errors);

        var entity = entityResult.Value;

        // 3. Set property
        var setResult = await SetPropertyValueAsync(
            entity, 
            command.TargetProperty, 
            command.Value, 
            cancellationToken);
        
        if (!setResult.IsSuccess)
            return Result<Guid>.Fail(setResult.Errors);

        // 4. Validate
        var validateResult = await ValidateEntityAsync(entity, cancellationToken);
        if (!validateResult.IsSuccess)
            return Result<Guid>.Fail(validateResult.Errors);

        // 5. Save
        return await SaveEntityAsync(entity, cancellationToken);
    }

    private async Task<Result<object>> GetOrCreateEntityAsync(...)
    {
        switch (targetEntity)
        {
            case "YourEntity":
                // Fetch or create entity
                break;
            default:
                return Result<object>.Fail($"Unknown entity: {targetEntity}");
        }
    }

    private Task<Result> SetPropertyValueAsync(...)
    {
        if (entity is not YourEntity yourEntity)
            return Task.FromResult(Result.Fail("Wrong entity type"));

        switch (propertyName.ToLowerInvariant())
        {
            case "someproperty":
                yourEntity.SomeProperty = value?.ToString();
                break;
            // ... more properties
        }
        
        return Task.FromResult(Result.Ok());
    }

    private Task<Result> ValidateEntityAsync(...)
    {
        // Validate business rules
        return Task.FromResult(Result.Ok());
    }

    private async Task<Result<Guid>> SaveEntityAsync(...)
    {
        // Save to repository
        await _repository.CreateAsync(entity, cancellationToken);
        return Result<Guid>.Ok(entity.Id.Value);
    }
}
```

### Step 3: Handler Registration (Automatic!)

The handler is **automatically registered** when you call `AddProcessityMediator()` in your module's DI configuration:

```csharp
public static IServiceCollection AddYourModule(
    this IServiceCollection services,
    IConfiguration configuration)
{
    // This scans the assembly and auto-registers all handlers
    services.AddProcessityMediator(typeof(IYourModule).Assembly);
    
    // ... other registrations
    
    return services;
}
```

### Step 4: Test It!

#### Create Form Mapping in Communications

```json
{
  "FormId": "your-form",
  "FieldMappings": [
    {
      "FieldId": "fieldName",
      "TargetModule": "YourModuleName",  // ← Must match your handler's check
      "TargetEntity": "YourEntity",
      "TargetProperty": "SomeProperty"
    }
  ]
}
```

#### Submit Form

```http
POST /api/communications/submissions
{
  "templateId": "...",
  "formData": {
    "fieldName": "Some Value"
  }
}
```

#### Verify

Check your database for the new entity!

## Property Mapping Patterns

### String Properties

```csharp
case "name":
case "title":
    entity.Name = value?.ToString();
    break;
```

### Guid/ID Properties

```csharp
case "ownerid":
case "userid":
    if (value is string strId && Guid.TryParse(strId, out var guidId))
        entity.OwnerId = new YourIdType(guidId);
    else if (value is Guid gId)
        entity.OwnerId = new YourIdType(gId);
    else
        return Task.FromResult(Result.Fail($"Invalid ID: {value}"));
    break;
```

### DateTime Properties

```csharp
case "startdate":
case "createddate":
    if (value is DateTime dt)
        entity.StartDate = dt;
    else if (value is string dtStr && DateTime.TryParse(dtStr, out var parsedDt))
        entity.StartDate = parsedDt;
    else
        return Task.FromResult(Result.Fail($"Invalid date: {value}"));
    break;
```

### Enum Properties

```csharp
case "status":
case "type":
    if (value is YourEnum enumValue)
        entity.Status = enumValue;
    else if (value is string enumStr && Enum.TryParse<YourEnum>(enumStr, true, out var parsed))
        entity.Status = parsed;
    else if (value is int enumInt && Enum.IsDefined(typeof(YourEnum), enumInt))
        entity.Status = (YourEnum)enumInt;
    else
        return Task.FromResult(Result.Fail($"Invalid enum: {value}"));
    break;
```

### Numeric Properties

```csharp
case "amount":
case "quantity":
    if (value is decimal decValue)
        entity.Amount = decValue;
    else if (value is string numStr && decimal.TryParse(numStr, out var parsedNum))
        entity.Amount = parsedNum;
    else if (value is int intValue)
        entity.Amount = intValue;
    else
        return Task.FromResult(Result.Fail($"Invalid number: {value}"));
    break;
```

## Common Validation Patterns

### Required Fields

```csharp
if (entity.RequiredField == null || entity.RequiredField.Value == Guid.Empty)
    return Task.FromResult(Result.Fail("RequiredField is required"));
```

### Business Rules

```csharp
if (entity.StartDate >= entity.EndDate)
    return Task.FromResult(Result.Fail("Start must be before End"));
```

### Format Validation

```csharp
if (!string.IsNullOrEmpty(entity.Email) && !IsValidEmail(entity.Email))
    return Task.FromResult(Result.Fail("Invalid email format"));
```

## Troubleshooting

### "Command not processed"

Check logs for:
```
Skipping command for module 'YourModule' (this handler processes 'YourModuleName')
```

**Fix**: Ensure `TargetModule` in form mapping matches your handler's module name check.

### "Property not set"

Add logging in `SetPropertyValueAsync`:
```csharp
_logger.LogDebug("Setting {PropertyName} to {Value}", propertyName, value);
```

**Fix**: Ensure property name mapping is case-insensitive and handles aliases.

### "Validation failed"

Check validation logic:
```csharp
_logger.LogWarning("Validation failed: {Errors}", string.Join(", ", errors));
```

**Fix**: Ensure all required fields are included in form submission.

## Best Practices

✅ **DO**: Use case-insensitive property matching  
✅ **DO**: Support multiple property name aliases (e.g., "employeeid" and "staffmemberid")  
✅ **DO**: Log at appropriate levels (Debug for property sets, Info for entity saves)  
✅ **DO**: Return descriptive error messages  
✅ **DO**: Validate business rules before saving  

❌ **DON'T**: Reference Communications module  
❌ **DON'T**: Hardcode module names (use constants)  
❌ **DON'T**: Throw exceptions (return Result.Fail instead)  
❌ **DON'T**: Forget to handle null values  
❌ **DON'T**: Skip validation  

## Example: Complete Handler

See: `/StaffManagement.Service/Absences/Features/FormIntegration/StaffManagementFormDataHandler.cs`

For full documentation, see:  
`/StaffManagement.Service/Absences/Features/FormIntegration/README_FORM_INTEGRATION.md`

---

**Need Help?** Check the zero-knowledge routing guide:  
`/Communications/Templates/Features/FormDefinitions/Handlers/ZERO_KNOWLEDGE_ROUTING.md`
