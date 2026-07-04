---
type: feature
---

# Processity Logging Service

A centralized logging microservice for the Processity platform that implements Domain-Driven Design (DDD) principles with multi-tenancy, CQRS patterns, and comprehensive event logging capabilities.

## Features

- **Event Logging**: Central repository for all application events with PostgreSQL JSONB storage
- **Multi-Tenancy**: Schema-based tenant isolation using SharedKernel functionality
- **CQRS Pattern**: Command Query Responsibility Segregation using SharedKernel mediator
- **Event Bus Integration**: Automatic capture of events via DotNetCore.CAP
- **Authentication Context**: Full integration with Processity authentication system
- **RESTful API**: Comprehensive API for creating and querying events
- **Performance Optimized**: PostgreSQL JSONB with GIN indexes for fast queries

## Architecture

The service follows DDD principles with clear separation of concerns:

```
Host/                           # Web API host
├── Program.cs                  # Application startup and configuration
├── appsettings.json           # Configuration files
└── appsettings.Development.json

Service/src/
├── LoggingService.Models/      # Domain models and contracts
│   ├── Events/
│   │   ├── Domain/            # Domain entities and value objects
│   │   ├── Contracts/         # Repository interfaces
│   │   ├── DTOs/              # Data transfer objects
│   │   ├── Features/          # CQRS commands and queries
│   │   └── Mapping/           # Manual mapping extensions
│
└── LoggingService.Service/     # Application and infrastructure
    ├── Application/           # Application services and handlers
    │   ├── Features/          # Command/Query handlers
    │   └── EventHandlers/     # Event bus handlers
    ├── Infrastructure/        # Data access layer
    │   ├── Persistence/       # Entity Framework DbContext
    │   └── Repositories/      # Repository implementations
    ├── Api/                   # Web API controllers
    └── Common/                # Dependency injection configuration
```

## Domain Model

### LoggedEvent Entity

The core domain entity with the following properties:

- **EventId**: Strongly-typed identifier
- **TenantId**: Multi-tenant isolation
- **UserId**: Optional user context
- **Source**: Originating application/service
- **Category**: Event classification (e.g., "Authentication", "UserAction")
- **Action**: Specific action (e.g., "UserLogin", "DocumentCreated")
- **Severity**: Event importance level (Trace, Debug, Information, Warning, Error, Critical)
- **EventData**: JSONB payload for flexible event storage
- **Metadata**: Additional JSONB metadata
- **Timestamps**: Event and recording timestamps
- **Correlation**: Cross-service correlation tracking

## API Endpoints

### Create Event

```
POST /api/v1/events
Content-Type: application/json
Authorization: Bearer {token}

{
  "source": "UserManagementService",
  "category": "UserAction",
  "action": "ProfileUpdated",
  "severity": 2,
  "eventData": "{\"userId\": \"123\", \"field\": \"email\"}",
  "metadata": "{\"version\": \"1.0\"}",
  "correlationId": "abc-123",
  "eventTimestamp": "2024-01-15T10:30:00Z",
  "sourceIpAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "sessionId": "session-456"
}
```

### Query Events

**Get by ID:**

```
GET /api/v1/events/{eventId}
```

**Get by Tenant:**

```
GET /api/v1/events/tenant/{tenantId}?skip=0&take=100
```

**Get by User:**

```
GET /api/v1/events/tenant/{tenantId}/user/{userId}?skip=0&take=100
```

**Get by Correlation ID:**

```
GET /api/v1/events/tenant/{tenantId}/correlation/{correlationId}
```

## Event Bus Integration

The service automatically captures events from the event bus using authenticated event handlers:

### Automatic Event Capture

```csharp
// Generic handler captures all events
public class GenericEventLoggingHandler : AuthenticatedEventHandlerBase<object>
{
    // Automatically logs any authenticated event to the database
}
```

### Specific Event Handlers

```csharp
// Example: User login event handler
[CapSubscribe("user.login")]
public class UserLoginEventHandler : AuthenticatedEventHandlerBase<UserLoginEvent>
{
    // Handles specific user login events with custom logic
}
```

## Configuration

### Database Configuration

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=processity_logging;Username=postgres;Password=postgres"
  }
}
```

### Event Bus Configuration

```json
{
  "CAP": {
    "DefaultGroup": "processity.logging.service",
    "Transport": {
      "PostgreSql": {
        "ConnectionString": "Host=localhost;Database=processity_logging;Username=postgres;Password=postgres"
      }
    }
  }
}
```

## Multi-Tenancy

The service implements schema-based multi-tenancy:

- Each tenant's events are isolated in separate database schemas
- Automatic tenant context resolution from authentication tokens
- All queries are automatically scoped to the current tenant

## Database Schema

### Table: logged_events

```sql
CREATE TABLE logged_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NULL,
    source VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    severity INTEGER NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB NULL,
    correlation_id VARCHAR(100) NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    recorded_timestamp TIMESTAMPTZ NOT NULL,
    source_ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    session_id VARCHAR(100) NULL
);
```

### Indexes

Performance-optimized indexes:

- Tenant-based indexes for multi-tenancy
- JSONB GIN indexes for flexible querying
- Composite indexes for common query patterns

## Development Setup

1. **Prerequisites:**

   - .NET 9.0 SDK
   - PostgreSQL 12+
   - Access to Processity SharedKernel

2. **Database Setup:**

   ```bash
   # Create database
   createdb processity_logging

   # Run migrations
   dotnet ef database update --project Host
   ```

3. **Build and Run:**

   ```bash
   dotnet build
   dotnet run --project Host
   ```

4. **Access Swagger:**
   Navigate to `https://localhost:5001/swagger`

## Usage Examples

### Logging Application Events

```csharp
// In your application service
public class UserService
{
    private readonly IMediator _mediator;

    public async Task UpdateUserProfile(UpdateUserRequest request)
    {
        // Your business logic here...

        // Log the event
        var eventDto = new CreateEventDto
        {
            Source = "UserService",
            Category = "UserAction",
            Action = "ProfileUpdated",
            Severity = EventSeverity.Information,
            EventData = JsonSerializer.Serialize(request),
            EventTimestamp = DateTimeOffset.UtcNow,
            CorrelationId = request.CorrelationId
        };

        await _mediator.Send(new CreateEventCommand(eventDto));
    }
}
```

### Querying Events

```csharp
// Get recent events for current tenant
var query = new GetEventsByTenantQuery(tenantId, skip: 0, take: 50);
var result = await _mediator.Send(query);

if (result.IsSuccess)
{
    var events = result.Value;
    // Process events...
}
```

## Security Considerations

- All endpoints require authentication
- Tenant isolation prevents cross-tenant data access
- Event data is stored as JSONB for flexibility but should not contain sensitive data
- Correlation IDs help track requests across services without exposing internal details

## Performance Features

- JSONB storage with GIN indexes for fast queries
- Pagination support for large result sets
- Efficient Entity Framework Core queries
- Connection pooling and retry policies
- Optimized database indexes for common query patterns

## Integration with Processity Platform

The Logging Service integrates seamlessly with:

- **SharedKernel**: Authentication, multi-tenancy, CQRS patterns
- **Event Bus**: Automatic event capture and processing
- **Authentication Service**: User and tenant context
- **Other Services**: Event correlation and distributed tracing
