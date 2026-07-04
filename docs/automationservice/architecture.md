---
type: architecture
---

# AutomationService — Architecture Reference

## Rule Evaluation Flow
`record.changed.{module}.{entity}` (CAP wildcard) →
  `GenericRecordChangedHandler` [Service/src/WorkflowService.Core/Rules/Application/Handlers/GenericRecordChangedHandler.cs]
    → builds `EvaluationContext` (SourceModule, SourceEntity, TriggerType, Fields, PreviousFields, ChangedFieldNames)
    → `RuleEvaluationService.EvaluateAndExecuteAsync()` [Service/src/WorkflowService.Core/Rules/Application/Services/RuleEvaluationService.cs]
        → `RuleRepository.GetApplicableRulesAsync()`: matches by `Trigger` config OR legacy `ConsumerName`
        → per matched rule: `IActionStrategy.ExecuteAsync()` dispatched by action type
    → `TriggeredWorkflowResolver.GetTriggeredWorkflowsAsync()` [Service/src/WorkflowService.Core/Registry/TriggeredWorkflowResolver.cs]
        → matched workflows: `WorkflowEngine.StartWorkflowAsync()` [Service/src/WorkflowService.Core/Engine/WorkflowEngine.cs]
          with `InitialData["_trigger"]` = `AutomationTriggerContext`

## Action Strategies
All in `Service/src/WorkflowService.Core/Rules/Application/Actions/`

| Class | Output |
|-------|--------|
| `AssignSecurityRoleActionStrategy.cs` | publishes `security.role.assignment.requested` |
| `PublishModuleEventActionStrategy.cs` | publishes module-specific CAP event |
| `UpdateFieldActionStrategy.cs` | publishes `field.update.requested.{module}.{entity}` |
| `StartWorkflowActionStrategy.cs` | starts a WorkflowEngine instance |

To add a new strategy: implement `IActionStrategy`, register in the action strategy factory (grep `IActionStrategy` registrations in `Host/`).

## Record Creation Flow
`RecordCreationActivity` [Service/src/WorkflowService.Activities/Records/Actions/RecordCreationActivity.cs]
  → `RecordCreationService` [Service/src/WorkflowService.Activities/Records/Services/RecordCreationService.cs]
      → `OperationTemplateResolver.ResolveAsync()` [Service/src/WorkflowService.Activities/Records/Services/OperationTemplateResolver.cs]
           queries Gateway `GET /api/v1.0/modules/entities` → URL template from `SupportedOperationDescriptors`
      → `FieldMappingService.ApplyMappingAsync()` [Service/src/WorkflowService.Activities/Records/Services/FieldMappingService.cs]
           queries Gateway `GET /api/v1.0/modules/mappings?source=X&target=Y` → rename + include rules
      → HTTP: GetById on source entity → Create on target entity

## Mapping Discovery Convention
`ReflectionMappingDiscoveryProvider` [Processity.SharedKernel/src/ModelDiscovery/Implementation/ReflectionMappingDiscoveryProvider.cs]
  Scans all loaded assemblies at startup for: class name ending in `Mappings`, member typed `public static Expression<Func<T1,T2>>`
  → cached at startup (mappings don't change at runtime)
  → Backend exposes: `GET /api/processity/v1.0/discovery/mappings`
  → Gateway aggregates: `GET /api/v1.0/modules/mappings?source=X&target=Y` via `MappingDiscoveryOrchestrationService`

## Caching
- Entity/operation discovery: 30-min in-memory (`EntityDiscoveryService`)
- Gateway mapping aggregation: 5-min sliding (`MappingDiscoveryOrchestrationService`)

## API Routes
**Rule Engine:**
`GET/POST /api/rule-engine/v1.0/rules` | `GET/PUT/DELETE /api/rule-engine/v1.0/rules/{id}`

**Workflow Management:**
`GET/POST /api/workflow-management/v1.0/workflows`
`PUT/DELETE /api/workflow-management/v1.0/workflows/{id}/trigger`
`POST /api/workflow-management/v1.0/workflows/{id}/start`
`GET /api/workflow-management/v1.0/activities`

## Non-Obvious Constraints
- `FieldFilters` and `ChangedFieldNames` matching is **case-sensitive**
- Entity type names in mapping keys are **case-sensitive**
- Workflows without a `Trigger` config must be started via API only
- Legacy `ConsumerName = "FunctionMapping"` path still works via `[Obsolete]` `FunctionAssignedRuleEvaluationHandler`
