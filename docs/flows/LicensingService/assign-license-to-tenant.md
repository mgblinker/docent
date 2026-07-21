---
type: flows
---

# Assign License To Tenant

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: TenantLicensesAdminController.AssignLicenseToTenant
- **Endpoints**:
  - `POST /licensing-admin/v{version:apiVersion}/tenant-licenses` (via ApiGateway; internally `api/licensing-admin/v{version:apiVersion}/tenant-licenses`)
- **Module**: LicensingService
- **Modules touched by this flow**: LicensingService, TenantProvisioning

```mermaid
flowchart TB
  EP_TenantLicensesAdminControllerAssignLicenseToTenant[["TenantLicensesAdminController.AssignLicenseToTenant<br/>(POST)"]]
  MOD_LicensingService["LicensingService"]
  REQ_AssignLicenseToTenantCommand("Assign License To Tenant")
  EP_TenantLicensesAdminControllerAssignLicenseToTenant -->|| REQ_AssignLicenseToTenantCommand
  REQ_AssignLicenseToTenantCommand -->|AssignLicenseToTenantCommandHandler| MOD_LicensingService
  EVT_licensing_tenant_licenses_activated{{"licensing.tenant-licenses.activated"}}
  MOD_LicensingService -->|AssignLicenseToTenantCommandHandler| EVT_licensing_tenant_licenses_activated
  MOD_TenantProvisioning["TenantProvisioning"]
  EVT_licensing_tenant_licenses_activated -->|TenantLicensesActivatedHandler| MOD_TenantProvisioning
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Register Tenant](#/flows/Authentication/register-tenant)
- [Handle Stripe Webhook](#/flows/BillingService/handle-stripe-webhook)
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
