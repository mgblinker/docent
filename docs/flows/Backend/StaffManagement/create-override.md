---
type: flows
---

# Create Override

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: EmployeeAvailabilityController.CreateOverride
- **Endpoints**:
  - `POST /staff-management/v{version:apiVersion}/employees/availability/overrides` (via ApiGateway; internally `api/staff-management/v{version:apiVersion}/employees/availability/overrides`)
- **Module**: Backend/StaffManagement
- **Modules touched by this flow**: Backend/StaffManagement, Calendar

```mermaid
flowchart TB
  EP_EmployeeAvailabilityControllerCreateOverride[["EmployeeAvailabilityController.CreateOverride<br/>(POST)"]]
  MOD_Backend_StaffManagement["Backend/StaffManagement"]
  REQ_CreateAvailabilityOverrideCommand("Create Availability Override")
  EP_EmployeeAvailabilityControllerCreateOverride -->|| REQ_CreateAvailabilityOverrideCommand
  REQ_CreateAvailabilityOverrideCommand -->|CreateAvailabilityOverrideCommandHandler| MOD_Backend_StaffManagement
  EVT_availability_override_changed{{"availability-override.changed"}}
  MOD_Backend_StaffManagement -->|CreateAvailabilityOverrideCommandHandler| EVT_availability_override_changed
  MOD_Calendar["Calendar"]
  EVT_availability_override_changed -->|AvailabilityOverrideChangedEventHandler| MOD_Calendar
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Appointment Created](#/flows/Backend/Communications/appointment-created)
- [Add Absence](#/flows/Backend/StaffManagement/add-absence)
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
