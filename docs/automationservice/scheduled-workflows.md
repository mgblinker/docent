---
type: architecture
---

# Scheduled (Time-Based) Workflow Triggers

## Overview

Workflows previously started only via CAP events (`EventBusTriggeredWorkflowHandler`, `[CapSubscribe("#")]`). This adds a **calendar/cron-based** trigger source: a workflow carrying a `scheduled-trigger` activity gets a persisted schedule row; a background service scans every tenant schema on an interval, fires workflows whose schedule is due, and advances them via a cron library (Cronos) — safe to run on multiple hosts.

Closes the cross-cutting scheduler gap from the fit-gap analysis (`Files/analysis/fit-gap-analysis.md`) that blocked F (renewal), B-10 (scheduled roles), E-24 (scheduled admissions), and reminder/anniversary requirements across D/E/F/I/C/J.

---

## Data Model

`ScheduledTrigger` [Service/src/AutomationService.Core/Scheduling/Domain/ScheduledTrigger.cs] — tenant-schema-scoped (`AutomationDbContext.ScheduledTriggers`, alongside `WorkflowDefinitions`):

| Field | Purpose |
|---|---|
| `WorkflowDefinitionId` | The workflow to start. Unique index — one schedule per workflow. |
| `CronExpression` | 5-field or 6-field (with seconds) cron. |
| `Timezone` | IANA id (e.g. `Europe/Zurich`); cron evaluated in this zone. |
| `NextFireUtc` | When due next (UTC). Composite index `(Enabled, NextFireUtc)` backs the due-scan. |
| `LastFireUtc` | Set on each successful fire. |
| `Enabled` | Scheduler ignores disabled rows (also auto-disabled if the cron has no future occurrence or fails to parse). |
| `CatchUpPolicy` | `Skip` (default) or `FireEach` — see below. |

Migration: `20260703185044_AddScheduledTriggers` [Service/migration/AutomationService.Migrations/Migrations/].

## Authoring

`ScheduledTriggerActivity` [Service/src/AutomationService.Activities/Schedule/ScheduledTriggerActivity.cs] — `Kind = Trigger`, `Category = "Schedule"`. Inputs: `cronExpression`, `timezone` (optional, defaults `UTC`), `catchUpPolicy` (optional, defaults `Skip`). Same pass-through pattern as `EventBusTriggerActivity`: reads `_trigger` workflow variable, exposes `firedAt` / `scheduledTriggerId` as outputs.

## Registry Sync

`ScheduleTriggerSynchronizer` [Service/src/AutomationService.Core/Scheduling/Infrastructure/ScheduleTriggerSynchronizer.cs] — wired into `WorkflowRegistry.RegisterWorkflowAsync`/`DeleteWorkflowDefinitionAsync`:

```
RegisterWorkflowAsync(definition)
  → SaveWorkflowDefinitionAsync (unchanged)
  → ScheduleTriggerSynchronizer.SyncAsync(definition)
      scans Activities for ActivityType == "scheduled-trigger"
      no schedule activity  → DeleteByWorkflowDefinitionIdAsync (remove stale row)
      invalid cron / no future occurrence → log + delete (not scheduled)
      valid → compute first NextFireUtc via ICronScheduleCalculator, UpsertAsync

DeleteWorkflowDefinitionAsync(id)
  → repository delete (unchanged)
  → ScheduleTriggerSynchronizer.RemoveAsync(id)
```

## Scheduler Engine

`SchedulerHostedService` [Service/src/AutomationService.Core/Scheduling/Infrastructure/SchedulerHostedService.cs] — `BackgroundService`, poll interval `Scheduler:PollIntervalSeconds` (default 30s, min 5s clamped).

```
loop:
  enumerate provisioned tenant schemas
    (information_schema.tables WHERE table_name = 'ScheduledTriggers', excluding system schemas)
  per schema:
    set ambient tenant context to this schema (IMultiTenantContextSetter, AsyncLocal —
      flows into WorkflowEngine's own child scopes / Task.Run executions)
    GetDueAsync(now) — Enabled AND NextFireUtc <= now
    per due trigger:
      compute next occurrence (Cronos), from NextFireUtc if CatchUpPolicy=FireEach else from now
      no next occurrence / invalid cron → disable trigger, skip
      TryClaimAsync — atomic compare-and-swap (see below)
      claimed → WorkflowEngine.StartWorkflowAsync(workflowId, { _trigger: {...} }, systemAuthContext)
  sleep(interval)
```

### Multi-host safety — compare-and-swap, not row locks

`IScheduledTriggerRepository.TryClaimAsync` [Service/src/AutomationService.Core/Scheduling/Domain/IScheduledTriggerRepository.cs] advances `NextFireUtc`/`LastFireUtc` via `ExecuteUpdateAsync(... WHERE Id = id AND NextFireUtc = expectedNextFireUtc)`. Two scheduler hosts scanning the same due row both attempt this; Postgres serializes the two `UPDATE`s, only the first affects a row (`expected` still matches), the second affects zero rows and returns `false`. No `SKIP LOCKED`, no distributed lock — the row's own value *is* the lock.

### Catch-up semantics

