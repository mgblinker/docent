---
type: howto
---

# Licensing System - Complete Implementation Guide

## Overview

The Processity licensing system provides feature-gated access control across all services. It consists of:

1. **Processity.LicensingService** - Microservice managing licenses and assignments
2. **SharedKernel.Licensing** - Runtime validation, caching, and authorization

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin/API Gateway                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────────┐
│ Licensing Service│                  │  Backend Services    │
│  - Manages Data  │◄─────HTTP────────┤  - Validate Access   │
│  - Publishes     │                  │  - Check Features    │
│    Events        │                  └──────────────────────┘
└────────┬─────────┘                            ▲
         │                                      │
         │ RabbitMQ Events                      │ Cache Read
         ▼                                      │
┌──────────────────┐                  ┌──────────────────────┐
│   Event Bus      │─────Notify──────►│  Redis Cache         │
│  - License       │                  │  - Tenant State      │
│    Changed       │                  │  - User State        │
└──────────────────┘                  └──────────────────────┘
```

## Components

### Licensing Service

**Responsibilities:**

- CRUD operations for tenant licenses
- User license assignment management
- Event publishing for license changes
- Providing license state for caching

**Endpoints:**

- `POST /api/v1/TenantLicenses` - Create license
- `GET /api/v1/TenantLicenses/tenant/{tenantId}` - Get tenant licenses
- `GET /api/v1/TenantLicenses/tenant/{tenantId}/state` - Get cached state
- `GET /api/v1/TenantLicenses/tenant/{tenantId}/feature/{featureName}` - Check feature
- `POST /api/v1/UserLicenseAssignments` - Assign license
- `DELETE /api/v1/UserLicenseAssignments/{id}` - Revoke license
- `GET /api/v1/UserLicenseAssignments/user/{userId}` - Get user assignments
- `GET /api/v1/UserLicenseAssignments/user/{userId}/state` - Get user state

### SharedKernel.Licensing

**Components:**

- `ILicenseValidator` - Main validation interface
- `ILicenseCache` - Redis distributed cache
- `ILicenseClient` - HTTP client to Licensing Service
- `LicenseFeatureAuthorizationHandler` - ASP.NET Core authorization handler
- `LicenseTierAuthorizationHandler` - Tier-based authorization handler
- `RequiresLicenseFeatureAttribute` - Declarative feature requirement
- `RequiresLicenseTierAttribute` - Declarative tier requirement

## Integration Steps

### 1. Configure Licensing Service

**appsettings.json:**

```json
{
  "ConnectionStrings": {
    "LicensingDatabase": "Host=localhost;Port=5432;Database=processity_licensing;Username=postgres;Password=postgres;"
  },
  "EventBus": {
    "HostName": "localhost",
    "Port": 5672,
    "UserName": "guest",
    "Password": "guest"
  }
}
```

**Run migrations:**

```bash
cd Processity.LicensingService
dotnet ef migrations add InitialCreate --project Service/src/Licensing.Service --startup-project Host
dotnet ef database update --project Service/src/Licensing.Service --startup-project Host
```

**Start service:**

```bash
dotnet run --project Host
```

### 2. Integrate SharedKernel.Licensing in Services

**Program.cs:**

```csharp
using Processity.SharedKernel.Licensing.DependencyInjection;

// Add licensing support
services.AddLicensing(configuration);

// Register module-specific features
services.AddLicensingPolicies(options =>
{
    options.Features = new List<string>
    {
        StaffManagementFeatures.AdvancedScheduling,
        StaffManagementFeatures.TimeTracking,
        StaffManagementFeatures.Analytics
    };
});
```

**appsettings.json:**

```json
{
  "LicensingService": {
    "BaseUrl": "https://localhost:7010"
  },
  "Redis": {
    "Configuration": "localhost:6379"
  }
}
```

### 3. Define Module Features

**StaffManagementFeatures.cs:**

```csharp
namespace StaffManagement.Service.Features;

public static class StaffManagementFeatures
{
    public const string AdvancedScheduling = "StaffManagement.AdvancedScheduling";
    public const string TimeTracking = "StaffManagement.TimeTracking";
    public const string Analytics = "StaffManagement.Analytics";
    public const string BulkOperations = "StaffManagement.BulkOperations";
}
```

### 4. Use in Controllers

**Attribute-based:**

```csharp
[ApiController]
[Route("api/[controller]")]
public class SchedulingController : ControllerBase
{
    [HttpGet("advanced")]
    [RequiresLicenseFeature(StaffManagementFeatures.AdvancedScheduling)]
    public async Task<IActionResult> GetAdvancedSchedule()
    {
        // Only accessible if tenant has AdvancedScheduling feature
        return Ok(/* ... */);
    }

    [HttpPost("bulk-import")]
    [RequiresLicenseTier(LicenseTier.Enterprise)]
    public async Task<IActionResult> BulkImport()
    {
        // Only accessible for Enterprise tier
        return Ok(/* ... */);
    }
}
```

**Programmatic:**

```csharp
public class SchedulingService
{
    private readonly ILicenseValidator _licenseValidator;
    private readonly ITenantProvider _tenantProvider;

