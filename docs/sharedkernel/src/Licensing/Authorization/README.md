---
type: feature
---

# Licensing Authorization

## Overview

The Licensing Authorization system provides **feature-based access control** that works alongside the general authorization system to enforce tenant subscription boundaries. While the general authorization system determines **what users are permitted to do** based on their roles and permissions, the licensing authorization system determines **what features are available** based on the tenant's subscription tier.

## Why It's Needed

In a multi-tenant SaaS application, not all tenants have access to all features. The Licensing Authorization system enforces subscription boundaries by:

1. **Preventing access to premium features** for tenants on lower-tier plans
2. **Enforcing feature toggles** based on subscription configuration
3. **Providing a centralized mechanism** for feature gating across all services
4. **Enabling business model flexibility** without code changes

### Business Scenarios

```
Example 1: Feature Gating
- Tenant A (Basic Tier): Can access core features
- Tenant B (Premium Tier): Can access core + advanced reporting
- Tenant C (Enterprise Tier): Can access all features + custom integrations

Example 2: Add-on Features
- Tenant D (Standard Tier): Base features
- Tenant D purchases "SMS Notifications" add-on
- Feature "sms-notifications" is enabled for Tenant D specifically
```

## Licensing Authorization vs. General Authorization

### General Authorization (Permission-Based)

**Location**: `c:\Projects\Processity.SharedKernel\src\Authorization\`

**Purpose**: Controls **user capabilities** within the application

**Key Concepts**:

- **Permissions**: Granular actions users can perform (e.g., `courses:create`, `users:delete`)
- **Roles**: Groups of permissions assigned to users (e.g., `Administrator`, `Instructor`)
- **User-Level Control**: Each user has specific permissions based on their role

**Example Usage**:

```csharp
[RequiresPermission("courses:create")]
public async Task<IActionResult> CreateCourse(CreateCourseRequest request)
{
    // Only users with the "courses:create" permission can access this
}
```

**Authorization Question**: _"Is this **user** allowed to perform this **action**?"_

### Licensing Authorization (Feature-Based)

**Location**: `c:\Projects\Processity.SharedKernel\src\Licensing\Authorization\`

**Purpose**: Controls **feature availability** based on subscription

**Key Concepts**:

- **License Features**: Features enabled/disabled based on subscription (e.g., `advanced-reporting`, `api-access`)
- **License Tiers**: Subscription levels (Basic, Standard, Premium, Enterprise)
- **Tenant-Level Control**: All users in a tenant share the same feature availability

**Example Usage**:

```csharp
[RequiresLicenseFeature("advanced-reporting")]
public async Task<IActionResult> GenerateAdvancedReport(ReportRequest request)
{
    // Only tenants with the "advanced-reporting" feature enabled can access this
}

[RequiresLicenseTier(LicenseTier.Premium)]
public async Task<IActionResult> GetPremiumAnalytics()
{
    // Only tenants on Premium or Enterprise tier can access this
}
```

**Authorization Question**: _"Is this **feature** available for this **tenant's subscription**?"_

## How They Work Together

Both authorization systems work in conjunction to provide comprehensive access control:

```csharp
[RequiresLicenseFeature("advanced-reporting")]    // Tenant must have this feature
[RequiresPermission("reports:advanced")]          // User must have this permission
public async Task<IActionResult> GenerateAdvancedReport(ReportRequest request)
{
    // Both checks must pass:
    // 1. Tenant subscription includes "advanced-reporting" feature
    // 2. User has "reports:advanced" permission
}
```

### Authorization Flow

```
Request to Protected Endpoint
        |
        v
[1] Licensing Check
    - Is feature available for tenant's subscription?
    - Is tenant's license valid and active?
        |
        +---> ❌ No  --> 403 Forbidden (Feature Not Available)
        |
        v Yes
[2] Permission Check
    - Does user have required permission?
    - Does user's role include this permission?
        |
        +---> ❌ No  --> 403 Forbidden (Insufficient Permissions)
        |
        v Yes
[3] Execute Action
```

## Components

### 1. License Feature Authorization

**File**: [LicenseFeatureAuthorizationHandler.cs](LicenseFeatureAuthorizationHandler.cs)

Validates that the tenant's subscription includes a specific feature.

**Requirements**: [LicenseFeatureRequirement.cs](LicenseFeatureRequirement.cs)

```csharp
public class LicenseFeatureRequirement : IAuthorizationRequirement
{
    public string FeatureName { get; }
}
```

### 1a. Any License Feature Authorization

**File**: [AnyLicenseFeatureAuthorizationHandler.cs](AnyLicenseFeatureAuthorizationHandler.cs)

Validates that the tenant's subscription includes any one of multiple specified features.

**Requirements**: [AnyLicenseFeatureRequirement.cs](AnyLicenseFeatureRequirement.cs)

```csharp
public class AnyLicenseFeatureRequirement : IAuthorizationRequirement
{
    public string[] Features { get; }
}
```

### 2. License Tier Authorization

**File**: [LicenseTierAuthorizationHandler.cs](LicenseTierAuthorizationHandler.cs)

Validates that the tenant's subscription meets a minimum tier level.

**Requirements**: [LicenseTierRequirement.cs](LicenseTierRequirement.cs)

```csharp
public class LicenseTierRequirement : IAuthorizationRequirement
{
    public LicenseTier MinimumTier { get; }
}
```

## Implementation Details

### Handler Execution Flow

```csharp
LicenseFeatureAuthorizationHandler.HandleRequirementAsync():
    1. Extract TenantId from user claims
    2. Call ILicenseValidator.ValidateFeatureAccessAsync(tenantId, featureName)
    3. Check cached license state from Redis
    4. If valid and feature enabled → Succeed
    5. If invalid or feature disabled → Fail (403)
