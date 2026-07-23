---
type: flows
---

# Register Tenant

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: RegisterTenantController.RegisterTenant
- **Endpoints**:
  - `POST /authentication/v{version:apiVersion}/tenants/register` (via ApiGateway; internally `api/v{version:apiVersion}/tenants/register`)
- **Module**: Authentication
- **Modules touched by this flow**: Authentication, LicensingService, TenantProvisioning

```mermaid
flowchart TB
  EP_RegisterTenantControllerRegisterTenant[["RegisterTenantController.RegisterTenant<br/>(POST)"]]
  MOD_Authentication["Authentication"]
  REQ_RegisterTenantCommand("Register Tenant")
  EP_RegisterTenantControllerRegisterTenant --> REQ_RegisterTenantCommand
  REQ_RegisterTenantCommand -->|RegisterTenantCommandHandler| MOD_Authentication
  EVT_authentication_tenant_created{{"authentication.tenant.created"}}
  MOD_Authentication -->|RegisterTenantCommandHandler| EVT_authentication_tenant_created
  MOD_LicensingService["LicensingService"]
  EVT_authentication_tenant_created -->|TenantCreatedEventHandler| MOD_LicensingService
  EVT_licensing_tenant_licenses_activated{{"licensing.tenant-licenses.activated"}}
  MOD_LicensingService -->|TenantCreatedEventHandler| EVT_licensing_tenant_licenses_activated
  MOD_TenantProvisioning["TenantProvisioning"]
  EVT_licensing_tenant_licenses_activated -->|TenantLicensesActivatedHandler| MOD_TenantProvisioning
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Handle Stripe Webhook](#/flows/BillingService/handle-stripe-webhook)
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
