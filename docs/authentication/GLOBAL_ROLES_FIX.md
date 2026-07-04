---
type: feature
---

# Global Roles Integration - Fix Applied

## Issue

The GetUserRoles endpoint (`/api/v1.0/users/roles/names`) was only returning tenant-scoped roles, not global roles, even though the unit tests passed.

## Root Cause

The `TenantUserService.GetUserRoleNames()` method was directly calling the repository (`userRepository.GetUserRolesAsync()`) instead of using the mediator to invoke the `GetUserRolesQueryHandler`, which merges both tenant and global roles.

## Solution Applied

### Changes Made

1. **Updated TenantUserService** ([TenantUserService.cs](Service/src/AuthenticationService/TenantScoped/Users/Application/Services/TenantUserService.cs))
   - Added `IMediator` dependency injection
   - Modified `GetUserRoleNames()` to use mediator pattern
   - Changed from direct repository call to `mediator.Send(new GetUserRolesQuery(userId))`

### Code Changes

**Before:**

```csharp
internal class TenantUserService(
    ICurrentUserProvider currentUserProvider,
    ITenantUserRepository userRepository,
    ITenantRoleRepository roleRepository,
    PermissionCache permissionCache
) : ITenantUserService
{
    public async Task<Result<IList<string>>> GetUserRoleNames(UserId userId)
    {
        // ... validation code ...

        var userRoles = await userRepository.GetUserRolesAsync(userId);
        if (userRoles.IsFailed)
            return Result<IList<string>>.Fail(userRoles.Errors);

        return Result<IList<string>>.Ok(userRoles.Value?.Select(r => r.Name).ToList() ?? []);
    }
}
```

**After:**

```csharp
internal class TenantUserService(
    ICurrentUserProvider currentUserProvider,
    ITenantUserRepository userRepository,
    ITenantRoleRepository roleRepository,
    PermissionCache permissionCache,
    IMediator mediator
) : ITenantUserService
{
    public async Task<Result<IList<string>>> GetUserRoleNames(UserId userId)
    {
        // ... validation code ...

        // Use mediator to get both tenant and global roles
        var query = new GetUserRolesQuery(userId.Value);
        var rolesResult = await mediator.Send(query);

        if (rolesResult.IsFailed)
            return Result<IList<string>>.Fail(rolesResult.Errors);

        return Result<IList<string>>.Ok(rolesResult.Value?.ToList() ?? []);
    }
}
```

## How It Works

1. Controller calls `TenantUserService.GetUserRoleNames()`
2. Service uses mediator to send `GetUserRolesQuery`
3. `GetUserRolesQueryHandler` (TenantScoped):
   - Gets tenant-scoped roles from `ITenantRoleRepository`
   - Calls Global `GetUserRolesQuery` via mediator
   - Merges both role lists
   - Returns distinct roles
4. Global `GetUserRolesQueryHandler`:
   - Queries `AspNetUserRoles` and `AspNetRoles` tables in global schema
   - Returns global roles

## Testing

### Unit Tests

All 27 unit tests pass:

- 8 tests for tenant-scoped handler (merging logic)
- 9 tests for global handler
- 10 tests for global repository

Run tests:

```bash
dotnet test Service/test/AuthenticationService.RoleTests/AuthenticationService.RoleTests.csproj
```

### Integration Testing

Test the endpoint manually:

```http
GET {{authUrl}}{{authPort}}/api/v1.0/users/roles/names
Content-Type: application/json
Cookie: {{authCookie}}
```

**Expected Result:**

- Response should include both tenant-scoped roles (from TenantRoles table)
- AND global roles (from AspNetRoles table in global schema)
- Duplicate roles should be filtered out

## Related Files

- [TenantUserService.cs](Service/src/AuthenticationService/TenantScoped/Users/Application/Services/TenantUserService.cs) - Updated to use mediator
- [GetUserRolesQueryHandler.cs](Service/src/AuthenticationService/TenantScoped/Roles/Application/Handlers/GetUserRolesQueryHandler.cs) - Merges tenant + global roles
- [Global GetUserRolesQueryHandler.cs](Service/src/AuthenticationService/Global/Features/UserManagement/GetUserRoles/GetUserRolesQueryHandler.cs) - Retrieves global roles
- [GlobalUserRepository.cs](Service/src/AuthenticationService/Global/Users/Infrastructure/Repositories/GlobalUserRepository.cs) - Queries AspNetRoles table

## Verification Steps

1. **Build the service:**

   ```bash
   dotnet build Service/src/AuthenticationService/AuthenticationService.csproj
   ```

2. **Run unit tests:**

   ```bash
   dotnet test Service/test/AuthenticationService.RoleTests/AuthenticationService.RoleTests.csproj
   ```

3. **Test with actual data:**
   - Create a user with tenant-scoped roles
   - Assign global roles to the same user in AspNetUserRoles table
   - Call the GetUserRoleNames endpoint
   - Verify both sets of roles are returned

## Notes

- The fix ensures consistency between the handler layer (which was already correct) and the service layer
- The mediator pattern is now used consistently throughout the codebase for role retrieval
- Global roles are automatically merged with tenant roles without any additional client-side logic required
