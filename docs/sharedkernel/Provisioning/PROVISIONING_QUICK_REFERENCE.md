---
type: howto
---

# Provisioning Quick Reference

Fast lookup guide for common provisioning tasks.

## Key Enums & Values

### ProvisioningType
```csharp
Initial          // Tenant creation flow
LicenseChange    // License purchased for additional modules
SchemaUpdate     // Admin-triggered or automatic post-deployment update
NewService       // New microservice joining the system
```

### SchemaUpdateStatus
```csharp
UpToDate = 0           // All migrations current
UpdateRequired = 1     // Pending migrations detected
UpdateInProgress = 2   // Update workflow running
UpdateFailed = 3       // Last update failed
```

### UpdateRequiredReason (Flags)
```csharp
None = 0
PendingMigrations = 1          // New migrations available
NewLicensedModules = 2         // Tenant acquired new license
NewServiceRegistered = 4       // New service registered
```

## Events

### Initial Provisioning Flow
1. **TenantProvisioningInitiatedEvent** — Published by TenantProvisioning service
   - Triggers all modules' handlers
   - Each module creates schema → applies migrations → seeds data

2. **ModuleProvisioningCompletedEvent** — Published by each module handler
   - Reports success/failure
   - TenantProvisioning aggregates results

### Schema Update Flow
1. **TenantSchemaUpdateRequiredEvent** — Published when updates detected
   - Sets `Tenant.SchemaUpdateStatus = UpdateRequired`

2. **TenantSchemaUpdateInitiatedEvent** — Published when admin triggers update
   - Triggers all modules' schema update handlers
   - Each module validates, backups, applies migrations

3. **ModuleSchemaUpdateCompletedEvent** — Published by each schema update handler
   - Reports migration count, backup location
   - TenantProvisioning updates `TenantSchemaStatus`

## CAP Subscription Groups

**Format**: `processity.{domain}.{module}-{operation}`

Examples:
- `processity.core-apps.core-data-provisioning`
- `processity.core-apps.social-care-schema-update`
- `processity.automation.workflow-provisioning`

**Rule**: Each module gets a **unique group** to ensure it receives its own event copy.

## Common Code Patterns

### Register Module Provisioning (DI)
```csharp
public static IServiceCollection Add[Module]Provisioning(this IServiceCollection services)
{
    // Initial provisioning
    services.AddScoped<[Module]ModuleProvisioningService>();
    services.AddScoped<IModuleProvisioningService>(sp =>
        sp.GetRequiredService<[Module]ModuleProvisioningService>()
    );
    services.AddScoped<[Module]ProvisioningEventHandler>();

    // Schema updates
    services.AddScoped<[Module]SchemaUpdateService>();
    services.AddScoped<ISchemaUpdateService>(sp =>
        sp.GetRequiredService<[Module]SchemaUpdateService>()
    );
    services.AddScoped<[Module]SchemaUpdateEventHandler>();
    services.AddScoped<[Module]MigrationStatusProvider>();
    services.AddScoped<IMigrationStatusProvider>(sp =>
        sp.GetRequiredService<[Module]MigrationStatusProvider>()
    );

    return services;
}
```

### Create DbContext for Schema
Used by both initial provisioning and schema updates:

```csharp
protected override DbContext CreateDbContext(string schemaName)
{
    var scope = serviceProvider.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<I[Module]DbContext>();
    var context = (BaseDbContext)dbContext;
    context.SetTenantSchema(schemaName);
    return (DbContext)context;
}
```

### Check Migration Status
```csharp
var provider = serviceProvider.GetRequiredService<IMigrationStatusProvider>();
var status = await provider.GetMigrationStatusAsync(schemaName);

if (status.HasPendingMigrations)
{
    Console.WriteLine($"Pending: {string.Join(", ", status.PendingMigrations)}");
}
```

### Apply Migrations with Safety Check
```csharp
var service = serviceProvider.GetRequiredService<ISchemaUpdateService>();

// Step 1: Validate safety
var safety = await service.ValidateMigrationsAsync(schemaName);
if (!safety.IsSafe)
{
    Console.WriteLine("Destructive operations detected:");
    foreach (var op in safety.DestructiveOperations)
    {
        Console.WriteLine($"  {op.OperationType}: {op.TableName}.{op.ColumnName}");
    }
    // User must acknowledge before proceeding
}

// Step 2: Apply (if safe or user approved)
var result = await service.ApplyPendingMigrationsAsync(new SchemaUpdateRequest
{
    SchemaName = schemaName,
    AllowDestructive = userApproved,
    CreateBackup = true  // Always backup on production
});

if (result.IsSuccess)
{
    Console.WriteLine($"Applied {result.Value.MigrationsApplied} migrations");
    Console.WriteLine($"Backup: {result.Value.BackupLocation}");
}
```

