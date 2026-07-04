---
type: howto
---

# Welcome — Processity.Backend

Welcome to the `Processity.Backend` repository. This file provides a compact orientation: what this project contains, how the code is organised, where to find important documentation, and quick commands to get started developing and testing locally.

**Quick Links**

- **Code root**: `c:/Projects/Processity.Backend`
- **Solution file**: `Processity.sln`
- **Host projects**: `Host/` folders under each service (e.g., `SocialCare/Host`, `Host/`)
- **Developer docs**: `docs/` (includes `data-model-relationships.md`)

---

## Purpose

`Processity.Backend` is the monorepo for the server-side services used by the Processity platform. It contains multiple bounded contexts (e.g., `SocialCare`, `CareManagement`, `StaffManagement`, `CoreData`) implemented as .NET projects and grouped by feature folders. Each folder usually contains `src/`, `migration/` and `test/` subfolders.

## Getting started (developer quickstart)

Prerequisites

- .NET SDK (check `global.json` if present)
- Docker (for running dependent services locally)
- Optional: `dotnet-ef` if you run EF migrations locally

Common commands (run from repository root `c:/Projects/Processity.Backend`)

```pwsh
# build the full solution
dotnet build Processity.sln

# run tests for a specific project (example)
dotnet test SocialCare/test/SocialCare.Tests.csproj

# run a specific Host project (example)
cd Host
dotnet run --project Host.csproj
```

---

## Repository layout (high level)

- `Host/` — shared host project and common startup configuration
- `CoreData/` — canonical tenant, user, person data
- `SocialCare/` — social care domain: cases, assessments, appointments
- `CareManagement/` — care plans, tasks, assignments
- `StaffManagement/` — staff, teams, roles
- `CourseManagement/` — courses and enrollments
- `ProductData/` & `Sales/` — product catalog and sales/orders
- `FileService/` — file metadata and storage helpers
- `TestingHost/` — test helpers, fakes and integration test support
- `Host/` folders under each domain contain `appsettings.*.json` and `Program.cs` / `Startup.cs` files for running locally or in containers

Subfolders common to modules:

- `src/` — implementation code
- `test/` — unit and integration tests
- `migration/` — database migration scripts

---

## Important documentation

- Data model overview: `docs/data-model-relationships.md` (ERD and module dependency graph)
- Architecture notes: `ARCHITECTURE.md`
- Host and environment examples: `Host/appsettings.Development.Docker.json`, `Host/appsettings.Local.json`

## Contributing & coding guidelines

- Follow existing folder patterns: keep domain code under `src/`, tests under `test/`.
- Use the shared `Processity.SharedKernel` for common utilities and base classes.
- Prefer explicit mapping between domain models and DTOs — avoid AutoMapper unless a module already uses it.
- Use `async/await` for IO and long-running operations.
- Add XML comments for new public APIs.

---

## Local development tips

- Start dependent services (database, event-bus) using Docker Compose if available in `EnvironmentSetup/` or per-service `.docker` folders.
- Use the `TestingHost` utilities for faster integration tests and local seeding.
- When introducing schema changes, add migration scripts under the module's `migration/` directory and update tests.

---

If you want, I can also:

- create per-module `README.md` files with focused developer instructions,
- generate a physical ERD by scanning DB migration files, or
- add a short CONTRIBUTING.md describing PR, branching and review rules.

Pick one option and I will continue.
