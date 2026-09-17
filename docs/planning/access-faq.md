---
title: Planning App — Access & Data Visibility FAQ
type: manual
audience: public
---

# FAQ: Planning App Access & Data Visibility

## What does a user need to see data in the Planning app?

Two independent gates, both required:

1. **Correct tenant.** Planning data is isolated per tenant via
   Finbuckle.MultiTenant — `PlanningDbContext` resolves the tenant from
   the session/JWT and scopes all queries to that tenant's schema. A
   user simply cannot query another tenant's data, regardless of role.
2. **A `PlanningContact` record in that tenant** — the local membership
   row. Without one, `GetMeQueryHandler` fails with `"Tenant user record
   not found."` and the frontend can't establish an identity, so there
   is no data visibility at all.

A `PlanningContact` is created when:

- Licensing assigns the user the `"planning"` feature (event
  `licensing.license.assignedtouser`, handled in
  `LicenseAssignedEventHandler`), which auto-creates the contact with
  default role `DevelopmentTeamMember`, **or**
- An existing **People Manager** explicitly adds them
  (`AddUserCommandHandler`, restricted to the `PeopleManager` role), or
  via the fuller onboarding flow (`OnboardPlanningMemberCommandHandler`,
  which also creates a CoreData contact + StaffManagement employee and
  sends a set-password link).

Revocation happens via `LicenseRevokedEventHandler` /
`ModuleAssignmentEventHandler` (event
`module.assignment.requested`), which removes the contact.

## What access levels (roles) exist?

Four roles, defined in `PlanningRoles`, cumulative in scope (each level
includes everything below it):

| Role | Permission gained | Effective permissions |
|---|---|---|
| `DevelopmentTeamMember` | `planning.issues.work` | Work on issues |
| `ProjectManager` | `planning.projects.manage` | + manage projects |
| `PortfolioManager` | `planning.portfolio.view` | + view portfolio |
| `PeopleManager` | `planning.users.manage` | + manage users (full set) |

Role→permission mapping is seeded per tenant
(`PlanningAuthorizationDefaults`). Roles can also be derived from HR
function codes (`PlanningFunctionCodes.ToRole`, e.g.
`planning.portfolio_manager` → `PortfolioManager`). The Auth service is
the authoritative source for role/permission claims; `PlanningTenantUser.Role`
is a locally cached mirror.

## Is there per-project or per-board sharing (an ACL)?

No. There is no `ProjectMember` / `IsMember` concept in Planning.
Once a user has a `PlanningContact` in a tenant, visibility of
issues/boards/projects within that tenant is governed purely by
role/permission — not by per-project or per-board membership.

## How is access enforced in code?

Controllers (`IssuesController`, `ProjectsController`,
`PortfolioController`, `UsersController`) only enforce authentication
(`[Authorize]`) at the class level — no per-endpoint policy attributes.
Finer-grained role checks (e.g. "only PeopleManager can add users") are
done imperatively inside application handlers, e.g.
`AddUserCommandHandler`.

## Summary

To see any Planning data, a user needs: (1) a session resolving to the
right tenant, and (2) a `PlanningContact` in that tenant — granted via
license assignment or People Manager onboarding — carrying one of the
four roles above. There is no additional per-project sharing layer.
