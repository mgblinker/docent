---
type: feature
---

# Licensing System

Provides license validation and feature availability checks across the Processity platform.

## Overview

The licensing system consists of:

1. **Licensing Service** - Microservice managing licenses, features, and user assignments
2. **SharedKernel.Licensing** - Runtime validation, caching, and authorization integration

## Architecture

### Data Flow

1. **License Management** (Licensing Service)
   - Admins create/manage tenant licenses
   - Admins assign licenses to users
   - Service publishes events via EventBus

2. **Cache Population** (SharedKernel)
   - Event handlers listen for license changes
   - Cache is invalidated on changes
   - Fresh data fetched on next access

3. **Runtime Validation** (SharedKernel)
   - Authorization attributes check cache
   - Cache miss triggers service call
   - Results cached for performance

### Components

#### Licensing Service

- `TenantLicense` - License records with tiers
- `UserLicenseAssignment` - User-to-license mappings
- `TenantLicenseFeature` - Feature enablement

#### SharedKernel.Licensing

- `ILicenseValidator` - Main validation interface
- `ILicenseCache` - Distributed cache
- `ILicenseClient` - HTTP client to Licensing Service
- `LicenseFeatureAuthorizationHandler` - ASP.NET Core authorization
- `RequiresLicenseFeatureAttribute` - Controller/action attribute for single feature
- `RequiresAnyLicenseFeatureAttribute` - Controller/action attribute requiring any of multiple features
- `RequiresLicenseTierAttribute` - Tier-based authorization

## Usage

### Setup in Service

```csharp
// In Program.cs or Startup.cs
services.AddLicensing(configuration);

services.AddLicensingPolicies(options =>
{
    options.Features = new List<string>
    {
        "StaffManagement.AdvancedScheduling",
        "StaffManagement.TimeTracking",
        "StaffManagement.Analytics"
    };
});
```

### Configuration

```json
{
  "LicensingService": {
    "BaseUrl": "https://localhost:7010"
  }
}
```

### Using Attributes

```csharp
[ApiController]
[Route("api/[controller]")]
public class AdvancedSchedulingController : ControllerBase
{
    [HttpGet]
    [RequiresLicenseFeature("StaffManagement.AdvancedScheduling")]
    public async Task<IActionResult> GetSchedule()
    {
        // Only accessible if tenant has this feature enabled
        return Ok();
    }

    [HttpGet("reporting")]
    [RequiresAnyLicenseFeature("StaffManagement.AdvancedReporting", "StaffManagement.BasicReporting")]
    public async Task<IActionResult> GenerateReport()
    {
        // Accessible if tenant has either AdvancedReporting OR BasicReporting
        return Ok();
    }

    [HttpPost]
    [RequiresLicenseTier(LicenseTier.Enterprise)]
    public async Task<IActionResult> CreateAdvancedSchedule()
    {
        // Only accessible for Enterprise tier
        return Ok();
    }
}
```

### Programmatic Checks

```csharp
public class MyService
{
    private readonly ILicenseValidator _licenseValidator;

    public MyService(ILicenseValidator licenseValidator)
    {
        _licenseValidator = licenseValidator;
    }

    public async Task<bool> CanUseFeature(TenantId tenantId, string feature)
    {
        var result = await _licenseValidator.IsFeatureEnabledAsync(tenantId, feature);
        return result.IsSuccess && result.Data;
    }
}
```

## Events

The system subscribes to these events for cache invalidation:

- `TenantLicenseCreatedEvent` - New license created
- `TenantLicenseUpdatedEvent` - License modified
- `LicenseAssignedToUserEvent` - User assigned license
- `LicenseRevokedFromUserEvent` - User license revoked

## Performance

- **Cache TTL**: 30 minutes
- **Cache Strategy**: Lazy loading with invalidation on changes
- **Fallback**: Service call on cache miss
- **Resilience**: HTTP client with retry policies

## Feature Registration

Each module should register its licensed features:

```csharp
public static class StaffManagementLicenseFeatures
{
    public const string AdvancedScheduling = "StaffManagement.AdvancedScheduling";
    public const string TimeTracking = "StaffManagement.TimeTracking";
    public const string Analytics = "StaffManagement.Analytics";
}
```
