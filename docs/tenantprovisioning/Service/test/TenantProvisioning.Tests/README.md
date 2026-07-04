---
type: howto
---

# Tenant Provisioning Tests

This test suite verifies the license-based tenant provisioning logic.

## Test Structure

### Unit Tests (`/Unit`)

1. **ProvisioningStepFactoryTests** - Tests license-based module filtering

   - ✅ Creates only global steps when no licenses exist
   - ✅ Creates steps for licensed modules only
   - ✅ Matches modules by name, display name, and service name
   - ✅ Verifies correct step ordering and types
   - ✅ Case-insensitive matching
   - ✅ Handles null/empty license features

2. **InitiateProvisioningCommandHandlerTests** - Tests provisioning orchestration

   - ✅ Fetches licenses and modules in parallel
   - ✅ Returns failure when license fetch fails
   - ✅ Returns failure when module discovery fails
   - ✅ Passes data to factory correctly
   - ✅ Prevents duplicate provisioning requests
   - ✅ Starts orchestration after creating request

3. **GetTenantLicensesQueryHandlerTests** - Tests licensing API integration

   - ✅ Returns licenses from API client
   - ✅ Returns empty list when API returns null
   - ✅ Returns failure on API exception
   - ✅ Logs license count

4. **TenantCreatedEventHandlerTests** - Tests event-driven provisioning
   - ✅ Maps event properties to command correctly
   - ✅ Handles command failures gracefully
   - ✅ Does not propagate exceptions

### Integration Tests (`/Integration`)

1. **LicenseBasedProvisioningIntegrationTests** - End-to-end scenarios
   - ✅ Creates correct steps for multi-license tenants
   - ✅ Provisions only licensed modules
   - ✅ Verifies unlicensed modules are skipped
   - ✅ Creates only global step when no licenses exist
   - ✅ Provisions all modules when service-level license exists

## Running Tests

```powershell
# Run all tests
cd c:\Projects\Processity.TenantProvisioning
dotnet test

# Run specific test class
dotnet test --filter ProvisioningStepFactoryTests

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"
```

## Test Coverage

The tests verify:

### License-Based Filtering Logic

- ✅ Modules are provisioned only when tenant has matching license
- ✅ Matching works by module name, display name, or service name
- ✅ Matching is case-insensitive
- ✅ Service-level licenses provision all modules in that service

### Parallel Processing

- ✅ Licenses and modules are fetched simultaneously
- ✅ Either failure stops provisioning
- ✅ Both results are passed to factory

### Step Creation

- ✅ Global steps (GenerateSecrets) always created
- ✅ Module steps created in correct order: CreateDatabaseSchema → ApplyMigrations → SeedConfigurationData → CreateInitialUser
- ✅ Execution order is sequential and unique

### Event-Driven Flow

- ✅ TenantCreatedEvent triggers InitiateProvisioningCommand
- ✅ All event properties mapped to command
- ✅ Failures handled gracefully without throwing

### Error Handling

- ✅ Duplicate requests prevented
- ✅ API failures return Result.Fail with error messages
- ✅ Orchestration failures don't prevent request creation

## Key Test Scenarios

### Scenario 1: Multi-License Tenant

```csharp
Licenses:
  - Social Care: CaseManagement, Assessments, CarePlanning
  - Course Management: Courses, Certificates

Modules Available:
  - SocialCare: CaseManagement, Assessments, CarePlanning, Invoicing
  - CourseManagement: Courses, Certificates, Accreditations
  - Communications: EmailService

Expected Steps: 21
  - 1 global (GenerateSecrets)
  - 20 module steps (5 licensed modules × 4 steps each)

Skipped Modules: Invoicing, Accreditations, EmailService
```

### Scenario 2: Trial Tenant (No Licenses)

```csharp
Licenses: []
Modules Available: All

Expected Steps: 1 (GenerateSecrets only)
```

### Scenario 3: Service-Level License

```csharp
Licenses: ["SocialCare"]
Modules Available: CaseManagement, Assessments, CarePlanning

Expected: All SocialCare modules provisioned
```

## Implementation Notes

### Key Vault Question

**Current**: Each tenant gets a `KeyVaultProjectId` for secrets.

**Recommendation** (from earlier discussion):

- Use **single Key Vault per environment** with tenant-namespaced secrets
- Example: `tenants/{tenantId}/db-password`, `tenants/{tenantId}/api-key`
- Only use separate Key Vaults for regulatory/compliance requirements
- Single DB connection works fine with schema-based multitenancy

### Dependencies

- `FluentAssertions` - Readable assertions
- `Moq` - Mocking framework
- `Microsoft.EntityFrameworkCore.InMemoryDatabase` - In-memory DB for tests (needs to be added)
- `Refit` - HTTP client mocking

## Next Steps

1. **Add InMemory EF Provider**:

```powershell
# Add to Directory.Packages.props
<PackageVersion Include="Microsoft.EntityFrameworkCore.InMemoryDatabase" Version="10.0.0" />

# Add to TenantProvisioning.Tests.csproj
<PackageReference Include="Microsoft.EntityFrameworkCore.InMemoryDatabase" />
```

2. **Fix Model Mismatches**: Update test DTOs to match actual `TenantLicenseDto` and `DiscoveredModuleDto` structures

3. **Add Test Helpers**: Create builder pattern for complex test objects

4. **Expand Coverage**:
   - Test DiscoverAvailableModulesQueryHandler
   - Test ProvisioningOrchestrator (if needed)
   - Test individual provisioning steps

## Status

✅ Test infrastructure set up (Moq, FluentAssertions)  
✅ InternalsVisibleTo configured  
⚠️ Tests need model updates to match actual DTOs  
⚠️ InMemory EF provider needed for integration tests

The test approach and structure are solid - just need to align test models with actual implementations.
