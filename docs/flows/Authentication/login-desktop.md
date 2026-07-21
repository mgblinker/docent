---
type: flows
---

# Login Desktop

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: LoginController.LoginDesktop
- **Endpoints**:
  - `POST /authentication/v{version:apiVersion}/account/login/desktop` (via ApiGateway; internally `api/v{version:apiVersion}/account/login/desktop`)
- **Module**: Authentication
- **Modules touched by this flow**: Authentication, CommunicationService

```mermaid
flowchart TB
  EP_LoginControllerLoginDesktop[["LoginController.LoginDesktop<br/>(POST)"]]
  MOD_Authentication["Authentication"]
  REQ_LoginCommand("Login")
  EP_LoginControllerLoginDesktop -->|| REQ_LoginCommand
  REQ_LoginCommand -->|LoginCommandHandler| MOD_Authentication
  EVT_communication_system_email_requested{{"communication.system.email.requested"}}
  MOD_Authentication -->|LoginCommandHandler| EVT_communication_system_email_requested
  MOD_CommunicationService["CommunicationService"]
  EVT_communication_system_email_requested -->|GenericSystemEventRequestedHandler| MOD_CommunicationService
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Bootstrap](#/flows/Authentication/bootstrap)
- [Create First Admin](#/flows/Authentication/create-first-admin)
- [Login](#/flows/Authentication/login)
- [Send Set Password Link](#/flows/Authentication/send-set-password-link)
