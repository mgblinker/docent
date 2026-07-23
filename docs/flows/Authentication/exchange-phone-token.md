---
type: flows
---

# Exchange Phone Token

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ExchangePhoneTokenController.ExchangePhoneToken
- **Endpoints**:
  - `POST /authentication/v{version:apiVersion}/account/exchange-phone-token` (via ApiGateway; internally `api/v{version:apiVersion}/account/exchange-phone-token`)
- **Module**: Authentication
- **Modules touched by this flow**: Authentication, Backend/CoreData, Backend/Activities

```mermaid
flowchart TB
  EP_ExchangePhoneTokenControllerExchangePhoneToken[["ExchangePhoneTokenController.ExchangePhoneToken<br/>(POST)"]]
  MOD_Authentication["Authentication"]
  REQ_ExchangePhoneTokenCommand("Exchange Phone Token")
  EP_ExchangePhoneTokenControllerExchangePhoneToken --> REQ_ExchangePhoneTokenCommand
  REQ_ExchangePhoneTokenCommand -->|ExchangePhoneTokenCommandHandler| MOD_Authentication
  EVT_phone_user_registered{{"phone.user.registered"}}
  MOD_Authentication -->|ExchangePhoneTokenCommandHandler| EVT_phone_user_registered
  MOD_Backend_CoreData["Backend/CoreData"]
  EVT_phone_user_registered -->|PhoneUserRegisteredEventHandler| MOD_Backend_CoreData
  EVT_contact_linked_to_phone_user{{"contact.linked.to.phone.user"}}
  MOD_Backend_CoreData -->|PhoneUserRegisteredEventHandler| EVT_contact_linked_to_phone_user
  EVT_contact_linked_to_phone_user -->|ContactLinkedToPhoneUserEventHandler| MOD_Authentication
  EVT_notifiable_event_triggered{{"Notifiable Event Triggered"}}
  MOD_Backend_CoreData -->|PhoneUserRegisteredEventHandler| EVT_notifiable_event_triggered
  MOD_Backend_Activities["Backend/Activities"]
  EVT_notifiable_event_triggered -->|NotifiableEventTriggeredEventHandler| MOD_Backend_Activities
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Admin User Registered](#/flows/Authentication/admin-user-registered)
- [Bootstrap](#/flows/Authentication/bootstrap)
- [Create First Admin](#/flows/Authentication/create-first-admin)
- [Login](#/flows/Authentication/login)
- [Login Desktop](#/flows/Authentication/login-desktop)
- [Register](#/flows/Authentication/register)
- [Register Tenant](#/flows/Authentication/register-tenant)
- [Send Set Password Link](#/flows/Authentication/send-set-password-link)
- [Tenant Schema Update Required](#/flows/Authentication/tenant-schema-update-required)
- [Contact Linked To Admin User](#/flows/Backend/CoreData/contact-linked-to-admin-user)
- [Add User](#/flows/ImmoBroker/add-user)
- [Onboard Member](#/flows/ImmoBroker/onboard-member)
- [Remove User](#/flows/ImmoBroker/remove-user)
- [Update User Role](#/flows/ImmoBroker/update-user-role)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Tenant Provisioning Completed](#/flows/TenantProvisioning/tenant-provisioning-completed)
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
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
