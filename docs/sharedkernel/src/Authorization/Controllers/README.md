---
type: feature
---

# Authorization Controller Architecture

## Overview

The SharedKernel provides base controller classes that modules can inherit from to create their own permission management endpoints. Each module maintains its own authorization tables and database context.

## Base Controller

`PermissionsControllerBase` - Abstract base class in SharedKernel that provides all CRUD operations for permissions.

## Module Implementation

Each module should:

1. **Inherit from the base controller**
2. **Define module-specific routes**
3. **Inject module-specific services**

### Example: StaffManagement

```csharp
[Route("api/v{version:apiVersion}/admin/staff-management/permissions")]
[ApiVersion("1.0")]
public class StaffManagementPermissionsController(
    IAuthorizationManagementService authorizationService,
    IOptions<AuthorizationSettings> settings
) : PermissionsControllerBase(authorizationService, settings)
{
    // All functionality inherited from base class
}
```

### Configuration Required

```json
{
  "Authorization": {
    "ModuleName": "StaffManagement",
    "ModuleDisplayName": "Staff Management",
    "EnableManagementApi": true
  }
}
```

### Available Endpoints

- `GET /api/v1.0/admin/staff-management/permissions` - Get all StaffManagement permissions
- `POST /api/v1.0/admin/staff-management/permissions` - Create permission
- `PUT /api/v1.0/admin/staff-management/permissions/{id}` - Update permission
- `DELETE /api/v1.0/admin/staff-management/permissions/{id}` - Delete permission
- `POST /api/v1.0/admin/staff-management/permissions/bulk-register` - Bulk register permissions

## Benefits

1. **Isolation** - Each module uses its own database tables
2. **Consistency** - All modules have the same API surface
3. **Flexibility** - Modules can override methods if needed
4. **Type Safety** - Each module gets proper dependency injection
