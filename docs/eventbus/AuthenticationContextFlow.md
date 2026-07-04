---
type: architecture
---

# Authentication Context Flow in Processity Event Bus

This document describes how to implement and use the consistent authentication flow across API and event bus components in Processity applications.

## Overview

The authentication context flow ensures that when events are published from a service, the authentication context (user ID, tenant ID, and other security information) is automatically captured and included with the event. When the event is handled by another service, the same authentication context is automatically applied, making it appear as if the operation is being performed by the original user.

## Architecture

The implementation follows clean architectural principles:

1. **SharedKernel:** Contains only the interfaces and contracts for authentication context propagation.
   - `IAuthenticationContextPropagator`: Interface for serializing and deserializing authentication context

2. **EventBus:** Contains all implementation details specific to the event bus.
   - `AuthenticatedEvent<T>`: Wrapper for events with authentication context
   - `EventBusAuthenticationFilter`: CAP filter for applying authentication context
   - `AuthenticationContextEventBusDecorator`: Decorator for automatically capturing authentication context

This separation ensures proper architectural boundaries are maintained - the SharedKernel does not depend on the EventBus component.

## Setup Instructions

### 1. Configure Dependencies

In your `Program.cs` or `Startup.cs` file, register the authentication-aware event bus:

```csharp
// Register standard authentication services
services.AddAuthentication(/* ... */);
services.AddAuthenticationServices(); // Ensure you have registered authentication services

// Add regular event bus
services.AddEventBus(Configuration);

// Add authentication-aware event bus components
services.AddAuthenticatedEventBus();
```

### 2. Publishing Events with Authentication Context

There are two ways to publish events with authentication context:

**Option 1: Using the ICapPublisher extension method:**

```csharp
// Inject the dependencies
private readonly ICapPublisher _capPublisher;
private readonly IAuthenticationContextProvider _authContextProvider;

public MyController(
    ICapPublisher capPublisher,
    IAuthenticationContextProvider authContextProvider)
{
    _capPublisher = capPublisher;
    _authContextProvider = authContextProvider;
}

// Publish an event with authentication context
await _capPublisher.PublishWithAuthenticationContextAsync(
    "my.event.name", 
    myEventData, 
    _authContextProvider);
```

**Option 2: Using IEventBus (with decorator):**

```csharp
// Inject the decorated IEventBus
private readonly IEventBus _eventBus;

public MyService(IEventBus eventBus)
{
    _eventBus = eventBus;
}

// The decorator will automatically include authentication context
await _eventBus.PublishAsync(myEventData, cancellationToken);
```

### 3. Handling Events with Authentication Context

When handling events, you can directly receive the `AuthenticatedEvent<T>` and the authentication context will be automatically applied:

```csharp
[CapSubscribe("my.event.name")]
public Task HandleEvent(AuthenticatedEvent<MyEventData> authenticatedEvent)
{
    // The authentication context has already been applied by the EventBusAuthenticationFilter
    // So you can use ICurrentUserService to get user information
    var userId = _currentUserService.GetCurrentUserId();
    
    // Process the event content
    var eventData = authenticatedEvent.Content;
    
    // Your event handling logic...
    
    return Task.CompletedTask;
}
```

## Best Practices

1. **Always use the authenticated event bus** for publishing events that might need user context.

2. **Access user information through the standard ICurrentUserService** rather than directly accessing the AuthContext in the event.

3. **Keep security in mind** - Remember that events can be intercepted and the authentication context can be spoofed. Don't rely solely on the authentication context for critical security decisions.

4. **Migration from legacy ImpersonatedEvent<T>** - The system supports both `AuthenticatedEvent<T>` and legacy `ImpersonatedEvent<T>`, but you should migrate to `AuthenticatedEvent<T>` for new development.

## Troubleshooting

If authentication context is not being properly passed or applied:

1. Ensure the `EventBusAuthenticationFilter` is registered correctly.
2. Verify that you're using the authenticated version of the event bus.
3. Check that the authentication context in the source service is being set correctly.
4. Look for any serialization/deserialization issues in the CAP logs.

## Sample Code

See the example implementation in:
- `ExampleAuthenticatedEventController.cs`
- `ExampleAuthenticatedEventHandler.cs`