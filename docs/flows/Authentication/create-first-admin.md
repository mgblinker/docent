---
type: flows
---

# Create First Admin

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: CreateFirstAdminController.CreateFirstAdminAsync
- **Endpoints**:
  - `POST /authentication/v{version:apiVersion}/admin/first-admin` (via ApiGateway; internally `api/v{version:apiVersion}/admin/first-admin`)
- **Module**: Authentication
- **Modules touched by this flow**: Authentication, LicensingService, CommunicationService

```mermaid
flowchart TB
  EP_CreateFirstAdminControllerCreateFirstAdminAsync[["CreateFirstAdminController.CreateFirstAdminAsync<br/>(POST)"]]
  MOD_Authentication["Authentication"]
  REQ_CreateFirstAdminCommand("Create First Admin")
  EP_CreateFirstAdminControllerCreateFirstAdminAsync -->|| REQ_CreateFirstAdminCommand
  REQ_CreateFirstAdminCommand -->|CreateFirstAdminCommandHandler| MOD_Authentication
  REQ_RegisterTenantCommand("Register Tenant")
  MOD_Authentication -->|CreateFirstAdminCommandHandler| REQ_RegisterTenantCommand
  REQ_RegisterTenantCommand -->|RegisterTenantCommandHandler| MOD_Authentication
  EVT_authentication_tenant_created{{"authentication.tenant.created"}}
  MOD_Authentication -->|RegisterTenantCommandHandler| EVT_authentication_tenant_created
  MOD_LicensingService["LicensingService"]
  EVT_authentication_tenant_created -->|TenantCreatedEventHandler| MOD_LicensingService
  REQ_SendSetPasswordLinkCommand("Send Set Password Link")
  MOD_Authentication -->|CreateFirstAdminCommandHandler| REQ_SendSetPasswordLinkCommand
  REQ_SendSetPasswordLinkCommand -->|SendSetPasswordLinkCommandHandler| MOD_Authentication
  EVT_communication_system_email_requested{{"communication.system.email.requested"}}
  MOD_Authentication -->|SendSetPasswordLinkCommandHandler| EVT_communication_system_email_requested
  MOD_CommunicationService["CommunicationService"]
  EVT_communication_system_email_requested -->|GenericSystemEventRequestedHandler| MOD_CommunicationService
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Bootstrap](#/flows/Authentication/bootstrap)
- [Register Tenant](#/flows/Authentication/register-tenant)
- [Handle Stripe Webhook](#/flows/BillingService/handle-stripe-webhook)
- [Assign License To Tenant](#/flows/LicensingService/assign-license-to-tenant)
- [Assign License To User](#/flows/LicensingService/assign-license-to-user)
- [Assign Licenses To User](#/flows/LicensingService/assign-licenses-to-user)
- [Revoke License From User](#/flows/LicensingService/revoke-license-from-user)
- [Login](#/flows/Authentication/login)
- [Login Desktop](#/flows/Authentication/login-desktop)
- [Send Set Password Link](#/flows/Authentication/send-set-password-link)
