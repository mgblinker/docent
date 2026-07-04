# ImmoBroker — Feature Delivery Plan

## Context

The integration scaffold (new `Processity.ImmoBroker` service + dual-shell Angular tree + gateway + provisioning) is in place. Backend builds clean, frontend builds clean, docker-compose is wired. Now we move from "skeleton exists" to "real-estate brokers get value."

The brief from the user: build features one at a time, each delivering tangible value standalone. No half-finished horizontal slices. Each completed feature should be something a broker can use end-to-end before the next one starts.

This plan: (1) full backlog of features in delivery order, (2) one-paragraph description of each, (3) detailed implementation plan for the first feature.

## Feature backlog (delivery order)

Numbered by sprint, each feature is independently shippable and increments the previous.

| # | Feature | Standalone value | Reuses |
|---|---|---|---|
| **F1** | **Real-Estate Object management** | Centralized listing record — replaces Excel/email tracking | (none — foundational) |
| F2 | Public Lead intake form | Structured inquiry capture per object — replaces email triage | F1, FileService (optional photos) |
| F3 | Manual lead qualification | Broker tags leads Hot/Warm/Cold + standard-rejection action | F2, CommunicationService (email) |
| F4 | Viewing slot self-booking | No more phone-tag — qualified leads pick from broker's available slots | F3, Calendar |
| F5 | Viewing reminders & feedback | 48h/24h/2h reminders + auto post-viewing feedback request → seller-visible | F4, CommunicationService (SMS+Email), AutomationService |
| F6 | Document hub MVP | Per-object checklist of required docs, manual upload, status tracking | F1, FileService |
| F7 | Unified inbox projection | All inquiry/viewing/email/SMS comms per Object×Party in one thread | F2-F5, Communications.Interactions, RealtimeInteraction (live updates) |
| F8 | Template library | Reusable email/SMS templates with merge fields | F3, F7, Communications.Templates |
| F9 | Weekly seller report | Cron'd summary email per object: inquiries, viewings, feedback | F5, F7, AutomationService cron, CommunicationService |
| F10 | AI lead scoring (R/Y/G) | Replaces F3's manual scoring — broker only sees qualified leads | F3, AutomationService Rule Engine |
| F11 | Swiss registry integrations (Grundbuch, GEAK, cantonal archive) | Document procurement: weeks → days | F6, Processity.Integration (5 new adapters) |
| F12 | Hypothekar pre-check (UBS/ZKB/Raiffeisen) | Filters out leads who can't finance the asking price | F10, Processity.Integration |
| F13 | AI contract drafts | Per-canton, per-object-type LLM-drafted Kaufvertrag → PDF | F6, PdfService, LLM call |
| F14 | QES e-signature (SwissSign) | Legally-binding digital signing | F13, Processity.Integration |
| F15 | Portal sync (Homegate, ImmoScout24) | Inquiry import + listing sync — single source of truth | F1, F2, Processity.Integration |

**Rough rollout shape** matches the PDF's three phases:
- **Phase 1 (months 1–3):** F1–F5 — Lead funnel end-to-end
- **Phase 2 (months 4–6):** F6–F9 — Document/inbox/reporting layer
- **Phase 3 (month 7+):** F10–F15 — AI, integrations, polish

## Feature descriptions

