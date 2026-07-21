---
type: flows
---

# Module Provisioning Failed

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Trigger**: automatically published event `module.provisioning.failed` (no HTTP endpoint - fired by a background process or another handler)
- **Module**: SharedKernel
- **Modules touched by this flow**: SharedKernel, TenantProvisioning

```mermaid
flowchart TB
  EVT_module_provisioning_failed{{"module.provisioning.failed"}}
  MOD_SharedKernel["SharedKernel"]
  MOD_SharedKernel -->|BaseModuleProvisioningService| EVT_module_provisioning_failed
  MOD_TenantProvisioning["TenantProvisioning"]
  EVT_module_provisioning_failed -->|ModuleProvisioningFailedHandler| MOD_TenantProvisioning
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Register Tenant](#/flows/Authentication/register-tenant)
- [Handle Stripe Webhook](#/flows/BillingService/handle-stripe-webhook)
- [Assign License To Tenant](#/flows/LicensingService/assign-license-to-tenant)
- [Module Migration Status Reported](#/flows/SharedKernel/module-migration-status-reported)
- [Module Provisioning Completed](#/flows/SharedKernel/module-provisioning-completed)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Tenant Provisioning Completed](#/flows/TenantProvisioning/tenant-provisioning-completed)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
