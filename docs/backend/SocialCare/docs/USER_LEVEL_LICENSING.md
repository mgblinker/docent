---
type: architecture
---

# User-Level Licensing Architecture

## Design Change Summary

The licensing system has been updated from **tenant-level** to **user-level** licensing to support:

1. **Individual user licenses** - Each user has their own set of licenses
2. **Multiple licenses per user** - Users can have licenses for different modules/features
3. **Feature aggregation** - All features from all active licenses are combined
4. **Tier elevation** - User's effective tier is the highest across all their licenses

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Tenant: ABC Social Care                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  License Pool 1: SocialCare Admin (10 seats, Enterprise)   │
│  ├─ Features: admin-*, analytics, api-access               │
│  ├─ Assigned to: User A, User D                            │
│  └─ Available: 8 seats                                     │
│                                                              │
│  License Pool 2: SocialCare Referrer (50 seats, Basic)     │
│  ├─ Features: referrer-view, referrer-create, referrer-update│
│  ├─ Assigned to: User B, User C, ... (12 users)           │
│  └─ Available: 38 seats                                    │
│                                                              │
│  License Pool 3: Education Module (5 seats, Professional)  │
│  ├─ Features: education-*, course-management               │
│  ├─ Assigned to: User A                                    │
│  └─ Available: 4 seats                                     │
└─────────────────────────────────────────────────────────────┘

User A Effective License:
├─ Tier: Enterprise (highest from all licenses)
├─ Features: {admin-*, analytics, api-access, education-*, course-management}
└─ Licenses: 2 (SocialCare Admin + Education)

User B Effective License:
├─ Tier: Basic
├─ Features: {referrer-view, referrer-create, referrer-update}
└─ Licenses: 1 (SocialCare Referrer)
```

## Implementation Changes

### 1. Authorization Handlers (SharedKernel)

**Before (Tenant-Level):**

```csharp
var tenantId = currentUserProvider.GetCurrentTenantId();
var result = await licenseValidator.IsFeatureEnabledAsync(tenantId, featureName);
```

**After (User-Level):**

```csharp
var userId = currentUserProvider.GetCurrentUserId();
var result = await licenseValidator.IsFeatureEnabledForUserAsync(userId, featureName);
```

### 2. License Validation (SharedKernel)

Added new method:

```csharp
public interface ILicenseValidator
{
    Task<Result<string>> GetUserLicenseTierAsync(UserId userId, ...);
}
```

Implementation aggregates all user licenses:

- Collects all active `UserLicenseAssignment` records for the user
- Merges features from all associated `TenantLicense` records
- Returns highest tier across all licenses

### 3. License State Aggregation (Licensing Service)

Updated `GetUserLicenseStateQueryHandler`:

```csharp
// OLD: Return first active license
var activeAssignment = assignments.FirstOrDefault(a => a.TenantLicense.IsValid());

// NEW: Aggregate ALL active licenses
var activeAssignments = assignments.Where(a => a.TenantLicense.IsValid());
var allFeatures = activeAssignments
    .SelectMany(a => a.TenantLicense.Features)
    .Select(f => f.FeatureName)
    .Distinct()
    .ToHashSet();
var highestTier = activeAssignments.Select(a => a.TenantLicense.Tier).Max();
```

## Data Model

### Existing Model (Unchanged)

```
TenantLicense (License Pool)
├─ Id
├─ TenantId
├─ Tier (Basic, Professional, Enterprise)
├─ TotalSeats (e.g., 10)
├─ AssignedSeats (e.g., 3)
├─ ValidFrom / ValidUntil
├─ Status (Active, Expired, ...)
└─ Features[] (list of enabled features)

UserLicenseAssignment (User → License Pool)
├─ Id
├─ UserId
├─ TenantLicenseId (FK to license pool)
├─ AssignedAt
└─ AssignedBy
```

### How It Works

1. **Tenant purchases licenses** → Creates `TenantLicense` with seat pool
2. **Admin assigns users** → Creates `UserLicenseAssignment` linking user to license
3. **User authenticates** → System queries all their `UserLicenseAssignment` records
4. **Feature check** → Aggregates features from all linked licenses
5. **Tier check** → Returns highest tier from all linked licenses

### Example Queries

**Get all licenses for a user:**

```sql
SELECT tl.*
FROM user_license_assignments ula
JOIN tenant_licenses tl ON ula.tenant_license_id = tl.id
WHERE ula.user_id = @userId
  AND tl.status = 'Active'
  AND tl.valid_until > NOW()
