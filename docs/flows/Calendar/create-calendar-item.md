---
type: flows
---

# Create Calendar Item

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: CalendarItemController.CreateCalendarItem
- **Endpoints**:
  - `POST /calendar/v{version:apiVersion}/items` (via ApiGateway; internally `api/calendar/v{version:apiVersion}/items`)
- **Module**: Calendar
- **Modules touched by this flow**: Calendar

```mermaid
flowchart TB
  EP_CalendarItemControllerCreateCalendarItem[["CalendarItemController.CreateCalendarItem<br/>(POST)"]]
  MOD_Calendar["Calendar"]
  REQ_CreateCalendarItemCommand("Create Calendar Item")
  EP_CalendarItemControllerCreateCalendarItem -->|| REQ_CreateCalendarItemCommand
  REQ_CreateCalendarItemCommand -->|CreateCalendarItemCommandHandler| MOD_Calendar
  EVT_calendar_item_created{{"calendar.item.created"}}
  MOD_Calendar -->|CreateCalendarItemCommandHandler| EVT_calendar_item_created
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Put Item](#/flows/Calendar/put-item)