```

### Caching Strategy

- License state is cached in Redis with 30-minute TTL
- Cache is invalidated when license events are published:
  - `TenantLicenseCreatedEvent`
  - `TenantLicenseUpdatedEvent`
  - `UserLicenseAssignedEvent`
  - `UserLicenseRevokedEvent`

## Key Differences Summary

| Aspect             | General Authorization                  | Licensing Authorization               |
| ------------------ | -------------------------------------- | ------------------------------------- |
| **Scope**          | User-level                             | Tenant-level                          |
| **Purpose**        | Control user actions                   | Control feature availability          |
| **Based On**       | Roles & Permissions                    | Subscription tier & features          |
| **Storage**        | User-role assignments in database      | License records in Licensing Service  |
| **Changes**        | Admin assigns/revokes user permissions | Subscription changes, billing updates |
| **Granularity**    | Per-user                               | Per-tenant (all users share)          |
| **Example**        | "Can this user delete courses?"        | "Does this tenant have API access?"   |
| **Failure Reason** | Insufficient permissions               | Feature not included in subscription  |

## Usage Examples

### Protecting a Premium Feature

```csharp
[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    // Only Premium and Enterprise tiers can access
    [RequiresLicenseTier(LicenseTier.Premium)]
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        // Premium analytics logic
    }

    // Feature must be explicitly enabled (e.g., add-on purchase)
    [RequiresLicenseFeature("predictive-analytics")]
    [HttpGet("predictions")]
    public async Task<IActionResult> GetPredictions()
    {
        // Predictive analytics logic
    }

    // User needs either AdvancedReporting OR BasicReporting feature
    [RequiresAnyLicenseFeature("advanced-reporting", "basic-reporting")]
    [HttpGet("reports")]
    public async Task<IActionResult> GenerateReports()
    {
        // Accessible if tenant has any of the specified reporting features
    }
}
```

### Combining with Permission Checks

```csharp
[ApiController]
[Route("api/[controller]")]
public class IntegrationsController : ControllerBase
{
    [RequiresLicenseFeature("third-party-integrations")]  // Tenant must have feature
    [RequiresPermission("integrations:manage")]           // User must have permission
    [HttpPost]
    public async Task<IActionResult> CreateIntegration(CreateIntegrationRequest request)
    {
        // Both authorization checks must pass
        // 1. Tenant subscription includes integrations feature
        // 2. User has permission to manage integrations
    }
}
```

### Manual Validation in Code

```csharp
public class ReportService
{
    private readonly ILicenseValidator _licenseValidator;

    public async Task<Report> GenerateReportAsync(Guid tenantId, ReportType type)
    {
        // Check if advanced reports are available
        if (type == ReportType.Advanced)
        {
            var hasFeature = await _licenseValidator
                .ValidateFeatureAccessAsync(tenantId, "advanced-reporting");

            if (!hasFeature)
            {
                throw new LicenseException("Advanced reporting not available in current subscription");
            }
        }

        // Generate report
    }
}
```

## Error Handling

### Licensing Authorization Failures

When a licensing check fails, the system returns:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.3",
  "title": "Forbidden",
  "status": 403,
  "detail": "The feature 'advanced-reporting' is not available in your current subscription plan.",
  "instance": "/api/reports/advanced"
}
```

### Permission Authorization Failures

When a permission check fails, the system returns:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.3",
  "title": "Forbidden",
  "status": 403,
  "detail": "User does not have the required permission: reports:advanced",
  "instance": "/api/reports/advanced"
}
```

## When to Use Which

### Use Licensing Authorization When:

✅ Controlling access to **entire features** or modules  
✅ Different subscription tiers offer different capabilities  
✅ Features can be purchased as add-ons  
✅ All users in a tenant should have the same access to a feature  
✅ Access is determined by **business model/pricing**

### Use General Authorization When:

✅ Controlling **user-specific actions** within a feature  
✅ Different users in the same tenant have different capabilities  
✅ Access is determined by **job role or responsibility**  
✅ Granular action-level control is needed  
✅ Audit trails of who performed what action are important

### Use Both When:

✅ A feature is premium (licensing) AND requires specific permissions (authorization)  
✅ Example: API access might be a premium feature, but within that feature, only certain users can create API keys while others can only view them

## Configuration

Register licensing authorization in consuming services:

```csharp
// In Program.cs or ServiceCollectionExtensions
services.AddLicensing(configuration, options =>
{
    options.RegisterFeature("advanced-reporting");
    options.RegisterFeature("api-access");
    options.RegisterFeature("sso-integration");
    options.RegisterFeature("custom-branding");
});
```

## See Also

- [General Authorization System](../../Authorization/README.md)
- [Licensing Service Integration Guide](../../../Processity.LicensingService/INTEGRATION_GUIDE.md)
- [License Validation](../Abstractions/ILicenseValidator.cs)
- [License Caching Strategy](../Implementation/LicenseCache.cs)
