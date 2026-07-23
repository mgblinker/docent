---
type: flows
---

# Reprovision Tenant

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: AdminController.ReprovisionTenant
- **Endpoints**:
  - `POST /tenant-provisioning/v{version:apiVersion}/admin/tenants/{tenantId:guid}/reprovision` (via ApiGateway; internally `api/tenant-provisioning/v{version:apiVersion}/admin/tenants/{tenantId:guid}/reprovision`)
- **Module**: TenantProvisioning
- **Modules touched by this flow**: TenantProvisioning, AutomationService, Backend/Activities, Backend/CareManagement, Backend/Communications, Backend/CoreData, Backend/Education, Backend/EventManagement, Backend/ProductData, Backend/RelationshipModule, Backend/Sales, Backend/SocialCare, Backend/StaffManagement, BillingService, Calendar, FileService, ImmoBroker, IntegrationService, LoggingService, MappingService, Planning, RealtimeInteraction, SettingsService, SharedKernel, Authentication

```mermaid
flowchart TB
  EP_AdminControllerReprovisionTenant[["AdminController.ReprovisionTenant<br/>(POST)"]]
  MOD_TenantProvisioning["TenantProvisioning"]
  REQ_ReprovisionTenantCommand("Reprovision Tenant")
  EP_AdminControllerReprovisionTenant --> REQ_ReprovisionTenantCommand
  REQ_ReprovisionTenantCommand -->|ReprovisionTenantCommandHandler| MOD_TenantProvisioning
  EVT_tenant_provisioning_initiated{{"tenant.provisioning.initiated"}}
  MOD_TenantProvisioning -->|ReprovisionTenantCommandHandler| EVT_tenant_provisioning_initiated
  MOD_AutomationService["AutomationService"]
  EVT_tenant_provisioning_initiated -->|AutomationProvisioningHandler| MOD_AutomationService
  MOD_Backend_Activities["Backend/Activities"]
  EVT_tenant_provisioning_initiated -->|ActivitiesProvisioningHandler| MOD_Backend_Activities
  MOD_Backend_CareManagement["Backend/CareManagement"]
  EVT_tenant_provisioning_initiated -->|CareManagementProvisioningHandler| MOD_Backend_CareManagement
  MOD_Backend_Communications["Backend/Communications"]
  EVT_tenant_provisioning_initiated -->|CommunicationsProvisioningHandler| MOD_Backend_Communications
  MOD_Backend_CoreData["Backend/CoreData"]
  EVT_tenant_provisioning_initiated -->|CoreDataProvisioningEventHandler| MOD_Backend_CoreData
  MOD_Backend_Education["Backend/Education"]
  EVT_tenant_provisioning_initiated -->|EducationProvisioningHandler| MOD_Backend_Education
  MOD_Backend_EventManagement["Backend/EventManagement"]
  EVT_tenant_provisioning_initiated -->|EventManagementProvisioningHandler| MOD_Backend_EventManagement
  MOD_Backend_ProductData["Backend/ProductData"]
  EVT_tenant_provisioning_initiated -->|ProductDataProvisioningHandler| MOD_Backend_ProductData
  MOD_Backend_RelationshipModule["Backend/RelationshipModule"]
  EVT_tenant_provisioning_initiated -->|RelationshipModuleProvisioningHandler| MOD_Backend_RelationshipModule
  MOD_Backend_Sales["Backend/Sales"]
  EVT_tenant_provisioning_initiated -->|SalesProvisioningHandler| MOD_Backend_Sales
  MOD_Backend_SocialCare["Backend/SocialCare"]
  EVT_tenant_provisioning_initiated -->|SocialCareProvisioningHandler| MOD_Backend_SocialCare
  MOD_Backend_StaffManagement["Backend/StaffManagement"]
  EVT_tenant_provisioning_initiated -->|StaffManagementProvisioningHandler| MOD_Backend_StaffManagement
  MOD_BillingService["BillingService"]
  EVT_tenant_provisioning_initiated -->|BillingProvisioningHandler| MOD_BillingService
  MOD_Calendar["Calendar"]
  EVT_tenant_provisioning_initiated -->|CalendarProvisioningHandler| MOD_Calendar
  MOD_FileService["FileService"]
  EVT_tenant_provisioning_initiated -->|FileServiceProvisioningHandler| MOD_FileService
  MOD_ImmoBroker["ImmoBroker"]
  EVT_tenant_provisioning_initiated -->|ImmoBrokerProvisioningHandler| MOD_ImmoBroker
  MOD_IntegrationService["IntegrationService"]
  EVT_tenant_provisioning_initiated -->|IntegrationProvisioningHandler| MOD_IntegrationService
  MOD_LoggingService["LoggingService"]
  EVT_tenant_provisioning_initiated -->|LoggingProvisioningHandler| MOD_LoggingService
  MOD_MappingService["MappingService"]
  EVT_tenant_provisioning_initiated -->|MappingProvisioningHandler| MOD_MappingService
  MOD_Planning["Planning"]
  EVT_tenant_provisioning_initiated -->|PlanningProvisioningHandler| MOD_Planning
  MOD_RealtimeInteraction["RealtimeInteraction"]
  EVT_tenant_provisioning_initiated -->|RealtimeInteractionProvisioningHandler| MOD_RealtimeInteraction
  MOD_SettingsService["SettingsService"]
  EVT_tenant_provisioning_initiated -->|SettingsProvisioningHandler| MOD_SettingsService
  MOD_SharedKernel["SharedKernel"]
  EVT_tenant_provisioning_initiated -->|TenantProvisioningInitiatedEventHandler| MOD_SharedKernel
  EVT_security_role_assignment_requested{{"Security Role Assignment<br/>Requested"}}
  MOD_ImmoBroker -->|ImmoBrokerProvisioningHandler| EVT_security_role_assignment_requested
  MOD_Authentication["Authentication"]
  EVT_security_role_assignment_requested -->|SecurityRoleAssignmentEventHandler| MOD_Authentication
  EVT_security_role_assignment_requested -->|SecurityRoleAssignmentRequestedEventDispatcher| MOD_SharedKernel
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Module Assignment Requested](#/flows/AutomationService/module-assignment-requested)
- [Add User](#/flows/ImmoBroker/add-user)
- [Onboard Member](#/flows/ImmoBroker/onboard-member)
- [Remove User](#/flows/ImmoBroker/remove-user)
- [Update User Role](#/flows/ImmoBroker/update-user-role)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
- [Exchange Phone Token](#/flows/Authentication/exchange-phone-token)
- [Create Notification](#/flows/Backend/Activities/create-notification)
- [Assign](#/flows/Backend/Communications/assign)
- [Cancel Meeting](#/flows/Backend/Communications/cancel-meeting)
- [Create Meeting](#/flows/Backend/Communications/create-meeting)
- [Respond By Token](#/flows/Backend/Communications/respond-by-token)
- [Respond To Appointment Invitation](#/flows/Backend/Communications/respond-to-appointment-invitation)
- [Respond To Invitation](#/flows/Backend/Communications/respond-to-invitation)
- [Send Appointment Invitation](#/flows/Backend/Communications/send-appointment-invitation)
- [Send Invitations](#/flows/Backend/Communications/send-invitations)
- [Submit](#/flows/Backend/Communications/submit)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Set Availability](#/flows/Backend/StaffManagement/set-availability)
- [Set Worktime Schedule](#/flows/Backend/StaffManagement/set-worktime-schedule)
- [Delete Notification](#/flows/ImmoBroker/delete-notification)
- [Get Notifications](#/flows/ImmoBroker/get-notifications)
- [Register Relative Relationship](#/flows/Backend/CareManagement/register-relative-relationship)
- [Accept Proposed Time](#/flows/Backend/Communications/accept-proposed-time)
- [Appointment Created](#/flows/Backend/Communications/appointment-created)
- [Create Call Activity](#/flows/Backend/Communications/create-call-activity)
- [Save External As Contact](#/flows/Backend/Communications/save-external-as-contact)
- [Update Meeting](#/flows/Backend/Communications/update-meeting)
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
- [Create Booking](#/flows/Calendar/create-booking)
- [Chat Conversation Ended](#/flows/RealtimeInteraction/chat-conversation-ended)
- [Chat Message Sent](#/flows/RealtimeInteraction/chat-message-sent)
- [Admin User Registered](#/flows/Authentication/admin-user-registered)
- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Contact Function Assigned](#/flows/Backend/CoreData/contact-function-assigned)
- [Contact Function Revoked](#/flows/Backend/CoreData/contact-function-revoked)
- [Contact Linked To Admin User](#/flows/Backend/CoreData/contact-linked-to-admin-user)
- [Get Participants](#/flows/Backend/EventManagement/get-participants)
- [Create Sales Idea](#/flows/Backend/Sales/create-sales-idea)
- [Get Sales Idea Candidates](#/flows/Backend/Sales/get-sales-idea-candidates)
- [Onboard Employee](#/flows/Backend/StaffManagement/onboard-employee)
- [Search](#/flows/ImmoBroker/search)
- [Tenant Provisioning Completed](#/flows/TenantProvisioning/tenant-provisioning-completed)
- [Complete Lesson](#/flows/Backend/Education/complete-lesson)
- [Create Student](#/flows/Backend/Education/create-student)
- [Delete Learning Path Definition](#/flows/Backend/Education/delete-learning-path-definition)
- [Delete Student](#/flows/Backend/Education/delete-student)
- [Enroll](#/flows/Backend/Education/enroll)
- [Update Learning Path Definition](#/flows/Backend/Education/update-learning-path-definition)
- [Update Student](#/flows/Backend/Education/update-student)
- [Event Management Registration Completed](#/flows/Backend/EventManagement/event-management-registration-completed)
- [Event Registration Completed](#/flows/Backend/EventManagement/event-registration-completed)
- [Initiate Registration Cancellation](#/flows/Backend/EventManagement/initiate-registration-cancellation)
- [Register Contact](#/flows/Backend/EventManagement/register-contact)
- [Register Contact Preliminary](#/flows/Backend/EventManagement/register-contact-preliminary)
- [Upload Event Template Certificate](#/flows/Backend/EventManagement/upload-event-template-certificate)
- [Create Product](#/flows/Backend/ProductData/create-product)
- [Delete Product](#/flows/Backend/ProductData/delete-product)
- [Update Product](#/flows/Backend/ProductData/update-product)
- [Add Absence](#/flows/Backend/StaffManagement/add-absence)
- [Create Override](#/flows/Backend/StaffManagement/create-override)
- [Handle Stripe Webhook](#/flows/BillingService/handle-stripe-webhook)
- [Action Created](#/flows/Calendar/action-created)
- [Complete Calendar Item](#/flows/Calendar/complete-calendar-item)
- [Create Calendar Item](#/flows/Calendar/create-calendar-item)
- [Put Item](#/flows/Calendar/put-item)
- [Update Calendar Item](#/flows/Calendar/update-calendar-item)
- [Event Logged](#/flows/LoggingService/event-logged)
- [User Login](#/flows/LoggingService/user-login)
- [Action Next Requested](#/flows/SharedKernel/action-next-requested)
- [Module Migration Status Reported](#/flows/SharedKernel/module-migration-status-reported)
- [Module Provisioning Completed](#/flows/SharedKernel/module-provisioning-completed)
- [Module Provisioning Failed](#/flows/SharedKernel/module-provisioning-failed)
- [Bootstrap](#/flows/Authentication/bootstrap)
- [Create First Admin](#/flows/Authentication/create-first-admin)
- [Login](#/flows/Authentication/login)
- [Login Desktop](#/flows/Authentication/login-desktop)
- [Register](#/flows/Authentication/register)
- [Register Tenant](#/flows/Authentication/register-tenant)
- [Send Set Password Link](#/flows/Authentication/send-set-password-link)
- [Tenant Schema Update Required](#/flows/Authentication/tenant-schema-update-required)
