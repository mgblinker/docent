---
type: flows
---

# Initiate Registration Cancellation

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: InitiateRegistrationCancellationController.InitiateRegistrationCancellation
- **Endpoints**:
  - `PUT /event-management/v{version:apiVersion}/registrations` (via ApiGateway; internally `api/event-management/v{version:apiVersion}/registrations`)
- **Module**: Backend/EventManagement
- **Modules touched by this flow**: Backend/EventManagement

```mermaid
flowchart TB
  EP_InitiateRegistrationCancellationControllerInitiateRegistrationCancellation[["InitiateRegistrationCancellationController.InitiateRegistrationCancellation<br/>(PUT)"]]
  MOD_Backend_EventManagement["Backend/EventManagement"]
  REQ_InitiateRegistrationCancellationCommand("Initiate Registration<br/>Cancellation")
  EP_InitiateRegistrationCancellationControllerInitiateRegistrationCancellation --> REQ_InitiateRegistrationCancellationCommand
  REQ_InitiateRegistrationCancellationCommand -->|InitiateRegistrationCancellationCommandHandler| MOD_Backend_EventManagement
  EVT_email_send{{"email.send"}}
  MOD_Backend_EventManagement -->|InitiateRegistrationCancellationCommandHandler| EVT_email_send
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Register Contact](#/flows/Backend/EventManagement/register-contact)
- [Register Contact Preliminary](#/flows/Backend/EventManagement/register-contact-preliminary)
