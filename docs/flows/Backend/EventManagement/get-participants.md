---
type: flows
---

# Get Participants

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ParticipantController.GetParticipants
- **Endpoints**:
  - `GET /event-management/v{apiVersion}/participants` (via ApiGateway; internally `api/event-management/v{apiVersion}/participants`)
- **Module**: Backend/EventManagement
- **Modules touched by this flow**: Backend/EventManagement, Backend/CoreData

```mermaid
flowchart TB
  EP_ParticipantControllerGetParticipants[["ParticipantController.GetParticipants<br/>(GET)"]]
  MOD_Backend_EventManagement["Backend/EventManagement"]
  REQ_GetParticipantListQuery[/"Get Participant List"/]
  EP_ParticipantControllerGetParticipants --> REQ_GetParticipantListQuery
  REQ_GetParticipantListQuery -->|GetParticipantListQueryHandler| MOD_Backend_EventManagement
  REQ_GetContactListQuery[/"Get Contact List"/]
  MOD_Backend_EventManagement -->|GetParticipantListQueryHandler| REQ_GetContactListQuery
  MOD_Backend_CoreData["Backend/CoreData"]
  REQ_GetContactListQuery -->|GetContactListHandler| MOD_Backend_CoreData
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
