---
type: flows
---

# Handle Stripe Webhook

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: WebhooksController.HandleStripeWebhook
- **Endpoints**:
  - `POST /authentication/billing/webhooks/stripe` (via ApiGateway; internally `api/billing/webhooks/stripe`)
- **Module**: BillingService
- **Modules touched by this flow**: BillingService, LicensingService, TenantProvisioning

```mermaid
flowchart TB
  EP_WebhooksControllerHandleStripeWebhook[["WebhooksController.HandleStripeWebhook<br/>(POST)"]]
  MOD_BillingService["BillingService"]
  EVT_licensing_purchase_completed{{"licensing.purchase.completed"}}
  EP_WebhooksControllerHandleStripeWebhook -->|| EVT_licensing_purchase_completed
  MOD_LicensingService["LicensingService"]
  EVT_licensing_purchase_completed -->|PurchaseCompletedEventHandler| MOD_LicensingService
  EVT_licensing_tenant_licenses_activated{{"licensing.tenant-licenses.activated"}}
  MOD_LicensingService -->|PurchaseCompletedEventHandler| EVT_licensing_tenant_licenses_activated
  MOD_TenantProvisioning["TenantProvisioning"]
  EVT_licensing_tenant_licenses_activated -->|TenantLicensesActivatedHandler| MOD_TenantProvisioning
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Register Tenant](#/flows/Authentication/register-tenant)
- [Assign License To Tenant](#/flows/LicensingService/assign-license-to-tenant)
- [Module Migration Status Reported](#/flows/SharedKernel/module-migration-status-reported)
- [Module Provisioning Completed](#/flows/SharedKernel/module-provisioning-completed)
- [Module Provisioning Failed](#/flows/SharedKernel/module-provisioning-failed)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Tenant Provisioning Completed](#/flows/TenantProvisioning/tenant-provisioning-completed)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
