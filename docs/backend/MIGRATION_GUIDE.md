---
type: howto
---

# Backend Migration Strategy - Developer Guide

## Quick Start for Backend Modules

This guide shows you how to use the enhanced migration capabilities with Backend modules.

## Creating and Testing Migrations

### 1. Create Migration

```bash
# Example for SocialCare module
cd SocialCare/migration/SocialCare.Migrations

dotnet ef migrations add AddNewFeature \
  --project SocialCare.Migrations.csproj \
  --startup-project ../../src/SocialCare/SocialCare.csproj
```

### 2. Preview Migration Locally

```bash
# Generate script to review
dotnet ef migrations script --idempotent --output preview.sql

# Check for destructive operations
grep -i "DROP TABLE\|DROP COLUMN" preview.sql
```

### 3. Test Locally

```bash
# Apply to local development database
dotnet ef database update --project SocialCare.Migrations.csproj
```

## Module Configuration

### Dependencies and Priority

All modules now support dependency declaration and provisioning priority:

```csharp
// Example: SocialCare depends on CoreData
public ModuleProvisioningMetadata GetMetadata() => new()
{
    ModuleName = "SocialCare",
    DisplayName = "Social Care",
    DbContextType = typeof(SocialCareDbContext),
    MigrationAssemblyName = "SocialCare.Migrations",
    // ... connection strings

    // NEW: Dependencies and ordering
    Dependencies = new List<string> { "CoreData" },
    ProvisioningPriority = 50,  // 0 = highest, 100 = lowest
    Version = "2.0.0"
};
```

### Current Module Dependencies

```
CoreData (Priority: 0)
  └─ No dependencies - provision first

SocialCare (Priority: 50)
  └─ Depends on: CoreData

StaffManagement (Priority: 50)
  └─ Depends on: CoreData

CareManagement (Priority: 60)
  └─ Depends on: CoreData, SocialCare

Activities (Priority: 50)
  └─ Depends on: CoreData
```

## Using Migration Validation

The SocialCare module provisioning service automatically validates migrations before execution.

### Validation Features

- ✅ Detects DROP TABLE, DROP COLUMN operations
- ✅ Checks for TRUNCATE (error - should never be in migrations)
- ✅ Validates schema references
- ✅ Detects sensitive data in scripts
- ✅ Warns about SELECT \* usage

### Example Output

```
[INFO] Validating migration script for module SocialCare on schema tenant_001
[WARN] Migration for SocialCare contains 1 destructive operation(s)
[WARN]   Line 42: DROP COLUMN Persons.OldColumn - Data loss imminent
[INFO] Successfully applied migrations for SocialCare to schema tenant_001
```

## Dry-Run Migration Testing

### Using the API

```csharp
// Inject services
private readonly IMigrationScriptProvider _migrationProvider;
private readonly ISocialCareDbContext _dbContext;

// Generate dry-run preview
var dryRun = await _migrationProvider.GenerateMigrationDryRunAsync(
    (DbContext)_dbContext,
    "tenant_001",
    validateOnly: false
);

Console.WriteLine($"Pending Migrations: {dryRun.PendingMigrations.Count}");
Console.WriteLine($"Script Size: {dryRun.GeneratedScript.Length} bytes");
Console.WriteLine($"Estimated Duration: {dryRun.EstimatedDurationSeconds}s");
Console.WriteLine($"Is Valid: {dryRun.IsValid}");
Console.WriteLine($"Requires Review: {dryRun.RequiresReview}");

// Check validation results
if (!dryRun.IsValid)
{
    foreach (var error in dryRun.ValidationResult.Errors)
    {
        Console.WriteLine($"❌ {error}");
    }
}

if (dryRun.RequiresReview)
{
    foreach (var op in dryRun.ValidationResult.DestructiveOperations)
    {
        Console.WriteLine($"⚠️ Line {op.LineNumber}: {op.OperationType} {op.ObjectName}");
    }
}
```

## Module-Specific Provisioning

### SocialCare Example

The SocialCare module provisioning service automatically:

1. Validates migrations before execution
2. Logs destructive operations as warnings
3. Provides detailed error messages on validation failures
4. Includes script preview in debug logs

```csharp
// Implemented in SocialCareModuleProvisioningService
protected override async Task<int> ApplyMigrationsAsync(
    string schemaName,
    CancellationToken cancellationToken)
{
    // 1. Resolve DbContext
    // 2. Generate migration script
    // 3. Validate script (if validator available)
    // 4. Log warnings for destructive ops
    // 5. Execute if valid
    // 6. Log success
}
```

## Adding Validation to Your Module

To add validation to your module provisioning service:

### 1. Update Constructor

```csharp
public class YourModuleProvisioningService(
    IConfiguration configuration,
    ILogger<YourModuleProvisioningService> logger,
    ICapPublisher eventBus,
    IMigrationScriptProvider migrationProvider,
    IServiceProvider serviceProvider,
    IMigrationValidator? migrationValidator = null  // ADD THIS
) : BaseModuleProvisioningService(configuration, logger, eventBus, migrationProvider)
```

### 2. Add Validation in ApplyMigrationsAsync

