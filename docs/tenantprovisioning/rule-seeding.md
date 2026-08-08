---
type: feature
---

# SeedConfigurationDataStep — Module Rule Seeding

## Overview

`SeedConfigurationDataStep`
(`Service/src/TenantProvisioning.Service/Orchestration/Steps/SeedConfigurationDataStep.cs`)
was previously an unimplemented stub (`// TODO: Implement seed data logic`, always
returned `Success: true` without doing anything). It now implements a generic,
module-agnostic mechanism for seeding a module's default Rule Engine templates into a
newly provisioned tenant's schema.

## Mechanism

1. Discover `step.ModuleName`'s metadata via `IModuleDiscoveryClient` (same
   `Services` config section + fallback loop already used by `ApplyMigrationsStep`).
2. If the module declares a non-null `SeedDataPath`
   (`ModuleRegistrationRequest.SeedDataPath`), `GET {moduleServiceUrl}{SeedDataPath}`
   — the module's own service returns its seed content as opaque JSON. This step never
   inspects the shape.
3. Discover `AutomationService`'s metadata the same way.
4. `POST {automationServiceUrl}/api/v1.0/internal/rules/seed` with
   `{ tenantId, schemaName, rules: <opaque JSON from step 2> }`.

Planning is the first module using this (`SeedDataPath =
"/api/planning/v1.0/internal/seed-data/rules"`, see
`docs/planning/role-assignment-rules.md`) but the mechanism itself has no Planning- or
AutomationService-specific knowledge baked in beyond "seeded content happens to be Rule
Engine rules today" — a future module could reuse the same `SeedDataPath` convention
for a different seed target if `SeedConfigurationDataStep` grows a second apply
endpoint.

## Failure handling — deliberately non-blocking

Every failure path in this step (module not found, seed fetch fails, AutomationService
not found, apply fails, unexpected exception) logs a warning and still returns
`Success: true`. This is intentional: `ProvisioningOrchestrator.ExecuteStepAsync`
throws and rolls back the **entire** tenant provisioning on any step failure. The
previous stub always succeeded trivially, so making this step capable of hard-failing
provisioning over a best-effort "seed some example rules" feature would have been a
regression — losing default rule templates is recoverable (an admin can create them
manually later), losing tenant provisioning is not.

## Required config

The `Services` section (per-environment `appsettings.json` in this repo's `.docker/*`
folders and `Host/`) must list both `Planning` and `AutomationService` base URLs for
this step to actually seed anything. As of this feature landing, only
`Authentication`/`Licensing`/`ApiGateway` are configured in the checked-in dev/uat/prod
appsettings. Without those two entries, the step silently no-ops (per the non-blocking
design above) — tenant provisioning still succeeds, but no default rules get created.

## Redeploy

`Processity.TenantProvisioning` (+ `Services` config update, see above).
