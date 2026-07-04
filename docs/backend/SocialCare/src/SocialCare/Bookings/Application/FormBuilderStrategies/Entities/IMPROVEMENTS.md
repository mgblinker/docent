---
type: feature
---

# Form Integration Improvements

This implementation enhances the BookingRequestEntityMappingStrategy with the following improvements:

## Changes Made

### 1. **PropertyPathResolver Service** (SharedKernel)

- **Location**: `Processity.SharedKernel/src/FormIntegration/Services/PropertyPathResolver.cs`
- **Purpose**: Automatically resolves flattened form field names to canonical nested property paths using Model Discovery
- **Benefits**:
  - Eliminates hardcoded property mappings (e.g., "PreferredAgeMin" → "PreferredProfile.AgeRange.Min")
  - Uses Model Discovery infrastructure to auto-detect field paths
  - Caches mappings for performance
  - Falls back gracefully when discovery is unavailable

### 2. **Generic Base Class** (SharedKernel)

- **Location**: `Processity.SharedKernel/src/FormIntegration/Infrastructure/GenericEntityMappingStrategy.cs`
- **Purpose**: Provides reusable mapping flow for all entity strategies
- **Benefits**:
  - Standardizes the Get/Create → Set → Validate → Save → Post-Process workflow
  - Reduces code duplication across entity strategies
  - Makes it easier to add new entity mapping strategies
  - Supports automatic property path resolution via PropertyPathResolver

### 3. **IEntityValidator Interface** (SharedKernel)

- **Location**: `Processity.SharedKernel/src/FormIntegration/Abstractions/IEntityValidator.cs`
- **Purpose**: Separates validation concerns from mapping logic
- **Benefits**:
  - Allows validation logic to be reused and tested independently
  - Supports partial validation based on which property is being set
  - Can be swapped or composed with other validators

### 4. **BookingRequestFormValidator** (SocialCare)

- **Location**: `Processity.Backend/SocialCare/src/SocialCare/Bookings/Application/Validators/BookingRequestFormValidator.cs`
- **Purpose**: Validates BookingRequest entities during form mapping
- **Benefits**:
  - Extracted from the mapping strategy for better separation of concerns
  - Testable in isolation
  - Reusable across different scenarios

### 5. **Refactored BookingRequestEntityMappingStrategy**

- **Changes**:
  - Now inherits from `GenericEntityMappingStrategy<BookingRequest>`
  - Uses `PropertyPathResolver` for automatic field name resolution (no more hardcoded mappings!)
  - Uses `IEntityValidator<BookingRequest>` for validation
  - Significantly reduced code size (~380 lines → ~260 lines)
  - All logging now uses inherited `Logger` property

## Before vs After

### Before:

```csharp
// Hardcoded property mappings
private static string ResolveCanonicalProperty(string incoming)
{
    return n switch
    {
        var s when string.Equals(s, "PreferredAgeMin", ...) => "PreferredProfile.AgeRange.Min",
        var s when string.Equals(s, "PreferredAgeMax", ...) => "PreferredProfile.AgeRange.Max",
        // ... many more mappings
        _ => incoming,
    };
}

// Hardcoded validation
private static Task<Result> ValidateBookingRequestAsync(...)
{
    // Validation logic mixed with strategy
}
```

### After:

```csharp
// Automatic resolution via Model Discovery
protected override string ModuleName => "SocialCare";
protected override string TargetEntityName => "BookingRequest";
// PropertyPathResolver automatically maps field names!

// Separated validation
protected override Task<Result> ValidateEntityAsync(...)
{
    return _validator.ValidateAsync(entity, propertyBeingSet, cancellationToken);
}
```

## Benefits

1. **Sustainability**: Changes to the BookingRequest model are automatically detected via Model Discovery
2. **Maintainability**: Clear separation of concerns (mapping vs validation vs resolution)
3. **Extensibility**: Easy to add new entity strategies using the base class
4. **Testability**: Each component can be tested in isolation
5. **Performance**: Caching in PropertyPathResolver ensures minimal overhead

## Migration Guide for Other Entities

To create a new entity mapping strategy:

```csharp
internal class YourEntityMappingStrategy(
    IYourRepository repository,
    ILogger<YourEntityMappingStrategy> logger,
    IEnumerable<IFieldMappingStrategy> fieldStrategies,
    IEntityValidator<YourEntity> validator,
    PropertyPathResolver? propertyPathResolver = null
) : GenericEntityMappingStrategy<YourEntity>(logger, fieldStrategies, propertyPathResolver),
        IEntityMappingStrategy
{
    protected override string TargetEntityName => "YourEntity";
    protected override string ModuleName => "YourModule";

    public bool CanHandle(string targetEntity) =>
        string.Equals(targetEntity, "YourEntity", StringComparison.OrdinalIgnoreCase);

    public async Task<Result<Guid>> HandleAsync(StoreFormFieldDataCommand command, CancellationToken ct)
    {
        return await HandleMappingAsync(command.EntityId, command.TargetProperty, command.Value, ct);
    }

    protected override Task<Result<YourEntity>> GetOrCreateEntityAsync(Guid? id, CancellationToken ct)
    {
        // Your entity retrieval/creation logic
    }

    protected override Task<Result<Guid>> SaveEntityAsync(YourEntity entity, CancellationToken ct)
    {
        // Your save logic
    }

    protected override Task<Result> ValidateEntityAsync(YourEntity entity, string? prop, CancellationToken ct)
    {
        return _validator.ValidateAsync(entity, prop, ct);
    }

    protected override Task<Result> PostSaveProcessingAsync(YourEntity entity, CancellationToken ct)
    {
        // Optional: additional processing after save
        return Task.FromResult(Result.Ok());
    }
}
```

## Dependencies

These improvements require:

- DiscoveryRegistry (already registered in SocialCare module)
- Model Discovery Provider (already implemented as SocialCareDiscoveryProvider)
- No additional NuGet packages needed

## Testing

The PropertyPathResolver can be tested independently:

- Mock the DiscoveryRegistry
- Provide test field descriptors
- Verify correct path resolution

The base class flow can be tested with concrete implementations in unit tests.

## Future Enhancements

1. Add attribute-based field aliases directly on models (`[FormFieldAlias("PreferredAgeMin")]`)
2. Support for composite validators (chain multiple validators)
3. Async validation strategies
4. Integration with FluentValidation library
