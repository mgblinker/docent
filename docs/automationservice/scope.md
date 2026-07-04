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
