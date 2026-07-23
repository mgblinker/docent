---
type: flows
---

# Complete Calendar Item

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: CalendarItemController.CompleteCalendarItem
- **Endpoints**:
  - `PATCH /calendar/v{version:apiVersion}/items/{id}/complete` (via ApiGateway; internally `api/calendar/v{version:apiVersion}/items/{id}/complete`)
- **Module**: Calendar
- **Modules touched by this flow**: Calendar

```mermaid
flowchart TB
  EP_CalendarItemControllerCompleteCalendarItem[["CalendarItemController.CompleteCalendarItem<br/>(PATCH)"]]
  MOD_Calendar["Calendar"]
  REQ_UpdateCalendarItemCommand("Update Calendar Item")
  EP_CalendarItemControllerCompleteCalendarItem --> REQ_UpdateCalendarItemCommand
  REQ_UpdateCalendarItemCommand -->|UpdateCalendarItemCommandHandler| MOD_Calendar
  EVT_calendar_item_completed{{"calendar.item.completed"}}
  MOD_Calendar -->|UpdateCalendarItemCommandHandler| EVT_calendar_item_completed
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Put Item](#/flows/Calendar/put-item)
- [Update Calendar Item](#/flows/Calendar/update-calendar-item)
