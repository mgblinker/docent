---
type: flows
---

# Create Call Activity

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: CallController.CreateCallActivityAsync
- **Endpoints**:
  - `POST /communications/v{version:apiVersion}/interactions/calls` (via ApiGateway; internally `api/communications/v{version:apiVersion}/interactions/calls`)
- **Module**: Backend/Communications
- **Modules touched by this flow**: Backend/Communications, Backend/CoreData

```mermaid
flowchart TB
  EP_CallControllerCreateCallActivityAsync[["CallController.CreateCallActivityAsync<br/>(POST)"]]
  MOD_Backend_Communications["Backend/Communications"]
  REQ_CreateCallActivityCommand("Create Call Activity")
  EP_CallControllerCreateCallActivityAsync -->|| REQ_CreateCallActivityCommand
  REQ_CreateCallActivityCommand -->|CreateCallActivityCommandHandler| MOD_Backend_Communications
  REQ_GetCurrentUserContactQuery[/"Get Current User Contact"/]
  MOD_Backend_Communications -->|CreateCallActivityCommandHandler| REQ_GetCurrentUserContactQuery
  MOD_Backend_CoreData["Backend/CoreData"]
  REQ_GetCurrentUserContactQuery -->|GetCurrentUserContactQueryHandler| MOD_Backend_CoreData
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Admin User Registered](#/flows/Authentication/admin-user-registered)
- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Register Relative Relationship](#/flows/Backend/CareManagement/register-relative-relationship)
- [Create Meeting](#/flows/Backend/Communications/create-meeting)
- [Save External As Contact](#/flows/Backend/Communications/save-external-as-contact)
- [Send Appointment Invitation](#/flows/Backend/Communications/send-appointment-invitation)
- [Send Invitations](#/flows/Backend/Communications/send-invitations)
- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
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
