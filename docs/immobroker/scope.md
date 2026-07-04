# Processity.ImmoBroker — Scope

Swiss real-estate broker process platform. Manages property listings, lead intake, viewing coordination, documents, and contract execution. Deployed at `immobroker.processity.ch` and embeddable via Module Federation.

## What is ImmoBroker?

A platform for **independent real-estate brokers** to:

- **Create & manage listings** (apartments, houses, commercial, land)
- **Receive & qualify leads** (inquiries from public forms or portals)
- **Schedule viewings** (self-booked by leads, no phone tag)
- **Manage documents** (checklists per object type, auto-fetch from registries)
- **Send contracts & collect signatures** (AI-drafted, legally binding e-sign)
- **Track communications** (unified inbox per property)
- **Generate seller reports** (weekly summaries, feedback aggregation)

## Rollout plan

| Phase   | Timeline   | Features | User value                                                  |
| ------- | ---------- | -------- | ----------------------------------------------------------- |
| Phase 1 | Months 1–3 | F1–F5    | Lead funnel (listing → inquiry → qualified → viewing)       |
| Phase 2 | Months 4–6 | F6–F9    | Documents, inbox, seller reports                            |
| Phase 3 | Month 7+   | F10–F15  | AI scoring, registry integrations, e-contracts, portal sync |

See **features.md** for full feature roadmap.

## Project layout

```
Processity.ImmoBroker/
  src/
    ImmoBroker.Core/              ← business logic (Objects, Leads, Viewings, Documents, Inbox, Contacts)
    ImmoBroker.Host/              ← ASP.NET Core entry, DI, Swagger
    ImmoBroker.Migrations/        ← EF Core migrations
  test/
    Processity.ImmoBroker.APITests/
    Processity.ImmoBroker.IntegrationTests/
  .docker/
    local/, dev/, uat/            ← Docker compose per environment
  .nswag/
    generate-clients.ps1          ← NSwag client generator
  ImmoBroker.slnx
```

## Feature structure

Each domain (Objects, Leads, Viewings, Documents, Inbox, Contacts) follows a consistent pattern:

```
{Domain}/
  Domain/
    {Aggregate}.cs              ← aggregate root (e.g., RealEstateObject.cs)
    {ValueObject}.cs            ← value objects (e.g., Address.cs)
  Application/
    {Aggregate}Dto.cs           ← flat data transfer object
    {Aggregate}Mapper.cs        ← internal static mapper (if needed)
    Create{Aggregate}/
      Create{Aggregate}Command.cs
      Create{Aggregate}CommandHandler.cs
      Create{Aggregate}Request.cs
    Update{Aggregate}/
      Update{Aggregate}Command.cs
      Update{Aggregate}CommandHandler.cs
    List{Aggregates}/
      List{Aggregates}Query.cs
      List{Aggregates}QueryHandler.cs
  Controllers/
    {Domain}Controller.cs       ← REST endpoints
  Infrastructure/
    {Aggregate}Repository.cs    ← generic repo, typed ID
```

**Namespace convention:**  
`namespace Processity.ImmoBroker.{Domain}.Application;` — no sub-namespace for use cases.

**Never add:** `Commands/`, `Queries/`, `Dtos/`, `Services/` (type-based) folders.

## Standards

### .NET / C#

