---
type: howto
---

# Purchase-Triggered License Assignment - Integration Guide

## Overview

This guide explains how to integrate purchase events with the licensing system to automatically assign tenant licenses when purchases are completed.

## Architecture

The implementation uses an **event-driven pattern** where any purchase source can publish a `PurchaseCompletedEvent` to trigger license creation:

```
Purchase Source → Publishes PurchaseCompletedEvent → RabbitMQ/CAP
    ↓
PurchaseCompletedEventHandler (Licensing Service)
    ↓
1. Idempotency check (by TransactionId)
2. Create TenantLicense
3. Publish TenantLicensesActivatedEvent
    ↓
Existing Provisioning Saga (auto-provisions licensed modules)
```

## Key Components

### 1. PurchaseCompletedEvent

**Location**: `Processity.LicensingService\Service\src\Licensing.Models\Events\PurchaseCompletedEvent.cs`

**Event Name**: `"licensing.purchase.completed"`

**Properties**:
- `TenantId` - The tenant purchasing the license
- `Tier` - License tier (Basic, Professional, Enterprise)
- `TotalSeats` - Number of seats purchased
- `DurationMonths` - License duration in months
- `EnabledFeatures` - List of feature names to enable
- `TransactionId` - Unique transaction ID for idempotency
- `PurchaseDate` - When the purchase occurred

### 2. PurchaseCompletedEventHandler

**Location**: `Processity.LicensingService\Service\src\Licensing.Service\Features\TenantLicenses\PurchaseCompletedEventHandler.cs`

**Responsibilities**:
- Listens for `PurchaseCompletedEvent`
- Checks idempotency using TransactionId
- Creates new TenantLicense
- Publishes `TenantLicensesActivatedEvent` to trigger provisioning

### 3. Database Changes

**Migration**: `20260116202232_AddTransactionIdToTenantLicense`

**Changes**:
- Added `TransactionId` column to `TenantLicenses` table (nullable, varchar(255))
- Added unique index on `TransactionId` for fast idempotency checks

## Integration Patterns

### Pattern 1: External Payment Webhook (Stripe, PayPal, etc.)

Create a webhook controller that receives payment provider callbacks:

```csharp
[ApiController]
[Route("api/webhooks/payment")]
public class PaymentWebhookController : ControllerBase
{
    private readonly ICapPublisher _capPublisher;

    [HttpPost("stripe")]
    public async Task<IActionResult> HandleStripeWebhook(
        [FromBody] StripeWebhookDto webhook,
        CancellationToken cancellationToken)
    {
        // 1. Validate Stripe signature
        ValidateStripeSignature(webhook);

        // 2. Map webhook to PurchaseCompletedEvent
        var purchaseEvent = new PurchaseCompletedEvent
        {
            TenantId = new TenantId(webhook.Metadata["TenantId"]),
            Tier = Enum.Parse<LicenseTier>(webhook.Metadata["Tier"]),
            TotalSeats = int.Parse(webhook.Metadata["Seats"]),
            DurationMonths = 12, // From product configuration
            EnabledFeatures = GetFeaturesForTier(webhook.Metadata["Tier"]),
            TransactionId = webhook.PaymentIntentId, // Unique Stripe ID
            PurchaseDate = DateTimeOffset.FromUnixTimeSeconds(webhook.Created)
        };

        // 3. Publish to event bus
        await _capPublisher.PublishAsync(
            PurchaseCompletedEvent.EventName,
            purchaseEvent,
            cancellationToken
        );

        return Ok();
    }
}
```

### Pattern 2: Internal Billing Service

Your billing service publishes the event directly after processing payment:

