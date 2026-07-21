---
type: flows
---

# Upload Event Template Certificate

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: UploadEventTemplateCertificateController.UploadEventTemplateCertificate
- **Endpoints**:
  - `POST /event-management/v{version:apiVersion}/event-templates/{eventTemplateId}/certificates` (via ApiGateway; internally `api/event-management/v{version:apiVersion}/event-templates/{eventTemplateId}/certificates`)
- **Module**: Backend/EventManagement
- **Modules touched by this flow**: Backend/EventManagement, ProcessInsightsService

```mermaid
flowchart TB
  EP_UploadEventTemplateCertificateControllerUploadEventTemplateCertificate[["UploadEventTemplateCertificateController.UploadEventTemplateCertificate<br/>(POST)"]]
  MOD_Backend_EventManagement["Backend/EventManagement"]
  REQ_UploadEventTemplateCertificateCommand("Upload Event Template<br/>Certificate")
  EP_UploadEventTemplateCertificateControllerUploadEventTemplateCertificate -->|| REQ_UploadEventTemplateCertificateCommand
  REQ_UploadEventTemplateCertificateCommand -->|UploadEventTemplateCertificateCommandHandler| MOD_Backend_EventManagement
  EVT_event_certificate_uploaded{{"Certificate Uploaded"}}
  MOD_Backend_EventManagement -->|UploadEventTemplateCertificateCommandHandler| EVT_event_certificate_uploaded
  MOD_ProcessInsightsService["ProcessInsightsService"]
  EVT_event_certificate_uploaded -->|CertificateUploadedEventHandler| MOD_ProcessInsightsService
  EVT_event_certificate_mapping_rules_generated{{"Certificate Mapping Rules<br/>Generated"}}
  MOD_ProcessInsightsService -->|CertificateUploadedEventHandler| EVT_event_certificate_mapping_rules_generated
  EVT_event_certificate_mapping_rules_generated -->|CertificateMappingRulesGeneratedEventHandler| MOD_Backend_EventManagement
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Complete Lesson](#/flows/Backend/Education/complete-lesson)
- [Enroll](#/flows/Backend/Education/enroll)
- [Event Management Registration Completed](#/flows/Backend/EventManagement/event-management-registration-completed)
- [Event Registration Completed](#/flows/Backend/EventManagement/event-registration-completed)
- [Get Participants](#/flows/Backend/EventManagement/get-participants)
- [Initiate Registration Cancellation](#/flows/Backend/EventManagement/initiate-registration-cancellation)
- [Register Contact](#/flows/Backend/EventManagement/register-contact)
- [Register Contact Preliminary](#/flows/Backend/EventManagement/register-contact-preliminary)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
