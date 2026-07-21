---
type: flows
---

# Register

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: RegisterWithPasskeyController.Register
- **Endpoints**:
  - `POST /authentication/v{version:apiVersion}/account/register-with-passkey` (via ApiGateway; internally `api/v{version:apiVersion}/account/register-with-passkey`)
- **Module**: Authentication
- **Modules touched by this flow**: Authentication

```mermaid
flowchart TB
  EP_RegisterWithPasskeyControllerRegister[["RegisterWithPasskeyController.Register<br/>(POST)"]]
  MOD_Authentication["Authentication"]
  REQ_RegisterWithPasskeyCommand("Register With Passkey")
  EP_RegisterWithPasskeyControllerRegister -->|| REQ_RegisterWithPasskeyCommand
  REQ_RegisterWithPasskeyCommand -->|RegisterWithPasskeyCommandHandler| MOD_Authentication
  EVT_user_registered{{"user.registered"}}
  MOD_Authentication -->|RegisterWithPasskeyCommandHandler| EVT_user_registered
```
