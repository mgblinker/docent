---
type: flows
---

# Add Absence

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: EmployeeAbsencesController.AddAbsence
- **Endpoints**:
  - `POST /staff-management/v{version:apiVersion}/employees/{employeeId}/absences` (via ApiGateway; internally `api/staff-management/v{version:apiVersion}/employees/{employeeId}/absences`)
- **Module**: Backend/StaffManagement
- **Modules touched by this flow**: Backend/StaffManagement, Calendar

```mermaid
flowchart TB
  EP_EmployeeAbsencesControllerAddAbsence[["EmployeeAbsencesController.AddAbsence<br/>(POST)"]]
  MOD_Backend_StaffManagement["Backend/StaffManagement"]
  REQ_AddAbsenceCommand("Add Absence")
  EP_EmployeeAbsencesControllerAddAbsence -->|| REQ_AddAbsenceCommand
  REQ_AddAbsenceCommand -->|AddAbsenceCommandHandler| MOD_Backend_StaffManagement
  EVT_absence_created{{"absence.created"}}
  MOD_Backend_StaffManagement -->|AddAbsenceCommandHandler| EVT_absence_created
  MOD_Calendar["Calendar"]
  EVT_absence_created -->|AbsenceCreatedEventHandler| MOD_Calendar
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Appointment Created](#/flows/Backend/Communications/appointment-created)
- [Create Override](#/flows/Backend/StaffManagement/create-override)
- [Action Created](#/flows/Calendar/action-created)
- [Complete Calendar Item](#/flows/Calendar/complete-calendar-item)
- [Create Booking](#/flows/Calendar/create-booking)
- [Create Calendar Item](#/flows/Calendar/create-calendar-item)
- [Put Item](#/flows/Calendar/put-item)
- [Update Calendar Item](#/flows/Calendar/update-calendar-item)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
