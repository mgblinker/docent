---
type: feature
---

# Social Care Module - Licensing Integration

## Overview

The Social Care module implements **user-level** role-based feature access control using the Processity Licensing System. Individual users have their own licenses, and a single user can have multiple licenses for different modules or feature sets.

## Licensing Model

### User-Centric Licensing

- **Licenses are assigned to individual users**, not tenants
- **One user can have multiple licenses** (e.g., SocialCare Basic + Education Premium)
- **Different users in the same tenant can have different licenses**
- Features are **aggregated across all active licenses** for a user
- The **highest tier** across all licenses determines the user's effective tier

### Example Scenario

```
Tenant: ABC Social Care Ltd
├── User A (Admin)
│   ├── License 1: SocialCare Admin (Enterprise tier)
│   └── License 2: Education Module (Professional tier)
│   → Effective: Enterprise tier + all features from both licenses
│
├── User B (Referrer)
│   └── License 1: SocialCare Referrer (Basic tier)
│   → Effective: Basic tier + referrer features only
│
└── User C (Carer)
    └── License 1: SocialCare Carer (Basic tier)
    → Effective: Basic tier + carer features only
```

## License Features

### Module-Level Access

**`social-care-module`** - Base feature required for any Social Care functionality

### Carer Persona Features

Carers are service providers who deliver care services. Their features include:

| Feature            | Constant                                              | Description                           |
| ------------------ | ----------------------------------------------------- | ------------------------------------- |
| Booking Access     | `SocialCareLicensingFeatures.Carer.BookingAccess`     | View assigned booking requests        |
| Booking Management | `SocialCareLicensingFeatures.Carer.BookingManagement` | Update booking status, add notes      |
| Service View       | `SocialCareLicensingFeatures.Carer.ServiceView`       | Browse service catalog                |
| Case File View     | `SocialCareLicensingFeatures.Carer.CaseFileView`      | Read case files for assigned bookings |
| Status Management  | `SocialCareLicensingFeatures.Carer.StatusManagement`  | Update online status/availability     |

### Referrer Persona Features

Referrers are external organizations making care referrals. Their features include:

| Feature             | Constant                                                  | Description                       |
| ------------------- | --------------------------------------------------------- | --------------------------------- |
| Create Bookings     | `SocialCareLicensingFeatures.Referrer.CreateBookings`     | Submit new booking requests       |
| View Bookings       | `SocialCareLicensingFeatures.Referrer.ViewBookings`       | View status of submitted bookings |
| Update Bookings     | `SocialCareLicensingFeatures.Referrer.UpdateBookings`     | Modify bookings before assignment |
| Problem Statements  | `SocialCareLicensingFeatures.Referrer.ProblemStatements`  | Manage problem statements         |
| Reports             | `SocialCareLicensingFeatures.Referrer.Reports`            | Download booking reports          |
| Employee Management | `SocialCareLicensingFeatures.Referrer.EmployeeManagement` | Manage referrer employees         |

### Administrative Persona Features

Administrative/backend workers are internal staff managing the system:

| Feature              | Constant                                                        | Description                        |
| -------------------- | --------------------------------------------------------------- | ---------------------------------- |
| Booking Management   | `SocialCareLicensingFeatures.Administrative.BookingManagement`  | Full booking lifecycle management  |
| Person Management    | `SocialCareLicensingFeatures.Administrative.PersonManagement`   | Manage all persons (carers, users) |
| Case File Management | `SocialCareLicensingFeatures.Administrative.CaseFileManagement` | Create/edit case files             |
| Service Management   | `SocialCareLicensingFeatures.Administrative.ServiceManagement`  | Manage service catalog             |
| Referrer Management  | `SocialCareLicensingFeatures.Administrative.ReferrerManagement` | Manage referrer organizations      |
| Family Management    | `SocialCareLicensingFeatures.Administrative.FamilyManagement`   | Manage families/relationships      |
| Scoring Access       | `SocialCareLicensingFeatures.Administrative.ScoringAccess`      | Access matching algorithms         |
| Persona Management   | `SocialCareLicensingFeatures.Administrative.PersonaManagement`  | Manage personas/profiles           |
| Admin Access         | `SocialCareLicensingFeatures.Administrative.AdminAccess`        | Administrative configuration       |

