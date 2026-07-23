---
type: flows
---

# Update Calendar Item

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: CalendarItemController.UpdateCalendarItem
- **Endpoints**:
  - `PUT /calendar/v{version:apiVersion}/items/{id}` (via ApiGateway; internally `api/calendar/v{version:apiVersion}/items/{id}`)
- **Module**: Calendar
- **Modules touched by this flow**: Calendar

```mermaid
flowchart TB
  EP_CalendarItemControllerUpdateCalendarItem[["CalendarItemController.UpdateCalendarItem<br/>(PUT)"]]
  MOD_Calendar["Calendar"]
  REQ_UpdateCalendarItemCommand("Update Calendar Item")
  EP_CalendarItemControllerUpdateCalendarItem --> REQ_UpdateCalendarItemCommand
  REQ_UpdateCalendarItemCommand -->|UpdateCalendarItemCommandHandler| MOD_Calendar
  EVT_calendar_item_completed{{"calendar.item.completed"}}
  MOD_Calendar -->|UpdateCalendarItemCommandHandler| EVT_calendar_item_completed
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Complete Calendar Item](#/flows/Calendar/complete-calendar-item)
- [Put Item](#/flows/Calendar/put-item)
