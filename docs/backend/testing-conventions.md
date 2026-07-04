---
type: howto
---

# Testing conventions

These rules govern every new test added during the 18.9% → 75% coverage push. Read this before scaffolding tests in any module.

## Default style: integration over unit

Inherit from [`TestingHost.IntegrationTestBase`](../TestingHost/IntegrationTestBase.cs) and exercise handlers through HTTP. One test covers controller → mediator → validator → handler → EF → DbContext in a single call. Unit tests with Moq are reserved for pure logic (calculators, mappers, domain rules) that has no DB or HTTP dependency.

Anchor pattern:

```csharp
public class FooControllerTests(
    TestWebApplicationFactory<Program> factory,
    ITestOutputHelper output
) : IntegrationTestBase(factory, output)
{
    [Fact]
    public async Task CreateFoo_ReturnsCreated_WhenInputValid() { ... }

    [Fact]
    public async Task CreateFoo_ReturnsBadRequest_WhenNameMissing()
        => await AssertBadRequestWithError(response, "Name is required");
}
```

Every handler gets at minimum: one happy-path test + one validation-failure test. Domain edge cases come after.

## Database

`TestWebApplicationFactory` uses **SQLite in-memory** for 9 of 14 modules (Activities, Communications, CoreData, EventManagement, Relationships, Sales — and structurally for CareManagement, SocialCare, StaffManagement, Education, ProductData even though their schemas can't be created). Not EF InMemory. JSONB, triggers, RLS, case-insensitive collation, true transactional behavior, CITEXT, and Finbuckle schema-per-tenant do not work on SQLite.

For handlers in **CareManagement, SocialCare, StaffManagement, Education, ProductData**, or any handler that needs Postgres-specific features, inherit from [`PostgresIntegrationTestBase`](../TestingHost/Postgres/PostgresIntegrationTestBase.cs) instead. It uses a shared [Testcontainers.PostgreSql](https://dotnet.testcontainers.org/) container via the `Postgres` collection and instantiates a dedicated [`PostgresTestWebApplicationFactory`](../TestingHost/Postgres/PostgresTestWebApplicationFactory.cs) (Npgsql-only, parallel to the SQLite factory — EF Core can't have both providers in one DI scope, and the SharedKernel `ReplaceService` in `BaseDbContext.OnConfiguring` blocks the `UseInternalServiceProvider` workaround). Each test class gets a fresh schema via `RelationalDatabaseCreator.CreateTables()` per DbContext (EF's `EnsureCreated` is unusable here — returns false after the first call once a DB exists). Each test assembly needs a one-line `[CollectionDefinition(PostgresCollection.Name)]` shim (xUnit requires this).

Reference passing test: [`CreateProductPostgresTests`](../ProductData/test/ProductData.IntegrationTests/Products/CreateProductPostgresTests.cs).

Tests inheriting from `PostgresIntegrationTestBase` automatically get `[Trait("Category","Postgres")]`. They **require a local Docker socket** (Testcontainers .NET doesn't support SSH-based Docker contexts). To run them locally, switch your Docker context to colima:

```bash
docker context use colima        # uses unix:///Users/michael/.colima/default/docker.sock
dotnet test                       # runs both SQLite + Postgres tests
docker context use dev-server     # switch back when done
```

To run only the SQLite tests (no Docker needed):

```bash
dotnet test --filter "Category!=Postgres"
```

CI (Gitea dev-server runner) has local Docker on the runner host and runs everything.

`IntegrationTestBase.SeedDatabaseAsync()` already seeds CoreData, EventManagement, Sales, Communications. Don't reseed those — add your own entities via `AddEntityAsync` or by extending `TestDataHelpers`.

## Result assertions

Use the custom `Result<T>` from SharedKernel (not FluentResults). At the HTTP layer, prefer status code + `await response.Content.ReadFromJsonAsync<...>()`. For direct handler tests, assert `result.IsSuccess` / `result.Value` / `result.Errors`.

## CAP events

Every handler that writes data and publishes a domain event must be asserted on both sides. `FakeCapPublisher` is registered as a singleton in [`TestWebApplicationFactory.cs`](../TestingHost/TestWebApplicationFactory.cs); resolve it via `factory.Services.GetRequiredService<ICapPublisher>() as FakeCapPublisher` and assert against its `PublishedEvents` collection. If the handler under test publishes an event and your test doesn't assert it, the test is incomplete.

## Multi-tenancy

`TestMultiTenantContextAccessor` returns a fixed `"test"` tenant by default. For cross-tenant scenarios, set `MultiTenantContextAccessor.MultiTenantContext` in your test before acting. Do not bypass Finbuckle by reaching into `DbContext` directly.

## Auth

`TestAuthHandler` short-circuits authentication. Use `AuthenticatedClient` for endpoints behind `[Authorize]`, `AnonymousClient` for endpoints that should reject anonymous calls.

## File layout

Mirror `src/`. For module `Foo`:

```
Foo/test/Foo.IntegrationTests/Foo.IntegrationTests.csproj
Foo/test/Foo.IntegrationTests/{Feature}/{UseCase}Tests.cs
Foo/test/Foo.TestData/Foo.TestData.csproj        ← Bogus fakers, one per aggregate
```

One test class per use-case (CreateFoo, UpdateFoo). Group related scenarios as `[Fact]` methods inside it.

## Fakers

Per-aggregate Bogus fakers live in `{Module}.TestData`. Examples: `ActionFaker` in `Activities.TestData`, `ProductFaker` in `TestDataGeneratorService`. Reuse them — do not inline `new Foo { ... }` in tests except for the field under test.

## Forbidden

- **MediatR** — use the custom SharedKernel mediator (`AddProcessityMediator`).
- **FluentValidation** — validation is plain .NET; the `Result` carries errors.
- **FluentResults** — `Result<T>` is the custom SharedKernel type.
- **AutoMapper** — manual mapping only.
- **EF InMemory provider** — TestingHost uses SQLite in-memory; do not introduce a second provider per test.

## Coverage exclusions (already configured)

`Directory.Build.props` excludes migrations, TypedIds, Program.cs, ModuleRegistration, DependencyInjection, NSwag/Generated files. Do not write tests against excluded code paths. If a class shouldn't count toward coverage but isn't excluded by the global rule, add `[ExcludeFromCodeCoverage]` rather than writing a sham test.

## What "done" looks like for a module

- Every command/query handler has ≥1 happy-path + ≥1 failure-path test.
- Every handler that publishes a CAP event asserts `FakeCapPublisher.PublishedEvents`.
- Domain services and validators are exercised transitively via handler tests (not in isolation).
- Module-local coverage (per SonarQube) ≥ the per-sprint target in [/Users/michael/.claude/plans/our-backend-repo-has-linear-waterfall.md](../../.claude/plans/our-backend-repo-has-linear-waterfall.md).
