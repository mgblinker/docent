---
type: architecture
---

# Form Integration Infrastructure - SharedKernel Enhancement

## Overview

This document describes the new form integration infrastructure added to SharedKernel to support entities that can be created or updated from form submissions.

## Problem Statement

Previously, form-submittable entities like `BookingRequest` had to implement form processing fields (`Metadata`, `RequiresManualReview`, `RawSubmissionJson`) individually. These fields needed to be:

1. Hidden from Model Discovery (not exposed to frontend forms)
2. Standardized across all form-enabled entities
3. Properly integrated with the form mapping pipeline

## Solution

### 1. IFormSubmittableEntity Interface

**Location:** `Processity.SharedKernel.FormIntegration.Abstractions.IFormSubmittableEntity`

A marker interface for entities that support form submissions:

```csharp
public interface IFormSubmittableEntity
{
    Dictionary<string, object>? Metadata { get; set; }
    bool RequiresManualReview { get; }
    string? RawSubmissionJson { get; }
    void MarkForManualReview();
    void CaptureRawSubmission(string rawJson);
}
```

**Benefits:**

- Standardizes form processing infrastructure
- Type-safe contract for form mapping strategies
- Enables generic form processing utilities

### 2. ExcludeFromDiscoveryAttribute

**Location:** `Processity.SharedKernel.ModelDiscovery.Infrastructure.ExcludeFromDiscoveryAttribute`

Marks properties to be excluded from model discovery:

```csharp
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public class ExcludeFromDiscoveryAttribute : Attribute
{
    public string? Reason { get; set; }

    public ExcludeFromDiscoveryAttribute() { }
    public ExcludeFromDiscoveryAttribute(string reason) => Reason = reason;
}
```

**Features:**

- Prevents internal fields from being exposed in discovery endpoints
- Optional documentation via `Reason` property
- Checked automatically by `FieldDiscoveryService`

## Implementation Details

### FieldDiscoveryService Enhancement

The discovery service now checks for the exclusion attribute:

```csharp
foreach (var property in properties)
{
    // Check for ExcludeFromDiscoveryAttribute
    if (property.GetCustomAttribute<ExcludeFromDiscoveryAttribute>() != null)
        continue;

    // ... rest of discovery logic
}
```

### Usage Example: BookingRequest

```csharp
internal class BookingRequest : BaseEntity<BookingRequestId>, IFormSubmittableEntity
{
    // Regular fields discovered normally
    public TimeRange Timeframe { get; private set; } = null!;

    // Form processing fields excluded from discovery
    [NotMapped]
    [ExcludeFromDiscovery("Internal form processing metadata")]
    public Dictionary<string, object>? Metadata { get; set; }

    [ExcludeFromDiscovery("Internal form processing flag")]
    public bool RequiresManualReview { get; private set; }

    [ExcludeFromDiscovery("Internal audit/debugging field")]
    public string? RawSubmissionJson { get; private set; }

    // Interface implementation
    public void MarkForManualReview()
        => RequiresManualReview = true;

    public void CaptureRawSubmission(string rawJson)
        => RawSubmissionJson = rawJson;
}
```

## Field Purposes

### Metadata (Dictionary<string, object>?)

- **Purpose:** Temporary storage for cross-field coordination during form processing
- **Lifecycle:** Set during mapping, cleared after entity save
- **NotMapped:** Yes (never persisted to database)
- **Use Cases:**
  - Storing intermediate mapping results
  - Communication between field mapping strategies
  - Temporary foreign key lookups
  - Deferred relationship resolution

**Example:**

```csharp
entity.Metadata["pendingNotes"] = new List<string> { "Note 1", "Note 2" };
// Later in processing pipeline:
if (entity.Metadata.TryGetValue("pendingNotes", out var notes))
{
    CreateNotesFromList((List<string>)notes);
}
```

### RequiresManualReview (bool)

