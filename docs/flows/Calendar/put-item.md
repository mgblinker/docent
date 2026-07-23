---
type: flows
---

# Put Item

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: CalDavController.PutItem
- **Endpoints**:
  - `PUT /calendar/caldav/{ownerId:guid}/{uid}.ics` (via ApiGateway; internally `api/calendar/caldav/{ownerId:guid}/{uid}.ics`)
- **Module**: Calendar
- **Modules touched by this flow**: Calendar

```mermaid
flowchart TB
  EP_CalDavControllerPutItem[["CalDavController.PutItem<br/>(PUT)"]]
  MOD_Calendar["Calendar"]
  REQ_CreateCalendarItemCommand("Create Calendar Item")
  EP_CalDavControllerPutItem --> REQ_CreateCalendarItemCommand
  REQ_CreateCalendarItemCommand -->|CreateCalendarItemCommandHandler| MOD_Calendar
  EVT_calendar_item_created{{"calendar.item.created"}}
  MOD_Calendar -->|CreateCalendarItemCommandHandler| EVT_calendar_item_created
  REQ_UpdateCalendarItemCommand("Update Calendar Item")
  EP_CalDavControllerPutItem --> REQ_UpdateCalendarItemCommand
  REQ_UpdateCalendarItemCommand -->|UpdateCalendarItemCommandHandler| MOD_Calendar
  EVT_calendar_item_completed{{"calendar.item.completed"}}
  MOD_Calendar -->|UpdateCalendarItemCommandHandler| EVT_calendar_item_completed
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Create Calendar Item](#/flows/Calendar/create-calendar-item)
- [Complete Calendar Item](#/flows/Calendar/complete-calendar-item)
- [Update Calendar Item](#/flows/Calendar/update-calendar-item)
