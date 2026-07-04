---
type: feature
---

# SharedKernel FormIntegration

Generic field mapping strategies for form integration across all Processity modules.

## Overview

The FormIntegration module provides reusable field mapping strategies that enable any module to map form submission data to domain entities. These strategies use reflection to work with any entity type, eliminating the need for module-specific implementations of common mapping logic.

## Architecture

### Strategy Pattern

The module uses the Strategy pattern through the `IFieldMappingStrategy` interface:

```csharp
public interface IFieldMappingStrategy
{
    bool CanHandle(string targetEntity, string targetProperty);
    Task<Result> HandleAsync(object entity, string targetProperty, object? value, CancellationToken cancellationToken);
}
```

### Strategy Precedence

Strategies are evaluated in registration order. More specific strategies should be registered **before** generic ones to ensure proper handling.

## Available Strategies

### Generic Strategies (Tier 1)

These strategies are fully generic with zero refactoring needed:

#### EnumFieldMappingStrategy

Maps string or integer values to enum properties.

**Handles:**
- Any enum property on any entity
- Case-insensitive string-to-enum conversion
- Integer-to-enum conversion
- Nullable enums

**Example:**
```csharp
// Form data: { "Priority": "High" }
// Maps to: BookingRequest.Priority (BookingPriority enum)
```

#### GenericCollectionByGuidFieldMappingStrategy\<TEntity>

Maps GUID arrays to entity collections using a configurable loader delegate.

**Handles:**
- `IEnumerable<Guid>`
- JSON array strings: `["guid1", "guid2"]`
- Comma-separated strings: `"guid1,guid2"`
- JsonElement arrays

**Example:**
```csharp
// Form data: { "ProblemStatements": ["guid1", "guid2"] }
// Loads ProblemStatement entities and adds to collection
```

### Refactored Strategies (Tier 2)

These strategies were generalized from SocialCare-specific implementations:

#### NavigationPropertyMappingStrategy

Maps GUID values to foreign key properties and navigation properties.

**Handles:**
- Properties ending in "Id" (e.g., `ServiceId`)
- Typed-ID value objects (e.g., `ServiceId` class with `From(Guid)` factory)
- Navigation properties (creates minimal instances with ID set)

**Attempts (in order):**
1. Set FK property directly (preferred - prevents EF duplicate inserts)
2. Create typed-ID via factory methods: `From()`, `FromGuid()`, `Create()`, `Parse()`
3. Create typed-ID via constructor: `new TypedId(guid)`
4. Set backing fields if no setter available

**Example:**
```csharp
// Form data: { "ServiceId": "guid-value" }
// Maps to: BookingRequest.ServiceId (typed ServiceId value object)
```

#### DottedPropertyMappingStrategy

Handles nested property paths using dot notation.

**Handles:**
- Nested paths like `"Family.NumberOfChildren"`
- Initializes null intermediate objects automatically
- Sets typed IDs on created nested entities

**Example:**
```csharp
// Form data: { "Family.NumberOfChildren": 3 }
// Creates Family object if null, then sets NumberOfChildren property
```

#### PrimitiveFieldMappingStrategy

Maps value types and primitive properties.

**Handles:**
- `int`, `uint`, `long`, `ulong`
- `bool`
- `decimal`, `double`, `float`
- `DateTime`
- Nullable versions of all above
- JsonElement unwrapping

**Example:**
```csharp
// Form data: { "NumberOfChildren": 3 }
// Maps to: Family.NumberOfChildren (int property)
```

#### TextFieldMappingStrategy

Maps string properties.

**Handles:**
- Plain string properties
- JsonElement string unwrapping
- Type conversion to string for non-string values

**Example:**
```csharp
// Form data: { "GoalSummary": "Improve independence" }
// Maps to: BookingRequest.GoalSummary (string property)
```

## Usage

### Basic Setup

In your module's DI registration:

```csharp
using Processity.SharedKernel.FormIntegration.Infrastructure;

public static class MyModuleFormIntegrationRegistration
{
    public static void AddMyModuleFormIntegration(this IServiceCollection services)
    {
        // 1. Register domain-specific strategies FIRST
        services.AddTransient<IFieldMappingStrategy, CustomDomainStrategy>();

        // 2. Register generic collection mappings (if needed)
        services.AddGenericCollectionMapping<MyEntity>(
            sp => {
                var repo = sp.GetRequiredService<IMyEntityRepository>();
                return id => repo.GetByIdAsync(new MyEntityId(id));
            },
            "MyEntities"
        );

        // 3. Register generic strategies LAST
        services.AddSharedFormIntegration();

        // 4. Register other form integration services
        services.AddTransient<IFormSubmissionParser, FormSubmissionParser>();
    }
}
```

### Generic Collection Mapping

Use `AddGenericCollectionMapping<TEntity>()` to register collection mappings:

```csharp
services.AddGenericCollectionMapping<ProblemStatement>(
    sp => {
        var repo = sp.GetRequiredService<IProblemStatementRepository>();
        return id => repo.GetByIdAsync<ProblemStatement>(new ProblemStatementId(id));
    },
    "ProblemStatements"
);
```

This enables mapping form data like:
```json
{
  "ProblemStatements": ["guid1", "guid2", "guid3"]
}
```

### Strategy Registration Order

**Critical:** Strategy order determines precedence. Register strategies from most specific to most generic:

