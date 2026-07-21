---
type: flows
---

# Event Management Registration Completed

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Trigger**: automatically published event `event-management.registration.completed` (no HTTP endpoint - fired by a background process or another handler)
- **Module**: Backend/EventManagement
- **Modules touched by this flow**: Backend/EventManagement

```mermaid
flowchart TB
  EVT_event_management_registration_completed{{"event-management.registration.completed"}}
  MOD_Backend_EventManagement["Backend/EventManagement"]
  EVT_event_management_registration_completed -->|RegistrationCompletedEventHandler| MOD_Backend_EventManagement
  EVT_event_registration_completed{{"Registration Completed"}}
  MOD_Backend_EventManagement -->|RegistrationCompletedEventHandler| EVT_event_registration_completed
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Event Registration Completed](#/flows/Backend/EventManagement/event-registration-completed)