```csharp
public class BillingService
{
    private readonly ICapPublisher _capPublisher;

    public async Task ProcessPurchase(PurchaseRequest request)
    {
        // 1. Process payment
        var payment = await _paymentGateway.ChargeAsync(request.PaymentMethod, request.Amount);

        // 2. Publish purchase completed event
        var purchaseEvent = new PurchaseCompletedEvent
        {
            TenantId = request.TenantId,
            Tier = request.SelectedTier,
            TotalSeats = request.NumberOfSeats,
            DurationMonths = request.BillingCycle == "yearly" ? 12 : 1,
            EnabledFeatures = GetFeaturesForTier(request.SelectedTier),
            TransactionId = payment.TransactionId,
            PurchaseDate = DateTimeOffset.UtcNow
        };

        await _capPublisher.PublishAsync(
            PurchaseCompletedEvent.EventName,
            purchaseEvent,
            CancellationToken.None
        );
    }
}
```

### Pattern 3: Admin Manual Assignment

Admin UI triggers license creation by publishing the event:

```csharp
[HttpPost("tenants/{tenantId}/licenses")]
public async Task<IActionResult> CreateTenantLicense(
    Guid tenantId,
    [FromBody] CreateLicenseRequest request)
{
    var purchaseEvent = new PurchaseCompletedEvent
    {
        TenantId = new TenantId(tenantId),
        Tier = request.Tier,
        TotalSeats = request.Seats,
        DurationMonths = request.DurationMonths,
        EnabledFeatures = request.Features,
        TransactionId = $"manual-{Guid.NewGuid()}", // Generate manual transaction ID
        PurchaseDate = DateTimeOffset.UtcNow
    };

    await _capPublisher.PublishAsync(
        PurchaseCompletedEvent.EventName,
        purchaseEvent,
        cancellationToken
    );

    return Accepted("License creation initiated");
}
```

## Idempotency

The system ensures idempotent license creation using the `TransactionId`:

1. Each purchase must have a **unique TransactionId**
2. Before creating a license, the handler checks if a license with that TransactionId already exists
3. If found, the event is ignored (already processed)
4. Database has a unique constraint on TransactionId to prevent race conditions

**Example TransactionId formats**:
- Stripe: `pi_3MtwBwLkdIwHu7ix28a3tqPa` (payment intent ID)
- PayPal: `8VX89234567890123` (transaction ID)
- Manual: `manual-{guid}` (admin operations)
- Internal: `billing-{orderId}` (internal billing service)

## Feature Mapping

Common pattern for mapping license tiers to features:

```csharp
private List<string> GetFeaturesForTier(LicenseTier tier)
{
    return tier switch
    {
        LicenseTier.Basic => new List<string>
        {
            "CoreData",
            "SocialCare"
        },
        LicenseTier.Professional => new List<string>
        {
            "CoreData",
            "SocialCare",
            "StaffManagement",
            "EventManagement"
        },
        LicenseTier.Enterprise => new List<string>
        {
            "CoreData",
            "SocialCare",
            "StaffManagement",
            "EventManagement",
            "Education",
            "Analytics",
            "CustomReporting"
        },
        _ => new List<string> { "CoreData" }
    };
}
```

## Testing

### 1. Manual Event Publishing

Test the event handler by publishing a test event:

```csharp
[Fact]
public async Task ShouldCreateLicenseFromPurchaseEvent()
{
    // Arrange
    var purchaseEvent = new PurchaseCompletedEvent
    {
        TenantId = new TenantId(Guid.NewGuid()),
        Tier = LicenseTier.Professional,
        TotalSeats = 25,
        DurationMonths = 12,
        EnabledFeatures = new List<string> { "CoreData", "SocialCare", "StaffManagement" },
        TransactionId = $"test-{Guid.NewGuid()}",
        PurchaseDate = DateTimeOffset.UtcNow
    };

    // Act
    await _capPublisher.PublishAsync(
        PurchaseCompletedEvent.EventName,
        purchaseEvent,
        CancellationToken.None
    );

    // Assert - Wait for event processing
    await Task.Delay(2000);
    var license = await _tenantLicenseRepository.GetByTransactionIdAsync(purchaseEvent.TransactionId);
    Assert.NotNull(license);
    Assert.Equal(purchaseEvent.TenantId, license.TenantId);
    Assert.Equal(LicenseTier.Professional, license.Tier);
}
```

