# Processity.Planning — Scope

Standalone planning module (Jira-like boards, sprints, issues). Deployed at `planning.processity.ch` and embeddable via Module Federation.

## Project layout

```
backend/
  src/
    Planning.Core/      ← all feature areas + common infrastructure
    Planning.Host/      ← ASP.NET host, DI wiring
    Planning.Migrations/
```

## Feature structure

Each feature area uses **use-case sub-folders** inside `Application/`. One class/record per file. Shared DTOs and helpers live at the `Application/` level; use-case-specific files (command, handler, request DTO) live in a named sub-folder.

```
{Feature}/
  Application/
    SharedDto.cs              ← shared across multiple use cases
    SharedMapper.cs           ← internal static class (shared helper)
    CreateFoo/
      CreateFooCommand.cs
      CreateFooCommandHandler.cs
      CreateFooRequest.cs
    UpdateFoo/
      UpdateFooCommand.cs
      UpdateFooCommandHandler.cs
      UpdateFooRequest.cs
    GetFoo/
      GetFooQuery.cs
      GetFooQueryHandler.cs
  Controllers/
  Domain/
  Infrastructure/
```

**All namespaces stay flat**: `namespace Processity.Planning.{Feature}.Application;` — no sub-namespace for the use-case folder.

**Never** add type-based sub-folders (`Commands/`, `Queries/`, `Dtos/`, `Services/`).

## Standards

- Pagination: use `PaginatedResponse<T>` from SharedKernel (`Processity.SharedKernel.Common.Infrastructure.Data.Pagination`). `PageIndex` is 0-based.
- Results: `Result<T>` / `Result` are custom SharedKernel types — no FluentResults NuGet.
- Validation: plain .NET data annotations / guard clauses — no FluentValidation NuGet.
- No AutoMapper — map manually.
- Primary constructors throughout.
