---
type: flows
---

# Set Availability

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: EmployeeAvailabilityController.SetAvailability
- **Endpoints**:
  - `POST /staff-management/v{version:apiVersion}/employees/availability` (via ApiGateway; internally `api/staff-management/v{version:apiVersion}/employees/availability`)
- **Module**: Backend/StaffManagement
- **Modules touched by this flow**: Backend/StaffManagement, Backend/CoreData, Backend/Activities

```mermaid
flowchart TB
  EP_EmployeeAvailabilityControllerSetAvailability[["EmployeeAvailabilityController.SetAvailability<br/>(POST)"]]
  MOD_Backend_StaffManagement["Backend/StaffManagement"]
  REQ_SetAvailabilityCommand("Set Availability")
  EP_EmployeeAvailabilityControllerSetAvailability -->|| REQ_SetAvailabilityCommand
  REQ_SetAvailabilityCommand -->|SetAvailabilityCommandHandler| MOD_Backend_StaffManagement
  REQ_GetContactUserIdQuery[/"Get Contact User Id"/]
  MOD_Backend_StaffManagement -->|SetAvailabilityCommandHandler| REQ_GetContactUserIdQuery
  MOD_Backend_CoreData["Backend/CoreData"]
  REQ_GetContactUserIdQuery -->|GetContactUserIdQueryHandler| MOD_Backend_CoreData
  EVT_notifiable_event_triggered{{"Notifiable Event Triggered"}}
  MOD_Backend_StaffManagement -->|SetAvailabilityCommandHandler| EVT_notifiable_event_triggered
  MOD_Backend_Activities["Backend/Activities"]
  EVT_notifiable_event_triggered -->|NotifiableEventTriggeredEventHandler| MOD_Backend_Activities
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
- [Onboard Employee](#/flows/Backend/StaffManagement/onboard-employee)
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
- [Create Notification](#/flows/Backend/Activities/create-notification)
- [Assign](#/flows/Backend/Communications/assign)
- [Cancel Meeting](#/flows/Backend/Communications/cancel-meeting)
- [Respond By Token](#/flows/Backend/Communications/respond-by-token)
- [Respond To Appointment Invitation](#/flows/Backend/Communications/respond-to-appointment-invitation)
- [Respond To Invitation](#/flows/Backend/Communications/respond-to-invitation)
- [Submit](#/flows/Backend/Communications/submit)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Delete Notification](#/flows/ImmoBroker/delete-notification)
- [Get Notifications](#/flows/ImmoBroker/get-notifications)
