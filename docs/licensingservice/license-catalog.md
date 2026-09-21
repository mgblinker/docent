---
title: License Catalog — Pricing-Page Alignment
type: architecture
audience: internal
---

# License Catalog — Pricing-Page Alignment

> Status: **partly merged** (2026-09-21) — Planning, ApiGateway catalog, WebApp dialog and the v1 migration script are merged; implied-features work is on `feat/license-implied-features` (LicensingService, ApiGateway, WebApp), Education/Event/Sales on `feat/license-catalog-pricing-alignment` (Backend). Internal — pricing structure and licensing gaps.

## Principle

The website pricing page (`Processity.Website/components/pricing/`) is the single master for what can be licensed.
Every entry in the tenant-level **Assign Licenses** dialog is a pricing-page SKU; each priced seat type is exactly one licensable feature (the Licensing service keeps one seat pool per feature: one `TenantLicenses` row per tenant + feature).
**Only seat features are stored as license rows.** The features an app bundles are *implied* by its seats: the Licensing service expands them wherever it reports features (tenant license state, user license state, and the identifiers of the license-activated event that drives module provisioning). Nothing else is individually selectable.

## Where the catalog lives

- **Seat types (what the dialog lists):** `Processity.ApiGateway/Host/Services/FeatureOrchestration/LicenseSkuCatalog.cs` — SKU → seat types. The gateway resolves it against the discovered features and serves it as `skus` on `GET /api/v1.0/licensing/features/discovery`. The Angular dialog renders only `skus` and sends only the seat feature.
- **Implied features:** `Processity.LicensingService/Service/src/Licensing.Service/Domain/LicenseFeatureImplications.cs` — seat feature → implied features. Unit-tested.
- Keep the seat lists of the two in sync when a seat is added or renamed.

Features that appear in no SKU (ImmoBroker, Marketing, infra) are simply not assignable from the UI.

## Catalog (as built)

| SKU | Seat types (stored feature) | Implied by every seat (not stored) |
|---|---|---|
| Social Care | Intake & Backoffice (`social-care-role-administrative`), Social Worker & Carer (`…-carer`), External Partner (`…-referrer`) | `social-care-module`, `care-management-module`, `care-plans` |
| Gardening | Staff (`gardening-core`) — see gaps | handouts, mobile-capture, outlook-sync |
| Course Management | Staff (`course-app`) | `education-module` |
| eLearning | Authors & Course Owners (`elearning-app`) | `education-module` |
| Event Management | Staff (`event-management-module`) | event-instances, participant-management, event-analytics |
| Planning | Full (`planning-seat-full`), Viewer (`planning-seat-viewer`) | `planning-module` |
| CRM | Sales (`crm-seat-sales`), Marketing (`crm-seat-marketing`), Viewer (`crm-seat-viewer`) | `crm-module`, opportunity-management, ideas-management |
| Processity Drive | Users (`drive`) | — |
| Platform | Users (`automation-service-module`) | — |

**Shared bundle (implied by any seat):** Activities, Calendar, ProductData, RelationshipModule.
**Applied automatically, never selectable:** `platform.basic-access` and the `IsRequired` modules (CoreData, StaffManagement, Communications, Integration, Mapping, Settings, FileService).
**Not licensable (hidden):** ImmoBroker.

## Decisions taken

1. Sales + Marketing = **CRM** app. RelationshipModule is base (shared, also used by care management), ProductData is base.
2. **Education** split into `course-app` / `elearning-app`; Teacher/Student are no longer license seats (students = participant tier, billed by band).
3. **Activities** is available with every app.
4. **Base license** is applied automatically with any app; not selectable.
5. **Planning**: `planning-module` is the entitlement; standalone vs. embedded is deployment. Seats: Full and Viewer.
6. Seat types follow the pricing-page roles. Apps without per-role enforcement use license-only seat features.

## Code changes