### Publish Schema Update Required Event
```csharp
var tenantSchemaStatus = new TenantSchemaStatus
{
    TenantId = tenantId,
    SchemaName = schemaName,
    ModuleName = moduleName,
    SchemaUpdateStatus = SchemaUpdateStatus.UpdateRequired,
    UpdateRequiredReason = UpdateRequiredReason.PendingMigrations,
    LastCheckedAt = DateTime.UtcNow
};

// Save to DB
var tenantSchemaStatusEvent = new TenantSchemaUpdateRequiredEvent
{
    TenantId = tenantId,
    SchemaName = schemaName,
    ModuleName = moduleName,
    UpdateReason = UpdateRequiredReason.PendingMigrations
};

await capPublisher.PublishAsync("tenant.schema.update-required", tenantSchemaStatusEvent);
```

## Testing Utilities

### Create Test Tenant
```csharp
var tenant = new Tenant
{
    Id = TenantId.New(),
    Identifier = "test-tenant-001",
    Name = "Test Tenant",
    SchemaName = "test_schema_001",
    SchemaUpdateStatus = SchemaUpdateStatus.UpToDate
};

dbContext.Tenants.Add(tenant);
await dbContext.SaveChangesAsync();
```

### Mock Migration Status
```csharp
var mockProvider = new Mock<IMigrationStatusProvider>();
mockProvider.Setup(x => x.ModuleName).Returns("TestModule");
mockProvider.Setup(x => x.GetMigrationStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
    .ReturnsAsync(new MigrationStatusReport
    {
        ModuleName = "TestModule",
        SchemaName = "test_schema",
        AppliedMigrations = new() { "20240101000000_Initial" },
        PendingMigrations = new() { "20240102000000_AddUsers" },
        LatestApplied = "20240101000000_Initial",
        LatestAvailable = "20240102000000_AddUsers",
        Success = true
    });
```

### Mock Schema Update Service
```csharp
var mockService = new Mock<ISchemaUpdateService>();
mockService.Setup(x => x.ModuleName).Returns("TestModule");
mockService.Setup(x => x.ValidateMigrationsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
    .ReturnsAsync(new MigrationSafetyReport
    {
        ModuleName = "TestModule",
        SchemaName = "test_schema",
        IsSafe = true,
        Operations = new(),
        DestructiveOperations = new(),
        Warnings = new()
    });
mockService.Setup(x => x.ApplyPendingMigrationsAsync(It.IsAny<SchemaUpdateRequest>(), It.IsAny<CancellationToken>()))
    .ReturnsAsync(Result<SchemaUpdateResult>.Ok(new SchemaUpdateResult
    {
        ModuleName = "TestModule",
        SchemaName = "test_schema",
        MigrationsApplied = 1,
        BackupLocation = "/tmp/backup.sql"
    }));
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tenant-provisioning/v1.0/tenants/{tenantId}/schema-status` | GET | Get module status for tenant |
| `/api/tenant-provisioning/v1.0/tenants/{tenantId}/schema-update` | POST | Trigger schema update |
| `/api/tenant-provisioning/v1.0/tenants/update-required` | GET | List all tenants needing updates |
| `/api/tenant-provisioning/v1.0/check-all-tenants` | POST | Force status check on all tenants |
| `/api/tenant-provisioning/v1.0/services/register` | POST | Register microservice |
| `/api/tenant-provisioning/v1.0/services` | GET | List registered services |
| `/api/provisioning/modules/{moduleName}/migration-status` | GET | Module-level migration status |

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Handler not triggered | Module not registered in DI | Add `Add[Module]Provisioning()` to service collection |
| CAP subscription group mismatch | Group name conflicts with another module | Use unique group: `processity.{domain}.{module}-{operation}` |
| DbContext creation fails | Scope doesn't have required DbContext | Ensure DI configured with `services.AddScoped<I[Module]DbContext>()` |
| Migration validation hangs | `CreateDbContext()` doesn't manage scope lifecycle | Store scope and dispose in base class implementation |
| Destructive operation blocked | Migration detected as unsafe | Confirm intentional, use `allowDestructive: true` in request |
| Backup failed | pg_dump not installed or permissions insufficient | Install pg_dump, verify database permissions |

## Migration Best Practices

1. **Always create backups** before applying migrations to production
2. **Test migrations** on a dev tenant schema first
3. **Review SQL** generated by `ValidateMigrationsAsync()` before applying
4. **Acknowledge destructive operations** explicitly — never force through silently
5. **Monitor status** — check `TenantSchemaStatus.LastUpdatedAt` to verify completion
6. **Log events** — CAP publishes completion events for audit trails

## References

- `PROVISIONING_GUIDE.md` — Full conceptual guide
- `SharedKernel/src/Provisioning/` — Implementation files
- `TenantProvisioning.Service/` — Orchestration logic
- `Authentication.Service/` — Tenant status synchronization
