---
type: feature
---

# EventManagement — High-level Functionality Summary

This file summarises the major existing capabilities implemented in the `EventManagement` module (code is under `src/EventManagement/`). The summary maps capabilities to folder areas so you can quickly locate the code that implements them.

## Overview

EventManagement is responsible for modelling and operating events, templates and registrations. It contains domain logic, APIs and admin features for creating event templates, scheduling event instances, managing participants and registrations, and supporting operational workflows (rebookings, attendance lists, cancellations and completions).

## Primary capabilities (modules / responsibilities)

1. Event Templates
   - Purpose: define reusable templates for events (structure, default metadata, capacities, pricing, certificate settings).
   - Where: `EventTemplates/` (Application, Domain, Features, Infrastructure)
   - Key features:
     - Create / read / update event templates (API + command handlers).
     - Certificate-related data management for templates (certificate generation/management features exist under CertificateManagement).
   - Example entry-point: `CreateEventTemplateController` (POST /api/event-management/v1.0/event-templates)

2. Event Instances (scheduling & lifecycle)
   - Purpose: instantiate scheduled occurrences of templates (specific date/time, venue, instructor, capacity).
   - Where: `EventInstances/` (Features include Create, Update, Cancel, Complete, AddParticipantsFromAttendanceList)
   - Key features:
     - Create an event instance from a template (`CreateEventInstance` controller/command).
     - Update, cancel and complete instances (lifecycle management).
     - Add participants from attendance lists (import/attendance-driven participant management).
     - Support for instance-level operations such as capacity checks and status transitions.

3. Registrations (public & direct registrations)
   - Purpose: manage how participants register for event instances, including multiple registration flows.
   - Where: `Registrations/` (Features: RegistrationCreation, DirectRegistration, TwoStepRegistration, CancelRegistration, RebookRegistration, ContactManagement)
   - Key features:
     - Create registrations via different flows (direct and two-step flows).
     - Rebooking support to move registrations between instances.
     - Cancellation handling per registration with appropriate state changes.
     - Contact integration for linking registrations to CoreData contacts (ContactManagement feature).

4. Participants & Attendance
   - Purpose: model participants (people), link them to registrations and event instances, manage attendance and roles.
   - Where: `Participants/`, `Participations/`
   - Key features:
     - Participant creation and lookup.
     - Management of participations (the link between participant and an event instance).
     - Tools for attendance lists and importing/adding participants from attendance sheets.

5. Venues, TimeSlots and Providers
   - Venues: physical or virtual places where events run (`Venues/`)
   - TimeSlots: definitions of recurring slots or time definitions used by scheduling (`TimeSlots/`)
   - Providers: organisations or teams offering events (`Providers/`)
   - Key features:
     - CRUD for venues and providers.
     - Time slot domain logic used by scheduling and availability checks.

6. Instructors and Sales
   - Instructors: staff or external instructors assigned to instances (`Instructors/`)
   - SalesPersons / Sales: support for linking registrations to sales staff (promotion, sales tracking)

7. Rebookings and Operational Workflows
   - Purpose: operational flows for changing event assignments, rebooking participants, and performing bulk operations.
   - Where: `Rebookings/`, `EventInstances/Features/*` and `Registrations/Features/RebookRegistration`
   - Key features:
     - Rebooking workflows with validations.
     - Support for adjusting capacities, waitlists, and notifying subscribers where applicable.

8. Model discovery & admin functionality
   - ModelDiscovery: tooling to introspect domain models (likely used by admin UIs or import tools).
   - EventManagement.Admin: contains admin-specific controllers / features to manage templates, instances and operational tasks.

9. Integration & contracts
   - EventManagement references and exposes models via `EventManagement.Models` and integrates with shared systems:
     - `CoreData.Models` for contact data
     - Event Bus for publishing domain events (`Processity.EventBus`)
     - Mapping, Workflow and Insights services via contracts declared in csproj package refs
   - Where to find contracts: `EventManagement.Models/` project (referenced by implementation)

10. Persistence, migrations and tests
    - DB migrations live in `migration/` (EventManagement.Migrations).
    - Unit and integration tests present under `test/` folders (Admin tests, API tests, integration scenarios and test data generators).

## Example API endpoints (representative)

- POST /api/event-management/v1.0/event-templates — create template
- POST /api/event-management/v1.0/event-instances — create event instance
- POST /api/event-management/v1.0/registrations — create registration (multiple flows exist)
- POST /api/event-management/v1.0/event-instances/{id}/participants/from-attendance-list — add participants from an attendance list
- (Admin) endpoints under `EventManagement.Admin` for management UIs

> Note: Exact routes and request/response DTOs are implemented in the `*Controller.cs` files under `EventTemplates/API` and `EventInstances/API` and the names above reflect the typical shapes found in the codebase.


## Events & async behaviour

- EventManagement publishes domain events via the EventBus package for important state changes (example: event instance created, registration created, instance cancelled) so other modules (e.g., Communications, SocialCare, WorkflowService) can subscribe and react asynchronously.

## Where to look for implementation details

- Business logic & application services: `EventManagement/*/Application`
- Domain entities and value objects: `EventManagement/*/Domain`
- HTTP endpoints and API controllers: `EventManagement/*/API` and `EventManagement.Admin`
- Dependency injection: `DependencyInjection/` folders contained within each area
- Tests & testdata: `test/` folders across the EventManagement solution

## Next steps (recommended)

- Add a short README under `src/EventManagement/` listing the top controllers and their routes for quick discoverability.
- Publish a small `EventManagement.Contracts` package (or keep `EventManagement.Models` tidy) to make inter-module contracts explicit and stable.
- Create a sequence diagram for the most important end-to-end flow (Registration → EventInstance creation → EventBus publishing → Subscriber reaction).

If you'd like, I can:

- Generate a per-feature summary that includes the exact controller class, route and DTO type for each public API.
- Produce a sequence diagram for a chosen flow (which one would you like: registration flow, create-instance flow, or rebooking flow?).

