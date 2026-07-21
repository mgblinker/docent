---
type: flows
---

# Appointment Created

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Trigger**: automatically published event `appointment.created` (no HTTP endpoint - fired by a background process or another handler)
- **Module**: Backend/Communications
- **Modules touched by this flow**: Backend/Communications, Calendar

```mermaid
flowchart TB
  EVT_appointment_created{{"Appointment Created"}}
  MOD_Backend_Communications["Backend/Communications"]
  MOD_Backend_Communications -->|CreateAppointmentCommandHandler| EVT_appointment_created
  MOD_Calendar["Calendar"]
  EVT_appointment_created -->|AppointmentCreatedEventHandler| MOD_Calendar
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Add Absence](#/flows/Backend/StaffManagement/add-absence)
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
