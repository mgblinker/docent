---
type: feature
---

# Tenant Provisioning Service

## Overview

The Tenant Provisioning Service provides automated tenant onboarding for the Processity platform. It orchestrates the creation of tenant records, database schemas, and initial configuration across all modules.

## Architecture

### Components

1. **Provisioning Orchestrator**: Coordinates the execution of provisioning steps
2. **Provisioning Steps**: Individual step implementations (create tenant, create schema, apply migrations, etc.)
3. **Module Registry**: Database-driven registry of modules to provision
4. **API**: REST API for triggering and monitoring provisioning
5. **Admin UI**: Blazor WebAssembly interface for administration

### Database Structure

- `ModuleRegistrations`: Registry of modules available for provisioning
- `ProvisioningRequests`: Tenant provisioning requests
- `ProvisioningSteps`: Individual steps for each request

## Features

- **Approval Workflow**: Optional manual approval before provisioning
- **Database-driven Module Registry**: Configure modules via database instead of config files
- **Automated Provisioning**: Create schemas, apply migrations, seed data
- **Rollback Support**: Automatic rollback on failure
- **Step Tracking**: Detailed tracking of each provisioning step
- **Blazor Admin UI**: Web-based administration interface

## API Endpoints

### Provisioning Requests

- `POST /api/v1/provisioning/requests` - Create new request
- `GET /api/v1/provisioning/requests` - List all requests
- `GET /api/v1/provisioning/requests/{id}` - Get request details
- `POST /api/v1/provisioning/requests/{id}/approve` - Approve request
- `POST /api/v1/provisioning/requests/{id}/reject` - Reject request
- `POST /api/v1/provisioning/requests/{id}/rollback` - Rollback failed request

### Module Registry

- `GET /api/v1/provisioning/modules` - List all modules
- `GET /api/v1/provisioning/modules/{id}` - Get module details
- `POST /api/v1/provisioning/modules` - Create/update module
- `DELETE /api/v1/provisioning/modules/{id}` - Delete module

## Setup

### Prerequisites

- .NET 9.0 SDK
- PostgreSQL
- Processity.SharedKernel package

### Database Setup

1. Create provisioning database:

```sql
CREATE DATABASE provisioning;
```

2. Run migrations:

```bash
cd Service/migration/TenantProvisioning.Migrations
dotnet ef migrations add Initial
dotnet ef database update
```

### Configuration

Update `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "ProvisioningDb": "Host=localhost;Database=provisioning;Username=postgres;Password=postgres"
  },
  "Services": {
    "AuthenticationService": "http://localhost:5000"
  }
}
```

### Running the Service

```bash
cd Host
dotnet run
```

- API: http://localhost:5010
- Admin UI: http://localhost:5010
- Swagger: http://localhost:5010/swagger

## Module Registry Setup

Before provisioning tenants, register modules in the database:

```csharp
// Example module registration
{
    "ModuleName": "CoreData",
    "DisplayName": "Core Data Module",
    "Description": "Core data and common entities",
    "ConnectionString": "Host=localhost;Database=coredata;...",
    "MigrationAssembly": "CoreData.Migrations",
    "DbContextType": "CoreDataDbContext",
    "RequiresLicense": false,
    "IsTenantScoped": true,
    "ExecutionOrder": 1,
    "IsActive": true
}
```

## Provisioning Flow

1. Create provisioning request via API or Admin UI
2. Request enters `PendingApproval` status
3. Administrator approves/rejects via Admin UI
4. On approval, orchestrator executes steps:
   - Create tenant record in auth service
   - Generate secrets in KeyVault
   - For each module:
     - Create database schema
     - Apply EF Core migrations
     - Seed configuration data
   - Create initial admin user
5. Request marked as `Completed` or `Failed`
6. Failed requests can be rolled back

## Micro Frontend Integration

The Blazor Admin UI is designed as a standalone SPA that can be integrated as a micro frontend into the main Angular application:

1. Build the Blazor app
2. Host static files from `wwwroot`
3. Load via iframe or module federation
4. Communicate via postMessage or shared state

## Future Enhancements

- Email notifications for approvals
- Scheduled provisioning
- Bulk tenant provisioning
- Template-based provisioning
- Integration with licensing service
- Automated testing of provisioned tenants
