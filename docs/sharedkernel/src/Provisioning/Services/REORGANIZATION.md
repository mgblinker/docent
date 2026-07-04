---
type: architecture
---

# Provisioning Services Reorganization

## Overview

The `Provisioning.Services` namespace has been reorganized by feature/responsibility to improve code organization, discoverability, and reduce redundancies.

## New Structure

```
Services/
├── Infrastructure/                          # Infrastructure & utilities
│   ├── Helpers/
│   │   ├── ConnectionStringResolver.cs     # [NEW] Shared connection string resolution
│   │   ├── PostgresDatabaseHelper.cs       # [NEW] Shared PostgreSQL operations
│   │   └── DbContextFactory.cs             # [NEW] Shared DbContext creation
│   ├── PostgresMigrationScriptProvider.cs
│   ├── PostgresMigrationValidator.cs
│   ├── PostgresSchemaBackupService.cs
│   └── ServiceRegistrationOptions.cs
│
├── Migrations/                              # Migration status & querying
│   ├── BaseMigrationStatusProvider.cs
│   ├── GenericMigrationStatusProvider.cs
│   └── MigrationHistoryQuery.cs
│
├── Provisioning/                            # Module provisioning orchestration
│   ├── BaseModuleProvisioningService.cs
│   ├── GenericModuleProvisioningService.cs
│   └── ServiceRegistrationHostedService.cs
│
├── SchemaUpdates/                           # Schema migration & updates
│   ├── BaseSchemaUpdateService.cs
│   └── GenericSchemaUpdateService.cs
│
├── Startup/                                 # Startup-time operations
│   └── GenericStartupMigrationService.cs
│
└── Discovery/                               # Module discovery
    └── ModuleDiscoveryClient.cs
```

## Key Improvements

### 1. **Extracted Shared Utilities** (Reduced ~100 lines of duplication)

#### `ConnectionStringResolver` (Infrastructure/Helpers/)

- **Consolidates:** 3x `GetConnectionString()` / `ResolveConnectionString()` implementations
- **Used by:** GenericModuleProvisioningService, GenericSchemaUpdateService, GenericMigrationStatusProvider
- **Benefits:** Single source of truth, consistent error handling, easier testing

#### `PostgresDatabaseHelper` (Infrastructure/Helpers/)

- **Consolidates:** 2x `EnsureDatabaseExistsAsync()` implementations
- **Used by:** GenericMigrationStatusProvider, GenericStartupMigrationService
- **Benefits:** Consistent database creation logic, single logging

#### `DbContextFactory` (Infrastructure/Helpers/)

- **Consolidates:** DbContext resolution pattern used across all Generic\* classes
- **Used by:** All Generic\* services for DI resolution
- **Benefits:** Handles schema awareness automatically, consistent scope management

### 2. **Feature-Based Organization**

Services are now grouped by their primary responsibility:

- **Migrations/**: Query and report migration status
- **Provisioning/**: Orchestrate module setup and registration
- **SchemaUpdates/**: Apply pending migrations with safety checks
- **Startup/**: Automatic migration checks at app startup
- **Discovery/**: Module metadata discovery
- **Infrastructure/**: Database, script generation, validation

### 3. **Visibility Improvements**

- **GenericModuleProvisioningService** → `internal` (DI-registered only)
- **GenericSchemaUpdateService** → remains `public` (may be used as base for custom implementations)
- **GenericMigrationStatusProvider** → remains `public` (consumed by modules in DI)

## Migration Guide for Dependent Code

### Update using statements:

**Before:**

```csharp
using Processity.SharedKernel.Provisioning.Services;

var provider = new GenericMigrationStatusProvider<MyModule, IMyDbContext>(...);
var service = new GenericModuleProvisioningService<MyModule, IMyDbContext>(...);
```

**After:**

```csharp
using Processity.SharedKernel.Provisioning.Services.Migrations;
using Processity.SharedKernel.Provisioning.Services.Provisioning;
using Processity.SharedKernel.Provisioning.Services.SchemaUpdates;

// These are still typically resolved via DI, not instantiated directly
var provider = sp.GetRequiredService<GenericMigrationStatusProvider<MyModule, IMyDbContext>>();
var service = sp.GetRequiredService<GenericSchemaUpdateService<MyModule, IMyDbContext>>();
```

### Update DI Registrations:

If you're manually registering (uncommon), update namespaces accordingly:

```csharp
services.AddScoped(
    typeof(GenericMigrationStatusProvider<,>),
    typeof(GenericMigrationStatusProvider<,>)
);
```

The factory methods and extension methods in DependencyInjection/ handle this automatically.

## Benefits Summary

| Aspect              | Benefit                                                            |
| ------------------- | ------------------------------------------------------------------ |
| **Discoverability** | Related services grouped together by feature                       |
| **Maintainability** | Duplicated code extracted into reusable helpers                    |
| **Testability**     | Helpers like `ConnectionStringResolver` can be tested in isolation |
| **Code Reuse**      | New services can leverage existing helpers                         |
| **Scaling**         | Adding new providers/services fits naturally into the structure    |
| **Documentation**   | Folder names immediately clarify purpose                           |

## Backward Compatibility

⚠️ **Breaking Change**: Using statements must be updated to point to the new namespaces.

All functionality remains identical. This is purely a reorganization. If you're using DI (recommended), most changes are handled automatically by the service registration layer.

## Future Considerations

- Consider extracting test-specific utilities (connection mocking, schema isolation)
- Consider creating abstraction interfaces for `ConnectionStringResolver`, `PostgresDatabaseHelper` if other database systems need to be supported
- Monitor the size of the Provisioning folder—if it continues to grow, consider further decomposition