### Advanced Features

Premium features available in higher tiers:

| Feature          | Constant                                               | Description                  |
| ---------------- | ------------------------------------------------------ | ---------------------------- |
| Analytics        | `SocialCareLicensingFeatures.Advanced.Analytics`       | Advanced reporting/analytics |
| Form Integration | `SocialCareLicensingFeatures.Advanced.FormIntegration` | External form integration    |
| Bulk Operations  | `SocialCareLicensingFeatures.Advanced.BulkOperations`  | Bulk import/export           |
| API Access       | `SocialCareLicensingFeatures.Advanced.ApiAccess`       | Programmatic API access      |

## Controller Protection

### Example: Referrer Controller

```csharp
[ApiController]
[Authorize]
[Route("api/social-care-referrer/v{version:apiVersion}/bookings")]
[RequiresLicenseFeature(SocialCareLicensingFeatures.SocialCareModule)] // Module-level check
public class ReferrerBookingsController : ControllerBase
{
    [HttpGet("open")]
    [RequiresLicenseFeature(SocialCareLicensingFeatures.Referrer.ViewBookings)]
    public async Task<IActionResult> GetOpenBookings() { }

    [HttpPut("{id}")]
    [RequiresLicenseFeature(SocialCareLicensingFeatures.Referrer.UpdateBookings)]
    public async Task<IActionResult> UpdateBooking(Guid id) { }

    [HttpGet("reports")]
    [RequiresLicenseFeature(SocialCareLicensingFeatures.Referrer.Reports)]
    public async Task<IActionResult> GetReports() { }
}
```

### Example: Administrative Controller

```csharp
[ApiController]
[Authorize]
[Route("api/social-care/v{version:apiVersion}/persons")]
[RequiresLicenseFeature(SocialCareLicensingFeatures.SocialCareModule)]
[RequiresLicenseFeature(SocialCareLicensingFeatures.Administrative.AdminAccess)]
public class PersonLifecycleController : ControllerBase
{
    [HttpPost]
    [RequiresLicenseFeature(SocialCareLicensingFeatures.Administrative.PersonManagement)]
    public async Task<IActionResult> CreatePerson() { }
}
```

## Controller Mapping

### Referrer Controllers

- **ReferrerBookingsController** → `Referrer.ViewBookings`, `Referrer.UpdateBookings`, `Referrer.Reports`
- **ReferrerProblemStatementController** → `Referrer.ProblemStatements`
- **ReferrerEmployeeController** → `Referrer.EmployeeManagement`
- **ReferrerController** → `Administrative.ReferrerManagement` (admin only)

### Administrative Controllers

- **BookingRequestsController** → `Administrative.BookingManagement`
- **PersonLifecycleController** → `Administrative.PersonManagement`
- **PersonDataRetrievalController** → `Administrative.PersonManagement`
- **CaseFileController** → `Administrative.CaseFileManagement`
- **ServiceController** → `Administrative.ServiceManagement`
- **ScoringController** → `Administrative.ScoringAccess`
- **PersonasController** → `Administrative.PersonaManagement`
- **SocialCareAdminController** → `Administrative.AdminAccess`

### Carer Controllers

_Note: Carer-specific controllers may need to be created based on requirements_

## Setup License in Licensing Service

When creating licenses, they are assigned to **individual users**, not tenants. Users can have multiple license assignments for different modules/features.

### Example: Assign Referrer License to User

```http
POST /api/licensing/v1.0/user-licenses/assign
{
  "userId": "user-guid",
  "tenantLicenseId": "license-guid"
}
```

### Example: Create Module-Specific Licenses

**Create a SocialCare Referrer License (Tenant-Level Pool):**

