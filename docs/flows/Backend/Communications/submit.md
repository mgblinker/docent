---
type: flows
---

# Submit

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: PublicContactRequestController.SubmitAsync
- **Endpoints**:
  - `POST /communications-public/v{version:apiVersion}/contact-requests` (via ApiGateway; internally `api/communications-public/v{version:apiVersion}/contact-requests`)
- **Module**: Backend/Communications
- **Modules touched by this flow**: Backend/Communications, Backend/Activities

```mermaid
flowchart TB
  EP_PublicContactRequestControllerSubmitAsync[["PublicContactRequestController.SubmitAsync<br/>(POST)"]]
  MOD_Backend_Communications["Backend/Communications"]
  REQ_SubmitContactRequestCommand("Submit Contact Request")
  EP_PublicContactRequestControllerSubmitAsync --> REQ_SubmitContactRequestCommand
  REQ_SubmitContactRequestCommand -->|SubmitContactRequestCommandHandler| MOD_Backend_Communications
  EVT_action_required{{"Action Required"}}
  MOD_Backend_Communications -->|SubmitContactRequestCommandHandler| EVT_action_required
  MOD_Backend_Activities["Backend/Activities"]
  EVT_action_required -->|ActionRequiredEventHandler| MOD_Backend_Activities
  EVT_contactrequest_received{{"Contact Request Received"}}
  MOD_Backend_Communications -->|SubmitContactRequestCommandHandler| EVT_contactrequest_received
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Create Notification](#/flows/Backend/Activities/create-notification)
- [Assign](#/flows/Backend/Communications/assign)
- [Cancel Meeting](#/flows/Backend/Communications/cancel-meeting)
- [Create Meeting](#/flows/Backend/Communications/create-meeting)
- [Respond By Token](#/flows/Backend/Communications/respond-by-token)
- [Respond To Appointment Invitation](#/flows/Backend/Communications/respond-to-appointment-invitation)
- [Respond To Invitation](#/flows/Backend/Communications/respond-to-invitation)
- [Send Appointment Invitation](#/flows/Backend/Communications/send-appointment-invitation)
- [Send Invitations](#/flows/Backend/Communications/send-invitations)
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