**F1 — Real-Estate Object management.** Broker creates a listing record: address, type (Wohnung/Haus/MFH/Gewerbe/Grundstück), asking price, key facts (rooms, m², year), seller contact, status (Draft/Active/Reserved/Sold/Archived). List view with filters, detail view with edit, soft-archive (no hard delete — every Object is a transaction record). URL-safe `slug` per object (used by F2's public form). One screen tells the broker what's on their plate today.

**F2 — Public Lead intake form.** Each Object gets a public URL (`/inquire/{slug}` on the standalone domain). Anonymous form captures contact + initial message. Creates a `Lead` aggregate linked to the Object. Broker sees inbox of leads per object. No qualification yet, just structured capture.

**F3 — Manual lead qualification.** Broker reviews leads in inbox, opens a qualification panel: Kaufabsicht, Zeitrahmen, Budget range, Eigenkapital range (free-text initially, no scoring engine). Marks lead as Hot / Warm / Cold / Rejected. "Reject" sends a templated standard rejection email via CommunicationService.

**F4 — Viewing slot self-booking.** Broker opens an Object, defines available time windows (e.g. "Sa 10-12 and 14-16"). A "qualified" lead receives a magic link to a public slot picker. Slot reservation creates a Calendar item via the Calendar service and a `Viewing` aggregate linking Object↔Lead↔CalendarItem.

**F5 — Viewing reminders & feedback.** AutomationService workflow triggered on `ViewingBooked`: schedule SMS+email reminders at T-48h / T-24h / T-2h via CommunicationService. At T+2h send a feedback questionnaire. Aggregate feedback into a per-Object summary that the seller can see.

**F6 — Document hub MVP.** Predefined checklist per object type (StWE → Grundbuchauszug, GEAK, Stockwerkreglement, ETV-Protokolle 3J, Versicherungspolice; EFH → different list). Broker uploads docs via FileService. Checklist UI shows status per item (Missing / Uploaded / Sent-to-Lead). Version history via FileService's `ChangesController`.

**F7 — Unified inbox projection.** Per-Object×PartyContact thread that joins ImmoBroker's `InboxThread` correlation record with `Processity.Backend.Communications.Interactions` history (email, SMS, portal messages) plus broker-internal notes. Live updates via SignalR hub.

**F8 — Template library.** Tenant-scoped library of email and SMS templates with merge fields (`{ObjectAddress}`, `{ContactFirstName}`, `{ViewingSlot}`, etc.). Used by F3 (rejection), F4 (booking confirmation), F5 (reminders), F7 (manual sends). Templates persist in Communications.Templates with an ImmoBroker category tag.

**F9 — Weekly seller report.** AutomationService cron workflow: every Monday 06:00 tenant-local, generate per-Object report (inquiries received, viewings booked/completed/no-show, feedback themes) and send templated email to seller contact via CommunicationService.

**F10 — AI lead scoring.** Replaces F3's manual scoring. AutomationService rule evaluates questionnaire answers + optional hypothekar pre-check → R/Y/G score. Broker sees a sorted inbox: Green leads first. Rule version-controlled, can be tuned per tenant.

**F11 — Swiss registry integrations.** Five new `IIntegrationTargetMapper` adapters in `Processity.Integration`: GrundbuchAdapter (per Kanton), GeakAdapter, CantonalArchiveAdapter. Document checklist auto-pulls each when an Object is listed; files land in FileService, checklist items flip to "Vorhanden".

**F12 — Hypothekar pre-check.** Adapters for UBS, ZKB, Raiffeisen tragbarkeit APIs in `Processity.Integration`. Called from the Lead qualification flow (F10 input). Lead inbox shows financing-likelihood badge.

**F13 — AI contract drafts.** Object listed → broker clicks "Draft Kaufvertrag" → LLM call (Anthropic via SharedKernel) → HTML → `Processity.PDF` renders. Per-canton, per-object-type templates. Broker reviews + edits before sending.

**F14 — QES e-signature.** SwissSignQesAdapter in `Processity.Integration` initiates a QES-conform signing session, polls status, retrieves signed PDF back into FileService. Triggered from a finalized contract draft.

**F15 — Portal sync.** Homegate + ImmoScout24 adapters in `Processity.Integration`: outbound listing sync (push Object metadata), inbound inquiry import (create Leads from portal messages). Bidirectional with conflict resolution.

## First feature implementation — F1: Real-Estate Object Management

### Why this is first

- **Foundational.** Every later feature references an Object — Leads link to it, Viewings happen on it, Documents belong to it.
- **Standalone value.** Even without F2–F15, a broker gets a single home for their listings, replacing scattered spreadsheets.
- **Pattern-pure.** It's a textbook tenant-scoped CRUD aggregate. Mirrors Planning's `Projects/` template 1:1.
- **No external service deps.** No Calendar, Communication, Integration, OCR, PDF, AutomationService — just the module's DbContext.
- **~1 week to ship.** Backend mirror + frontend list/detail/form + NSwag regen + one migration.

### Scope (what's in F1)

- Create, read, update, archive (soft-delete by status) Object records
- Filter list by status / type / text search
- Slug field generated on create — pre-builds F2's public-URL keying
- Field set: address (value object), type, status, headline, description, asking price, living area, plot area, room count, year built, seller contact id (links to `ImmoBrokerContact`), listed-at timestamp
- Authorization: `ImmoBrokerPermissions.ObjectsManage` required (Broker, OfficeManager, PeopleManager roles already have it)
- Audit: `CreatedBy`, `UpdatedBy`, `CreatedAt`, `UpdatedAt` via `BaseEntity` from SharedKernel

### Out of scope (deferred to later features)

- Photos / floorplans → F1.5 nice-to-have OR F6 (covered by FileService when document hub lands)
- Public visibility (only authenticated brokers see Objects) → F2 adds the public slug-resolver endpoint
- Portal sync → F15
- Linking sellers to CoreData contact authority → uses `ImmoBrokerContactId` mirror only

### Backend — `Processity.ImmoBroker.Core/Objects/`

Mirror Planning's [`Projects/`](Processity.Planning/src/Planning.Core/Projects/) layout. New files:

```
Objects/
  Domain/
    RealEstateObject.cs       ← aggregate (BaseEntity<RealEstateObjectId>)
    ObjectType.cs             ← enum: Wohnung, Haus, MehrfamilienHaus, Gewerbe, Grundstueck
    ObjectStatus.cs           ← enum: Draft, Active, Reserved, Sold, Archived
    Address.cs                ← value object (Strasse, Hausnummer, PLZ, Ort, Kanton)
  Application/
    RealEstateObjectDto.cs    ← flat DTO (matches Planning's ProjectDto location)
    ObjectMapper.cs           ← file-scoped static mapper, called as ObjectMapper.MapToDto(...)
    CreateObject/
      CreateObjectCommand.cs           ← record : IRequest<Result<Guid>>
      CreateObjectCommandHandler.cs
      CreateObjectRequest.cs           ← public DTO posted from FE
    UpdateObject/
      UpdateObjectCommand.cs
      UpdateObjectCommandHandler.cs
      UpdateObjectRequest.cs
    ArchiveObject/
      ArchiveObjectCommand.cs
      ArchiveObjectCommandHandler.cs
    GetObjects/
      GetObjectsQuery.cs               ← supports filters: status[], type[], search, paging
      GetObjectsQueryHandler.cs        ← returns PaginatedResponse<RealEstateObjectDto>
    GetObjectById/
      GetObjectByIdQuery.cs
      GetObjectByIdQueryHandler.cs
  Controllers/
    ObjectsController.cs      ← [Authorize], [ApiExplorerSettings(GroupName="immobroker-objects-v1.0")], route /api/immobroker/v{version}/objects
  Infrastructure/
    RealEstateObjectRepository.cs   ← extends GenericRepository<RealEstateObject, RealEstateObjectId, ImmoBrokerDbContext>
```

**EF configuration:** `src/ImmoBroker.Core/Common/Data/Configurations/RealEstateObjectConfiguration.cs` (auto-discovered by `ApplyConfigurationsFromAssembly`):
- Unique index on `(TenantId, Slug)` — slugs unique per tenant
- `Address` mapped as owned entity (composition, not separate table)
- `AskingPrice` precision (18, 2)
- Required-field constraints

**DbContext wiring** (modify [`ImmoBrokerDbContext.cs`](Processity.ImmoBroker/src/ImmoBroker.Core/Common/Data/ImmoBrokerDbContext.cs) + [`IImmoBrokerDbContext.cs`](Processity.ImmoBroker/src/ImmoBroker.Core/Common/Data/IImmoBrokerDbContext.cs)):
- Add `public DbSet<RealEstateObject> RealEstateObjects { get; set; } = null!;`
- The `RealEstateObjectId` TypedId converter is **already registered** from scaffolding (line 41–45)

**DI wiring** (modify [`ImmoBrokerServiceExtensions.cs`](Processity.ImmoBroker/src/ImmoBroker.Core/Common/DI/ImmoBrokerServiceExtensions.cs)):
- Register `RealEstateObjectRepository` in `AddImmoBrokerApplicationServices()`

**Migration:** `dotnet ef migrations add AddObjectsFeature --project src/ImmoBroker.Migrations --startup-project src/ImmoBroker.Host`

### Frontend — `src/immobroker/app/objects/`

```
objects/
  objects.routes.ts                  ← OBJECTS_ROUTES export
  object-list/
    object-list.component.ts         ← list view: MatTable, filters, paging
    object-list.component.html
    object-list.component.scss
  object-detail/
    object-detail.component.ts       ← detail with edit-in-place
    object-detail.component.html
    object-detail.component.scss
  object-form/
    object-form.component.ts         ← reactive form, used by create + edit
    object-form.component.html
  object-status-chip/
    object-status-chip.component.ts  ← presentational, color-by-status
```

**Generated client:** `ImmobrokerObjectsClient` from [`immobroker-objects-client.ts`](Processity.WebApp.Angular/src/immobroker/shared/services/api/immobroker-objects-client.ts) — currently an NSwag stub; regenerates after backend boots via `.nswag/generate-clients.ps1`.

**Route registration:**
- [`app.routes.ts`](Processity.WebApp.Angular/src/immobroker/app/app.routes.ts) — uncomment the existing placeholder: `{ path: 'objects', loadChildren: () => import('./objects/objects.routes').then(m => m.OBJECTS_ROUTES) }`
- [`embedded.routes.ts`](Processity.WebApp.Angular/src/immobroker/app/shells/embedded-shell/embedded.routes.ts) — same lazy entry

**Navigation:**
- [`standalone-shell.component.ts`](Processity.WebApp.Angular/src/immobroker/app/shells/standalone-shell/standalone-shell.component.ts) — add "Objekte" nav button calling `nav.toObjects()`
- [`immobroker-navigation.service.ts`](Processity.WebApp.Angular/src/immobroker/shared/services/immobroker-navigation.service.ts) — `toObjects()` already exists from scaffolding

**i18n:** Use kebab-case keys per house style: `objects.list.empty`, `objects.form.headline.label`, `objects.status.active`, etc.

### Tests

- `test/Processity.ImmoBroker.APITests/Objects/CreateAndFetchObjectTests.cs` — happy path: provision a tenant, POST an Object, GET it back.
- `test/Processity.ImmoBroker.APITests/Objects/TenantIsolationTests.cs` — provision two tenants, create Objects in each, verify the other can't see them (this is the load-bearing check on Finbuckle wiring).

### Reused components — do not reinvent

- [`BaseEntity<TId>`](Processity.SharedKernel) — gives `Id`, `CreatedAt`, `UpdatedAt`, audit fields
- [`TypedId<T>`](Processity.SharedKernel) — `RealEstateObjectId` already defined in `Common/Domain/ValueObjects/ImmoBrokerIds.cs`
- [`GenericRepository<TEntity, TId, TDbContext>`](Processity.SharedKernel) — repo base
- [`PaginatedResponse<T>`](Processity.SharedKernel) — per project standard, do not invent a custom paged DTO
- [`Result<T>`](Processity.SharedKernel) — the project's custom Result (not FluentResults)
- `ICurrentUserProvider` — for CreatedBy / UpdatedBy
- Existing TypedId converters in [`ImmoBrokerDbContext.cs:41-50`](Processity.ImmoBroker/src/ImmoBroker.Core/Common/Data/ImmoBrokerDbContext.cs#L41-L50)
- Swagger group `immobroker-objects-v1.0` already declared in [`SwaggerExtensions.cs`](Processity.ImmoBroker/src/ImmoBroker.Host/Extensions/SwaggerExtensions.cs)
- Permission `ImmoBrokerPermissions.ObjectsManage` already declared

### Verification

1. **Compile** — `dotnet build` from `Processity.ImmoBroker/` → 0 errors.
2. **Migration** — `dotnet ef migrations add AddObjectsFeature ...` → migration file generated; `dotnet ef database update` against local Postgres applies it.
3. **Boot** — `docker compose up -d` in `.docker/local/` → `curl http://localhost:20103/health` returns 200.
4. **Swagger** — Open `http://localhost:20103/swagger` → `immobroker-objects-v1.0` group visible with 5 endpoints.
5. **NSwag regen** — `pwsh .nswag/generate-clients.ps1 -Environment Local` → `immobroker-objects-client.ts` now has real classes (not empty stub).
6. **Frontend** — `ng serve Processity.Immobroker.App` (or via docker), navigate to `/objects`:
    - Empty list shows empty-state.
    - "Neues Objekt" → form → submit → list shows the new Object.
    - Click row → detail → edit → save → list reflects change.
    - Archive → status flips to Archived, row drops from default filter.
7. **Tenant isolation** — provision a second tenant via TenantProvisioning, log in as it, verify the first tenant's Objects are invisible (this is the Finbuckle smoke test).
8. **API tests** — `dotnet test test/Processity.ImmoBroker.APITests/` → all green.

### Definition of done

- Backend builds + tests pass
- Migration applied cleanly to local DB
- Swagger doc visible at `/swagger`
- NSwag client regenerated and committed
- Frontend builds (immobroker config) + standalone shell shows /objects route end-to-end
- Tenant isolation verified manually with 2 tenants
- HANDOFF.md updated: F1 marked complete, F2 listed as next

Once green: F2 (Public Lead intake) can start. F2 adds the first public-endpoint design decision and the Lead aggregate; the public form will post against `/inquire/{slug}` and resolve the tenant via the Object's slug.
