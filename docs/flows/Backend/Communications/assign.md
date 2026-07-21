---
type: flows
---

# Assign

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ContactRequestController.AssignAsync
- **Endpoints**:
  - `PUT /communications/v{version:apiVersion}/contact-requests/{id:guid}/assign` (via ApiGateway; internally `api/communications/v{version:apiVersion}/contact-requests/{id:guid}/assign`)
- **Module**: Backend/Communications
- **Modules touched by this flow**: Backend/Communications, Backend/Activities

```mermaid
flowchart TB
  EP_ContactRequestControllerAssignAsync[["ContactRequestController.AssignAsync<br/>(PUT)"]]
  MOD_Backend_Communications["Backend/Communications"]
  REQ_AssignContactRequestCommand("Assign Contact Request")
  EP_ContactRequestControllerAssignAsync -->|| REQ_AssignContactRequestCommand
  REQ_AssignContactRequestCommand -->|AssignContactRequestCommandHandler| MOD_Backend_Communications
  EVT_action_required{{"Action Required"}}
  MOD_Backend_Communications -->|AssignContactRequestCommandHandler| EVT_action_required
  MOD_Backend_Activities["Backend/Activities"]
  EVT_action_required -->|ActionRequiredEventHandler| MOD_Backend_Activities
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Create Notification](#/flows/Backend/Activities/create-notification)
- [Cancel Meeting](#/flows/Backend/Communications/cancel-meeting)
- [Create Meeting](#/flows/Backend/Communications/create-meeting)
- [Respond By Token](#/flows/Backend/Communications/respond-by-token)
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
