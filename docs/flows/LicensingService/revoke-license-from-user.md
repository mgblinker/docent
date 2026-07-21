---
type: flows
---

# Revoke License From User

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: UserLicensesAdminController.RevokeLicenseFromUser
- **Endpoints**:
  - `DELETE /licensing-admin/v{version:apiVersion}/users/{assignmentId:guid}` (via ApiGateway; internally `api/licensing-admin/v{version:apiVersion}/users/{assignmentId:guid}`)
- **Module**: LicensingService
- **Modules touched by this flow**: LicensingService

```mermaid
flowchart TB
  EP_UserLicensesAdminControllerRevokeLicenseFromUser[["UserLicensesAdminController.RevokeLicenseFromUser<br/>(DELETE)"]]
  MOD_LicensingService["LicensingService"]
  REQ_RevokeLicenseFromUserCommand("Revoke License From User")
  EP_UserLicensesAdminControllerRevokeLicenseFromUser -->|| REQ_RevokeLicenseFromUserCommand
  REQ_RevokeLicenseFromUserCommand -->|RevokeLicenseFromUserCommandHandler| MOD_LicensingService
  EVT_license_revoked_from_user{{"License revoked from user"}}
  MOD_LicensingService -->|RevokeLicenseFromUserCommandHandler| EVT_license_revoked_from_user
```