The "from" instant fed to the cron calculator determines behaviour after downtime:

- **`Skip`** (default): compute next occurrence from **now** — collapses any missed fires into a single future one.
- **`FireEach`**: compute next occurrence from the trigger's **current `NextFireUtc`** — each scan advances one slot at a time, so missed occurrences fire individually across subsequent scans.

### Fired workflow context

`ScheduledTriggerContext` [Service/src/AutomationService.Core/Scheduling/Domain/ScheduledTriggerContext.cs] — `{ ScheduledTriggerId, FiredAtUtc }`, passed as the `_trigger` workflow variable, read by `ScheduledTriggerActivity.ExecuteAsync`.

`AuthenticationContextDto` for scheduler-fired workflows: `TenantName = schema`, empty `UserId`/`TenantId` guids, `CorrelationId = "scheduler:{triggerId}"`. DB routing is correct via the ambient tenant schema; workflows needing a real user/tenant GUID for downstream event auth need that addressed per-workflow when built.

## Cron Calculation

`ICronScheduleCalculator` / `CronScheduleCalculator` [Service/src/AutomationService.Core/Scheduling/Infrastructure/CronScheduleCalculator.cs] — thin wrapper over `Cronos`. Auto-detects 5 vs 6 field expressions by whitespace-split count. `GetNextOccurrenceUtc(cron, timezone, fromUtc, inclusive)` throws `TimeZoneNotFoundException`/`CronFormatException` on bad input — callers (synchronizer, hosted service) catch and disable/skip rather than crash the scan loop.

---

## Configuration Reference

```json
"Scheduler": {
  "Enabled": true,
  "PollIntervalSeconds": 30
}
```

| Key | Default | Notes |
|---|---|---|
| `Scheduler:Enabled` | `true` | `false` disables polling entirely (useful for single-purpose hosts/tests). |
| `Scheduler:PollIntervalSeconds` | `30` | Clamped to a 5s minimum. |

No config needed per-workflow — schedule parameters live on the workflow definition's trigger activity.

---

## Testing

- `CronScheduleCalculatorTests` [Service/test/WorkflowService.UnitTests/Scheduling/CronScheduleCalculatorTests.cs] — daily rollover, timezone offset, 6-field seconds, inclusive boundary, invalid tz/cron.
- `ScheduleTriggerSynchronizerTests` [Service/test/WorkflowService.UnitTests/Scheduling/ScheduleTriggerSynchronizerTests.cs] — parse+upsert, UTC/Skip defaults, no-activity removal, invalid-cron removal.
- `ScheduledTriggerIntegrationTests` [Service/test/WorkflowService.IntegrationTests/Scheduling/ScheduledTriggerIntegrationTests.cs] (Postgres/Testcontainers) — register creates row, delete removes row, and **two concurrent `TryClaimAsync` calls on the same due trigger → exactly one wins** (proves the multi-host guarantee against a real database).

---

## Non-Obvious Constraints

- Schedule rows live in the **tenant schema**, not a global table — the scheduler must set the ambient tenant per schema before querying, or it sees nothing (empty schema = "public" default).
- `TryClaimAsync` returning `false` is the normal "another host already claimed this" case, not an error — do not log it as a failure.
- A workflow's schedule is derived from its activity graph at *save time*; editing the cron expression in the workflow designer and saving re-triggers `SyncAsync`, but the row is not updated by any other path (e.g. direct DB edits to `WorkflowDefinitions` bypass the synchronizer).
- Package `Cronos` was added centrally (`Directory.Packages.props`) — not present before this feature.

## Incidental Fixes (discovered while building this)

Two latent bugs in `AutomationService.Migrations`/`WorkflowService.IntegrationTests` were found and fixed as a side effect of getting migrations/tests working — unrelated to scheduling itself:

1. `AutomationServiceDesignTimeDbContextFactory.MigrationsAssemblyName` referenced `"AutomationService.Migrations"`; the built assembly name is `Processity.AutomationService.Migrations` (per the `.csproj`'s `AssemblyName`). Corrected — `dotnet ef migrations add` was previously broken.
2. A duplicate/misnamed `WorkflowDbContextModelSnapshot.cs` (containing class `AutomationDbContextModelSnapshot`, from before the `WorkflowService → AutomationService` rename) caused a `CS0111` duplicate-member error the moment a second snapshot was generated. Consolidated to one conventionally-named `AutomationDbContextModelSnapshot.cs`.
3. `StartWorkflowTests.cs` called `new WorkflowEngine(scopeFactory, logger.Object)` — a 2-arg constructor that doesn't exist (`WorkflowEngine` takes only `IServiceScopeFactory`). Solution-level builds silently skipped recompiling the integration-test project (stale up-to-date cache), masking the break; direct project builds failed. Fixed by dropping the stale `logger` argument.
4. `WorkflowPostgresTestFactory` mapped `ConnectionStrings:WorkflowServiceDb` — stale from the same rename; `AddModuleDbContext` actually resolves `AutomationServiceDb`. Under the test factory's forced `USE_LOCAL_DB=true`, this would throw `Connection string 'AutomationServiceDb' not found in configuration.` at runtime. Corrected.
