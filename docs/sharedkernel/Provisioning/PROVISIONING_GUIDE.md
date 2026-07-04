---
type: howto
---

# Tenant Provisioning Guide

This guide explains how the Processity tenant provisioning system works, covering both **initial provisioning** (tenant creation) and **schema updates** (applying migrations to existing tenant schemas).

## Overview

Tenant provisioning is an **event-driven, modular workflow** that safely creates and maintains database schemas for multi-tenant deployments. The system is designed to:

- **Create schemas** for new tenants with all required tables and initial data
- **Apply migrations** to existing tenant schemas when services deploy new database changes
- **Validate safety** by detecting destructive operations (DROP TABLE, DROP COLUMN, type changes)
- **Backup schemas** before risky migrations to enable rollback if needed
- **Coordinate across modules** — each module independently handles its own schema while provisioning orchestrates the overall flow

## Architecture

### Key Components

| Component | Purpose |
|-----------|---------|
| **TenantProvisioning Service** | Central orchestrator that publishes provisioning events and tracks status |
| **Module Provisioning Services** | Each backend module/microservice handles schema creation and migration for its data |
| **Schema Update Services** | Apply pending migrations safely to existing schemas with validation and backup |
| **Migration Status Providers** | Report migration status (applied vs. pending) for each module per tenant |
| **CAP Event Bus** | Enables async communication between TenantProvisioning and all modules |

### Provisioning Models

The system uses `ProvisioningRequest` to track work across phases:

