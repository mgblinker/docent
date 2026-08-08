---
type: feature
---

# Planning Role Assignment via Default Rule Engine Templates

## Overview

Planning's 4 roles (`Planning.DevelopmentTeamMember` / `Planning.ProjectManager` /
`Planning.PortfolioManager` / `Planning.PeopleManager`, see `PlanningRoles.cs`) can only
be assigned by a caller who already holds `PeopleManager`
(`UsersController`/`AddUserCommandHandler`/`UpdateUserRoleCommandHandler`). Two
mechanisms now exist to bootstrap and maintain these roles without requiring a human
PeopleManager to hand-assign every user:

1. **Admin bootstrap** (existing, unchanged) — `PlanningProvisioningHandler
   .BootstrapAdminUserAsync` auto-grants `PeopleManager` to the tenant admin
   (`eventPayload.AdminEmail`) the first time Planning is provisioned for a tenant, if
   no PeopleManager exists yet.
2. **Rule-driven assignment** (new) — Planning ships one default Rule Engine template,
   seeded automatically for every tenant at provisioning time, that grants
   `PeopleManager` whenever an employee gains a direct report (explicit manager
   assignment, or team-membership cascade) or becomes a team lead — a structural
   org-chart fact, not a JobTitle guess.

These two mechanisms are independent and coexist: the admin bootstrap solves "who can
assign the very first role," the rule template solves "how does PeopleManager keep
propagating to actual managers without someone doing it by hand in the Planning UI."

**JobTitle-text matching was considered and rejected** as the trigger for this — it's
tenant-specific (every company titles roles differently) and brittle to renames (a
title change shouldn't silently revoke/regrant roles). There's currently no
StaffManagement-side structural signal for the other 3 Planning roles
(`ProjectManager`/`PortfolioManager`/`DevelopmentTeamMember`) — those stay manually
assigned via the Planning UI. That's an acceptable manual step: a PeopleManager always
exists (via the admin bootstrap, and now via this rule), so there's always someone able
to do it.

## How it works end to end

```
StaffManagement: employee gains a direct report (ChangeEmployeeRoleCommandHandler's
  NewManagerId, SetManagerOnMembersHandler's team-cascade) or becomes a team lead
  (CreateTeamCommandHandler / UpdateTeamCommandHandler)
  → record.changed.staffmanagement.employee, Fields: { IsManager: true, ContactId }   [docs/backend/StaffManagement/docs/planning-role-assignment-events.md]
  → AutomationService: GenericRecordChangedHandler matches Trigger (SourceModule=StaffManagement, SourceEntity=Employee, FieldFilters=[IsManager])
  → matched rule's PublishModuleEvent action fires
  → module.assignment.requested (CAP), TargetModule=Planning, FunctionCode=planning.people_manager
  → Planning: ModuleAssignmentEventHandler (unchanged) upserts PlanningContact.Role
```

Nothing changed on Planning's consumption side (`ModuleAssignmentEventHandler`,
`PlanningFunctionCodes.ToRole`) — this feature only adds a producer.

Note the event is published against the **manager's own** Employee record, not the
subordinate's whose `ManagerId` field actually changed — the role has to land on
whoever gained the report, not whoever got assigned to them. See
`StaffManagementRecordChangedPublisher.PublishEmployeeBecameManagerAsync` and its 3
call sites for the exact "who does this apply to" logic per trigger.

## Default rule template

Served by `PlanningRuleSeedController`
(`Planning.Core/Common/Provisioning/PlanningRuleSeedController.cs`),
`GET /api/planning/v1.0/internal/seed-data/rules` (internal, no auth — fetched
service-to-service by TenantProvisioning, never called by a browser). Referenced via
`PlanningProvisionableModule.GetMetadata().SeedDataPath`.

| Rule | Condition | Planning role |
|---|---|---|
| Default: Assign Planning People Manager role | `IsManager` Equals `true` | `PeopleManager` |

`Trigger.TriggerType` is `null` (matches the `"Updated"` ChangeType every publish site
uses) — `FieldFilters: ["IsManager"]` is what narrows matching.

## Seeding mechanism (general-purpose)

See `docs/tenantprovisioning/rule-seeding.md` and
`docs/automationservice/architecture.md` for the generic
`SeedDataPath` → `SeedConfigurationDataStep` → AutomationService `rules/seed`
pipeline. Planning is the first (and so far only) module using it.

## Known gaps

- No reconciliation sweep over already-existing employees/managers at seed time — only
  a *future* manager/team-lead assignment triggers the rule. Managers who already had
  direct reports before this feature landed (or before it was seeded for their tenant)
  keep whatever role they already had until they're reassigned a report or team lead
  status again.
- `ChangeEmployeeRoleCommandHandler` in StaffManagement is misnamed — it only ever
  changed JobTitle/Department/Location/ManagerId, never a "role" in the RBAC sense. Not
  renamed as part of this change; tracked separately.
- The generic JobTitle `record.changed` publish (from `OnboardEmployeeCommandHandler`
  and `ChangeEmployeeRoleCommandHandler`) is still emitted — it's legitimate general
  infrastructure a tenant could build their own custom Rule Engine rule against — but
  no seeded default rule consumes it anymore.

## Redeploy

- `Processity.Planning` — new internal seed endpoint + `SeedDataPath` metadata.
- `Processity.AutomationService` — `RuleDto.Trigger` support, `RuleAction.Parameters`
  merge bugfix, new `rules/seed` endpoint.
- `Processity.Backend` — StaffManagement now publishes `record.changed.*` events,
  including the structural `IsManager` signal from `ChangeEmployeeRoleCommandHandler`,
  `SetManagerOnMembersHandler`, `CreateTeamCommandHandler`, `UpdateTeamCommandHandler`.
- `Processity.TenantProvisioning` — `SeedConfigurationDataStep` implemented (was a
  no-op stub before).

**Config**: TenantProvisioning's `Services` section (per-environment appsettings) needs
`Planning` and `AutomationService` entries added — only `Authentication`/`Licensing`/
`ApiGateway` are configured today in the checked environments. Without these, the seed
step logs a warning and no-ops (it's deliberately non-blocking, see
`docs/tenantprovisioning/rule-seeding.md`) — tenant provisioning still completes, but
no default rules get created for new tenants until the config is added.
