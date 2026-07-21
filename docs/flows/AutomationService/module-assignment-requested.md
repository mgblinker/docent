---
type: flows
---

# Module Assignment Requested

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Trigger**: automatically published event `module.assignment.requested` (no HTTP endpoint - fired by a background process or another handler)
- **Module**: AutomationService
- **Modules touched by this flow**: AutomationService, Backend/SocialCare

```mermaid
flowchart TB
  EVT_module_assignment_requested{{"Module Assignment Requested"}}
  MOD_AutomationService["AutomationService"]
  MOD_AutomationService -->|PublishModuleEventActionStrategy| EVT_module_assignment_requested
  MOD_Backend_SocialCare["Backend/SocialCare"]
  EVT_module_assignment_requested -->|ModuleAssignmentEventHandler| MOD_Backend_SocialCare
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Create Product](#/flows/Backend/ProductData/create-product)
- [Delete Product](#/flows/Backend/ProductData/delete-product)
- [Update Product](#/flows/Backend/ProductData/update-product)
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
