---
type: flows
---

# Assign License To User

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: UserLicensesAdminController.AssignLicenseToUser
- **Endpoints**:
  - `POST /licensing-admin/v{version:apiVersion}/users` (via ApiGateway; internally `api/licensing-admin/v{version:apiVersion}/users`)
- **Module**: LicensingService
- **Modules touched by this flow**: LicensingService

```mermaid
flowchart TB
  EP_UserLicensesAdminControllerAssignLicenseToUser[["UserLicensesAdminController.AssignLicenseToUser<br/>(POST)"]]
  MOD_LicensingService["LicensingService"]
  REQ_AssignLicenseToUserCommand("Assign License To User")
  EP_UserLicensesAdminControllerAssignLicenseToUser -->|| REQ_AssignLicenseToUserCommand
  REQ_AssignLicenseToUserCommand -->|AssignLicenseToUserCommandHandler| MOD_LicensingService
  EVT_licensing_license_assignedtouser{{"License assigned to user"}}
  MOD_LicensingService -->|AssignLicenseToUserCommandHandler| EVT_licensing_license_assignedtouser
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Assign Licenses To User](#/flows/LicensingService/assign-licenses-to-user)
