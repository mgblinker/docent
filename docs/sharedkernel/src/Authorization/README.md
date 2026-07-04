---
type: feature
---

# SharedKernel Authorization

This directory contains the shared authorization components that can be used across all services and modules in the Processity system.

## Architecture Overview

The authorization system is designed with the following principles:

1. **Separation of Concerns**: Abstractions are separated from implementations
2. **Extensibility**: Easy to extend with custom implementations
3. **Performance Optimization**: Built-in caching and batch operations for role management
4. **Integration Ready**: Designed to work with the authentication service while maintaining performance

## Role Management Features

### Key Components

#### Models

- **`Role`**: Minimal role model optimized for caching and authorization checks
- **`RequiresRoleAttribute`**: Performance-optimized authorization attribute with configurable caching

#### Abstractions

- **`IRoleRepository`**: Repository interface for role data operations
- **`IRoleService`**: Service interface with caching and performance optimizations

#### Implementations

- **`RoleService`**: Performance-optimized service with memory caching
- **`DefaultRoleRepository`**: Default implementation that delegates to authentication service
- **`RequiresRoleAuthorizationHandler`**: Authorization handler for RequiresRole attribute

### Usage Examples

#### Service Registration

```csharp
// In your Program.cs or Startup.cs
services.AddRoleServices();
services.AddRequiresRoleAuthorization();
services.AddUserRoleHttpClientService(configuration, "Authentication:Api");
```

#### Configuration

```json
{
  "Authentication": {
    "Api": {
      "BaseUrl": "https://your-auth-service.com/api/v1.0/userdetails"
    }
  }
}
```

#### Using RequiresRole Attribute

```csharp
[RequiresRole("Administrator")]
public class AdminController : ControllerBase
{
    // Only users with Administrator role can access
}

[RequiresRole("Manager", "Supervisor", RequireAllRoles = false)]
public IActionResult GetReports()
{
    // Users with Manager OR Supervisor role can access
}

[RequiresRole("Administrator", "SuperUser", RequireAllRoles = true, CacheDurationMinutes = 60)]
public IActionResult CriticalAction()
{
    // Users must have BOTH Administrator AND SuperUser roles
    // Role data cached for 60 minutes
}
```

### Performance Features

- **Multi-level caching**: Role data, permissions, and tenant roles are cached separately
- **Configurable cache duration**: Per-attribute and global configuration
- **Batch operations**: Optimized for retrieving multiple roles
- **Memory-efficient**: Uses HashSet for quick permission lookups

1. **Caching**: Built-in support for per-request and distributed caching
2. **Performance**: Optimized for high-throughput scenarios
3. **Reusability**: Components can be reused across multiple services

## Directory Structure

```text
Authorization/
├── Abstractions/           # Core interfaces and contracts
│   ├── IPermissionContext.cs
│   ├── IRolePermissionResolver.cs
│   ├── IPermissionRepository.cs
│   ├── IRoleRepository.cs
│   └── IPermissionRequirement.cs
├── Attributes/             # Authorization attributes
│   └── RequiresPermissionAttribute.cs
├── Configuration/          # Configuration models and examples
│   ├── AuthorizationOptions.cs
│   └── appsettings.example.json
├── Controllers/            # REST API controllers
│   ├── PermissionsController.cs
│   ├── RolesController.cs
│   └── UserRolesController.cs
├── Extensions/             # Extension methods
│   ├── AuthorizationServiceCollectionExtensions.cs
│   └── PermissionContextExtensions.cs
├── Handlers/               # Authorization handlers
│   └── PermissionAuthorizationHandler.cs
├── Implementation/         # Template implementations
│   ├── ServicePermissionContextTemplate.cs
│   └── ServiceRolePermissionResolverTemplate.cs
├── Models/                 # Data models
│   ├── Permission.cs
│   ├── Role.cs
│   ├── RolePermission.cs
│   └── UserRole.cs
├── Providers/              # Policy providers
│   └── PermissionPolicyProvider.cs
├── Repositories/           # Repository templates
│   ├── PermissionRepositoryTemplate.cs
│   └── RoleRepositoryTemplate.cs
├── Requirements/           # Authorization requirements
│   └── PermissionRequirement.cs
├── Services/               # Business logic services
│   └── AuthorizationManagementService.cs
└── README.md              # This file
```

