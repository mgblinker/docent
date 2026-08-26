# Current Scope — Processity.AutomationService

Last updated: 2026-02-27

## Status: Unified Automation System + Record Creation Modes (2026-02-27)

### Completed

1. **Unified Automation System** — Generic Record Trigger, UpdateField Action, Rule->Workflow context, Event-Triggered Workflows
2. **Record Creation Modes** — "From scratch" (existing) and "From existing record" (new) with automatic mapping detection

## Recent Additions: Record Creation Enhancement (COREAPPS-XXXX)

### New Feature: "Create from Existing Record" Mode

**Purpose**: Allow workflow Record Creation activities to create new records by copying/transforming data from an existing source record, with automatic mapping detection.

**Components**:

1. **SharedKernel Enhancements**:
   - `EntityMappingDescriptor` — Records projection mappings between entity types
   - `IMappingDiscoveryProvider` — Discovers `*Mappings` classes with projection expressions
   - `ReflectionMappingDiscoveryProvider` — Scans assemblies for `Expression<Func<TSource, TTarget>>` fields
   - `DiscoverableObjectDescriptor.SupportedOperations` — Lists available operations per entity (e.g., "GetById", "Create")

2. **Backend MappingDiscoveryController**:
   - `GET /api/processity/v1.0/discovery/mappings` — Returns all discovered entity mappings
   - 5-minute sliding cache for performance
   - Scans all loaded Processity assemblies at startup

3. **ApiGateway Orchestration**:
   - `MappingDiscoveryOrchestrationService` — Aggregates mapping data from backend services
   - `GET /api/v1.0/modules/entities?operation=GetById` — Filters entities to those with GetById endpoints
   - `GET /api/v1.0/modules/mappings?source={source}&target={target}` — Checks mapping availability

4. **RecordCreationActivity Updates**:
   - New parameter `CreationMode` (radio: "from-scratch" / "from-existing")
   - `RecordData` (field-map) — Visible only when CreationMode = "from-scratch"
   - `SourceEntityType` (select) — Visible only when CreationMode = "from-existing"
   - `SourceRecordId` (text) — Visible only when CreationMode = "from-existing"
   - Added `GetRecordByIdAsync` to `ICoreDataWorkflowApi`

5. **Frontend UI Enhancements**:
   - **Radio Editor** — New `editorType: "radio"` with configurable options
   - **Conditional Visibility** — `visibleWhen` hint controls parameter display based on sibling values
   - **Mapping Availability Chip** — Green (status 100) if automatic mapping exists, orange (status 101) if not
   - Dynamic mapping check on source/target entity selection

### Workflow Example: Copy Contact Record

```
1. Trigger: Event (e.g., contact created)
2. Activity: Record Creation
   - CreationMode: "from-existing"
   - SourceEntityType: "Contact" (selected, shows mapping available ✓)
   - SourceRecordId: {event.sourceRecordId} (mapped from trigger)
   - RecordType: "Person" (target entity)
3. Backend execution:
   - Call GetRecordById("contact", sourceRecordId) → fetch source data
   - Call CreateRecord("person", sourceData) → create target record with projected data
   - Return new record ID
```

## Recent Fixes

### "Record Created or Updated" trigger missing Contact Requests (2026-08-17)

**Symptom**: `RecordType` entity dropdown on the `RecordCreatedOrUpdated` trigger (`GET /api/v1.0/modules/entities`) didn't list Contact Requests, so workflows couldn't be triggered off contact-form submissions.

**Root cause**: an entity only appears in that dropdown if its owning backend module registers a `BaseReflectionDiscoveryProvider` via `services.RegisterDiscoveryProvider<T>("ModuleName")` (see `Processity.Backend/.claude/CLAUDE.md` → Discovery). The **Communications** module (owner of `ContactRequestEntity`) had never registered one — none of its entities were discoverable, not just Contact Requests.

