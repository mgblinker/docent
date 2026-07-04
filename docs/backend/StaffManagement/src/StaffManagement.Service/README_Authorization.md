---
type: feature
---

# Staff Management Authorization Integration

This document outlines the integration of the SharedKernel authorization feature with the Staff Management module.

## Integration Summary

### 1. Service Registration

The `StaffManagementModuleRegistration` class has been updated to include authorization components:

```csharp
services.AddStaffManagementAuthorization(configuration);
```

This method registers:

- **Shared Authorization Components**: Core handlers, policy providers, management services
- **Permission Context**: Default permission context for authorization checks
- **Role Services**: Role-based authorization with caching
- **RequiresRole Authorization**: Support for the `RequiresRole` attribute
- **HTTP Client Integration**: Connects to the authentication service for user roles
- **Custom Role Repository**: Staff Management specific role repository (placeholder)

### 2. Role-Based Authorization Implementation

#### Controllers Updated

- **`EmployeeListController`**: Requires Manager, Administrator, or HR roles
- **`OnboardEmployeeController`**: Requires Administrator or HR roles (with custom cache duration)

#### Authorization Attributes Used

```csharp
// Class-level authorization - applies to all actions
[RequiresRole(StaffManagementRoles.Manager, StaffManagementRoles.Administrator, StaffManagementRoles.HR)]

// Method-level authorization with custom settings
[RequiresRole(StaffManagementRoles.Administrator, StaffManagementRoles.HR, RequireAllRoles = false, CacheDurationMinutes = 60)]
```

### 3. Permission Constants

Created `StaffManagementPermissions` and `StaffManagementRoles` classes for:

- **Type Safety**: Compile-time checking of permission names
- **Maintainability**: Centralized permission management
- **IntelliSense**: Better developer experience

#### Defined Permissions

- **Staff**: `read`, `create`, `update`, `delete`, `onboard`, `read.own`
- **Availability**: `read`, `manage`, `read.own`
- **Absence**: `read`, `manage`, `read.own`
- **Skills**: `read`, `manage`, `read.own`

#### Defined Roles

- **Administrator**: Full permissions
- **HR**: Staff management permissions
- **Manager**: Limited read permissions
- **Employee**: Own-data-only permissions

### 4. Configuration

#### appsettings.Authorization.json

Provides configuration for:

- Authentication service connection
- Role definitions with permissions
- Caching settings
- Performance options

#### Key Configuration Sections

```json
{
  "Authentication": {
    "Api": {
      "BaseUrl": "https://your-authentication-service.com/api/v1.0/userdetails"
    }
  },
  "Authorization": {
    "DefaultCacheDurationMinutes": 30,
    "EnableRoleCaching": true,
    "EnablePerformanceLogging": false
  }
}
```

### 5. Custom Role Repository

`StaffManagementRoleRepository` serves as:

- **Integration Point**: Bridge between SharedKernel and authentication service
- **Future Extension**: Can be enhanced for local role caching or database storage
- **Service Isolation**: Staff Management specific role logic

## Usage Examples

### Controller Authorization

```csharp
[RequiresRole(StaffManagementRoles.Manager)]
public class MyController : ControllerBase
{
    [RequiresRole(StaffManagementRoles.Administrator, RequireAllRoles = true)]
    public async Task<IActionResult> CriticalAction() { }
}
```

### Handler Authorization (Future)

```csharp
public class MyHandler : IRequestHandler<MyQuery, Result<MyResponse>>
{
    private readonly IRoleService _roleService;

    public async Task<Result<MyResponse>> Handle(MyQuery request, CancellationToken cancellationToken)
    {
        // Check permissions programmatically if needed
        var hasPermission = await _roleService.RoleHasPermissionAsync(roleId, StaffManagementPermissions.StaffRead);
    }
}
```

## Benefits Achieved

1. **Type Safety**: Compile-time checking of roles and permissions
2. **Performance**: Multi-level caching for role data
3. **Flexibility**: Configurable cache duration per endpoint
4. **Maintainability**: Centralized permission management
5. **Integration**: Seamless connection to authentication service
6. **Scalability**: Optimized for high-frequency authorization checks

## Next Steps

1. **Integration Testing**: Test role-based authorization with actual authentication service
2. **Role Synchronization**: Implement real-time role updates from authentication service
3. **Audit Logging**: Add authorization decision logging
4. **Performance Monitoring**: Monitor cache hit rates and authorization performance
5. **Policy Extensions**: Add more granular permission-based policies if needed

## Dependencies

- `Processity.SharedKernel.Authorization` - Core authorization components
- Authentication Service - User role data source
- ASP.NET Core Authorization - Framework integration
- Memory Cache - Performance optimization
