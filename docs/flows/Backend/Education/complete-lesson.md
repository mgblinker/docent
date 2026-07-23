---
type: flows
---

# Complete Lesson

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ElearningController.CompleteLesson
- **Endpoints**:
  - `POST /education/v{version:apiVersion}/elearning/lessons/{lessonId:guid}/complete` (via ApiGateway; internally `api/education/v{version:apiVersion}/elearning/lessons/{lessonId:guid}/complete`)
- **Module**: Backend/Education
- **Modules touched by this flow**: Backend/Education, Backend/EventManagement

```mermaid
flowchart TB
  EP_ElearningControllerCompleteLesson[["ElearningController.CompleteLesson<br/>(POST)"]]
  MOD_Backend_Education["Backend/Education"]
  REQ_CompleteElearningLessonCommand("Complete Elearning Lesson")
  EP_ElearningControllerCompleteLesson --> REQ_CompleteElearningLessonCommand
  REQ_CompleteElearningLessonCommand -->|CompleteElearningLessonHandler| MOD_Backend_Education
  EVT_education_student_learning_path_completed{{"education.student.learning-path.completed"}}
  MOD_Backend_Education -->|CompleteElearningLessonHandler| EVT_education_student_learning_path_completed
  MOD_Backend_EventManagement["Backend/EventManagement"]
  EVT_education_student_learning_path_completed -->|StudentCompletedLearningPathEventHandler| MOD_Backend_EventManagement
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Enroll](#/flows/Backend/Education/enroll)
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
