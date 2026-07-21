---
type: flows
---

# Enroll

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ElearningController.Enroll
- **Endpoints**:
  - `POST /education/v{version:apiVersion}/elearning/enroll` (via ApiGateway; internally `api/education/v{version:apiVersion}/elearning/enroll`)
- **Module**: Backend/Education
- **Modules touched by this flow**: Backend/Education, Backend/EventManagement

```mermaid
flowchart TB
  EP_ElearningControllerEnroll[["ElearningController.Enroll<br/>(POST)"]]
  MOD_Backend_Education["Backend/Education"]
  REQ_ElearningEnrollCommand("Elearning Enroll")
  EP_ElearningControllerEnroll -->|| REQ_ElearningEnrollCommand
  REQ_ElearningEnrollCommand -->|ElearningEnrollHandler| MOD_Backend_Education
  EVT_education_student_learning_path_enrolled{{"education.student.learning-path.enrolled"}}
  MOD_Backend_Education -->|ElearningEnrollHandler| EVT_education_student_learning_path_enrolled
  MOD_Backend_EventManagement["Backend/EventManagement"]
  EVT_education_student_learning_path_enrolled -->|StudentEnrolledEventHandler| MOD_Backend_EventManagement
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Complete Lesson](#/flows/Backend/Education/complete-lesson)
- [Event Management Registration Completed](#/flows/Backend/EventManagement/event-management-registration-completed)
- [Event Registration Completed](#/flows/Backend/EventManagement/event-registration-completed)
- [Get Participants](#/flows/Backend/EventManagement/get-participants)
- [Initiate Registration Cancellation](#/flows/Backend/EventManagement/initiate-registration-cancellation)
- [Register Contact](#/flows/Backend/EventManagement/register-contact)
- [Register Contact Preliminary](#/flows/Backend/EventManagement/register-contact-preliminary)
- [Upload Event Template Certificate](#/flows/Backend/EventManagement/upload-event-template-certificate)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
