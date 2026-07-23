---
type: flows
---

# Create Booking

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: PublicBookingController.CreateBooking
- **Endpoints**:
  - `POST /calendar/v{version:apiVersion}/public/{publicToken}/bookings` (via ApiGateway; internally `api/calendar/v{version:apiVersion}/public/{publicToken}/bookings`)
- **Module**: Calendar
- **Modules touched by this flow**: Calendar, Backend/Communications, Backend/CoreData

```mermaid
flowchart TB
  EP_PublicBookingControllerCreateBooking[["PublicBookingController.CreateBooking<br/>(POST)"]]
  MOD_Calendar["Calendar"]
  REQ_CreateBookingCommand("Create Booking")
  EP_PublicBookingControllerCreateBooking --> REQ_CreateBookingCommand
  REQ_CreateBookingCommand -->|CreateBookingCommandHandler| MOD_Calendar
  EVT_booking_created{{"Booking Created"}}
  MOD_Calendar -->|CreateBookingCommandHandler| EVT_booking_created
  MOD_Backend_Communications["Backend/Communications"]
  EVT_booking_created -->|BookingCreatedEventHandler| MOD_Backend_Communications
  EVT_booking_created -->|BookingCreatedNotificationHandler| MOD_Backend_Communications
  REQ_CreateContactCommand("Create Contact")
  MOD_Backend_Communications -->|BookingCreatedEventHandler| REQ_CreateContactCommand
  MOD_Backend_CoreData["Backend/CoreData"]
  REQ_CreateContactCommand -->|CreateContactCommandHandler| MOD_Backend_CoreData
  REQ_FindContactByEmailQuery[/"Find Contact By Email"/]
  MOD_Backend_Communications -->|BookingCreatedEventHandler| REQ_FindContactByEmailQuery
  REQ_FindContactByEmailQuery -->|FindContactByEmailQueryHandler| MOD_Backend_CoreData
  EVT_booking_linked{{"Booking Linked"}}
  MOD_Backend_Communications -->|BookingCreatedEventHandler| EVT_booking_linked
  EVT_booking_linked -->|BookingLinkedEventHandler| MOD_Calendar
  EVT_message_delivery_requested{{"Message Delivery Requested"}}
  MOD_Backend_Communications -->|BookingCreatedNotificationHandler| EVT_message_delivery_requested
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
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
- [Onboard Employee](#/flows/Backend/StaffManagement/onboard-employee)
- [Set Availability](#/flows/Backend/StaffManagement/set-availability)
- [Set Worktime Schedule](#/flows/Backend/StaffManagement/set-worktime-schedule)
- [Search](#/flows/ImmoBroker/search)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Tenant Provisioning Completed](#/flows/TenantProvisioning/tenant-provisioning-completed)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
- [Appointment Created](#/flows/Backend/Communications/appointment-created)
- [Add Absence](#/flows/Backend/StaffManagement/add-absence)
- [Create Override](#/flows/Backend/StaffManagement/create-override)
- [Action Created](#/flows/Calendar/action-created)
- [Complete Calendar Item](#/flows/Calendar/complete-calendar-item)
- [Create Calendar Item](#/flows/Calendar/create-calendar-item)
- [Put Item](#/flows/Calendar/put-item)
- [Update Calendar Item](#/flows/Calendar/update-calendar-item)
- [Accept Proposed Time](#/flows/Backend/Communications/accept-proposed-time)
- [Assign](#/flows/Backend/Communications/assign)
- [Cancel Meeting](#/flows/Backend/Communications/cancel-meeting)
- [Respond By Token](#/flows/Backend/Communications/respond-by-token)
- [Respond To Appointment Invitation](#/flows/Backend/Communications/respond-to-appointment-invitation)
- [Respond To Invitation](#/flows/Backend/Communications/respond-to-invitation)
- [Submit](#/flows/Backend/Communications/submit)
- [Update Meeting](#/flows/Backend/Communications/update-meeting)
- [Chat Conversation Ended](#/flows/RealtimeInteraction/chat-conversation-ended)
- [Chat Message Sent](#/flows/RealtimeInteraction/chat-message-sent)