**Fix required three parts** (registering the provider alone was not enough — the entity still didn't show up until the HTTP route existed on both ends):

1. `Communications/src/Communications/ModelDiscovery/CommunicationsDiscoveryProvider.cs` (same pattern as `CoreDataDiscoveryProvider`) — registers `ContactRequestEntity` as a main object (`Name = "ContactRequest"`, `RouteSegment = "contact-requests"`, `GetById` operation).
2. `services.RegisterDiscoveryProvider<CommunicationsDiscoveryProvider>("Communications")` in `Communications/src/Communications/Common/DependencyInjection/ServiceCollectionExtensions.cs`.
3. **`Communications/src/Communications/ModelDiscovery/Controllers/CommunicationsDiscoveryController.cs`** — a concrete `ModuleDiscoveryControllerBase` subclass exposing `GET /api/communications/v1.0/discovery/objects`. Every module needs its own controller (see `CoreDataDiscoveryController`, `SocialCareDiscoveryController`); `DiscoveryRegistry.TryGetProvider("Communications", ...)` is only reachable through this route, no controller existed for Communications before.
4. **`Processity.ApiGateway/.docker/{dev,local,uat,prod}/config/ocelot.communications.json`** — added a `communications-discovery` route (`SwaggerKey` must end in `-discovery`). `OcelotServiceEndpointProvider` builds the list of services to poll for `GET /api/v1.0/modules/entities` by scanning Ocelot routes for that suffix; Communications had no such route, so the gateway never called the module at all regardless of what was registered backend-side.

**Follow-up**: only `ContactRequest` was registered in the provider. Other Communications entities (Interactions, Templates, Signatures) are still not discoverable — add them to `CommunicationsDiscoveryProvider.ConfigureEntities()` if/when they need to appear as automation trigger/action targets (the provider/controller/route plumbing from this fix already covers them).

## New Activity: Send Email (2026-08-17)

Added `SendEmailActivity` (`AutomationService.Activities/Messaging/Actions/SendEmailActivity.cs`, `Id = "send-email"`, `Category = "Communications"`), plus a new backend send-email endpoint since none existed:

- **Recipient resolution** — `RecipientMode` radio: `"addresses"` (comma/semicolon-separated `EmailAddresses`, may be bound from a previous activity/trigger output) or `"record-lookup"` (`RecordType` + `RecordId` + `EmailField` — fetches the record via the same `IEntityDiscoveryService`/`IModuleServiceUrlResolver`/`IWorkflowModuleClient` GetById path `RecordCreationService` uses, then reads `EmailField` case-insensitively off the response).
- **Send endpoint** — Communications had no way to send an arbitrary email (only template CRUD + internal SMTP calls from within handlers). Added `POST /api/communications/v1.0/emails/send` (`Messaging/API/Controllers/EmailController.cs` → `SendEmailCommand`/`SendEmailCommandHandler` → existing internal `IMessagingService.SendAsync`, already DI-registered by the Interactions feature). No new Ocelot route needed — it rides the existing generic `/communications/{everything}` proxy (unlike discovery, which needs its own `-discovery` SwaggerKey route, see above).
- **Config** — added `Services:Communications:BaseUrl` to `Processity.AutomationService/.docker/{dev,local,uat,prod}/appsettings.json` (same host as `CoreData` in each env) — `ModuleServiceUrlResolver` throws if a service's BaseUrl isn't configured, and this key never existed before since AutomationService never called Communications directly.
- **Not yet built**: HTML/templated bodies (plain text `Subject`/`Body` only), attachments, and using an actual `EmailTemplate` (Communications already has template CRUD but no render/merge mechanism — see `EmailTemplateController` note above).

## Immediate Next Steps

1. **Verify compilation** — `dotnet build` on SharedKernel, Backend, ApiGateway, AutomationService
2. **Register operations** — Annotate entities in discovery configs with `SupportedOperations = ["GetById", "Create"]` for affected modules
3. **Frontend build** — `npm run build` in WebApp.Angular
4. **Integration testing** — Test both creation modes, mapping detection, from-scratch regression

## Sprint 2 Backlog

- E2E tests (Cucumber + Playwright) for record creation modes
- Workflow versioning and rollback
- Rule execution history / audit logs
- Advanced visual rule condition builder
- Rule import/export API
- Mapping caching optimization (multi-level caching per tenant)
- Performance metrics for mapping discovery

## Known Constraints

- Mapping discovery depends on modules having `*Mappings` projection classes with static `Expression<Func<TSource, TTarget>>` fields
- GetRecordById endpoints must be declared in `SupportedOperations` during entity registration
- Mapping check is informational only; frontend displays status but doesn't block creation if mapping unavailable
- Source record fetch assumes same authentication context as create operation