- **Pagination:** Use `PaginatedResponse<T>` from SharedKernel (page index 0-based)
- **Results:** Custom `Result<T>` from SharedKernel (no FluentResults)
- **Validation:** Data annotations + guard clauses (no FluentValidation)
- **Mapping:** Manual static mappers (no AutoMapper)
- **DI:** Microsoft.Extensions.DependencyInjection (native)
- **Events:** Publish via CAP (RabbitMQ + PostgreSQL Outbox)
- **Logging:** Serilog (structured)
- **Constructors:** Primary constructors (C# 12)

### Angular / TypeScript

- **Syntax:** `@if` / `@for` (new control flow)
- **i18n keys:** kebab-case (`objects.list.empty`, `leads.qualified.badge`)
- **HTTP clients:** NSwag-generated (never hand-edit)
- **State:** Component-level observables + signals (no NgRx)
- **Components:** Standalone, lazy-loaded routes

## Multi-tenancy

- Framework: **Finbuckle.MultiTenant** (schema-per-tenant, `.UseTenant()` automatic)
- Enforcement: Query interceptor filters by `TenantId` on all reads
- Tenant resolution: JWT claim `tid` or custom header
- Violations: Logged, forbidden responses

## Authorization

- **Provider:** Processity.Authentication (OIDC)
- **Roles:** Broker, OfficeManager, PeopleManager, SalesAgent (future Seller)
- **Permissions:** Role → permission mapping (e.g., Broker has `objects.manage`, `leads.manage`)
- **Bootstrap:** On tenant provision, roles are registered with default role members

## Event-driven

- **Bus:** CAP (RabbitMQ + PostgreSQL Outbox for reliability)
- **Topics:** `immobroker.events.{aggregate}.{event}` (e.g., `immobroker.events.object.created`)
- **Subscribers:** Local handlers + external services (Communications, AutomationService, Integration)
- **Pattern:** Domain event → published in handler → other aggregates subscribe asynchronously

## Integrations

| Service                | Purpose                      | Use                                               |
| ---------------------- | ---------------------------- | ------------------------------------------------- |
| **Auth**               | OIDC, JWT, roles             | Login, token validation                           |
| **Calendar**           | Event scheduling             | Book viewings, reserve slots                      |
| **Communication**      | Email, SMS, templates        | Send notifications, reminders                     |
| **FileService**        | File storage, versioning     | Document uploads, retrieval                       |
| **Integration**        | Third-party adapters         | Registry lookups, bank APIs, portal sync          |
| **AutomationService**  | Workflows, rule engine, cron | Schedule reminders, score leads, generate reports |
| **TenantProvisioning** | Onboarding                   | New broker tenant setup, roles, DB                |

## Frontend

**Deployed at:** `immobroker.processity.ch` (standalone) and embedded in main host app (module federation)

**Shells:**

- **Standalone:** Full-page SPA at domain root
- **Embedded:** Lazy-loaded from main host app (`/planning/immobroker` route)

**Architecture:**

- Feature routes: Objects, Leads, Viewings, Documents, Inbox, Contacts, Settings
- Each route lazy-loads its module
- Shared: API clients (NSwag-generated), navigation service, auth service, i18n

**i18n:** API-driven translations via `Communication.Translations` service

## Database

**Engine:** PostgreSQL 16  
**Multi-tenancy:** Schema-per-tenant (Finbuckle)  
**Migrations:** EF Core (code-first)

**Core tables:**

- `realestateobjects` — listings
- `leads` — inquiries
- `viewings` — scheduled tours
- `documentchecklists`, `documentchecklistitems` — required docs
- `inboxthreads`, `inboxnotes` — unified conversation threads
- `contacts` — sellers & lead contacts

All audited via `BaseEntity<TId>` (CreatedAt, UpdatedAt, CreatedBy, UpdatedBy).

## Testing

**Locations:**

- Unit: `test/Processity.ImmoBroker.UnitTests/` (domain logic, mocked dependencies)
- Integration: `test/Processity.ImmoBroker.IntegrationTests/` (real DbContext)
- API: `test/Processity.ImmoBroker.APITests/` (HTTP calls, multi-tenant isolation)

**Patterns:**

- Happy path + error cases for each use case
- Multi-tenant isolation verified (cross-tenant access forbidden)
- Event publishing verified (handlers called, state changed)

## Deployment

| Env   | Docker port | DB port | Frontend port      | Notes                              |
| ----- | ----------- | ------- | ------------------ | ---------------------------------- |
| Local | 20103       | 5443    | 20102 (federation) | Dev loop, docker-compose           |
| Dev   | 20103       | 5443    | 20102              | CI/CD auto-deploy per commit       |
| UAT   | 20103       | 5443    | 20102              | Manual release candidate promotion |
| Prod  | 443 (HTTPS) | managed | 443 (HTTPS)        | Live production environment        |

## Key files

| Path                                                                                                                               | Purpose                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [ImmoBroker.slnx](ImmoBroker.slnx)                                                                                                 | Solution file             |
| [src/ImmoBroker.Core/Common/DI/ImmoBrokerServiceExtensions.cs](src/ImmoBroker.Core/Common/DI/ImmoBrokerServiceExtensions.cs)       | DI wiring for all domains |
| [src/ImmoBroker.Core/Common/Data/ImmoBrokerDbContext.cs](src/ImmoBroker.Core/Common/Data/ImmoBrokerDbContext.cs)                   | Primary DbContext         |
| [src/ImmoBroker.Host/Program.cs](src/ImmoBroker.Host/Program.cs)                                                                   | ASP.NET setup, middleware |
| [.docker/local/docker-compose.yml](.docker/local/docker-compose.yml)                                                               | Local dev environment     |
| [.nswag/generate-clients.ps1](.nswag/generate-clients.ps1)                                                                         | Frontend client generator |
| [src/ImmoBroker.Core/Auth/Authorization/ImmoBrokerPermissions.cs](src/ImmoBroker.Core/Auth/Authorization/ImmoBrokerPermissions.cs) | Permission constants      |
