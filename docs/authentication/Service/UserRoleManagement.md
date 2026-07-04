---
type: feature
---

# User-Role Management in Authentication Service

This document explains the centralized user-role management system implemented in the Authentication service and how modules should integrate with it.

## Architecture Overview

The Authentication service is responsible for:

- Storing user identities
- Managing user-role assignments
- Storing basic role information from all modules
- Providing role lookup APIs for authorization

Individual modules are responsible for:

- Defining their permissions and role-permission mappings
- Registering their roles with the Authentication service during startup
- Using SharedKernel authorization for permission checks

## Key Components

### Authentication Service Components

- **`UserRoleManagementService`**: Core service for managing user-role relationships
- **`RoleSynchronizationService`**: Handles role registration from modules
- **`AuthenticationUserRoleService`**: Integrates with SharedKernel authorization system
- **`RoleManagementController`**: REST API for role management operations
- **`ModuleRegistrationController`**: API for modules to register their roles

### SharedKernel Components

- **`ModuleRoleRegistrationService`**: Client service for modules to register roles
- **`ModuleAuthorizationInitializationExtensions`**: Convenient extension methods for module initialization

## Module Integration Guide

### 1. Register Roles During Startup

Add this to your module's startup/program configuration:

```csharp
// Define your module's roles
var roles = new[]
{
    ModuleAuthorizationInitializationExtensions.CreateRole(
        "StaffManager", 
        "Manages staff members", 
        "staff.read", "staff.write", "staff.delete"
    ),
    ModuleAuthorizationInitializationExtensions.CreateRole(
        "StaffViewer", 
        "Views staff information", 
        "staff.read"
    )
};

// Register roles with Authentication service
await serviceProvider.InitializeModuleAuthorizationAsync(
    "StaffManagement", 
    roles
);
```

### 2. Use Authorization in Controllers

Use the standard SharedKernel authorization pattern:

```csharp
[ApiController]
[Authorize]
[RequiresPermission(StaffManagementPermissions.StaffRead)]
public class EmployeeListController : ControllerBase
{
    // The authorization system will:
    // 1. Get user roles from Authentication service
    // 2. Check if user's roles have the required permission
    // 3. Use module-specific permission repository for validation
}
```

### 3. Permission Management in Modules

Modules should still implement their own permissions controllers for detailed permission management:

```csharp
[Route("api/v{version:apiVersion}/staff-management/permissions")]
public class StaffManagementPermissionsController : PermissionsControllerBase
{
    // Inherits from SharedKernel base controller
    // Uses module-specific services and repositories
}
```

## API Endpoints

### Authentication Service Endpoints

#### Role Management

- **GET** `/api/v1.0/auth/roles` - Get all roles
- **POST** `/api/v1.0/auth/roles` - Create or update a role
- **GET** `/api/v1.0/auth/roles/users/{userId}` - Get user's roles
- **POST** `/api/v1.0/auth/roles/users/{userId}/roles/{roleName}` - Assign role to user
- **DELETE** `/api/v1.0/auth/roles/users/{userId}/roles/{roleName}` - Remove role from user
- **GET** `/api/v1.0/auth/roles/users/{userId}/roles/{roleName}/check` - Check if user has role
- **GET** `/api/v1.0/auth/roles/roles/{roleName}/users` - Get users in role

#### Module Registration

- **POST** `/api/v1.0/auth/modules/register-roles` - Register module roles
- **POST** `/api/v1.0/auth/modules/ensure-system-admin` - Ensure System Admin role exists

## Data Flow

### Role Assignment Flow

1. **Role Registration**: Modules register their roles during startup
2. **User Assignment**: Administrators assign roles to users via Authentication service API
3. **Authorization Check**: When user accesses protected resource:
   - SharedKernel gets user roles from Authentication service
   - Checks if user's roles have required permission
   - Module validates permission through its own repository

### Permission Check Flow

``` text
User Request → [Authorize] → SharedKernel Authorization → 
Authentication Service (get user roles) → 
Module Permission Repository (validate permissions) → 
Allow/Deny Access
```

## System Admin Role

The System Admin role is automatically created/updated with access to all modules. It's ensured during:

- System initialization
- Module startup (if `ensureSystemAdmin` is true)

## Configuration

### Authentication Service

The Authentication service automatically registers all necessary services. No additional configuration needed.

### Modules

Add to your module's service registration:

```csharp
services.AddProcessityAuthorization(configuration, options =>
{
    options.ModuleName = "YourModuleName";
    options.ConnectionString = connectionString;
    // ... other options
});
```

## Database Schema

### Authentication Service Tables

- **`TenantRoles`**: Stores role definitions from all modules
- **`TenantUserRoles`**: Junction table for user-role assignments
- **`TenantUsers`**: User identity information

### Module Tables

Each module maintains its own:

- **Permissions table**: Available permissions for the module
- **Role-Permission mappings**: Which roles have which permissions

## Best Practices

1. **Role Names**: Use descriptive names like "ModuleName_RoleName" (e.g., "StaffManagement_Manager")
2. **Permission Names**: Use hierarchical naming (e.g., "staff.read", "staff.write")
3. **Error Handling**: Role registration failures should not prevent module startup
4. **Caching**: Authorization decisions are cached for performance
5. **Module Independence**: Each module should be able to function with its own authorization tables

## Example Implementation

See the StaffManagement module for a complete implementation example:

- Role registration in `Program.cs`
- Permission controller in `StaffManagementPermissionsController.cs`
- Authorization usage in `EmployeeListController.cs`

## Troubleshooting

### Common Issues

1. **Roles not registered**: Check module startup logs for registration errors
2. **Permission denied**: Verify user has required role and role has required permission
3. **System Admin access**: Ensure System Admin role exists and user is assigned to it

### Debugging

Enable detailed logging for authorization:

```json
{
  "Logging": {
    "LogLevel": {
      "Processity.SharedKernel.Authorization": "Debug",
      "Processity.AuthenticationService": "Debug"
    }
  }
}
```

## Migration Guide

If you have existing role management, follow these steps:

1. Register your roles with Authentication service using the new API
2. Migrate user-role assignments to Authentication service
3. Update your authorization checks to use SharedKernel authorization
4. Keep your permission definitions in your module
5. Test thoroughly before removing old role management code