- **Purpose:** Flag indicating mapping/validation issues requiring human review
- **Lifecycle:** Set by mapping strategies on errors, persisted to database
- **Use Cases:**
  - Ambiguous data that couldn't be automatically mapped
  - Validation failures that don't prevent entity creation
  - Data quality issues requiring manual verification
  - Reference resolution failures (missing lookups)

**Example:**

```csharp
if (!familyFound)
{
    entity.MarkForManualReview();
    // Entity still saved, but flagged for admin review
}
```

### RawSubmissionJson (string?)

- **Purpose:** Complete audit trail of original form submission
- **Lifecycle:** Set once on entity creation, persisted to database
- **Use Cases:**
  - Debugging mapping issues
  - Manual data recovery when mapping fails
  - Audit trail for compliance
  - Reprocessing entities with updated mapping logic

**Example:**

```csharp
entity.CaptureRawSubmission(formSubmissionJson);
// Later, admin can view original submission to understand mapping issues
```

## Integration with Form Processing Pipeline

### Recommended Processing Flow

```csharp
public async Task<BookingRequest> ProcessFormSubmission(FormSubmission form)
{
    var entity = new BookingRequest();

    // 1. Capture raw submission immediately
    entity.CaptureRawSubmission(JsonSerializer.Serialize(form));

    // 2. Initialize metadata for cross-field coordination
    entity.Metadata = new Dictionary<string, object>();

    try
    {
        // 3. Apply field mapping strategies
        foreach (var strategy in fieldMappingStrategies)
        {
            var result = await strategy.MapFieldAsync(form, entity);
            if (result.IsFailed && result.IsRecoverable)
            {
                entity.MarkForManualReview();
            }
        }

        // 4. Process metadata (e.g., create related entities)
        await ProcessMetadata(entity);

        // 5. Clear metadata before save
        entity.Metadata = null;

        // 6. Save entity
        await repository.AddAsync(entity);

        return entity;
    }
    catch (Exception ex)
    {
        entity.MarkForManualReview();
        throw;
    }
}
```

## Migration Guide

### For Existing Entities

1. **Add interface implementation:**

   ```csharp
   internal class YourEntity : BaseEntity<YourEntityId>, IFormSubmittableEntity
   ```

2. **Add exclusion attributes:**

   ```csharp
   [ExcludeFromDiscovery("Internal form processing metadata")]
   public Dictionary<string, object>? Metadata { get; set; }

   [ExcludeFromDiscovery("Internal form processing flag")]
   public bool RequiresManualReview { get; private set; }

   [ExcludeFromDiscovery("Internal audit/debugging field")]
   public string? RawSubmissionJson { get; private set; }
   ```

3. **Implement interface methods:**

   ```csharp
   public void MarkForManualReview()
       => RequiresManualReview = true;

   public void CaptureRawSubmission(string rawJson)
       => RawSubmissionJson = rawJson;
   ```

4. **Update form processing code** to use interface methods instead of direct property access

### For New Entities

Simply implement `IFormSubmittableEntity` and add the three properties with `[ExcludeFromDiscovery]` attributes.

## Benefits

### ✅ Type Safety

- Form processing utilities can depend on `IFormSubmittableEntity`
- Compile-time checks for required infrastructure

### ✅ Consistency

- All form-enabled entities use same field names and behavior
- Standardized contract reduces cognitive load

### ✅ API Cleanliness

- Model discovery endpoints don't expose internal fields
- Frontend forms don't see processing metadata

### ✅ Flexibility

- `Metadata` enables complex cross-field scenarios
- `RawSubmissionJson` enables data recovery and debugging
- `RequiresManualReview` enables graceful degradation

### ✅ Maintainability

- Centralized interface definition
- Single source of truth for form processing contract
- Easy to extend with additional capabilities

## Common Patterns

### Pattern 1: Deferred Relationship Creation

