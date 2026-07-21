---
type: flows
---

# Contact Data Updated

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Trigger**: automatically published event `contact.data.updated` (no HTTP endpoint - fired by a background process or another handler)
- **Module**: Backend/CoreData
- **Modules touched by this flow**: Backend/CoreData, Backend/EventManagement, Backend/SocialCare, Backend/StaffManagement

```mermaid
flowchart TB
  EVT_contact_data_updated{{"Contact Data Updated"}}
  MOD_Backend_CoreData["Backend/CoreData"]
  MOD_Backend_CoreData -->|ContactUpdatedDomainEventHandler| EVT_contact_data_updated
  MOD_Backend_EventManagement["Backend/EventManagement"]
  MOD_Backend_EventManagement -->|ParticipantUpdatedEventHandler| EVT_contact_data_updated
  EVT_contact_data_updated -->|ContactDataUpdatedEventHandler| MOD_Backend_CoreData
  MOD_Backend_SocialCare["Backend/SocialCare"]
  EVT_contact_data_updated -->|PersonContactDataUpdatedEventHandler| MOD_Backend_SocialCare
  MOD_Backend_StaffManagement["Backend/StaffManagement"]
  EVT_contact_data_updated -->|EmployeeContactDataUpdatedEventHandler| MOD_Backend_StaffManagement
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Admin User Registered](#/flows/Authentication/admin-user-registered)
- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Register Relative Relationship](#/flows/Backend/CareManagement/register-relative-relationship)
- [Create Call Activity](#/flows/Backend/Communications/create-call-activity)
- [Create Meeting](#/flows/Backend/Communications/create-meeting)
- [Save External As Contact](#/flows/Backend/Communications/save-external-as-contact)
- [Send Appointment Invitation](#/flows/Backend/Communications/send-appointment-invitation)
- [Send Invitations](#/flows/Backend/Communications/send-invitations)
- [Contact Function Assigned](#/flows/Backend/CoreData/contact-function-assigned)
- [Contact Function Revoked](#/flows/Backend/CoreData/contact-function-revoked)
- [Contact Linked To Admin User](#/flows/Backend/CoreData/contact-linked-to-admin-user)
- [Get Participants](#/flows/Backend/EventManagement/get-participants)
- [Create Sales Idea](#/flows/Backend/Sales/create-sales-idea)
- [Get Sales Idea Candidates](#/flows/Backend/Sales/get-sales-idea-candidates)
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
- [Onboard Employee](#/flows/Backend/StaffManagement/onboard-employee)
- [Set Availability](#/flows/Backend/StaffManagement/set-availability)
- [Set Worktime Schedule](#/flows/Backend/StaffManagement/set-worktime-schedule)
- [Create Booking](#/flows/Calendar/create-booking)
- [Search](#/flows/ImmoBroker/search)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Tenant Provisioning Completed](#/flows/TenantProvisioning/tenant-provisioning-completed)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
- [Module Assignment Requested](#/flows/AutomationService/module-assignment-requested)
- [Create Product](#/flows/Backend/ProductData/create-product)
- [Delete Product](#/flows/Backend/ProductData/delete-product)
- [Update Product](#/flows/Backend/ProductData/update-product)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Add Absence](#/flows/Backend/StaffManagement/add-absence)
- [Create Override](#/flows/Backend/StaffManagement/create-override)
