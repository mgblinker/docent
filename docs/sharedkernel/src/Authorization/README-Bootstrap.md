---
type: howto
---

# Authorization Bootstrap Solutions

## The Problem

When setting up authorization for the first time, we have a chicken-and-egg problem:

- Admin endpoints require `system.admin` permission to access
- But the `system.admin` permission needs to be created by those same endpoints

## Solution 1: Bootstrap Endpoint (Recommended)

### How it works

- Added `bootstrap-authorization` endpoint that bypasses permission checks
- Only available when `Authorization:EnableBootstrap=true` in configuration
- Checks if admin permissions already exist to prevent misuse
- Logs warnings for security auditing

### Usage

1. **Initial deployment**: Set `Authorization:EnableBootstrap=true` in appsettings.json
2. **Call bootstrap endpoint**: `POST /api/admin/{module}/bootstrap-authorization`
3. **Disable bootstrap**: Set `Authorization:EnableBootstrap=false` or remove the setting
4. **Future updates**: Use regular `POST /api/admin/{module}/initialize-authorization`

### Configuration

```json
{
  "Authorization": {
    "EnableBootstrap": true  // Only set to true during initial deployment
  }
}
```

### Endpoints

- `POST /api/admin/{module}/bootstrap-authorization` - Initial setup (no auth required)
- `POST /api/admin/{module}/initialize-authorization` - Updates (requires system.admin)
- `GET /api/admin/{module}/authorization-status` - Status check (requires system.admin)

## Solution 2: Environment-Based Override

Alternative approach using environment variables:

```csharp
[HttpPost("initialize-authorization")]
public async Task<IActionResult> InitializeAuthorization()
{
    // Allow bypass during development/initial setup
    var allowBootstrap = Environment.GetEnvironmentVariable("ALLOW_AUTH_BOOTSTRAP") == "true";
    
    if (!allowBootstrap && !User.HasPermission("system.admin"))
    {
        return Forbid();
    }
    
    // ... rest of initialization
}
```

## Solution 3: Database Seeding

Alternative approach using EF Core seeding:

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Seed initial admin permissions during database creation
    modelBuilder.Entity<Permission>().HasData(
        new Permission { Id = Guid.NewGuid(), Name = "system.admin", CreatedAt = DateTime.UtcNow }
    );
}
```

## Security Considerations

1. **Bootstrap endpoints must be disabled in production** after initial setup
2. **Log all bootstrap operations** for security auditing
3. **Verify no existing permissions** before allowing bootstrap
4. **Use strong validation** to prevent misuse

## Recommended Workflow

1. **Development**: Use bootstrap endpoint with configuration flag
2. **Staging**: Test with bootstrap disabled to ensure normal flow works
3. **Production**: Enable bootstrap only for initial deployment, then disable immediately
4. **Updates**: Always use the permission-protected initialize endpoint

## Implementation Notes

- Base controller provides consistent bootstrap functionality across all modules
- Derived controllers can override `HasExistingAdminPermissions()` for module-specific checks
- Configuration-based enabling provides safe defaults (disabled by default)
- Extensive logging helps with security auditing and troubleshooting