```csharp
// During mapping:
entity.Metadata["pendingRelationships"] = new List<RelationshipDto> { ... };

// After main entity save:
if (entity.Metadata?.TryGetValue("pendingRelationships", out var rels) == true)
{
    await CreateRelationships(entity, (List<RelationshipDto>)rels);
}
```

### Pattern 2: Conditional Manual Review

```csharp
var confidenceScore = CalculateMatchConfidence(entity, submission);
if (confidenceScore < 0.8)
{
    entity.MarkForManualReview();
}
```

### Pattern 3: Audit Trail for Compliance

```csharp
// Capture on creation
entity.CaptureRawSubmission(originalJson);

// Query for audit reports
var entitiesForAudit = await dbContext.BookingRequests
    .Where(br => br.CreatedAt > auditStartDate && br.RawSubmissionJson != null)
    .Select(br => new AuditRecord
    {
        EntityId = br.Id,
        OriginalData = br.RawSubmissionJson
    })
    .ToListAsync();
```

## Testing Considerations

### Unit Tests

```csharp
[Fact]
public void MarkForManualReview_SetsFlag()
{
    var entity = new BookingRequest();
    entity.MarkForManualReview();
    Assert.True(entity.RequiresManualReview);
}

[Fact]
public void CaptureRawSubmission_StoresJson()
{
    var entity = new BookingRequest();
    var json = "{\"test\":true}";
    entity.CaptureRawSubmission(json);
    Assert.Equal(json, entity.RawSubmissionJson);
}
```

### Integration Tests

```csharp
[Fact]
public async Task FormSubmission_WithErrors_MarksForReview()
{
    var submission = CreateInvalidSubmission();
    var entity = await formProcessor.ProcessAsync(submission);

    Assert.True(entity.RequiresManualReview);
    Assert.NotNull(entity.RawSubmissionJson);
}
```

### Discovery Tests

```csharp
[Fact]
public void ModelDiscovery_ExcludesFormProcessingFields()
{
    var fields = discoveryService.DiscoverFields(typeof(BookingRequest));

    Assert.DoesNotContain(fields, f => f.Name == "Metadata");
    Assert.DoesNotContain(fields, f => f.Name == "RequiresManualReview");
    Assert.DoesNotContain(fields, f => f.Name == "RawSubmissionJson");
}
```

## Future Enhancements

### Potential Additions to IFormSubmittableEntity

- `MappingErrors`: Structured list of mapping errors instead of just boolean flag
- `ProcessedAt`: Timestamp of form processing
- `ProcessingDuration`: Performance metric
- `FormVersion`: Version of form schema used

### Potential Attribute Extensions

- `[ExcludeFromDiscovery(ExceptForRoles = ["Admin"])]`: Role-based visibility
- `[IncludeInAuditLog]`: Mark fields for automatic audit trail
- `[SensitiveData]`: Mark fields for encryption/masking

## Related Documentation

- [FormIntegration README](../FormIntegration/README.md)
- [ModelDiscovery README](../ModelDiscovery/README.md)
- [Field Mapping Strategies](../FormIntegration/Strategies/README.md)
- [Discovery Configuration](../ModelDiscovery/Config/EntityDiscoveryConfiguration.cs)

## Questions & Answers

**Q: Should all entities created from forms implement IFormSubmittableEntity?**  
A: Yes, if they need form processing infrastructure. Otherwise, they can remain simple entities.

**Q: Can I add additional properties to IFormSubmittableEntity?**  
A: Submit a PR to SharedKernel if the property would benefit all form-enabled entities.

**Q: What happens if I forget the ExcludeFromDiscovery attribute?**  
A: The fields will be exposed in discovery endpoints, potentially confusing users and exposing internal data.

**Q: Should Metadata be cleared after processing?**  
A: Yes, it's temporary storage. Clear it before persisting to avoid memory bloat.

**Q: Can I use RawSubmissionJson for reprocessing?**  
A: Yes! Store the raw JSON and you can reprocess entities if mapping logic improves.
