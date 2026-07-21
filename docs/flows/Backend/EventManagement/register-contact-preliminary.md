---
type: flows
---

# Register Contact Preliminary

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: RegisterParticipantPreliminaryController.RegisterContactPreliminary
- **Endpoints**:
  - `POST /event-management/v{version:apiVersion}/registrations` (via ApiGateway; internally `api/event-management/v{version:apiVersion}/registrations`)
- **Module**: Backend/EventManagement
- **Modules touched by this flow**: Backend/EventManagement

```mermaid
flowchart TB
  EP_RegisterParticipantPreliminaryControllerRegisterContactPreliminary[["RegisterParticipantPreliminaryController.RegisterContactPreliminary<br/>(POST)"]]
  MOD_Backend_EventManagement["Backend/EventManagement"]
  REQ_RegisterParticipantPreliminaryCommand("Register Participant<br/>Preliminary")
  EP_RegisterParticipantPreliminaryControllerRegisterContactPreliminary -->|| REQ_RegisterParticipantPreliminaryCommand
  REQ_RegisterParticipantPreliminaryCommand -->|RegisterParticipantPreliminaryHandler| MOD_Backend_EventManagement
  EVT_email_send{{"email.send"}}
  MOD_Backend_EventManagement -->|RegisterParticipantPreliminaryHandler| EVT_email_send
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Initiate Registration Cancellation](#/flows/Backend/EventManagement/initiate-registration-cancellation)
- [Register Contact](#/flows/Backend/EventManagement/register-contact)
