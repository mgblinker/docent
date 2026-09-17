---
type: feature
---

# Processity Licensing Service

A microservice for managing tenant licenses and user license assignments in the Processity platform.

## Features

- **Tenant License Management**: Create and manage licenses for tenants with different tiers (Basic, Professional, Enterprise)
- **User License Assignments**: Assign and revoke licenses to/from users
- **Feature-based Licensing**: Enable specific features per license tier
- **Event-Driven Architecture**: Publishes events for license changes via RabbitMQ
- **Multi-Tenancy Support**: Built-in multi-tenancy support using Finbuckle.MultiTenant
- **CQRS Pattern**: Follows Command Query Responsibility Segregation pattern

## Architecture

The service follows a clean architecture with:

- **Domain Layer**: Entities, Value Objects, and Domain Logic
- **Application Layer**: CQRS Commands/Queries and Handlers
- **Infrastructure Layer**: Database Context, Repositories, and External Services
- **API Layer**: REST API Controllers

## Technologies

- .NET 10.0
- Entity Framework Core
- PostgreSQL
- RabbitMQ (via CAP)
- Processity.SharedKernel
- Processity.EventBus

## Getting Started

### Prerequisites

- .NET 10.0 SDK
- PostgreSQL 17
- RabbitMQ
- Docker (optional)

### Running Locally

1. Update connection strings in `appsettings.Development.json`
2. Run migrations:
   ```bash
   dotnet ef database update --project Service/src/Licensing.Service --startup-project Host
   ```
3. Run the application:
   ```bash
   dotnet run --project Host
   ```

### Running with Docker

```bash
cd Host/.docker/Dev
docker-compose up
```

## API Endpoints

### Tenant Licenses

- `POST /api/v1/TenantLicenses` - Create a new tenant license
- `GET /api/v1/TenantLicenses/tenant/{tenantId}` - Get all licenses for a tenant

### User License Assignments

- `POST /api/v1/UserLicenseAssignments` - Assign a license to a user
- `DELETE /api/v1/UserLicenseAssignments/{assignmentId}` - Revoke a license from a user
- `GET /api/v1/UserLicenseAssignments/user/{userId}` - Get all license assignments for a user

## Events Published

- `TenantLicenseCreatedEvent` - When a new tenant license is created
- `TenantLicenseUpdatedEvent` - When a tenant license is updated
- `LicenseAssignedToUserEvent` - When a license is assigned to a user
- `LicenseRevokedFromUserEvent` - When a license is revoked from a user

## Related components

- [FileService Architecture](../fileservice/architecture.md#licensing) — `"drive"` is a single flat feature gating the standalone Drive apps
- [Drive Frontend Architecture](../drive/architecture.md#licensing-gap-known-tracked)

## License

Proprietary - Processity Platform
