---
type: howto
---

# Processity.TestingKernel

Shared testing primitives for Processity services: Testcontainers Postgres fixture, JWT auth handler, CAP stub, multi-tenant accessor, and **convention-driven module discovery** so test factories don't grow per module added to a service.

## What's in the box

| Namespace | What it does |
|---|---|
| `Processity.TestingKernel.Auth.TestAuthHandler` | Authenticates every request as `"Test user"` via xUnit-friendly scheme. |
| `Processity.TestingKernel.Cap.FakeCapPublisher` | Records published CAP events to `PublishedEvents` instead of sending them. |
| `Processity.TestingKernel.Hosting.FakeSecretsProvider` | In-memory `ISecretsProvider`; consumer seeds via `AddPlain` / `AddBase64`. |
| `Processity.TestingKernel.Hosting.FakeWebHostEnvironment` | `IWebHostEnvironment` with mutable env-var bag, defaults to `Testing`. |
| `Processity.TestingKernel.Hosting.MinimalTestStartup` | Routing + auth + controller endpoints — service registration happens in the factory. |
| `Processity.TestingKernel.MultiTenancy.TestMultiTenantContextAccessor` | Finbuckle tenant accessor; default schema `"test"`. |
| `Processity.TestingKernel.Discovery.ProcessityModuleDiscovery` | Reflects `Processity.*` assemblies for module-registration methods, `I*Module` markers, and `BaseDbContext`-derived contexts. |
| `Processity.TestingKernel.Discovery.DiscoveryOptions` | Include/exclude filters for the scan. |
| `Processity.TestingKernel.Postgres.PostgresFixture` | xUnit `IAsyncLifetime` wrapper around a Testcontainers `postgres:16-alpine` container. |
| `Processity.TestingKernel.Postgres.PostgresTestFactory<TProgram>` | `WebApplicationFactory<T>` that wires every discovered module + fixed-schema tenant context + CAP/secrets stubs. ~80 LOC, doesn't grow per module added. |
| `Processity.TestingKernel.Postgres.PostgresTestCase<TProgram>` | xUnit test base. Creates a fresh per-test-class schema, calls `CreateTables` for every discovered DbContext. |
| `Processity.TestingKernel.Postgres.SqlScriptSplitter` | Strips EF's dollar-quoted `DO $EF$ ... $EF$;` schema-bootstrap blocks and splits the remainder on `;`. Lets per-DbContext `CreateTables` calls swallow duplicate-table errors per-statement. |

## How to consume

1. Add `<PackageReference Include="Processity.TestingKernel" />` to your test project (and the version to `Directory.Packages.props`).
2. Add a one-line collection-definition shim **in the test assembly** (xUnit requires it):
   ```csharp
   using Processity.TestingKernel.Postgres;
   [CollectionDefinition(PostgresCollection.Name)]
   public sealed class PostgresCollection : ICollectionFixture<PostgresFixture> { }
   ```
3. Write tests by inheriting `PostgresTestCase<Program>` directly:
   ```csharp
   public class CreateFooTests(PostgresFixture pg, ITestOutputHelper output)
       : PostgresTestCase<Program>(pg, output)
   {
       [Fact]
       public async Task CreateFoo_Persists()
       {
           var response = await AuthenticatedClient.PostAsJsonAsync(
               "api/foo/v1.0/foos", new { name = "bar" });
           Assert.True(response.IsSuccessStatusCode);
       }
   }
   ```

Adding a new module to your service is a project-reference change — no test-infrastructure edits.

## Conventions discovery relies on

A module is auto-wired when **all** of these hold:

- Lives in a `Processity.*` assembly.
- Exposes a marker interface named `I{ModuleName}Module` with no members (empty interface).
- Has a public static method `Add{ModuleName}Module(IServiceCollection, IConfiguration)` **or** `Add{ModuleName}Components(IServiceCollection, IConfiguration)`.
- Its DbContext derives from `Processity.SharedKernel.Common.Infrastructure.Data.BaseDbContext`.
- Its connection-string config key follows `ConnectionStrings:{DbContextName-without-DbContext-suffix}Db` (e.g. `FooDbContext` → `ConnectionStrings:FooDb`). The factory fills this with the test container's connection string automatically.

When discovery picks up something it shouldn't, override `CreateDiscoveryOptions()` on a `PostgresTestFactory<Program>` subclass and add to `ExcludedDbContexts` / `ExcludedModuleMarkers` / `ExcludedRegistrationMethods`.

## Local development

- Tests **require Docker**. Set local Docker context: `docker context use colima` (or any local socket).
- Filter out Postgres tests when no Docker is available: `dotnet test --filter "Category!=Postgres"`.

## Known limitations

- **DB-dependent `IHostedService`s at startup**: `PostgresTestCase` creates per-test-class schema and tables *after* `WebApplicationFactory.CreateClient()` returns. If your host registers an `IHostedService` that queries the DB during `StartAsync()` (e.g. a migration runner), it will fail with `relation does not exist` because the host starts before tables are created. Workarounds: register the hosted service conditionally on an env var that tests don't set, make it resilient to missing tables, or build schema before the host starts (would need a TestingKernel extension).