## Key Components

### Abstractions

- **IPermissionContext**: Main interface for permission checking with caching
- **IRolePermissionResolver**: Interface for resolving user permissions from data store
- **IPermissionRequirement**: Legacy interface for backward compatibility

### Core Features

- **Declarative Authorization**: Use `[RequiresPermission("permission.name")]` on controllers/actions
- **Programmatic Checks**: Use `IPermissionContext.HasPermissionAsync()` in services
- **Extension Methods**: Convenient methods like `RequirePermissionAsync()`, `HasAnyPermissionAsync()`
- **Caching**: Automatic per-request and distributed caching
- **Data Persistence**: Store permissions, roles, and relationships in your database
- **REST API**: Management API for configuring permissions and roles
- **Configuration-Driven**: Define permissions and roles via appsettings.json
- **Multi-Module Support**: Support for multiple services/modules with isolated permissions

## Quick Start

1. **Configure in appsettings.json**:

   ```json
   {
     "Authorization": {
       "ModuleName": "YourServiceName",
       "PermissionRegistration": {
         "AutoRegisterFromConfiguration": true,
         "Permissions": [
           {
             "Name": "users.read",
             "Description": "View user information",
             "Category": "Users"
           }
         ]
       },
       "DefaultRoles": {
         "CreateDefaultRoles": true,
         "Roles": [
           {
             "Name": "Administrator",
             "IsSystemRole": true,
             "Permissions": ["users.read", "users.create"]
           }
         ]
       }
     }
   }
   ```

2. **Register services in Startup.cs**:

   ```csharp
   services.AddSharedAuthorizationComponents(configuration);
   services.AddAuthorizationRepositories<YourPermissionRepository, YourRoleRepository>();
   services.AddPermissionContext<YourPermissionContext>();
   services.AddRolePermissionResolver<YourRolePermissionResolver>();

   // Optional: Enable management API
   services.AddAuthorizationManagementApi();
   ```

3. **Initialize system during startup**:

   ```csharp
   await serviceProvider.InitializeAuthorizationSystemAsync();
   ```

4. **Use in controllers**:

   ```csharp
   [RequiresPermission("users.read")]
   public async Task<IActionResult> GetUsers() { ... }
   ```

## Data Models

The authorization system uses the following data models:

- **Permission**: Represents an action that can be performed (e.g., "users.read")
- **Role**: Represents a collection of permissions (e.g., "Administrator")
- **RolePermission**: Links roles to permissions (many-to-many)
- **UserRole**: Links users to roles (many-to-many)

## REST API Endpoints

When `EnableManagementApi` is true, the following endpoints are available:

### Permissions API

- `GET /api/authorization/permissions` - List permissions
- `POST /api/authorization/permissions` - Create permission
- `PUT /api/authorization/permissions/{id}` - Update permission
- `DELETE /api/authorization/permissions/{id}` - Delete permission
- `POST /api/authorization/permissions/bulk-register` - Bulk register permissions

### Roles API

- `GET /api/authorization/roles` - List roles
- `POST /api/authorization/roles` - Create role
- `PUT /api/authorization/roles/{id}` - Update role
- `DELETE /api/authorization/roles/{id}` - Delete role
- `GET /api/authorization/roles/{id}/permissions` - Get role permissions
- `PUT /api/authorization/roles/{id}/permissions` - Set role permissions

### User Roles API

- `GET /api/authorization/users/{userId}/roles` - Get user roles
- `GET /api/authorization/users/{userId}/permissions` - Get user permissions
- `PUT /api/authorization/users/{userId}/roles` - Set user roles
- `POST /api/authorization/users/{userId}/roles/{roleId}` - Assign role to user
- `DELETE /api/authorization/users/{userId}/roles/{roleId}` - Remove role from user

## Implementation Guide

1. **Create Repository Implementations**: Use the provided templates in `Repositories/` folder
2. **Implement IPermissionContext**: Use `ServicePermissionContextTemplate.cs` as a starting point
3. **Implement IRolePermissionResolver**: Use `ServiceRolePermissionResolverTemplate.cs` as a starting point
4. **Configure Database**: Create tables for Permission, Role, RolePermission, and UserRole entities
5. **Set up Configuration**: Copy `appsettings.example.json` and customize for your service

