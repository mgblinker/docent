---
type: feature
---

# Event-Driven Product Catalog → Social Care Replication

## Overview

This document describes the event-driven architecture for replicating product data from the **Product Catalog** module to the **Social Care** module. The Product Catalog is the source of truth, while Social Care maintains read-only replicas for booking purposes.

## Architecture

### Data Flow Direction

```
Product Catalog (Source of Truth)
        ↓
   Event Bus (CAP + RabbitMQ)
        ↓
Social Care (Read Replica)
```

**Why this direction?**
- Product Catalog owns the product lifecycle and business logic
- Social Care needs product data for bookings but doesn't modify it
- Avoids bidirectional sync complexity and conflicts
- Maintains clear bounded context boundaries

## Components

### 1. Event Definitions (ProductData.Models)

**Location:** `Processity.Backend/ProductData/src/ProductData.Models/Products/Events/`

#### ProductAddedEvent.cs
```csharp
public record ProductAddedEvent(ProductDto Product) : IIntegrationEvent
{
    public const string EventName = "product.added";
}
```

#### ProductUpdatedEvent.cs
```csharp
public record ProductUpdatedEvent(ProductDto Product) : IIntegrationEvent
{
    public const string EventName = "product.updated";
}
```

#### ProductDeletedEvent.cs
```csharp
public record ProductDeletedEvent(Guid ProductId) : IIntegrationEvent
{
    public const string EventName = "product.deleted";
}
```

### 2. Event Publishing (ProductData Service)

Events are published from command handlers after successful database commits.

#### CreateProductCommandHandler
- **Publishes:** `ProductAddedEvent`
- **When:** After successfully creating a product
- **Method:** `PublishWithAuthAsync()` with authentication context

#### UpdateProductCommandHandler
- **Publishes:** `ProductUpdatedEvent`
- **When:** After successfully updating a product
- **Method:** `PublishWithAuthAsync()` with authentication context

#### DeleteProductCommandHandler
- **Publishes:** `ProductDeletedEvent`
- **When:** After successfully deleting a product
- **Method:** `PublishWithAuthAsync()` with authentication context

### 3. Event Handlers (Social Care)

**Location:** `Processity.Backend/SocialCare/src/SocialCare/Services/Integration/EventHandlers/`

All handlers extend `AuthenticatedEventHandlerBase<TEvent>` to automatically receive authentication context.

#### ProductAddedEventHandler
- **Subscribes to:** `product.added`
- **Action:** Creates new `Service` entity with data from `ProductDto`
- **Idempotency:** Checks if service already exists before creating
- **Version:** Initializes with `Version = 1`

#### ProductUpdatedEventHandler
- **Subscribes to:** `product.updated`
- **Action:** Updates existing `Service` entity
- **Fallback:** Creates service if it doesn't exist (handles missed create events)
- **Version:** Increments version on each update

#### ProductDeletedEventHandler
- **Subscribes to:** `product.deleted`
- **Action:** Soft-deletes service by setting `IsActive = false`
- **Why Soft Delete?** Preserves referential integrity with existing bookings
- **Version:** Increments version to track deletion event

### 4. Service Entity (Social Care)

**Location:** `Processity.Backend/SocialCare/src/SocialCare/Services/Domain/Entities/Service.cs`

```csharp
public class Service : BaseEntity<ServiceId>
{
    public string Title { get; set; }
    public string Description { get; set; }
    public decimal PricePerHour { get; set; }
    public decimal TotalHours { get; set; }
    public List<Qualification> Qualifications { get; set; }
    
    // Event sourcing fields
    public long Version { get; set; } = 1;
    public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
```

**Version Field:**
- Increments with each update event
- Enables detection of out-of-order events
- Future: Can implement optimistic locking

**LastSyncedAt Field:**
- Tracks when service was last synchronized
- Enables staleness detection
- Useful for monitoring sync health

### 5. Initial Sync Service

**Location:** `Processity.Backend/SocialCare/src/SocialCare/Services/Integration/Services/`

#### ProductCatalogClient
- HTTP client for calling Product Catalog APIs
- Methods:
  - `GetProductsAsync(pageNumber, pageSize)` - Paginated product fetch
  - `GetProductByIdAsync(productId)` - Single product fetch

#### ServiceSyncService
- Performs initial bulk synchronization
- Use cases:
  - New tenant onboarding
  - Re-sync after data corruption
  - Initial setup of Social Care module

**Key Method:**
```csharp
public async Task<int> SyncAllProductsAsync(CancellationToken cancellationToken)
```

- Fetches all products from Product Catalog (paginated)
- Creates or updates Service entities in Social Care
- Returns count of synchronized services

## Event Flow

### Scenario 1: Product Created

```
1. User creates product via Product Catalog API
2. CreateProductCommandHandler saves product to database
3. Handler publishes ProductAddedEvent with ProductDto
4. Event Bus routes event to Social Care
5. ProductAddedEventHandler receives event
6. Handler creates Service entity (idempotent check first)
7. Service saved with Version=1, LastSyncedAt=now
```

### Scenario 2: Product Updated

```
1. User updates product via Product Catalog API
2. UpdateProductCommandHandler updates product in database
3. Handler publishes ProductUpdatedEvent with ProductDto
4. Event Bus routes event to Social Care
5. ProductUpdatedEventHandler receives event
6. Handler updates Service entity (creates if missing)
7. Service updated with Version++, LastSyncedAt=now
```