### 2. Idempotency Test

Verify duplicate events are handled correctly:

```csharp
[Fact]
public async Task ShouldNotCreateDuplicateLicenseForSameTransaction()
{
    // Arrange
    var transactionId = $"test-{Guid.NewGuid()}";
    var purchaseEvent = CreateTestPurchaseEvent(transactionId);

    // Act - Publish twice
    await _capPublisher.PublishAsync(PurchaseCompletedEvent.EventName, purchaseEvent);
    await _capPublisher.PublishAsync(PurchaseCompletedEvent.EventName, purchaseEvent);

    // Assert - Only one license created
    await Task.Delay(3000);
    var licenses = await _tenantLicenseRepository.GetByTenantIdAsync(purchaseEvent.TenantId);
    Assert.Single(licenses.Where(l => l.TransactionId == transactionId));
}
```

## Deployment Steps

### 1. Deploy Code Changes

```bash
# Build and deploy the updated Licensing Service
cd Processity.LicensingService
dotnet publish -c Release
```

### 2. Run Database Migration

```bash
cd Processity.LicensingService
dotnet ef database update --project Service/migration/LicensingService.Migrations --startup-project Host
```

Or use your existing migration deployment process.

### 3. Configure Event Publishing

Ensure your purchase source has access to RabbitMQ and can publish events:

```json
{
  "EventBus": {
    "HostName": "rabbitmq.example.com",
    "Port": 5672,
    "UserName": "your-username",
    "Password": "your-password",
    "ExchangeName": "processity-events"
  }
}
```

## Monitoring

### Key Metrics to Monitor

1. **Event Processing Success Rate**
   - Track successful vs failed PurchaseCompletedEvent processing
   - Alert on processing failures

2. **Idempotency Hit Rate**
   - Monitor how often duplicate transactions are detected
   - High rate may indicate webhook retry issues

3. **License Creation Latency**
   - Time from purchase to license active
   - Should be < 5 seconds in normal conditions

4. **Provisioning Success Rate**
   - Track if TenantLicensesActivatedEvent triggers successful provisioning

### Logging

The event handler logs at these levels:

- **Information**: Normal event processing, license creation, event publishing
- **Warning**: Idempotency hits (duplicate transaction IDs)
- **Error**: Processing failures (with exception details)

## Troubleshooting

### Issue: License not created after purchase

**Possible causes**:
1. PurchaseCompletedEvent not published
2. Event handler not registered
3. RabbitMQ connectivity issues
4. Database connection failure

**Debug steps**:
1. Check RabbitMQ management UI for event delivery
2. Check Licensing Service logs for event receipt
3. Verify handler subscription: Look for `[CapSubscribe]` attribute
4. Test database connection

### Issue: Duplicate licenses created

**Possible causes**:
1. Non-unique TransactionId
2. Race condition (two events processed simultaneously)

**Debug steps**:
1. Check TransactionId uniqueness in source system
2. Verify database unique constraint exists
3. Review event timestamps in CAP dashboard

### Issue: Provisioning not triggered

**Possible causes**:
1. TenantLicensesActivatedEvent not published
2. Provisioning service not subscribed
3. Missing tenant metadata in event

**Debug steps**:
1. Check Licensing Service logs for event publishing
2. Check provisioning service logs for event receipt
3. Verify event contains required tenant information

## Next Steps

1. **Enhance PurchaseCompletedEvent**: Add tenant metadata to avoid TODOs in event handler
2. **Add webhook signature validation**: Secure external webhook endpoints
3. **Implement license renewal**: Create `LicenseRenewalCompletedEvent` for subscription renewals
4. **Add monitoring dashboard**: Visualize purchase → license → provisioning flow
5. **Create admin UI**: Allow manual event publishing for testing/support

## Support

For questions or issues:
- Check logs in Licensing Service
- Review CAP dashboard for event history
- Check this guide's troubleshooting section
- Contact the platform team
