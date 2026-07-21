---
type: flows
---

# Onboard Employee

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: InternalOnboardRequest.OnboardEmployee
- **Endpoints**:
  - `POST ` (no ApiGateway route resolved)
- **Module**: Backend/StaffManagement
- **Modules touched by this flow**: Backend/StaffManagement, Backend/CoreData

```mermaid
flowchart TB
  EP_InternalOnboardRequestOnboardEmployee[["InternalOnboardRequest.OnboardEmployee<br/>(POST)"]]
  MOD_Backend_StaffManagement["Backend/StaffManagement"]
  REQ_OnboardEmployeeCommand("Onboard Employee")
  EP_InternalOnboardRequestOnboardEmployee -->|| REQ_OnboardEmployeeCommand
  REQ_OnboardEmployeeCommand -->|OnboardEmployeeCommandHandler| MOD_Backend_StaffManagement
  REQ_GetExtendedContactByIdQuery[/"Get Extended Contact By Id"/]
  MOD_Backend_StaffManagement -->|OnboardEmployeeCommandHandler| REQ_GetExtendedContactByIdQuery
  MOD_Backend_CoreData["Backend/CoreData"]
  REQ_GetExtendedContactByIdQuery -->|GetContactByIdInternalHandler| MOD_Backend_CoreData
  REQ_UpdateContactUserIdCommand("Update Contact User Id")
  MOD_Backend_StaffManagement -->|OnboardEmployeeCommandHandler| REQ_UpdateContactUserIdCommand
  REQ_UpdateContactUserIdCommand -->|UpdateUserContactIdCommandHandler| MOD_Backend_CoreData
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
- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Contact Function Assigned](#/flows/Backend/CoreData/contact-function-assigned)
- [Contact Function Revoked](#/flows/Backend/CoreData/contact-function-revoked)
- [Contact Linked To Admin User](#/flows/Backend/CoreData/contact-linked-to-admin-user)
- [Get Participants](#/flows/Backend/EventManagement/get-participants)
- [Create Sales Idea](#/flows/Backend/Sales/create-sales-idea)
- [Get Sales Idea Candidates](#/flows/Backend/Sales/get-sales-idea-candidates)
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
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
