---
type: flows
---

# Create Referrer Employee

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ReferrerEmployeeController.CreateReferrerEmployee
- **Endpoints**:
  - `POST /social-care/v{version:apiVersion}/referrers/{referrerId:guid}/employees` (via ApiGateway; internally `api/social-care/v{version:apiVersion}/referrers/{referrerId:guid}/employees`)
- **Module**: Backend/SocialCare
- **Modules touched by this flow**: Backend/SocialCare, Backend/CoreData, Backend/Communications

```mermaid
flowchart TB
  EP_ReferrerEmployeeControllerCreateReferrerEmployee[["ReferrerEmployeeController.CreateReferrerEmployee<br/>(POST)"]]
  MOD_Backend_SocialCare["Backend/SocialCare"]
  REQ_CreateReferrerEmployeeCommand("Create Referrer Employee")
  EP_ReferrerEmployeeControllerCreateReferrerEmployee -->|| REQ_CreateReferrerEmployeeCommand
  REQ_CreateReferrerEmployeeCommand -->|CreateReferrerEmployeeHandler| MOD_Backend_SocialCare
  REQ_GetExtendedContactByIdQuery[/"Get Extended Contact By Id"/]
  MOD_Backend_SocialCare -->|CreateReferrerEmployeeHandler| REQ_GetExtendedContactByIdQuery
  MOD_Backend_CoreData["Backend/CoreData"]
  REQ_GetExtendedContactByIdQuery -->|GetContactByIdInternalHandler| MOD_Backend_CoreData
  REQ_UpdateContactUserIdCommand("Update Contact User Id")
  MOD_Backend_SocialCare -->|CreateReferrerEmployeeHandler| REQ_UpdateContactUserIdCommand
  REQ_UpdateContactUserIdCommand -->|UpdateUserContactIdCommandHandler| MOD_Backend_CoreData
  EVT_message_delivery_requested{{"Message Delivery Requested"}}
  MOD_Backend_SocialCare -->|CreateReferrerEmployeeHandler| EVT_message_delivery_requested
  MOD_Backend_Communications["Backend/Communications"]
  EVT_message_delivery_requested -->|MessageDeliveryRequestedEventHandler| MOD_Backend_Communications
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
- [Accept Proposed Time](#/flows/Backend/Communications/accept-proposed-time)
- [Appointment Created](#/flows/Backend/Communications/appointment-created)
- [Assign](#/flows/Backend/Communications/assign)
- [Cancel Meeting](#/flows/Backend/Communications/cancel-meeting)
- [Respond By Token](#/flows/Backend/Communications/respond-by-token)
- [Respond To Appointment Invitation](#/flows/Backend/Communications/respond-to-appointment-invitation)
- [Respond To Invitation](#/flows/Backend/Communications/respond-to-invitation)
- [Submit](#/flows/Backend/Communications/submit)
- [Update Meeting](#/flows/Backend/Communications/update-meeting)
- [Chat Conversation Ended](#/flows/RealtimeInteraction/chat-conversation-ended)
- [Chat Message Sent](#/flows/RealtimeInteraction/chat-message-sent)
