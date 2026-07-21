---
type: flows
---

# Contact Linked To Admin User

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Trigger**: automatically published event `contact.linked.to.admin.user` (no HTTP endpoint - fired by a background process or another handler)
- **Module**: Backend/CoreData
- **Modules touched by this flow**: Backend/CoreData, Authentication

```mermaid
flowchart TB
  EVT_contact_linked_to_admin_user{{"contact.linked.to.admin.user"}}
  MOD_Backend_CoreData["Backend/CoreData"]
  MOD_Backend_CoreData -->|AdminUserRegisteredEventHandler| EVT_contact_linked_to_admin_user
  MOD_Authentication["Authentication"]
  EVT_contact_linked_to_admin_user -->|ContactLinkedToAdminUserEventHandler| MOD_Authentication
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Admin User Registered](#/flows/Authentication/admin-user-registered)
- [Bootstrap](#/flows/Authentication/bootstrap)
- [Create First Admin](#/flows/Authentication/create-first-admin)
- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Login](#/flows/Authentication/login)
- [Login Desktop](#/flows/Authentication/login-desktop)
- [Register](#/flows/Authentication/register)
- [Register Tenant](#/flows/Authentication/register-tenant)
- [Send Set Password Link](#/flows/Authentication/send-set-password-link)
- [Tenant Schema Update Required](#/flows/Authentication/tenant-schema-update-required)
- [Add User](#/flows/ImmoBroker/add-user)
- [Onboard Member](#/flows/ImmoBroker/onboard-member)
- [Remove User](#/flows/ImmoBroker/remove-user)
- [Update User Role](#/flows/ImmoBroker/update-user-role)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Tenant Provisioning Completed](#/flows/TenantProvisioning/tenant-provisioning-completed)