    public SchedulingService(
        ILicenseValidator licenseValidator,
        ITenantProvider tenantProvider)
    {
        _licenseValidator = licenseValidator;
        _tenantProvider = tenantProvider;
    }

    public async Task<Result> CreateAdvancedSchedule()
    {
        var tenantId = _tenantProvider.GetCurrentTenantId();

        var hasFeature = await _licenseValidator.IsFeatureEnabledAsync(
            tenantId,
            StaffManagementFeatures.AdvancedScheduling
        );

        if (!hasFeature.IsSuccess || !hasFeature.Data)
        {
            return Result.Fail("Advanced scheduling requires a Professional or Enterprise license");
        }

        // Continue with advanced scheduling logic
        return Result.Ok();
    }
}
```

## License Management

### Create Tenant License

```http
POST https://localhost:7010/api/v1/TenantLicenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenantId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tier": "Professional",
  "totalSeats": 25,
  "validFrom": "2026-01-01T00:00:00Z",
  "validUntil": "2027-01-01T00:00:00Z",
  "enabledFeatures": [
    "StaffManagement.AdvancedScheduling",
    "StaffManagement.TimeTracking",
    "StaffManagement.Analytics"
  ]
}
```

### Assign License to User

```http
POST https://localhost:7010/api/v1/UserLicenseAssignments
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenantLicenseId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa7"
}
```

### Revoke License

```http
DELETE https://localhost:7010/api/v1/UserLicenseAssignments/{assignmentId}
Authorization: Bearer {token}
```

## Event Flow

### License Created

1. Admin creates license via API
2. Licensing Service stores license
3. `TenantLicenseCreatedEvent` published to RabbitMQ
4. Event handlers in all services receive event
5. Cache invalidated for that tenant

### License Assigned

1. Admin assigns license to user
2. Licensing Service creates assignment
3. `LicenseAssignedToUserEvent` published
4. Event handlers invalidate user and tenant cache
5. Next API call fetches fresh data

## Caching Strategy

**Cache Keys:**

- Tenant: `license:tenant:{tenantId}`
- User: `license:user:{userId}`

**TTL:** 30 minutes

**Invalidation:**

- On license creation/update → Invalidate tenant cache
- On user assignment/revocation → Invalidate user AND tenant cache

**Cache Miss Handling:**

1. Check Redis cache
2. If miss, call Licensing Service
3. Cache result with TTL
4. Return to caller

## Performance Considerations

**Response Times:**

- Cache hit: ~5ms
- Cache miss (cold): ~50-100ms
- Subsequent requests (cached): ~5ms

**Optimization:**

- Distributed cache prevents redundant service calls
- HTTP client uses resilience policies (retry, circuit breaker)
- Event-driven invalidation ensures eventual consistency

## Testing

### Unit Tests

```csharp
[Fact]
public async Task ShouldAllowAccessWhenFeatureEnabled()
{
    // Arrange
    var mockValidator = new Mock<ILicenseValidator>();
    mockValidator
        .Setup(x => x.IsFeatureEnabledAsync(It.IsAny<TenantId>(), "TestFeature", default))
        .ReturnsAsync(Result<bool>.Ok(true));

    // Act & Assert
    // Test controller/service logic
}
```

### Integration Tests

```csharp
[Fact]
public async Task ShouldReturnForbiddenWhenFeatureNotEnabled()
{
    // Arrange
    var client = _factory.CreateClient();

    // Act
    var response = await client.GetAsync("/api/advanced-feature");

    // Assert
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}
```

## Troubleshooting

**Common Issues:**

1. **403 Forbidden unexpectedly**

   - Check if license is active and not expired
   - Verify feature is in tenant's EnabledFeatures list
   - Check cache invalidation events are being received

2. **Slow license checks**

   - Verify Redis is running
   - Check network latency to Licensing Service
   - Review HTTP client resilience policies

3. **Cache not invalidating**
   - Verify RabbitMQ connectivity
   - Check event handler registration
   - Review event subscription names match exactly

## Migration from Existing Authorization

If migrating from a simpler permission-based system:

1. Keep existing permission checks
2. Add licensing as an additional layer
3. Use `RequiresLicenseFeature` AND `RequiresPermission` together
4. Gradually transition feature access to licensing

```csharp
[HttpGet]
[RequiresPermission("StaffManagement.ViewSchedule")]
[RequiresLicenseFeature(StaffManagementFeatures.AdvancedScheduling)]
public async Task<IActionResult> GetSchedule()
{
    // User needs BOTH permission AND license
    return Ok();
}
```

## Monitoring

**Key Metrics:**

- License validation response time
- Cache hit/miss ratio
- License assignment/revocation frequency
- Feature usage by tier

**Recommended Dashboards:**

- License utilization per tenant
- Feature adoption rates
- Cache performance metrics
- Service availability (Licensing Service, Redis)