### Scenario 3: Product Deleted

```
1. User deletes product via Product Catalog API
2. DeleteProductCommandHandler deletes product from database
3. Handler publishes ProductDeletedEvent with ProductId
4. Event Bus routes event to Social Care
5. ProductDeletedEventHandler receives event
6. Handler soft-deletes Service (sets IsActive=false)
7. Service updated with Version++, LastSyncedAt=now
```

## Idempotency & Resilience

### Idempotency Guarantees

1. **ProductAddedEventHandler:**
   - Checks if service exists before creating
   - Skips creation if already exists
   - Logs warning for duplicate events

2. **ProductUpdatedEventHandler:**
   - Updates existing service or creates if missing
   - Can handle events arriving in any order
   - Version field tracks event sequence

3. **ProductDeletedEventHandler:**
   - Safe to process multiple times
   - Soft delete is idempotent operation
   - Preserves data integrity

### Out-of-Order Event Handling

The `Version` field enables handling of out-of-order events:

```csharp
// Future enhancement: Optimistic locking
if (incomingVersion > service.Version)
{
    // Apply update
    service.Version = incomingVersion;
}
else
{
    // Discard stale event
    _logger.LogWarning("Received stale event");
}
```

### Error Handling

- All handlers wrapped in try-catch blocks
- Errors logged with correlation context
- Failed events can be retried by CAP
- Database transactions ensure consistency

## Multi-Tenancy

### Authentication Context Flow

1. Product Catalog publishes events with `AuthenticatedEvent<T>` wrapper
2. Event includes `AuthenticationContextDto` with TenantId, UserId, etc.
3. Social Care handlers extend `AuthenticatedEventHandlerBase<T>`
4. Base class automatically applies authentication context
5. Handlers resolve tenant-specific database context

### Tenant Isolation

- Each tenant has separate database schema
- Events carry tenant context
- Handlers use `TenantAwareDbContextFactory`
- No cross-tenant data leakage possible

## Configuration

### Product Catalog (Event Publishing)

**Required Services:**
- `ICapPublisher` - CAP event publisher
- `IAuthenticationContextProvider` - Current user/tenant context

**Registration:**
Already configured in ProductData module startup.

### Social Care (Event Handling)

**Required Services:**
- `ProductCatalogClient` - HTTP client for sync
- `ServiceSyncService` - Initial sync orchestrator
- Event handlers (auto-registered by CAP)

**Registration Example:**
```csharp
// In Startup.cs or DependencyInjection.cs
services.AddHttpClient<ProductCatalogClient>(client =>
{
    client.BaseAddress = new Uri(configuration["Services:ProductCatalog:BaseUrl"]);
});

services.AddScoped<ServiceSyncService>();
```

## Usage

### Initial Setup (New Tenant)

```csharp
// Inject ServiceSyncService
public async Task OnboardTenant(Guid tenantId)
{
    // Set authentication context
    _authContext.SetContext(new AuthenticationContext 
    { 
        TenantId = tenantId 
    });
    
    // Check if sync needed
    if (await _serviceSyncService.IsSyncNeededAsync())
    {
        var count = await _serviceSyncService.SyncAllProductsAsync();
        _logger.LogInformation("Synced {Count} products", count);
    }
}
```

### Ongoing Operation

Events are automatically handled by CAP subscribers. No manual intervention required.

### Monitoring Sync Health

```csharp
// Check for stale services (not synced recently)
var staleServices = await _dbContext.Services
    .Where(s => s.LastSyncedAt < DateTime.UtcNow.AddDays(-1))
    .ToListAsync();
```

## Benefits

### Clear Ownership
- Product Catalog owns product lifecycle
- Social Care consumes product data
- No circular dependencies

### Scalability
- Asynchronous event processing
- No blocking HTTP calls during product operations
- Social Care can scale independently

### Resilience
- Eventual consistency model
- Events can be retried on failure
- Initial sync handles missed events

### Maintainability
- Bounded contexts well-defined
- Changes isolated to respective modules
- Event schemas versioned in shared Models project

## Future Enhancements

1. **Event Versioning:**
   - Support multiple event schema versions
   - Backward compatibility for event handlers

2. **Conflict Resolution:**
   - Implement version-based optimistic locking
   - Reject stale events based on version number

3. **Delta Sync:**
   - Track last sync timestamp
   - Only fetch products modified since last sync

4. **Event Replay:**
   - Rebuild Social Care data from event log
   - Useful for disaster recovery

5. **Dead Letter Queue:**
   - Handle permanently failed events
   - Manual intervention workflow

## Troubleshooting

### Events Not Being Received

1. Check RabbitMQ connection in both services
2. Verify event names match exactly
3. Check CAP subscription registration
4. Review authentication context propagation

### Duplicate Services Created

1. Verify idempotency checks in handlers
2. Check for race conditions in event processing
3. Review database unique constraints

### Stale Data in Social Care

1. Check `LastSyncedAt` timestamps
2. Verify events are being published
3. Run manual sync via `ServiceSyncService`
4. Review event handler error logs

## Related Documentation

- [Authentication Context Flow](e:\Projects\Processity.EventBus\docs\AuthenticationContextFlow.md)
- [CAP Event Bus Setup](e:\Projects\Processity.EventBus\README.md)
- [Multi-Tenancy Architecture](e:\Projects\Processity.SharedKernel\docs\MultiTenancy.md)
