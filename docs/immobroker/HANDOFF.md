---
type: howto
---

# ImmoBroker — scaffold handoff

This repo was scaffolded from `Processity.Planning` and re-themed for ImmoBroker (real-estate broker process platform). The Planning template's auth / multi-tenancy / provisioning / licensing / notifications / SignalR plumbing is reused as-is. The five sub-domains (Objects, Leads, Viewings, Documents, Inbox) are placeholder folders.

## Layout

```
src/
  ImmoBroker.Core/              ← business code; multi-domain layout (Common, Auth, Realtime, Notifications, Contacts, Users, Documents…, Objects, Leads, Viewings, Inbox)
  ImmoBroker.Host/              ← ASP.NET Core entry, Program.cs + appsettings + Swagger
  ImmoBroker.Migrations/        ← EF Core migrations project (empty — InitialCreate must be regenerated)
test/Processity.ImmoBroker.APITests/
.docker/local/docker-compose.yml      ← immobroker-api on 20103, immobroker-db on 5443
.docker/{dev,uat,dev_local_exec}/      ← same renames applied
.nswag/generate-clients.ps1            ← updated module list (immobroker-objects/leads/viewings/documents/inbox/notifications/contacts/users/licensing)
ImmoBroker.slnx
```

## Ports & names

| Resource | Value |
| --- | --- |
| Backend host port | `20103` (container 8080) |
| Postgres host port | `5443` (container 5432) |
| DB name / user / pass | `immobroker` |
| Container names | `processity-immobroker-local`, `processity-immobroker-db-local` |
| Authorization ModuleName | `ImmoBroker` |
| License identifier | `immobroker` |
| Frontend dev port (federation) | `20102` (matches `src/app/planning/immobroker-remote.ts`) |
| Frontend dev port (standalone) | next free in your dev range |
| Hub group prefix | `object:<id>` (replaced Planning's `board:<id>`) |

## Tasks you need to do (faster for you than for me)

These were left out of the scaffold because they need credentials, DNS, or judgement calls that can't be safely guessed.

### 1. NuGet PAT
Drop your token into `nuget_pat.txt` at the repo root (gitignored; not copied from Planning). Without it the docker build can't restore Processity.* packages.

### 2. Local DNS / hosts
Add to `/etc/hosts` (or your colima/nginx config) so the standalone shell loads:
```
127.0.0.1 immobroker.processity.localdev
```
Plus whatever reverse-proxy/Caddy rules you use for `*.processity.localdev` → service-port mapping.

### 3. ApiGateway main composition
`ocelot.immobroker.json` is written, but the gateway's bootstrap likely concatenates the per-service `ocelot.*.json` files. Verify whichever code does the merge picks it up — search the gateway repo for `ocelot.planning.json` to find the registration site, mirror it. Restart the gateway after.

### 4. Auth service CORS
Add `https://immobroker.processity.ch` (and `https://immobroker.processity.{localdev,dev}`) to the Auth service's allowed origins — wherever `https://planning.processity.ch` currently lives in Auth config / KeyVault.

### 5. TenantProvisioning — register the new module
Add `"immobroker"` to the licensable-modules list in `Processity.TenantProvisioning`, plus a `plan=immobroker-only` onboarding path analogous to `plan=planning-only`. Search the TenantProvisioning repo for `"planning"` to find the registration spots.

### 6. Compile error cleanup (≈30 min)
The Planning→ImmoBroker bulk rename is done, but a few files still reference deleted business types or planning-only Angular tree pieces. The known ones:

**Backend:**
- `src/ImmoBroker.Core/Contacts/Controllers/ContactsController.cs`, `Contacts/Application/SearchContacts/*`, `Notifications/Controllers/NotificationsController.cs`, `Users/**` — keep as-is, they use the platform abstractions only. Should compile.
- Any remaining `using Processity.ImmoBroker.<Boards|Issues|Sprints|...>` references — `grep -rln "ImmoBroker\.\(Boards\|Issues\|Sprints\|Releases\|Tags\|Projects\|Portfolio\|StrategicGoals\)" src/` to find and delete.
- `SwaggerExtensions.cs` document keys are now `immobroker-objects-v1.0` etc — your `[ApiExplorerSettings(GroupName = "...")]` attributes on new controllers must match.

**Frontend (`Processity.WebApp.Angular/src/immobroker/`):**
- `app/setup/`, `app/auth/`, `app/settings/user-management/` — these still reference `ImmoBrokerNavigationService` / `ImmoBrokerRoles` which now point to the new ImmoBroker-flavored versions. Open the files and rewire any old role-name strings (`Planning.DevelopmentTeamMember` etc.) to the new ones.
- `app/dashboard/dashboard.component.ts` — replaced with a placeholder. The Planning sub-dashboards were deleted; rebuild dashboard widgets as Objects/Leads/Viewings/Documents/Inbox come online.

Run `npm run build` from the Angular monorepo and address whatever the compiler complains about — most will be missing-import-removal type fixes.

### 7. Host-app federation wiring
I added `src/app/planning/immobroker-remote.ts` + `immobroker-dashboard.strategy.ts` but did NOT touch:
- `src/app/app.routes.ts` — add a sibling to the `path: 'planning'` lazy-load entry, using `getImmoBrokerRemoteEntryUrl()` and `IMMOBROKER_EMBEDDED_ROUTES`.
- `src/app/main.ts` — add `immobroker` to the dev-mode remote-entry map (next to the `planning` entry on lines 7 and 11).
- Wherever `DashboardModuleStrategy` providers are registered — add `ImmoBrokerDashboardStrategy`.

### 8. Initial migration
With the new DbContext stripped of business entities, regenerate the initial migration:
```bash
cd src/ImmoBroker.Migrations
dotnet ef migrations add InitialCreate --project ImmoBroker.Migrations.csproj --startup-project ../ImmoBroker.Host
```

### 9. NSwag client generation
After the backend boots and Swagger docs are exposed at `http://localhost:20103/swagger/immobroker-*-v1.0/swagger.json`, run `.nswag/generate-clients.ps1` to regenerate frontend clients.

### 10. Verify
```bash
cd Processity.ImmoBroker/.docker/local
docker compose up --build
# Then: curl http://localhost:20103/health  ← expect 200
```

## What I did NOT do (out of scope for the scaffold)

- **`Processity.Integration` extensions** for Grundbuch / GEAK / cantonal archive / hypothekar / SwissSign. Per the plan, these go as new `IIntegrationTargetMapper` adapters in the Integration service when Phase 2/3 of the rollout lands.
- **Domain types** for Objects, Leads, Viewings, Documents, Inbox. Folders exist (`Domain/`, `Application/`, `API/` per the project's use-case-folder convention) but are empty. Add aggregates one feature at a time, register DbSets on `ImmoBrokerDbContext`, add migrations.
- **AutomationService workflows** (lead scoring, viewing reminders, weekly seller report). These live in AutomationService, not here — set them up when the corresponding aggregates exist.
