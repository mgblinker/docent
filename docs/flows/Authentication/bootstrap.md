---
type: flows
---

# Bootstrap

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: BootstrapStandaloneTenantController.Bootstrap
- **Endpoints**:
  - `POST /authentication/v{version:apiVersion}/internal/standalone-tenants/bootstrap` (via ApiGateway; internally `api/v{version:apiVersion}/internal/standalone-tenants/bootstrap`)
- **Module**: Authentication
- **Modules touched by this flow**: Authentication, LicensingService, CommunicationService

```mermaid
flowchart TB
  EP_BootstrapStandaloneTenantControllerBootstrap[["BootstrapStandaloneTenantController.Bootstrap<br/>(POST)"]]
  MOD_Authentication["Authentication"]
  REQ_BootstrapStandaloneTenantCommand("Bootstrap Standalone Tenant")
  EP_BootstrapStandaloneTenantControllerBootstrap -->|| REQ_BootstrapStandaloneTenantCommand
  REQ_BootstrapStandaloneTenantCommand -->|BootstrapStandaloneTenantCommandHandler| MOD_Authentication
  REQ_RegisterTenantCommand("Register Tenant")
  MOD_Authentication -->|BootstrapStandaloneTenantCommandHandler| REQ_RegisterTenantCommand
  REQ_RegisterTenantCommand -->|RegisterTenantCommandHandler| MOD_Authentication
  EVT_authentication_tenant_created{{"authentication.tenant.created"}}
  MOD_Authentication -->|RegisterTenantCommandHandler| EVT_authentication_tenant_created
  MOD_LicensingService["LicensingService"]
  EVT_authentication_tenant_created -->|TenantCreatedEventHandler| MOD_LicensingService
  EVT_authentication_standalone_app_bootstrapped{{"authentication.standalone-app.bootstrapped"}}
  MOD_Authentication -->|BootstrapStandaloneTenantCommandHandler| EVT_authentication_standalone_app_bootstrapped
  EVT_authentication_standalone_app_bootstrapped -->|StandaloneAppBootstrapEventHandler| MOD_LicensingService
  REQ_AssignLicenseToTenantCommand("Assign License To Tenant")
  MOD_LicensingService -->|StandaloneAppBootstrapEventHandler| REQ_AssignLicenseToTenantCommand
  REQ_AssignLicenseToTenantCommand -->|AssignLicenseToTenantCommandHandler| MOD_LicensingService
  REQ_AssignLicenseToUserCommand("Assign License To User")
  MOD_LicensingService -->|StandaloneAppBootstrapEventHandler| REQ_AssignLicenseToUserCommand
  REQ_AssignLicenseToUserCommand -->|AssignLicenseToUserCommandHandler| MOD_LicensingService
  EVT_communication_system_email_requested{{"communication.system.email.requested"}}
  MOD_Authentication -->|BootstrapStandaloneTenantCommandHandler| EVT_communication_system_email_requested
  MOD_CommunicationService["CommunicationService"]
  EVT_communication_system_email_requested -->|GenericSystemEventRequestedHandler| MOD_CommunicationService
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Create First Admin](#/flows/Authentication/create-first-admin)
- [Register Tenant](#/flows/Authentication/register-tenant)
- [Handle Stripe Webhook](#/flows/BillingService/handle-stripe-webhook)
- [Assign License To Tenant](#/flows/LicensingService/assign-license-to-tenant)
- [Assign License To User](#/flows/LicensingService/assign-license-to-user)
- [Assign Licenses To User](#/flows/LicensingService/assign-licenses-to-user)
- [Revoke License From User](#/flows/LicensingService/revoke-license-from-user)
- [Login](#/flows/Authentication/login)
- [Login Desktop](#/flows/Authentication/login-desktop)
- [Send Set Password Link](#/flows/Authentication/send-set-password-link)