```csharp
protected override async Task<int> ApplyMigrationsAsync(
    string schemaName,
    CancellationToken cancellationToken)
{
    // ... get dbContext and generate script ...

    // Validate migration script if validator is available
    if (migrationValidator != null)
    {
        var validationResult = await migrationValidator.ValidateMigrationAsync(
            script, dbContext, schemaName);

        if (!validationResult.IsValid)
        {
            var errors = string.Join(", ", validationResult.Errors);
            throw new InvalidOperationException($"Migration validation failed: {errors}");
        }

        if (validationResult.HasDestructiveOperations)
        {
            foreach (var op in validationResult.DestructiveOperations)
            {
                Logger.LogWarning(
                    "Line {LineNumber}: {OperationType} {ObjectName} - {Impact}",
                    op.LineNumber, op.OperationType, op.ObjectName, op.Impact);
            }
        }
    }

    // ... execute migration ...
}
```

### 3. Ensure DI Registration

Validation is automatically registered via `AddProvisioningInfrastructure()` in your module registration.

## Testing Migration Validation

### Unit Test Example

```csharp
[Fact]
public async Task ApplyMigrations_WithDestructiveOp_LogsWarning()
{
    // Arrange
    var mockValidator = new Mock<IMigrationValidator>();
    mockValidator
        .Setup(v => v.ValidateMigrationAsync(It.IsAny<string>(), It.IsAny<DbContext>(), It.IsAny<string>()))
        .ReturnsAsync(new MigrationValidationResult
        {
            Errors = new List<string>(),
            Warnings = new List<string> { "DROP COLUMN detected" },
            DestructiveOperations = new List<DestructiveOperation>
            {
                new()
                {
                    OperationType = "DROP COLUMN",
                    ObjectName = "Persons.OldField",
                    Impact = "Data loss",
                    LineNumber = 42
                }
            }
        });

    var service = new YourModuleProvisioningService(
        configuration, logger, eventBus, migrationProvider,
        serviceProvider, mockValidator.Object);

    // Act
    await service.ApplyMigrationsAsync("tenant_001", CancellationToken.None);

    // Assert
    // Verify warning was logged
    logger.Received().LogWarning(Arg.Is<string>(s => s.Contains("destructive")));
}
```

## Best Practices

### ✅ DO

1. **Test migrations locally first**

   ```bash
   dotnet ef database update
   ```

2. **Review generated SQL**

   ```bash
   dotnet ef migrations script --idempotent --output review.sql
   cat review.sql
   ```

3. **Use descriptive migration names**

   ```bash
   dotnet ef migrations add AddPersonMiddleNameForInternationalization
   ```

4. **Document breaking changes in migration**

   ```csharp
   /// <summary>
   /// BREAKING: Renames Person.Name to FirstName/LastName.
   /// Requires data migration script for existing records.
   /// </summary>
   public partial class SplitPersonName : Migration { }
   ```

5. **Check validation output**
   - Review warnings about destructive operations
   - Ensure no sensitive data in scripts
   - Verify schema references are correct

### ❌ DON'T

1. **Don't use TRUNCATE in migrations**

   ```sql
   -- NEVER DO THIS
   TRUNCATE TABLE "Persons";
   ```

2. **Don't commit sensitive data**

   ```sql
   -- NEVER
   INSERT INTO "Users" VALUES ('admin', 'password123');
   ```

3. **Don't skip validation in production**
   - Always let validation run
   - Review warnings before proceeding

4. **Don't deploy without testing**
   - Test locally first
   - Review dry-run output
   - Check for destructive operations

## Troubleshooting

### Issue: Validation fails with "schema not found"

**Solution:** Ensure schema creation happens before validation

```csharp
await CreateSchemaAsync(schemaName, cancellationToken);
```

### Issue: "public" schema appears instead of tenant schema

**Solution:** Check `ReplaceSchemaReferences` is working

```csharp
if (script.Contains("\"public\"."))
{
    throw new Exception("Schema replacement failed");
}
```

### Issue: Validator not injected

**Solution:** Ensure `AddProvisioningInfrastructure()` is called in module registration

```csharp
services.AddProvisioningInfrastructure(); // Registers validator
```

## Resources

- 📖 [Full Migration Strategy Guide](../../Processity.SharedKernel/src/Provisioning/MIGRATION_STRATEGY.md)
- 📋 [Quick Reference](../../Processity.SharedKernel/src/Provisioning/QUICK_REFERENCE.md)
- 🔧 [Implementation Summary](../../Processity.SharedKernel/src/Provisioning/IMPLEMENTATION_SUMMARY.md)
- 💬 Slack: #platform-engineering

## Example Modules

### Fully Implemented

- ✅ **SocialCare** - Full validation, dry-run support
- ✅ **CoreData** - Foundation module, priority 0
- ✅ **StaffManagement** - Standard implementation
- ✅ **CareManagement** - Multi-dependency example

### To Be Updated

- ⏳ **Communications** - Add validation
- ⏳ **CourseManagement** - Add validation
- ⏳ **Education** - Add validation
- ⏳ **EventManagement** - Add validation
- ⏳ **ProductData** - Add validation
- ⏳ **Sales** - Add validation
- ⏳ **RelationshipModule** - Add validation
- ⏳ **Activities** - Add validation

---

**Need Help?**

Contact the platform team or refer to the comprehensive guides in SharedKernel/Provisioning.