```

**Get all features for a user:**

```sql
SELECT DISTINCT f.feature_name
FROM user_license_assignments ula
JOIN tenant_licenses tl ON ula.tenant_license_id = tl.id
JOIN tenant_license_features f ON f.tenant_license_id = tl.id
WHERE ula.user_id = @userId
  AND tl.status = 'Active'
  AND tl.valid_until > NOW()
```

## Usage Examples

### Scenario 1: Assign Multiple Licenses to One User

```csharp
// Create license pools for tenant
var socialCareLicense = await CreateTenantLicense(tenantId, tier: Enterprise,
    features: ["social-care-*", "analytics"]);
var educationLicense = await CreateTenantLicense(tenantId, tier: Professional,
    features: ["education-*"]);

// Assign both to admin user
await AssignLicenseToUser(adminUserId, socialCareLicense.Id);
await AssignLicenseToUser(adminUserId, educationLicense.Id);

// User now has Enterprise tier + all features from both licenses
```

### Scenario 2: Different Users, Different Licenses

```csharp
var referrerLicense = await CreateTenantLicense(tenantId, tier: Basic,
    features: ["social-care-referrer-*"]);

await AssignLicenseToUser(referrerUser1, referrerLicense.Id);
await AssignLicenseToUser(referrerUser2, referrerLicense.Id);
// Both users share the same license pool but have individual assignments

var adminLicense = await CreateTenantLicense(tenantId, tier: Enterprise,
    features: ["social-care-admin-*"]);

await AssignLicenseToUser(adminUser, adminLicense.Id);
// Admin has different features than referrers
```

### Scenario 3: Feature Gating in Controllers

```csharp
[RequiresLicenseFeature("social-care-admin-person-management")]
public async Task<IActionResult> CreatePerson(...)
{
    // This checks:
    // 1. Get current user's UserId
    // 2. Query all UserLicenseAssignments for that user
    // 3. Aggregate features from all assigned TenantLicenses
    // 4. Check if "social-care-admin-person-management" is in the set
    // 5. Allow or deny (403)
}
```

## Cache Behavior

### User License State Cache

**Cache Key:** `license:user:{userId}`  
**TTL:** 30 minutes  
**Content:** Aggregated license state (tier + all features)  
**Invalidation:** When ANY license assigned to the user changes

### Invalidation Events

```csharp
// When a user is assigned a new license
UserLicenseAssignedEvent → Invalidate cache for UserId

// When a user's license is revoked
UserLicenseRevokedEvent → Invalidate cache for UserId

// When a tenant license is updated
TenantLicenseUpdatedEvent → Invalidate cache for ALL users assigned to that license

// When a tenant license expires
TenantLicenseExpiredEvent → Invalidate cache for ALL users assigned to that license
```

## Migration Guide

### For Existing Implementations

If you have existing tenant-level license checks, update them:

**Before:**

```csharp
var tenantId = GetCurrentTenantId();
if (await _licenseValidator.IsFeatureEnabledAsync(tenantId, "feature"))
{
    // Allow
}
```

**After:**

```csharp
var userId = GetCurrentUserId();
if (await _licenseValidator.IsFeatureEnabledForUserAsync(userId, "feature"))
{
    // Allow
}
```

### Using Attributes (Recommended)

```csharp
// Automatically uses user-level validation
[RequiresLicenseFeature("social-care-referrer-view-bookings")]
public async Task<IActionResult> GetBookings() { }
```

## Benefits of User-Level Licensing

1. **Flexible Pricing Models**

   - Charge per user, not per tenant
   - Different users pay for different feature sets
   - Easy to offer tiered user roles within same tenant

2. **Granular Control**

   - Admin can precisely control who has what features
   - Users can have access to multiple modules
   - Easy to grant temporary access or trial features to specific users

3. **Better Compliance**

   - Audit trail shows exactly which user had which features when
   - No shared access - each user has explicit license assignment
   - Easy to revoke access for individual users

4. **Scalability**
   - License pools scale independently
   - Can create specialized licenses for different user types
   - Multi-module access without complex tenant-level configurations

## See Also

- [Licensing Service Integration Guide](../../../Processity.LicensingService/INTEGRATION_GUIDE.md)
- [Authorization vs Licensing](../../../Processity.SharedKernel/src/Licensing/Authorization/README.md)
- [SocialCare Licensing Features](../Common/Licensing/SocialCareLicensingFeatures.cs)