```csharp
public class ProvisioningRequest
{
    public Guid TenantId { get; set; }
    public string TenantIdentifier { get; set; }
    public string TenantName { get; set; }
    public string SchemaName { get; set; }
    public ProvisioningType ProvisioningType { get; set; }  // Initial, LicenseChange, SchemaUpdate, NewService
    public ProvisioningStatus Status { get; set; }
    public List<ProvisioningStep> Steps { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

Status values: `Pending` → `InProgress` → `Completed` (or `Failed`)

## Initial Provisioning (Tenant Creation)

### Flow

1. **Admin creates tenant** via UI/API → Authentication Service creates `Tenant` entity
2. **TenantProvisioning receives request** → creates `ProvisioningRequest` (type=`Initial`)
3. **Publishes `TenantProvisioningInitiatedEvent`** on CAP event bus with:
   - Tenant metadata (ID, identifier, schema name, admin email)
   - Licensed modules (license IDs that determine which modules to provision)
4. **Each module's handler subscribes** to the event and:
   - Checks if module is `IsRequired` OR has a matching license ID
   - If yes: creates schema → applies all migrations → seeds initial data
   - Publishes `ModuleProvisioningCompletedEvent` (success or failure)
5. **TenantProvisioning aggregates results** and updates status
6. **Authentication Service updates tenant status** (Provisioned, or Failed)

### Example: Module Handler Pattern

```csharp
public class SocialCareProvisioningEventHandler(
    SocialCareModuleProvisioningService service,
    IAuthenticationContextProvider authContextProvider,
    ICapPublisher eventBus,
    ILogger logger
) : TenantProvisioningInitiatedEventHandler(service, authContextProvider, eventBus, logger)
{
    protected override ModuleProvisioningMetadata ModuleMetadata =>
        new SocialCareProvisionableModule().GetMetadata();

    [CapSubscribe("tenant.provisioning.initiated", Group = "processity.core-apps.social-care-provisioning")]
    protected override async Task HandleCapMessageAsync(
        AuthenticatedEvent<TenantProvisioningInitiatedEvent> @event,
        CancellationToken cancellationToken
    ) => await base.HandleCapMessageAsync(@event, cancellationToken);
}
```

Each module gets its own **unique CAP subscription group** to ensure every module receives its own copy of the event (no message loss).

---

## Schema Updates (Post-Deployment)

### Scenarios Triggering Updates

1. **New migrations deployed** — Service was updated with new EF Core migrations
2. **New license acquired** — Tenant licensed a new module that wasn't provisioned before
3. **New service registered** — New microservice joined the system with schemas for all matching tenants
4. **Manual admin trigger** — Admin initiates update from tenant detail page

### Flow

1. **Update requirement detected** → TenantProvisioning publishes `TenantSchemaUpdateRequiredEvent`
2. **Admin clicks "Run Schema Update"** or automatic trigger occurs
3. **TenantProvisioning creates `ProvisioningRequest`** (type=`SchemaUpdate`)
4. **Publishes `TenantSchemaUpdateInitiatedEvent`** with:
   - Tenant and schema info
   - Optional target modules list (if updating specific modules only)
   - `AllowDestructive` flag (admin must acknowledge destructive operations)
5. **Each module's handler subscribes** and:
   - Only processes if target module is included or if module has pending migrations
   - Uses `ISchemaUpdateService` (NOT `IModuleProvisioningService`) to:
     - **Validate** migrations for destructive operations
     - **Backup** schema via pg_dump (if enabled)
     - **Apply** pending migrations via EF Core
     - **Report** success/failure
   - Publishes `ModuleSchemaUpdateCompletedEvent`
6. **TenantProvisioning aggregates results** and updates `TenantSchemaStatus`
7. **Authentication Service updates tenant's `SchemaUpdateStatus`** → `UpToDate` (or `UpdateFailed`)

### Schema Update Handler Pattern

```csharp
public class SocialCareSchemaUpdateEventHandler(
    SocialCareSchemaUpdateService schemaUpdateService,
    IAuthenticationContextProvider authContextProvider,
    ICapPublisher eventBus,
    ILogger<SocialCareSchemaUpdateEventHandler> logger
) : TenantSchemaUpdateInitiatedEventHandler(schemaUpdateService, authContextProvider, eventBus, logger)
{
    protected override ModuleProvisioningMetadata ModuleMetadata =>
        new SocialCareProvisionableModule().GetMetadata();

    [CapSubscribe("tenant.schema.update-initiated", Group = "processity.core-apps.social-care-schema-update")]
    protected override async Task HandleCapMessageAsync(
        AuthenticatedEvent<TenantSchemaUpdateInitiatedEvent> @event,
        CancellationToken cancellationToken
    ) => await base.HandleCapMessageAsync(@event, cancellationToken);
}
```

**Difference from initial provisioning**: Uses `ISchemaUpdateService` (only migrations) instead of `IModuleProvisioningService` (schema creation + migrations + seed).

---

## Safety Mechanisms

### Destructive Operation Detection

`BaseSchemaUpdateService.ValidateMigrationsAsync()` generates migration SQL and scans for:

- `DROP TABLE` — potential data loss
- `DROP COLUMN` — potential data loss
- `ALTER COLUMN ... TYPE` — type narrowing (may lose data)

If destructive operations found and `AllowDestructive=false`, the update is **blocked** with a safety report.

### Schema Backup

Before applying migrations, a `pg_dump` backup is created:

```
/tmp/schema_backup_{schemaName}_{timestamp}.sql
```

If migration fails, the backup location is recorded for manual recovery.

### Idempotency

EF Core migrations are idempotent (via `MigrationsSqlGenerationOptions.Idempotent`). Even if a migration is applied twice, it succeeds without error.

### Concurrency Control

`TenantSchemaStatus` uses optimistic concurrency (row version) to prevent race conditions:

```csharp
if (status.SchemaUpdateStatus == UpdateInProgress)
{
    return Result.Fail("Update already in progress");
}
```

---

## Status Tracking

### TenantSchemaStatus Entity

Tracks per-tenant, per-module migration state:

```csharp
public class TenantSchemaStatus
{
    public TenantSchemaStatusId Id { get; set; }
    public TenantId TenantId { get; set; }
    public string SchemaName { get; set; }
    public string ModuleName { get; set; }

    // Current state
    public string? CurrentMigrationId { get; set; }
    public string? LatestAvailableMigrationId { get; set; }
    public bool HasPendingMigrations { get; set; }

    // Status & history
    public SchemaUpdateStatus SchemaUpdateStatus { get; set; }  // UpToDate, UpdateRequired, UpdateInProgress, UpdateFailed
    public UpdateRequiredReason UpdateRequiredReason { get; set; }  // Flags: PendingMigrations, NewLicensedModules, NewServiceRegistered
    public DateTime LastCheckedAt { get; set; }
    public DateTime? LastUpdatedAt { get; set; }

