---
type: flows
---

# Respond By Token

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: InvitationResponseController.RespondByTokenAsync
- **Endpoints**:
  - `POST /communications-public/v{version:apiVersion}/invitations/respond` (via ApiGateway; internally `api/communications-public/v{version:apiVersion}/invitations/respond`)
- **Module**: Backend/Communications
- **Modules touched by this flow**: Backend/Communications, Backend/Activities

```mermaid
flowchart TB
  EP_InvitationResponseControllerRespondByTokenAsync[["InvitationResponseController.RespondByTokenAsync<br/>(POST)"]]
  MOD_Backend_Communications["Backend/Communications"]
  REQ_RespondToInvitationByTokenCommand("Respond To Invitation By<br/>Token")
  EP_InvitationResponseControllerRespondByTokenAsync --> REQ_RespondToInvitationByTokenCommand
  REQ_RespondToInvitationByTokenCommand -->|RespondToInvitationByTokenCommandHandler| MOD_Backend_Communications
  EVT_invitation_response_received{{"Invitation Response Received"}}
  MOD_Backend_Communications -->|RespondToInvitationByTokenCommandHandler| EVT_invitation_response_received
  EVT_invitation_response_received -->|InvitationResponseNotificationHandler| MOD_Backend_Communications
  EVT_notifiable_event_triggered{{"Notifiable Event Triggered"}}
  MOD_Backend_Communications -->|InvitationResponseNotificationHandler| EVT_notifiable_event_triggered
  MOD_Backend_Activities["Backend/Activities"]
  EVT_notifiable_event_triggered -->|NotifiableEventTriggeredEventHandler| MOD_Backend_Activities
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Create Notification](#/flows/Backend/Activities/create-notification)
- [Assign](#/flows/Backend/Communications/assign)
- [Cancel Meeting](#/flows/Backend/Communications/cancel-meeting)
- [Create Meeting](#/flows/Backend/Communications/create-meeting)
- [Respond To Appointment Invitation](#/flows/Backend/Communications/respond-to-appointment-invitation)
- [Respond To Invitation](#/flows/Backend/Communications/respond-to-invitation)
- [Send Appointment Invitation](#/flows/Backend/Communications/send-appointment-invitation)
- [Send Invitations](#/flows/Backend/Communications/send-invitations)
- [Submit](#/flows/Backend/Communications/submit)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Set Availability](#/flows/Backend/StaffManagement/set-availability)
- [Set Worktime Schedule](#/flows/Backend/StaffManagement/set-worktime-schedule)
- [Delete Notification](#/flows/ImmoBroker/delete-notification)
- [Get Notifications](#/flows/ImmoBroker/get-notifications)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
