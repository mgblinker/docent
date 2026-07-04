---
type: feature
---

# Smart Module Provisioning System

## Overview

The smart module provisioning system allows backend services and modules to self-register their provisioning metadata, eliminating manual configuration entry. Modules expose their DbContext, migration assembly, and connection string information through a standardized interface.

## Architecture

### Components

1. **SharedKernel Provisioning Abstractions**

   - `IProvisionableModule` - Interface that modules implement to expose provisioning metadata
   - `ModuleProvisioningMetadata` - Contains all information needed to provision a module
   - `IMigrationScriptProvider` - Generates and executes migration scripts with schema replacement
   - `IModuleDiscoveryClient` - HTTP client for discovering modules from services

2. **Module Discovery**

   - Backend services expose `/api/provisioning/modules` endpoint
   - Provisioning service calls these endpoints to discover available modules
   - Modules are automatically registered with their metadata

3. **Smart Migration Execution**
   - Generates migration scripts from the latest migration state
   - Replaces "public" schema references with target tenant schema
   - Creates schema if it doesn't exist
   - Executes migrations idempotently

## Implementation Guide

### 1. Make Your Module Provisionable

Create a class implementing `IProvisionableModule` in your module:

```csharp
using Processity.SharedKernel.Provisioning.Abstractions;
using Processity.SharedKernel.Provisioning.DependencyInjection;

namespace MyModule.Provisioning;

public class MyModuleProvisionableModule : IProvisionableModule
{
    public ModuleProvisioningMetadata GetMetadata()
    {
        return new ModuleProvisioningMetadata
        {
            ModuleName = "MyModule",
            DisplayName = "My Module",
            Description = "Description of my module",
            DbContextType = typeof(MyModule.Infrastructure.MyModuleDbContext),
            MigrationAssemblyName = "MyModule.Migrations",
            ConnectionStringConfigKey = "ConnectionStrings:MyModuleDb",
            ConnectionStringSecretName = "my-module-db-connection",
            ConnectionStringSecretPath = "/my-module",
            LicenseIdentifier = "premium", // Optional — kebab-case license identifier
            SeedDataPath = "/seed-data/my-module", // Optional
            IsRequired = false
        };
    }
}
```

### 2. Register the Module in Your Service

In your service's `Program.cs` or DI registration:

```csharp
using Processity.SharedKernel.Provisioning.DependencyInjection;

// Register as provisionable
services.AddProvisionableModule<MyModuleProvisionableModule>();

// Add the discovery controller (if not already present)
services.AddControllers()
    .AddApplicationPart(typeof(ModuleProvisioningController).Assembly);
```

### 3. Configure Backend Services in Provisioning Service

Add your backend services to the provisioning service's `appsettings.json`:

```json
{
  "Services": {
    "CoreBackend": {
      "BaseUrl": "https://api.backend.dev"
    },
    "SocialCare": {
      "BaseUrl": "https://socialcare.backend.dev"
    }
  }
}
```

### 4. Discover and Register Modules

Use the provisioning service API to discover modules:

```bash
# Discover modules from a specific service
POST /api/v1/provisioning/module-discovery/discover?serviceUrl=https://api.backend.dev

# Discover modules from all configured services
POST /api/v1/provisioning/module-discovery/discover-all

# List configured services
GET /api/v1/provisioning/module-discovery/services
```

### 5. Provision a Tenant

Once modules are discovered and registered, provision a tenant as usual. The system will:

1. Create the tenant record
2. Create the tenant schema (e.g., `customer_dev`)
3. Generate migration scripts for each module
4. Replace `public` schema references with the tenant schema
5. Execute migrations against the tenant schema
6. Seed configuration data
7. Create initial users

## Migration Script Generation

The smart migration system:

- Uses EF Core's `IMigrator.GenerateScript()` to create idempotent scripts
- Replaces all schema references:
  - `"public"."TableName"` → `"customer_dev"."TableName"`
  - `public.TableName` → `customer_dev.TableName`
  - `SCHEMA public` → `SCHEMA customer_dev`
  - `SET search_path TO public` → `SET search_path TO customer_dev`

## Benefits

1. **No Manual Configuration**: Modules self-describe their provisioning requirements
2. **Type Safety**: DbContext types are validated at registration time
3. **Automatic Discovery**: New modules are discovered automatically
4. **Schema Isolation**: Each tenant gets its own schema with properly scoped migrations
5. **Idempotent Migrations**: Safe to run multiple times
6. **Centralized Management**: Single provisioning service manages all modules

## Example: Social Care Module

```csharp
// In SocialCare module
public class SocialCareProvisionableModule : IProvisionableModule
{
    public ModuleProvisioningMetadata GetMetadata()
    {
        return new ModuleProvisioningMetadata
        {
            ModuleName = "SocialCare",
            DisplayName = "Social Care",
            Description = "Social care case management",
            DbContextType = typeof(SocialCareDbContext),
            MigrationAssemblyName = "SocialCare.Migrations",
            ConnectionStringConfigKey = "ConnectionStrings:SocialCareDb",
            ConnectionStringSecretName = "social-care-db-connection",
            ConnectionStringSecretPath = "/social-care",
            IsRequired = false
        };
    }
}

// In SocialCare Program.cs
services.AddProvisionableModule<SocialCareProvisionableModule>();
```

## API Endpoints

### Module Discovery

- `GET /api/provisioning/modules` - List all provisionable modules (exposed by backend services)
- `GET /api/provisioning/modules/{moduleName}` - Get specific module metadata

### Provisioning Service

- `POST /api/v1/provisioning/module-discovery/discover?serviceUrl={url}` - Discover modules from service
- `POST /api/v1/provisioning/module-discovery/discover-all` - Discover from all configured services
- `GET /api/v1/provisioning/module-discovery/services` - List configured services

## Migration to Smart Provisioning

To migrate existing modules:

1. Create a `Provisioning` folder in your module
2. Add a class implementing `IProvisionableModule`
3. Register it in DI with `AddProvisionableModule<T>()`
4. Ensure your migrations are in the `public` schema initially
5. The provisioning system will handle schema replacement for tenant-specific deployments

## Troubleshooting

### Module Not Discovered

- Ensure `AddProvisionableModule<T>()` is called in DI
- Verify the controller is registered: `services.AddControllers()`
- Check that the service URL is reachable from the provisioning service

### Migration Fails

- Verify the DbContext type is correct and loadable
- Check that the migration assembly name matches your migrations project
- Ensure the connection string is properly configured

### Schema Not Created

- Check database permissions for `CREATE SCHEMA`
- Verify the connection string has sufficient privileges
- Review logs for specific error messages