## Performance Considerations

- **Caching**: Uses both per-request and distributed caching for optimal performance
- **Lazy Loading**: Permissions are only loaded when needed
- **Bulk Operations**: Supports bulk permission registration and role assignments
- **Database Optimization**: Query patterns optimized for minimal database hits

## Security Features

- **Permission-based Access**: All API endpoints protected by permissions
- **Audit Trail**: Tracks who granted/revoked permissions and assigned roles
- **Soft Deletes**: Permissions and roles are deactivated rather than deleted
- **Expiring Roles**: User role assignments can have expiration dates
- **Module Isolation**: Permissions can be scoped to specific modules/services
- **Performance**: Optimized for minimal database/cache hits

## Usage in Services

### 1. Register Shared Components

In your service's `Startup.cs` or `Program.cs`:

```csharp
services.AddSharedAuthorizationComponents();
```

### 2. Provide Service-Specific Implementations

Each service needs to provide its own implementations:

```csharp
// Add your custom permission context and resolver
services.AddPermissionContext<YourPermissionContext>();
services.AddRolePermissionResolver<YourRolePermissionResolver>();
```

### 3. Use in Controllers

```csharp
[ApiController]
[Route("api/[controller]")]
public class ExampleController : ControllerBase
{
    [HttpGet]
    [RequiresPermission("resource.read")]
    public IActionResult GetResource()
    {
        return Ok();
    }
}
```

### 4. Use in Services

```csharp
public class ExampleService
{
    private readonly IPermissionContext _permissionContext;

    public ExampleService(IPermissionContext permissionContext)
    {
        _permissionContext = permissionContext;
    }

    public async Task<Result> DoSomethingAsync()
    {
        // Check permission programmatically
        await _permissionContext.RequirePermissionAsync("resource.write");

        // Your business logic here
        return Result.Ok();
    }
}
```

## Implementation Guidelines

### For Service Developers

1. **Implement IPermissionContext**: Create a service-specific implementation that uses your data access layer
2. **Implement IRolePermissionResolver**: Handle the actual permission resolution and caching logic
3. **Register Components**: Use the provided extension methods to register your implementations
4. **Follow Naming Conventions**: Use hierarchical permission names (e.g., `module.resource.action`)

### Example Implementation Template

```csharp
public class ServicePermissionContext : IPermissionContext
{
    private readonly IRolePermissionResolver _resolver;
    private readonly IHttpContextAccessor _httpContextAccessor;

    // Implement all interface methods using the resolver
    // Add per-request caching logic
}

public class ServiceRolePermissionResolver : IRolePermissionResolver
{
    private readonly IYourDataContext _dataContext;
    private readonly IDistributedCache _cache;

    // Implement permission resolution from your data store
    // Add distributed caching logic
}
```

## Benefits of This Architecture

1. **Consistency**: All services use the same authorization patterns
2. **Maintainability**: Shared code reduces duplication and bugs
3. **Performance**: Built-in caching at multiple levels
4. **Flexibility**: Easy to customize for specific service needs
5. **Testing**: Mockable interfaces for unit testing
6. **Evolution**: Easy to add new features across all services

## Migration Guide

If you have existing authorization code, follow these steps:

1. Update namespace imports to use `Processity.SharedKernel.Authorization.*`
2. Replace custom authorization logic with the shared interfaces
3. Move service-specific implementations to use the shared abstractions
4. Update DI registration to use the shared extension methods
5. Test thoroughly to ensure permissions work correctly

## Performance Considerations

- **Per-Request Caching**: Permissions are cached within the same HTTP request
- **Distributed Caching**: User permissions are cached across service instances
- **Lazy Loading**: Permissions are only resolved when first requested
- **Batch Operations**: Extension methods help optimize multiple permission checks

## Security Considerations

- Always validate permissions on the server side
- Use specific permission names rather than broad permissions
- Implement proper cache invalidation when permissions change
- Log authorization decisions for audit purposes
- Consider using time-based cache expiration for sensitive permissions