```csharp
// ✅ CORRECT ORDER
services.AddTransient<IFieldMappingStrategy, ServiceFieldMappingStrategy>();      // Domain-specific
services.AddTransient<IFieldMappingStrategy, NotesFieldMappingStrategy>();        // Domain-specific
services.AddGenericCollectionMapping<ProblemStatement>(...);                      // Collection mapping
services.AddSharedFormIntegration();                                              // Generic strategies

// ❌ INCORRECT ORDER
services.AddSharedFormIntegration();                                              // Generic registered first
services.AddTransient<IFieldMappingStrategy, ServiceFieldMappingStrategy>();      // Won't be reached!
```

## Cross-Module Compatibility

### Entity Discovery

All strategies use `AppDomain.CurrentDomain.GetAssemblies()` to discover entity types dynamically. This enables cross-module usage without hardcoding assembly references.

### Example: Activities Module

```csharp
public static void AddActivitiesFormIntegration(this IServiceCollection services)
{
    // Domain-specific strategies
    services.AddTransient<IFieldMappingStrategy, NoteBodyFieldMappingStrategy>();

    // Generic strategies work automatically with Activities entities
    services.AddSharedFormIntegration();
}
```

## Domain-Specific Strategies

When to create a domain-specific strategy:

1. **Complex domain logic**: Strategy requires business rules (e.g., `InterventionScheduleFieldMappingStrategy`)
2. **Domain-specific types**: Strategy works with module-specific value objects (e.g., `TimeRange`)
3. **Cross-module communication**: Strategy needs to call other modules via IMediator (e.g., `NotesFieldMappingStrategy`)
4. **Repository access**: Strategy loads entities via repositories (e.g., `ServiceFieldMappingStrategy`)

Domain-specific strategies should:
- Remain in the module's codebase
- Be registered **before** `AddSharedFormIntegration()`
- Implement very specific `CanHandle()` logic to avoid conflicts

## Testing

### Unit Testing Strategies

```csharp
[Fact]
public async Task EnumFieldMappingStrategy_ConvertsStringToEnum()
{
    // Arrange
    var strategy = new EnumFieldMappingStrategy();
    var entity = new BookingRequest();

    // Act
    var result = await strategy.HandleAsync(
        entity,
        "Priority",
        "High",
        CancellationToken.None
    );

    // Assert
    result.IsSuccess.Should().BeTrue();
    entity.Priority.Should().Be(BookingPriority.High);
}
```

### Integration Testing

Test that strategies are registered in correct order and work together:

```csharp
[Fact]
public async Task FormSubmission_WithMultipleFields_MapsCorrectly()
{
    // Arrange
    var services = new ServiceCollection();
    services.AddMyModuleFormIntegration();

    var command = new StoreFormFieldDataCommand
    {
        TargetEntity = "BookingRequest",
        Fields = new Dictionary<string, object>
        {
            { "Priority", "High" },              // EnumFieldMappingStrategy
            { "NumberOfChildren", 3 },           // PrimitiveFieldMappingStrategy
            { "Family.NumberOfChildren", 2 },    // DottedPropertyMappingStrategy
            { "ServiceId", someGuid }            // NavigationPropertyMappingStrategy
        }
    };

    // Act & Assert
    // Verify all fields mapped correctly
}
```

## Migration from SocialCare

The following strategies were migrated from SocialCare:

| Strategy | Changes Made |
|----------|-------------|
| EnumFieldMappingStrategy | Changed `Assembly.GetExecutingAssembly()` to `AppDomain.CurrentDomain.GetAssemblies()` |
| GenericCollectionByGuidFieldMappingStrategy | Made public, no logic changes |
| NavigationPropertyMappingStrategy | Removed `"BookingRequest"` hardcode, made fully generic |
| DottedPropertyMappingStrategy | Removed entity type checks, works with any entity |
| PrimitiveFieldMappingStrategy | Removed `typeof(BookingRequest)`, uses `FindEntityType()` |
| TextFieldMappingStrategy | Removed entity type hardcodes, made generic |

## Future Extensions

### Planned Enhancements

1. **IEntityMappingStrategy Framework**: Extract common entity mapping patterns into a base class
2. **Validation Strategies**: Add pre-mapping validation strategies
3. **Type Conversion Registry**: Allow modules to register custom type converters
4. **Performance Optimizations**: Cache reflection lookups for entity types and properties

### Module Adoption

Other modules can adopt FormIntegration:

- **Activities**: Form-based note creation
- **CoreData**: Reference data management via forms
- **StaffManagement**: Staff profile updates via forms
- **EventManagement**: Event registration forms

## Troubleshooting

### Strategy Not Executing

**Problem**: Custom strategy never gets called

**Solution**: Check registration order. Domain-specific strategies must be registered **before** `AddSharedFormIntegration()`.

### Entity Type Not Found

**Problem**: `FindEntityType()` returns null

**Solution**: Ensure the assembly containing the entity is loaded. Reference the entity type in your startup code to force assembly loading.

### Duplicate Entity Insertion

**Problem**: EF tries to insert navigation entities as new records

**Solution**: Use `NavigationPropertyMappingStrategy` which prefers setting FK properties over navigation instances.

## Contributing

When adding new generic strategies:

1. Place in `Strategies/Generic/` if fully generic
2. Place in `Strategies/Refactored/` if generalized from domain-specific code
3. Update `ServiceCollectionExtensions.AddSharedFormIntegration()`
4. Add XML documentation
5. Create unit tests
6. Update this README

## Related Documentation

- [Form Builder Strategies Pattern](../EventHandling/CQRS/Handlers/BaseModuleFormDataHandler.cs)
- [Result Pattern](../Results/README.md)
- [SocialCare Form Integration](../../Processity.Backend/SocialCare/src/SocialCare/FormIntegration/)