```json
POST /api/licensing/v1.0/tenant-licenses
{
  "tenantId": "tenant-guid",
  "tier": "Professional",
  "totalSeats": 10,
  "validFrom": "2026-01-01",
  "validUntil": "2027-01-01",
  "features": [
    "social-care-module",
    "social-care-referrer-create-bookings",
    "social-care-referrer-view-bookings",
    "social-care-referrer-update-bookings",
    "social-care-referrer-problem-statements",
    "social-care-referrer-reports"
  ]
}
```

**Assign to Specific Users:**

```json
POST /api/licensing/v1.0/user-licenses/assign
{
  "userId": "user-1-guid",
  "tenantLicenseId": "referrer-license-guid"
}

POST /api/licensing/v1.0/user-licenses/assign
{
  "userId": "user-2-guid",
  "tenantLicenseId": "referrer-license-guid"
}
```

### Example: User with Multiple Licenses

```json
{
  "tier": "Professional",
  "features": [
    "social-care-module",
    "social-care-referrer-create-bookings",
    "social-care-referrer-view-bookings",
    "social-care-referrer-update-bookings",
    "social-care-referrer-problem-statements",
    "social-care-referrer-reports"
  ]
}
```

### Administrative License

```json
{
  "tier": "Enterprise",
  "features": [
    "social-care-module",
    "social-care-admin-booking-management",
    "social-care-admin-person-management",
    "social-care-admin-casefile-management",
    "social-care-admin-service-management",
    "social-care-admin-referrer-management",
    "social-care-admin-family-management",
    "social-care-admin-scoring",
    "social-care-admin-personas",
    "social-care-admin-access",
    "social-care-analytics",
    "social-care-api-access"
  ]
}
```

### Carer License

```json
{
  "tier": "Basic",
  "features": [
    "social-care-module",
    "social-care-carer-bookings",
    "social-care-carer-booking-management",
    "social-care-carer-services",
    "social-care-carer-casefile-view",
    "social-care-carer-status"
  ]
}
```

## Error Handling

When a user attempts to access a feature not included in their subscription:

**HTTP 403 Forbidden**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.3",
  "title": "Forbidden",
  "status": 403,
  "detail": "The feature 'social-care-referrer-reports' is not available in your current subscription plan.",
  "instance": "/api/social-care-referrer/v1.0/bookings/reports"
}
```

## Configuration

In `appsettings.json`:

```json
{
  "LicensingService": {
    "BaseUrl": "https://licensing-service:7010"
  },
  "ConnectionStrings": {
    "LicensingServiceDb": "..."
  }
}
```

## Testing

### Manual Testing

1. Create a tenant license with specific features
2. Authenticate as a user in that tenant
3. Attempt to access protected endpoints
4. Verify 403 responses for features not in the license

### Integration Tests

```csharp
[Fact]
public async Task ReferrerBookings_WithoutReportsFeature_Returns403()
{
    // Arrange: Create license without reports feature
    var license = await CreateLicenseAsync(new[] {
        SocialCareLicensingFeatures.SocialCareModule,
        SocialCareLicensingFeatures.Referrer.ViewBookings
    });

    // Act: Attempt to access reports
    var response = await Client.GetAsync("/api/social-care-referrer/v1.0/bookings/reports");

    // Assert
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}
```

## Best Practices

1. **Layered Security**: Use licensing alongside permission-based authorization

   ```csharp
   [RequiresLicenseFeature("social-care-admin-person-management")]
   [RequiresPermission("persons:delete")]
   public async Task<IActionResult> DeletePerson(Guid id) { }
   ```

2. **Controller-Level Protection**: Apply base feature at controller level
3. **Endpoint-Level Refinement**: Add specific features to individual actions
4. **Cache Efficiency**: License state is cached (30min TTL) for performance
5. **Event-Driven Updates**: License changes invalidate cache automatically

## See Also

- [Licensing Service Integration Guide](../../../Processity.LicensingService/INTEGRATION_GUIDE.md)
- [Authorization vs Licensing](../../../Processity.SharedKernel/src/Licensing/Authorization/README.md)
- [SharedKernel Licensing](../../../Processity.SharedKernel/src/Licensing/README.md)