    // Concurrency
    public byte[] RowVersion { get; set; }
}
```

### Tenant.SchemaUpdateStatus (in Authentication Service)

Tenant entity includes overall status:

```csharp
public enum SchemaUpdateStatus
{
    UpToDate = 0,           // All modules current
    UpdateRequired = 1,     // One or more modules need updates
    UpdateInProgress = 2,   // Update workflow running
    UpdateFailed = 3        // Last update failed
}
```

---

## API Endpoints (TenantProvisioning Service)

### Status Queries

```
GET /api/tenant-provisioning/v1.0/tenants/{tenantId}/schema-status
```
Returns: `TenantSchemaStatusDto[]` — per-module migration status

```
GET /api/tenant-provisioning/v1.0/tenants/update-required
```
Returns: Tenants needing updates (GlobalAdmin only)

### Triggering Updates

```
POST /api/tenant-provisioning/v1.0/tenants/{tenantId}/schema-update
Body: { targetModules?: string[], allowDestructive?: bool }
```
Initiates schema update (GlobalAdmin or TenantAdmin for their tenant)

```
POST /api/tenant-provisioning/v1.0/check-all-tenants
```
Forces status check across all tenants (GlobalAdmin only)

### Service Registration

```
POST /api/tenant-provisioning/v1.0/services/register
Body: ServiceRegistrationRequest
```
Called by each microservice on startup to announce availability

```
GET /api/tenant-provisioning/v1.0/services
```
Lists registered services with health status

---

## Module Implementation Checklist

Each module (Backend or microservice) needs:

### 1. Provisioning Metadata
```csharp
public class [Module]ProvisionableModule : IProvisionableModule
{
    public ModuleProvisioningMetadata GetMetadata() => new()
    {
        ModuleName = "[Module]",
        DisplayName = "[Display Name]",
        DbContextType = typeof([Module]DbContext),
        MigrationAssemblyName = "[Module].Migrations",
        LicenseIdentifier = "[license-id]",  // null if IsRequired
        IsRequired = [true/false],
        ProvisioningPriority = [0-100],
        Dependencies = new List<string> { /* module names */ },
        ConnectionStringConfigKey = "ConnectionStrings:[Module]Db",
        // ... other fields
    };
}
```

### 2. Module Provisioning Service (for initial provisioning)
```csharp
public class [Module]ModuleProvisioningService : BaseModuleProvisioningService
{
    protected override ModuleProvisioningMetadata ModuleMetadata =>
        new [Module]ProvisionableModule().GetMetadata();

    protected override string ServiceName => "[Module]";

    // Override ApplyMigrationsAsync if using custom migration logic
}
```

### 3. Schema Update Service (for post-deployment updates)
```csharp
public class [Module]SchemaUpdateService(
    IConfiguration configuration,
    ILogger<[Module]SchemaUpdateService> logger,
    IServiceProvider serviceProvider
) : BaseSchemaUpdateService(configuration, logger)
{
    public override string ModuleName => "[Module]";

    protected override DbContext CreateDbContext(string schemaName)
    {
        var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<I[Module]DbContext>();
        ((BaseDbContext)dbContext).SetTenantSchema(schemaName);
        return (DbContext)dbContext;
    }
}
```

### 4. Migration Status Provider
```csharp
public class [Module]MigrationStatusProvider(
    ILogger<[Module]MigrationStatusProvider> logger,
    IServiceProvider serviceProvider
) : BaseMigrationStatusProvider(logger)
{
    public override string ModuleName => "[Module]";

    protected override DbContext CreateDbContext(string schemaName)
    {
        var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<I[Module]DbContext>();
        ((BaseDbContext)dbContext).SetTenantSchema(schemaName);
        return (DbContext)dbContext;
    }
}
```

### 5. Event Handlers
```csharp
public class [Module]ProvisioningEventHandler(
    [Module]ModuleProvisioningService service,
    IAuthenticationContextProvider authContext,
    ICapPublisher eventBus,
    ILogger logger
) : TenantProvisioningInitiatedEventHandler(service, authContext, eventBus, logger)
{
    protected override ModuleProvisioningMetadata ModuleMetadata =>
        new [Module]ProvisionableModule().GetMetadata();

    [CapSubscribe("tenant.provisioning.initiated", Group = "processity.X.[module]-provisioning")]
    protected override async Task HandleCapMessageAsync(
        AuthenticatedEvent<TenantProvisioningInitiatedEvent> @event,
        CancellationToken cancellationToken
    ) => await base.HandleCapMessageAsync(@event, cancellationToken);
}

