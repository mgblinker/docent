---
type: flows
---

# Send Set Password Link

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: SendSetPasswordLinkRequest.SendSetPasswordLink
- **Endpoints**:
  - `POST ` (no ApiGateway route resolved)
- **Module**: Authentication
- **Modules touched by this flow**: Authentication, CommunicationService

```mermaid
flowchart TB
  EP_SendSetPasswordLinkRequestSendSetPasswordLink[["SendSetPasswordLinkRequest.SendSetPasswordLink<br/>(POST)"]]
  MOD_Authentication["Authentication"]
  REQ_SendSetPasswordLinkCommand("Send Set Password Link")
  EP_SendSetPasswordLinkRequestSendSetPasswordLink --> REQ_SendSetPasswordLinkCommand
  REQ_SendSetPasswordLinkCommand -->|SendSetPasswordLinkCommandHandler| MOD_Authentication
  EVT_communication_system_email_requested{{"communication.system.email.requested"}}
  MOD_Authentication -->|SendSetPasswordLinkCommandHandler| EVT_communication_system_email_requested
  MOD_CommunicationService["CommunicationService"]
  EVT_communication_system_email_requested -->|GenericSystemEventRequestedHandler| MOD_CommunicationService
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Bootstrap](#/flows/Authentication/bootstrap)
- [Create First Admin](#/flows/Authentication/create-first-admin)
- [Login](#/flows/Authentication/login)
- [Login Desktop](#/flows/Authentication/login-desktop)
