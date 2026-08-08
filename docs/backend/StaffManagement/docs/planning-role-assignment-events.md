---
type: feature
---

# Planning Role Assignment via record.changed Events

## Overview

StaffManagement now publishes generic `record.changed.staffmanagement.employee` CAP
events. This lets the Rule Engine (AutomationService) react to StaffManagement changes
and drive role assignment in other modules — the first consumer being Planning's
`PeopleManager` role — but the mechanism is generic and not Planning-specific. Two
independent kinds of change get published:

1. **JobTitle** — general-purpose, no seeded default rule consumes it (a tenant could
   build their own custom rule against it if they want JobTitle-driven automation).
2. **IsManager** (structural) — fired against the *manager's own* Employee record when
   they gain a direct report or become a team lead. This is what Planning's seeded
   `PeopleManager` rule actually watches — deliberately not JobTitle text, see
   `docs/planning/role-assignment-rules.md` for why.

## Why

Planning's roles can only be assigned by an existing PeopleManager — there was no
ongoing, low-friction way to grant PeopleManager to anyone beyond the tenant's
bootstrap admin without a human already holding that role doing it by hand via the
Planning UI. See `docs/planning/role-assignment-rules.md` and
`docs/automationservice/architecture.md` for the rest of the flow.

## What changed

- `StaffManagementRecordChangedEvent` (`StaffManagement.Models/Staff/Events/`) — new
  record mirroring `Processity.Licensing.Models.Events.LicensingRecordChangedEvent`
  (same `record.changed.*` convention, no `[EventCatalog]` attribute — consistent with
  the Licensing event, which also isn't catalogued).
- `StaffManagementRecordChangedPublisher.PublishEmployeeBecameManagerAsync`
  (`StaffManagement.Service/Staff/Events/`) — shared helper publishing the `IsManager`
  signal, called from:
  - `ChangeEmployeeRoleCommandHandler` — explicit `NewManagerId` assignment; publishes
    for the **new manager**, not the subordinate whose `ManagerId` field changed.
  - `SetManagerOnMembersHandler` — team-membership cascade (adding members to a team
    auto-assigns the team lead as their manager); publishes for the **team lead**.
  - `CreateTeamCommandHandler` / `UpdateTeamCommandHandler` — becoming a team's lead;
    publishes for the **new lead**.
- `OnboardEmployeeCommandHandler` and `ChangeEmployeeRoleCommandHandler` also still
  publish the plain `JobTitle` change (`ChangeType: "Created"`/`"Updated"`,
  `ChangedFieldNames: ["JobTitle"]`) — unconsumed by any seeded rule today, kept as
  general infrastructure.

## Consumer

`GenericRecordChangedHandler` in AutomationService subscribes to the `record.changed`
CAP topic prefix and matches rules by `Trigger.SourceModule`/`SourceEntity`/
`TriggerType`/`FieldFilters`. See `docs/automationservice/architecture.md`.

## Redeploy

Redeploy `Processity.Backend` (StaffManagement module is part of the monolith).