public class [Module]SchemaUpdateEventHandler(
    [Module]SchemaUpdateService service,
    IAuthenticationContextProvider authContext,
    ICapPublisher eventBus,
    ILogger logger
) : TenantSchemaUpdateInitiatedEventHandler(service, authContext, eventBus, logger)
{
    protected override ModuleProvisioningMetadata ModuleMetadata =>
        new [Module]ProvisionableModule().GetMetadata();

    [CapSubscribe("tenant.schema.update-initiated", Group = "processity.X.[module]-schema-update")]
    protected override async Task HandleCapMessageAsync(
        AuthenticatedEvent<TenantSchemaUpdateInitiatedEvent> @event,
        CancellationToken cancellationToken
    ) => await base.HandleCapMessageAsync(@event, cancellationToken);
}
```

### 6. DI Registration
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

---

## Frontend Integration

### Tenant List View
Shows schema status as a color-coded chip:
- 🟢 **Green** — UpToDate (all migrations applied)
- 🟡 **Amber** — UpdateRequired (pending migrations detected)
- 🔵 **Blue with spinner** — UpdateInProgress (update workflow running)
- 🔴 **Red** — UpdateFailed (last update failed)

### Tenant Detail View
"Schema Status" tab displays:
- Per-module migration status table (ModuleName, Status, Current Migration, Last Checked)
- "Run Schema Update" button (visible if updates required)
- "Refresh" button to check status immediately
- Confirmation dialog before triggering update

### Workflow
1. Admin navigates to tenant detail
2. Sees "Schema Status" tab with per-module migration info
3. If updates needed, clicks "Run Schema Update"
4. Confirmation dialog shows:
   - Modules that need updates
   - Safety warnings if destructive operations detected
   - Option to allow destructive operations
5. On confirm, provisioning workflow begins
6. Status updates in real-time (or via polling refresh)

---

## Troubleshooting

### Status shows UpdateRequired but no migrations available
- **Cause**: Migration status check is stale
- **Fix**: Click "Refresh" button to force status check

### Schema update blocked due to destructive operations
- **Cause**: Migration contains DROP TABLE, DROP COLUMN, or type changes
- **Fix**: Review migration in source, either:
  - Confirm it's intentional and click update with `allowDestructive=true`
  - Revert the migration if it was added by mistake
  - Add a migration that safely migrates the data before dropping

### Schema backup failed
- **Cause**: pg_dump not available or database permissions insufficient
- **Fix**: Ensure pg_dump is installed and database connection string has sufficient privileges
- **Recovery**: Backup location is logged; manually restore from that file if needed

### Update workflow hangs in UpdateInProgress state
- **Cause**: Module handler crashed or lost connection to CAP event bus
- **Fix**:
  - Check service logs for errors
  - Restart the failed service
  - Re-trigger the schema update

---

## Testing

### Unit Tests
Test `BaseSchemaUpdateService` and `BaseMigrationStatusProvider` with mock DbContexts.

### Integration Tests
- Create a test tenant
- Deploy new migration to a module
- Verify `TenantSchemaStatus` reflects pending migration
- Trigger schema update
- Verify migration applied and status updated to UpToDate

### Safety Tests
- Add destructive migration (DROP TABLE)
- Attempt update with `AllowDestructive=false`
- Verify blocked with safety report
- Retry with `AllowDestructive=true`
- Verify pg_dump backup created before migration applied

---

## References

- **Shared Kernel**: `src/Provisioning/` — abstractions, base classes, events
- **TenantProvisioning Service**: `Processity.TenantProvisioning/Service/`
- **Authentication Service**: `Processity.Authentication/Service/` — tenant status propagation
- **Frontend**: `Processity.WebApp.Angular/src/app/settings/components/tenant-management/`
