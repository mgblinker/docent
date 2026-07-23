---
type: flows
---

# Cancel Meeting

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: MeetingController.CancelMeetingAsync
- **Endpoints**:
  - `DELETE /communications/v{version:apiVersion}/interactions/meetings/{id}` (via ApiGateway; internally `api/communications/v{version:apiVersion}/interactions/meetings/{id}`)
- **Module**: Backend/Communications
- **Modules touched by this flow**: Backend/Communications, Backend/Activities

```mermaid
flowchart TB
  EP_MeetingControllerCancelMeetingAsync[["MeetingController.CancelMeetingAsync<br/>(DELETE)"]]
  MOD_Backend_Communications["Backend/Communications"]
  REQ_CancelMeetingCommand("Cancel Meeting")
  EP_MeetingControllerCancelMeetingAsync --> REQ_CancelMeetingCommand
  REQ_CancelMeetingCommand -->|CancelMeetingCommandHandler| MOD_Backend_Communications
  EVT_meeting_cancelled{{"Meeting Cancelled"}}
  MOD_Backend_Communications -->|CancelMeetingCommandHandler| EVT_meeting_cancelled
  EVT_meeting_cancelled -->|MeetingCancelledNotificationHandler| MOD_Backend_Communications
  EVT_message_delivery_requested{{"Message Delivery Requested"}}
  MOD_Backend_Communications -->|MeetingCancelledNotificationHandler| EVT_message_delivery_requested
  EVT_message_delivery_requested -->|MessageDeliveryRequestedEventHandler| MOD_Backend_Communications
  EVT_notifiable_event_triggered{{"Notifiable Event Triggered"}}
  MOD_Backend_Communications -->|MeetingCancelledNotificationHandler| EVT_notifiable_event_triggered
  MOD_Backend_Activities["Backend/Activities"]
  EVT_notifiable_event_triggered -->|NotifiableEventTriggeredEventHandler| MOD_Backend_Activities
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Accept Proposed Time](#/flows/Backend/Communications/accept-proposed-time)
- [Appointment Created](#/flows/Backend/Communications/appointment-created)
- [Assign](#/flows/Backend/Communications/assign)
- [Create Call Activity](#/flows/Backend/Communications/create-call-activity)
- [Create Meeting](#/flows/Backend/Communications/create-meeting)
- [Respond By Token](#/flows/Backend/Communications/respond-by-token)
- [Respond To Appointment Invitation](#/flows/Backend/Communications/respond-to-appointment-invitation)
- [Respond To Invitation](#/flows/Backend/Communications/respond-to-invitation)
- [Save External As Contact](#/flows/Backend/Communications/save-external-as-contact)
- [Send Appointment Invitation](#/flows/Backend/Communications/send-appointment-invitation)
- [Send Invitations](#/flows/Backend/Communications/send-invitations)
- [Submit](#/flows/Backend/Communications/submit)
- [Update Meeting](#/flows/Backend/Communications/update-meeting)
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
- [Create Booking](#/flows/Calendar/create-booking)
- [Chat Conversation Ended](#/flows/RealtimeInteraction/chat-conversation-ended)
- [Chat Message Sent](#/flows/RealtimeInteraction/chat-message-sent)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Create Notification](#/flows/Backend/Activities/create-notification)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Set Availability](#/flows/Backend/StaffManagement/set-availability)
- [Set Worktime Schedule](#/flows/Backend/StaffManagement/set-worktime-schedule)
- [Delete Notification](#/flows/ImmoBroker/delete-notification)
- [Get Notifications](#/flows/ImmoBroker/get-notifications)