| Repo | Change |
|---|---|
| ApiGateway | `LicenseSkuCatalog` (seat types), `Skus` on the discovery response |
| WebApp.Angular | Assign-licenses form rewritten: flat SKU cards with seat steppers (goal search, Core/Additional split, feature chips removed); sends only the seat feature; `LicenseSku` types in `licensing-settings.api.service.ts` |
| Planning | Seats `planning-seat-full/-viewer`; new `Planning.Viewer` role (no permissions); `FeatureNameForRole` Dev/PM/Portfolio/People → full, Viewer → viewer; standalone/role features removed; webapp role list + Viewer |
| Backend/Education | `course-app`, `elearning-app` replace Teacher/Student; provisioning identifiers now match emitted feature names |
| Backend/EventManagement | provisioning identifiers now match `event-management-module` (previously only the legacy `event-management`) |
| Backend/Sales | `crm-seat-sales`, `crm-seat-marketing`, `crm-seat-viewer` |
| LicensingService | `LicenseFeatureImplications` (+ unit tests) applied to tenant state, user state and activated-event identifiers; `scripts/2026-09-21-license-catalog-alignment.sql` per-tenant data migration |

## Migration (per tenant)

`Processity.LicensingService/scripts/2026-09-21-license-catalog-alignment.sql` — psql, transactional, **dry run by default**, idempotent, no hard deletes (retired rows get `DeletedAt`).

| Old | New |
|---|---|
| `planning-role-*` (4 pools) | `planning-seat-full` — pools summed, user assignments re-pointed (duplicates stay on the retired row) |
| `planning-standalone` | merged into `planning-module` (then retired, see below) |
| `education-teacher` | `course-app` |
| `education-student` | retired |
| `crm-module` | `crm-seat-sales` — seats copied once, assignments re-pointed |
| (optional `-v grant_elearning=1`) | `elearning-app` copied from Teacher seats |
| **Bundled rows** (`gardening-handouts/-mobile-capture/-outlook-sync`, `planning-module`, `social-care-module`, `care-management-module`, `care-plans`, `education-module`, event and CRM bundle features, shared bundle) | **Retired** once the tenant holds a seat that implies them. Users assigned only to a retired bundled row are moved onto the app's first seat row (shared bundle: not moved). Tenants without a seat keep their rows. `marketing-module` and unknown rows are left alone. |

```
psql "$LICENSING_DB" -v ON_ERROR_STOP=1 -v tenant=<uuid>            # dry run, prints BEFORE/AFTER, rolls back
psql "$LICENSING_DB" -v ON_ERROR_STOP=1 -v tenant=<uuid> -v apply=1 # persist
```

Tested on a throwaway Postgres 16 (colima): dry-run leaves data untouched, apply merges/retires as above, stranded users keep access, re-run changes nothing, other tenants untouched.

**Order:** deploy **LicensingService first** (retired rows are only safe once implications are expanded), then Planning, Backend, ApiGateway and WebApp (no SharedKernel release needed), then run the script per tenant. The Licensing license cache may serve old state until its TTL expires or the service restarts.

## Known gaps / follow-ups

1. **Planning Viewer is not enforced read-only.** Only `UsersManage` is permission-gated in Planning; the ~53 mutating endpoints are not. The Viewer role has no permissions, so it is nominal until writes are gated with `[RequiresPermission(IssuesWork)]` — safe for existing roles (all hold it) but needs the role/permission seed to have run for existing tenants.
2. **Gardening Office vs Field seats.** The app consumes one `gardening-core` seat per staff member and has no staff kind; pricing has two rates. Needs `Staff.Kind` + consumption by kind, then two seat features.
3. **Realtime Interaction is not in the catalog.** It is core infra (`IsRequired=true`, provisioned for every tenant); making it licensable would stop new tenants getting it. Needs a product decision.
4. **Integrations add-on, OCR, Process Insights** are billing/metering items, not licenses — not in the dialog.
5. **CRM is not on the pricing page yet** and has no price. Proposal mirroring Planning: Sales CHF 19, Marketing CHF 15, Viewer CHF 7 per user/month. CRM seats are license-only (no app roles); users are assigned via the generic user-license assignment.
6. **Unused translation keys** (`settings.tenant.license-form.goal-search-*`, `core-*`, `best-matches`, `no-matches`, `role-section-label`, `features-heading`, `additional-modules-heading`, `apps-heading`) can be removed from the translation seed.
7. `LicenseAssignedEventHandler` in Planning matches the literal feature `"planning"`, which no license carries — pre-existing, likely never fires.
