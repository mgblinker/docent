---
type: flows
---

# Contact Function Assigned

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Trigger**: automatically published event `contact.function.assigned` (no HTTP endpoint - fired by a background process or another handler)
- **Module**: Backend/CoreData
- **Modules touched by this flow**: Backend/CoreData

```mermaid
flowchart TB
  EVT_contact_function_assigned{{"Contact Function Assigned"}}
  MOD_Backend_CoreData["Backend/CoreData"]
  MOD_Backend_CoreData -->|ContactFunctionAssignedDomainEventHandler| EVT_contact_function_assigned
```
